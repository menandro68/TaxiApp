const {pool} = require('./config/database');
const bcrypt = require('bcrypt');

async function updateUser() {
    try {
        const hash = await bcrypt.hash('132312ml', 10);
        const result = await pool.query(
            "UPDATE admins SET password = $1, role = 'super_admin' WHERE username = 'menandro68'",
            [hash]
        );
        console.log('Filas actualizadas:', result.rowCount);
        process.exit(0);
    } catch(e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
}

updateUser();
