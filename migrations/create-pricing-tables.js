const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, '..', 'database.db'));

db.serialize(() => {
    // Tabla de configuración de tarifas base
    db.run(`
        CREATE TABLE IF NOT EXISTS pricing_config (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vehicle_type VARCHAR(50) NOT NULL,
            base_fare DECIMAL(10,2) DEFAULT 100,
            per_km DECIMAL(10,2) DEFAULT 25,
            per_minute DECIMAL(10,2) DEFAULT 5,
            minimum_fare DECIMAL(10,2) DEFAULT 100,
            booking_fee DECIMAL(10,2) DEFAULT 20,
            active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Tabla de multiplicadores de surge pricing
    db.run(`
        CREATE TABLE IF NOT EXISTS surge_multipliers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type VARCHAR(50) NOT NULL,
            name VARCHAR(100) NOT NULL,
            condition_value VARCHAR(100),
            multiplier DECIMAL(5,2) DEFAULT 1.0,
            start_time TIME,
            end_time TIME,
            days_of_week VARCHAR(20),
            active BOOLEAN DEFAULT 1,
            priority INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Tabla de zonas especiales
    db.run(`
        CREATE TABLE IF NOT EXISTS special_zones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            zone_name VARCHAR(100) NOT NULL,
            zone_type VARCHAR(50),
            surcharge DECIMAL(10,2) DEFAULT 0,
            multiplier DECIMAL(5,2) DEFAULT 1.0,
            coordinates TEXT,
            radius_km DECIMAL(5,2),
            active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Tabla de programación de cambios de tarifas
    db.run(`
        CREATE TABLE IF NOT EXISTS scheduled_pricing (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            change_type VARCHAR(50) NOT NULL,
            target_id INTEGER,
            new_value TEXT,
            scheduled_date DATETIME,
            executed BOOLEAN DEFAULT 0,
            created_by INTEGER,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Tabla de historial de cambios
    db.run(`
        CREATE TABLE IF NOT EXISTS pricing_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            table_name VARCHAR(50),
            record_id INTEGER,
            field_changed VARCHAR(50),
            old_value TEXT,
            new_value TEXT,
            changed_by INTEGER,
            change_date DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    console.log('✅ Tablas de tarifas creadas exitosamente');
});

db.close();