const db = require('./config/database');

console.log('Verificando notificaciones...\n');

// Ver todas las notificaciones
db.all('SELECT * FROM notifications', [], (err, rows) => {
    if (err) {
        console.error('Error:', err);
    } else {
        console.log('📨 Total de notificaciones:', rows.length);
        if (rows.length > 0) {
            rows.forEach(notif => {
                console.log('\n-------------------');
                console.log('ID:', notif.id);
                console.log('Usuario ID:', notif.user_id);
                console.log('Tipo:', notif.user_type);
                console.log('Título:', notif.title);
                console.log('Mensaje:', notif.message);
                console.log('Fecha:', notif.created_at);
            });
        } else {
            console.log('❌ No hay notificaciones en la base de datos');
        }
    }
    process.exit();
});