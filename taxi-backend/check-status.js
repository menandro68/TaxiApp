const db = require('./config/database');

db.all("SELECT id, name, status FROM drivers WHERE name LIKE '%menandro%' OR name LIKE '%Carlos%'", [], (err, rows) => {
    if (err) {
        console.error('Error:', err);
    } else {
        console.log('Conductores encontrados:');
        rows.forEach(row => {
            console.log(`ID: ${row.id}, Nombre: ${row.name}, Estado: ${row.status}`);
        });
    }
    db.close();
});