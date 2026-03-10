const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.query(`
  SELECT column_name FROM information_schema.columns 
  WHERE table_name = 'drivers' AND column_name = 'driver_code'
`)
.then(r => {
  console.log(r.rows.length > 0 ? '✅ driver_code existe' : '❌ NO existe');
  pool.end();
})
.catch(e => {
  console.error('❌ Error:', e.message);
  pool.end();
});