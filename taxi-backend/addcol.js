const {db} = require('./config/database');
db.query("ALTER TABLE admins ADD COLUMN IF NOT EXISTS permissions TEXT DEFAULT '[]'")
  .then(r => { console.log('COLUMNA AGREGADA'); process.exit(); })
  .catch(e => { console.log(e.message); process.exit(); });