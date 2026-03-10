const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
});

pool.query(`
  CREATE TABLE IF NOT EXISTS wallet_deposits (
    id SERIAL PRIMARY KEY,
    confirmation_number VARCHAR(50) UNIQUE NOT NULL,
    driver_id INTEGER REFERENCES drivers(id),
    driver_code VARCHAR(50),
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    deposit_date DATE,
    processed_at TIMESTAMP DEFAULT NOW(),
    pdf_filename VARCHAR(255),
    status VARCHAR(20) DEFAULT 'processed'
  )
`)
.then(() => { 
  console.log('✅ Tabla wallet_deposits creada'); 
  pool.end(); 
})
.catch(e => { 
  console.error('❌ Error:', e.message); 
  pool.end(); 
});