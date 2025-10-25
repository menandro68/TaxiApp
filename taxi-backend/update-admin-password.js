const { db } = require('./config/database');
const bcrypt = require('bcryptjs');

async function updatePassword() {
    try {
        const newPassword = '132312ml';
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        const result = await db.query(
            `UPDATE admins SET password = $1 WHERE username = $2 RETURNING username, email`,
            [hashedPassword, 'menandro68']
        );
        
        if (result.rows.length > 0) {
            console.log('✅ Contraseña actualizada:', result.rows[0]);
        } else {
            console.log('⚠️ Admin no encontrado');
        }
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

updatePassword();
```

**Guarda:**
```
Ctrl+S