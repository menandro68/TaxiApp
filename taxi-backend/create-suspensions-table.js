const Database = require('better-sqlite3');
const db = new Database('taxiapp.db');

// Crear tabla de suspensiones
console.log('📋 Creando tabla de suspensiones...');

db.exec(`
    CREATE TABLE IF NOT EXISTS driver_suspensions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        driver_id INTEGER NOT NULL,
        driver_name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('temporal', 'permanent')),
        reason TEXT NOT NULL,
        duration_hours INTEGER,
        suspended_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        lifted_at DATETIME,
        lifted_by TEXT,
        lifted_reason TEXT,
        created_by TEXT NOT NULL DEFAULT 'admin',
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'expired', 'lifted')),
        FOREIGN KEY (driver_id) REFERENCES drivers (id)
    )
`);

console.log('✅ Tabla driver_suspensions creada');

// Crear índices para mejorar rendimiento
db.exec(`
    CREATE INDEX IF NOT EXISTS idx_driver_suspensions_driver_id 
    ON driver_suspensions(driver_id);
    
    CREATE INDEX IF NOT EXISTS idx_driver_suspensions_status 
    ON driver_suspensions(status);
`);

console.log('✅ Índices creados');

// Verificar que la tabla existe
const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='driver_suspensions'
`).all();

console.log('📊 Tablas verificadas:', tables.map(t => t.name));

db.close();
console.log('✅ Base de datos actualizada exitosamente');