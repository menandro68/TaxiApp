const bcrypt = require('bcryptjs');
const db = require('./config/database');

(async () => {
  const hashedPassword = await bcrypt.hash('132312ml', 10);
  
  db.run(
    'UPDATE admins SET password = ? WHERE username = ?',
    [hashedPassword, 'menandro68'],
    function(err) {
      if (err) {
        console.error('Error:', err.message);
      } else {
        console.log('✅ Contraseña actualizada exitosamente!');
        console.log('Usuario: menandro68');
        console.log('Nueva contraseña: 132312ml');
      }
      process.exit();
    }
  );
})();