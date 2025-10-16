const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./taxiapp.db');

db.serialize(() => {
    // Crear tabla de notificaciones
    db.run(`
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            user_type TEXT CHECK(user_type IN ('driver', 'user')),
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            type TEXT DEFAULT 'info',
            read_status BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) {
            console.error('Error creando tabla:', err);
        } else {
            console.log('✅ Tabla notifications creada exitosamente');
        }
    });
    
    // Crear tabla de FCM tokens
    db.run(`
        CREATE TABLE IF NOT EXISTS fcm_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            user_type TEXT CHECK(user_type IN ('driver', 'user')),
            token TEXT UNIQUE,
            device_info TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) {
            console.error('Error creando tabla FCM:', err);
        } else {
            console.log('✅ Tabla fcm_tokens creada exitosamente');
        }
    });
});

db.close();