const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

db.run(`ALTER TABLE drivers ADD COLUMN is_online INTEGER DEFAULT 0`, (err) => {
  if (err) {
    console.log('❌ Error:', err.message);
  } else {
    console.log('✅ Columna is_online agregada exitosamente');
  }
  db.close();
  process.exit();
});