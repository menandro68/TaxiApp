const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:SsZlMeDRcnTgUDDVCEbKfRajlrznnwZY@mainline.proxy.rlwy.net:25600/railway',
  ssl: { rejectUnauthorized: false }
});

async function addCoordsColumns() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Agregando columnas de coordenadas a la tabla trips...');
    
    // Agregar columnas si no existen
    await client.query(`
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS pickup_lat DOUBLE PRECISION;
    `);
    console.log('✅ pickup_lat agregada');
    
    await client.query(`
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS pickup_lng DOUBLE PRECISION;
    `);
    console.log('✅ pickup_lng agregada');
    
    await client.query(`
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS destination_lat DOUBLE PRECISION;
    `);
    console.log('✅ destination_lat agregada');
    
    await client.query(`
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS destination_lng DOUBLE PRECISION;
    `);
    console.log('✅ destination_lng agregada');
    
    console.log('🎉 Migración completada exitosamente!');
    
  } catch (error) {
    console.error('❌ Error en migración:', error.message);
  } finally {
    client.release();
    pool.end();
  }
}

addCoordsColumns();