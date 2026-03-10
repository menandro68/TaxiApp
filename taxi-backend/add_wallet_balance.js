const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.query(`
  ALTER TABLE drivers 
  ADD COLUMN IF NOT EXISTS wallet_balance DECIMAL(10,2) DEFAULT 0.00
`)
.then(() => {
  console.log('✅ Columna wallet_balance agregada a drivers');
  pool.end();
})
.catch(e => {
  console.error('❌ Error:', e.message);
  pool.end();
});