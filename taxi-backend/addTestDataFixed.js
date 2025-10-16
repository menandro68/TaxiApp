const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./taxiapp.db');

// Primero verifiquemos la estructura de las tablas
console.log('Verificando estructura de la base de datos...\n');

db.all("PRAGMA table_info(drivers)", (err, columns) => {
    console.log('Columnas en tabla drivers:');
    columns.forEach(col => console.log(`  - ${col.name} (${col.type})`));
    console.log('');
});

db.all("PRAGMA table_info(users)", (err, columns) => {
    console.log('Columnas en tabla users:');
    columns.forEach(col => console.log(`  - ${col.name} (${col.type})`));
    console.log('\n-------------------\n');
});

// Esperar un momento y luego agregar datos
setTimeout(() => {
    console.log('Agregando usuarios de prueba...');
    
    // Agregar usuarios (parece que esta tabla no existe)
    const users = [
        ['María González', 'maria@email.com', '809-555-0001'],
        ['Juan Pérez', 'juan@email.com', '809-555-0002'],
        ['Carmen Silva', 'carmen@email.com', '809-555-0003']
    ];
    
    // Intentar crear tabla users si no existe
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT UNIQUE,
        phone TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) console.log('Error creando tabla users:', err.message);
        
        // Insertar usuarios
        users.forEach(user => {
            db.run(`INSERT OR IGNORE INTO users (name, email, phone) VALUES (?, ?, ?)`,
                user,
                function(err) {
                    if (err) console.error('Error:', err.message);
                    else if (this.changes > 0) console.log('✓ Usuario agregado:', user[0]);
                }
            );
        });
    });
    
    // Agregar más conductores
    console.log('\nAgregando conductores de prueba...');
    const drivers = [
        ['Carlos Rodríguez', 'carlos@taxi.com', '809-555-1001'],
        ['Ana Martínez', 'ana@taxi.com', '809-555-1002'],
        ['Luis García', 'luis@taxi.com', '809-555-1003']
    ];
    
    drivers.forEach(driver => {
        db.run(`INSERT OR IGNORE INTO drivers (name, email, phone) VALUES (?, ?, ?)`,
            driver,
            function(err) {
                if (err) console.error('Error:', err.message);
                else if (this.changes > 0) console.log('✓ Conductor agregado:', driver[0]);
            }
        );
    });
    
    // Verificar resultados después de 2 segundos
    setTimeout(() => {
        console.log('\n-------------------');
        console.log('Verificando datos...\n');
        
        db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
            if (err) console.log('Tabla users no existe');
            else console.log('Total usuarios:', row.count);
        });
        
        db.get("SELECT COUNT(*) as count FROM drivers", (err, row) => {
            if (err) console.log('Error:', err.message);
            else console.log('Total conductores:', row.count);
        });
        
        // Agregar algunos viajes de prueba
        console.log('\nCreando tabla de viajes si no existe...');
        db.run(`CREATE TABLE IF NOT EXISTS trips (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER,
            driverId INTEGER,
            pickupLocation TEXT,
            dropoffLocation TEXT,
            fare REAL,
            status TEXT DEFAULT 'completed',
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (!err) {
                // Agregar viajes de ejemplo
                const trips = [
                    [1, 1, 'Centro', 'Aeropuerto', 450.00],
                    [2, 2, 'Plaza', 'Hospital', 250.00],
                    [3, 1, 'Mall', 'Universidad', 180.00]
                ];
                
                trips.forEach(trip => {
                    db.run(`INSERT INTO trips (userId, driverId, pickupLocation, dropoffLocation, fare) VALUES (?, ?, ?, ?, ?)`,
                        trip,
                        function(err) {
                            if (!err && this.changes > 0) {
                                console.log('✓ Viaje agregado');
                            }
                        }
                    );
                });
            }
        });
        
        setTimeout(() => {
            db.get("SELECT COUNT(*) as count FROM trips", (err, row) => {
                if (!err) console.log('Total viajes:', row?.count || 0);
                db.close();
                console.log('\n✅ Proceso completado');
            });
        }, 1000);
    }, 2000);
}, 1000);