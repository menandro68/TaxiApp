const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./taxiapp.db');

console.log('Verificando administradores...\n');

db.all("SELECT username, email FROM admins", (err, rows) => {
    if (err) {
        console.error('Error:', err);
    } else if (rows.length === 0) {
        console.log('❌ No hay administradores en la base de datos');
        console.log('Necesitas crear uno con updateAdmin.js');
    } else {
        console.log('✅ Administradores encontrados:');
        rows.forEach(admin => {
            console.log(`   - Usuario: ${admin.username} | Email: ${admin.email}`);
        });
    }
    db.close();
});