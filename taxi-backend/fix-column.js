const { Client } = require('pg');

const c = new Client('postgresql://postgres:SsZlMeDRcnTgUDDVCEbKfRajlrznnwZY@mainline.proxy.rlwy.net:25600/railway');

async function fixColumn() {
  try {
    await c.connect();
    console.log('Conectado a la base de datos...');
    
    // Eliminar columna vieja y crear nueva con tipo correcto
    await c.query('ALTER TABLE drivers DROP COLUMN IF EXISTS last_seen');
    console.log('Columna vieja eliminada...');
    
    await c.query('ALTER TABLE drivers ADD COLUMN last_seen TIMESTAMP DEFAULT NOW()');
    console.log('✅ Columna last_seen creada como TIMESTAMP');
    
    await c.end();
  } catch (e) {
    console.error('Error:', e.message);
    await c.end();
  }
}

fixColumn();