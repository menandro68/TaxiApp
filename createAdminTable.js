const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const db = new sqlite3.Database('./taxiapp.db');

console.log('Creando tabla de administradores...\n');

// Crear tabla de administradores
db.run(`
    CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'admin',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`, async (err) => {
    if (err) {
        console.error('Error creando tabla:', err);
        return;
    }
    
    console.log('✓ Tabla admins creada/verificada');
    
    // Crear administrador por defecto
    const defaultAdmin = {
        username: 'admin',
        email: 'admin@taxiapp.com',
        password: 'Admin123!' // Cambiar en producción
    };
    
    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(defaultAdmin.password, 10);
    
    db.run(`
        INSERT OR IGNORE INTO admins (username, email, password)
        VALUES (?, ?, ?)
    `, [defaultAdmin.username, defaultAdmin.email, hashedPassword], (err) => {
        if (err) {
            console.error('Error:', err);
        } else {
            console.log('\n✅ Administrador creado:');
            console.log('   Usuario: admin');
            console.log('   Contraseña: Admin123!');
            console.log('\n⚠️  IMPORTANTE: Cambia esta contraseña en producción');
        }
        
        db.close();
    });
});