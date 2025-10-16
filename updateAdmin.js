const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const db = new sqlite3.Database('./taxiapp.db');

async function updateAdmin() {
    console.log('Actualizando credenciales del administrador...\n');
    
    // Tus nuevas credenciales
    const newUsername = 'menandro68';
    const newPassword = '132312ml';
    
    // Encriptar la nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Actualizar el admin existente
    db.run(`
        UPDATE admins 
        SET username = ?, password = ?
        WHERE username = 'admin'
    `, [newUsername, hashedPassword], function(err) {
        if (err) {
            console.error('Error:', err);
        } else if (this.changes > 0) {
            console.log('✅ Credenciales actualizadas exitosamente!\n');
            console.log('   Nuevo usuario: menandro68');
            console.log('   Nueva contraseña: 132312ml');
            console.log('\n📌 Ahora puedes iniciar sesión con estas credenciales');
        } else {
            console.log('⚠️  No se encontró el usuario admin para actualizar');
        }
        
        db.close();
    });
}

updateAdmin();