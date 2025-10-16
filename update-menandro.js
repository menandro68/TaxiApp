const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const db = new sqlite3.Database('./taxiapp.db');

async function updateUser() {
    // Encriptar tu contraseña
    const hashedPassword = await bcrypt.hash('132312ml', 10);
    
    // Actualizar tu usuario
    db.run(`
        UPDATE admins 
        SET password = ?,
            role = 'super_admin',
            permissions = '["all"]'
        WHERE username = 'menandro68'
    `, [hashedPassword], (err) => {
        if (err) {
            console.log('❌ Error:', err);
        } else {
            console.log('✅ Usuario menandro68 actualizado:');
            console.log('   Contraseña: 132312ml');
            console.log('   Rol: super_admin (todos los permisos)');
            console.log('\n🎉 Ya puedes iniciar sesión con tus credenciales!');
        }
        db.close();
    });
}

updateUser();