const { pool } = require('./config/database.js');
const bcrypt = require('bcryptjs');

(async () => {
  try {
    // Primero borramos todos los admins existentes
    await pool.query('TRUNCATE TABLE admins');
    
    // Luego creamos el nuevo admin con usuario y contraseña que quieres
    const hashedPassword = await bcrypt.hash('132312ml', 10);
    await pool.query(
      INSERT INTO admins (username, email, password, role, created_at, updated_at) 
       VALUES (, , , , NOW(), NOW()),
      ['menandro68', 'menandro68@example.com', hashedPassword, 'admin']
    );
    
    console.log('✅ Admin creado exitosamente');
    console.log('👤 Usuario: menandro68');
    console.log('🔐 Contraseña: 132312ml');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
})();
