const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Crear/conectar base de datos
const db = new sqlite3.Database(path.join(__dirname, '../taxiapp.db'), (err) => {
  if (err) {
    console.error('Error al conectar con la base de datos:', err);
  } else {
    console.log('📊 Base de datos SQLite conectada');
    initDatabase();
  }
});

// Inicializar tablas
function initDatabase() {
  // Tabla de usuarios (pasajeros)
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Tabla de conductores
  db.run(`CREATE TABLE IF NOT EXISTS drivers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT NOT NULL,
    password TEXT NOT NULL,
    license TEXT NOT NULL,
    vehicle_plate TEXT,
    vehicle_model TEXT,
    vehicle_color TEXT,
    status TEXT DEFAULT 'inactive',
    rating REAL DEFAULT 5.0,
    total_trips INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Tabla de viajes
  db.run(`CREATE TABLE IF NOT EXISTS trips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    driver_id INTEGER,
    pickup_location TEXT,
    destination TEXT,
    status TEXT DEFAULT 'pending',
    price REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (driver_id) REFERENCES drivers(id)
  )`);

  // Tabla de sesiones activas
  db.run(`CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    user_type TEXT CHECK(user_type IN ('user', 'driver', 'admin')),
    token TEXT UNIQUE NOT NULL,
    refresh_token TEXT UNIQUE,
    device_info TEXT,
    ip_address TEXT,
    user_agent TEXT,
    last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  console.log('✅ Tablas de base de datos inicializadas');
}

module.exports = db;