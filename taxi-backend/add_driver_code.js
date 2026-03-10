const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.query(`
  ALTER TABLE drivers 
  ADD COLUMN IF NOT EXISTS driver_code VARCHAR(50) UNIQUE
`)
.then(async () => {
  console.log('✅ Columna driver_code agregada');
  
  // Generar códigos automáticos para conductores existentes
  const result = await pool.query('SELECT id FROM drivers WHERE driver_code IS NULL');
  for (const row of result.rows) {
    const code = 'SQUID-' + String(row.id).padStart(3, '0');
    await pool.query('UPDATE drivers SET driver_code = $1 WHERE id = $2', [code, row.id]);
  }
  console.log(`✅ Códigos generados para ${result.rows.length} conductores existentes`);
  pool.end();
})
.catch(e => {
  console.error('❌ Error:', e.message);
  pool.end();
});