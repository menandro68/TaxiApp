const { pool } = require('../config/database');

async function addPhoneEncryptedColumn() {
  try {
    console.log('🔄 Ejecutando migración: Agregar columna phone_encrypted a tabla users...');
    
    // Agregar columna phone_encrypted si no existe
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS phone_encrypted VARCHAR(255)
    `);
    
    console.log('✅ Columna phone_encrypted agregada a tabla users exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en migración:', error);
    process.exit(1);
  }
}

addPhoneEncryptedColumn();