const db = require('./config/database');

db.run("UPDATE drivers SET status = 'pending' WHERE id = 5", function(err) {
    if (err) {
        console.error('Error:', err);
    } else {
        console.log('✅ Menandro actualizado a PENDING');
    }
    db.close();
});