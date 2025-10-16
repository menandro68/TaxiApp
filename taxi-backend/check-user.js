const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./taxiapp.db');

db.all('SELECT username, email, role FROM admins', (err, rows) => {
    console.log('\n📋 ADMINISTRADORES EN EL SISTEMA:');
    console.log('================================');
    if (rows && rows.length > 0) {
        rows.forEach(admin => {
            console.log(`Usuario: ${admin.username}`);
            console.log(`Email: ${admin.email}`);
            console.log(`Rol: ${admin.role}`);
            console.log('---');
        });
    } else {
        console.log('No hay administradores en el sistema');
    }
    db.close();
});