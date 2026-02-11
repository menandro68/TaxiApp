const {db} = require('./config/database');
db.query("ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS registered_by VARCHAR(100)")
  .then(r => { console.log('COLUMNA registered_by AGREGADA'); process.exit(); })
  .catch(e => { console.log(e.message); process.exit(); });