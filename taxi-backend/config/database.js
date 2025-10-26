// ========================================
// CONFIGURACIÓN DE BASE DE DATOS - PostgreSQL
// ========================================
const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

// ========================================
// POOL DE CONEXIONES POSTGRESQL
// ========================================
// Usar DATABASE_URL de Railway o variables locales
const connectionString = process.env.DATABASE_URL || process.env.DATABASE_PRIVATE_URL || 
  `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME}`;

console.log('📌 Conexión usando:', connectionString.split('@')[1] || 'variables locales');

const pool = new Pool({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false },  // SIEMPRE SSL en Railway
  max: 5,
  min: 1,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 60000,
  statement_timeout: 120000,
  application_name: 'taxiapp_backend',
});

// Manejo de errores del pool
pool.on('error', (err) => {
  console.error('Error en el pool de PostgreSQL:', err);
});

// ========================================
// SERVICIO DE BASE DE DATOS
// ========================================
class DatabaseService {
  async getOne(query, params = []) {
    try {
      const result = await pool.query(query, params);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  async getAll(query, params = []) {
    try {
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  async run(query, params = []) {
    try {
      const result = await pool.query(query, params);
      return {
        changes: result.rowCount,
        lastID: result.rows[0]?.id
      };
    } catch (error) {
      console.error('Database execution error:', error);
      throw error;
    }
  }

  async query(query, params = []) {
    try {
      const result = await pool.query(query, params);
      return result;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  async transaction(callback) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

const db = new DatabaseService();

// ========================================
// INICIALIZACIÓN DE TABLAS
// ========================================
async function initDatabase() {
  try {
    console.log('🔄 Inicializando base de datos PostgreSQL...');

    // Tabla de usuarios (pasajeros)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20),
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de conductores
    await pool.query(`
      CREATE TABLE IF NOT EXISTS drivers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20) NOT NULL,
        password VARCHAR(255) NOT NULL,
        license VARCHAR(100) NOT NULL,
        vehicle_plate VARCHAR(50),
        vehicle_model VARCHAR(100),
        vehicle_color VARCHAR(50),
        status VARCHAR(50) DEFAULT 'inactive',
        rating NUMERIC(3,2) DEFAULT 5.0,
        total_trips INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de viajes
    await pool.query(`
      CREATE TABLE IF NOT EXISTS trips (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        driver_id INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
        pickup_location VARCHAR(255),
        destination VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        price NUMERIC(10,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de sesiones activas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        user_type VARCHAR(50) CHECK(user_type IN ('user', 'driver', 'admin')),
        token VARCHAR(500) UNIQUE NOT NULL,
        refresh_token VARCHAR(500) UNIQUE,
        device_info TEXT,
        ip_address VARCHAR(50),
        user_agent TEXT,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de ubicaciones de conductores
    await pool.query(`
      CREATE TABLE IF NOT EXISTS driver_locations (
        id SERIAL PRIMARY KEY,
        driver_id INTEGER REFERENCES drivers(id) ON DELETE CASCADE,
        latitude NUMERIC(10,8),
        longitude NUMERIC(11,8),
        heading NUMERIC(5,2),
        speed NUMERIC(5,2),
        accuracy NUMERIC(5,2),
        status VARCHAR(50) DEFAULT 'online',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de administradores
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'admin',
        permissions JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de roles
    await pool.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        permissions JSONB DEFAULT '[]',
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de suspensiones de conductores
    await pool.query(`
      CREATE TABLE IF NOT EXISTS driver_suspensions (
        id SERIAL PRIMARY KEY,
        driver_id INTEGER REFERENCES drivers(id) ON DELETE CASCADE,
        driver_name VARCHAR(255),
        type VARCHAR(50) CHECK(type IN ('temporal', 'permanent')),
        reason TEXT,
        duration_hours INTEGER,
        expires_at TIMESTAMP,
        status VARCHAR(50) DEFAULT 'active',
        created_by VARCHAR(100),
        lifted_by VARCHAR(100),
        lifted_reason TEXT,
        suspended_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        lifted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Crear índices para mejor rendimiento
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_id ON driver_locations(driver_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_suspensions_driver_id ON driver_suspensions(driver_id)`);

    console.log('✅ Tablas de base de datos inicializadas');
  } catch (error) {
    console.error('Error inicializando base de datos:', error);
  }
}

// ========================================
// INICIALIZACIÓN CON ADMIN POR DEFECTO
// ========================================
(async () => {
  try {
    console.log('🔄 Inicializando base de datos y creando admin...');
    
    // Esperar a que se creen las tablas
    await initDatabase();
    
    // Insertar admin por defecto si no existe
    const bcrypt = require('bcryptjs');
    const adminCount = await pool.query('SELECT COUNT(*) as count FROM admins');
    const count = parseInt(adminCount.rows[0].count || 0);
    
    if (count === 0) {
      console.log('📝 Creando admin por defecto...');
      const hashedPassword = await bcrypt.hash('132312', 10);
      await pool.query(
        `INSERT INTO admins (username, email, password, role, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        ['menandro68', 'menandro68@example.com', hashedPassword, 'admin']
      );
      console.log('✅ Admin por defecto creado: menandro68 / 132312');
    } else {
      console.log('✅ Admin ya existe en la base de datos');
    }
  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error);
  }
})();

// Verificar conexión al pool
pool.query('SELECT NOW()', (err, result) => {
  if (err) {
    console.error('❌ Error conectando a PostgreSQL:', err);
  } else {
    console.log('🛡️ PostgreSQL conectado correctamente');
  }
});

// ========================================
// EXPORTAR
// ========================================
module.exports = { db, pool, DatabaseService };
