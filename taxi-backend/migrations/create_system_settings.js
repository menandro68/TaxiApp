// ========================================
// MIGRACIÓN: Crear tabla system_settings
// ========================================
const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false }
});

async function createSystemSettingsTable() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Creando tabla system_settings...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id SERIAL PRIMARY KEY,
        category VARCHAR(50) NOT NULL,
        setting_key VARCHAR(100) NOT NULL,
        setting_value TEXT,
        setting_type VARCHAR(20) DEFAULT 'string',
        description VARCHAR(255),
        is_editable BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(category, setting_key)
      )
    `);
    
    console.log('✅ Tabla system_settings creada');
    
    // Insertar configuraciones por defecto
    console.log('📝 Insertando configuraciones por defecto...');
    
    const defaultSettings = [
      // Configuración General
      ['general', 'app_name', 'TaxiApp Rondon', 'string', 'Nombre de la aplicación'],
      ['general', 'company_name', 'TaxiApp Rondon SRL', 'string', 'Nombre de la empresa'],
      ['general', 'support_email', 'soporte@taxiapp.com', 'string', 'Email de soporte'],
      ['general', 'support_phone', '+1 809 555 0100', 'string', 'Teléfono de soporte'],
      ['general', 'currency', 'RD$', 'string', 'Moneda'],
      ['general', 'timezone', 'America/Santo_Domingo', 'string', 'Zona horaria'],
      
      // Configuración de Tarifas
      ['pricing', 'base_fare', '50', 'number', 'Tarifa base (RD$)'],
      ['pricing', 'price_per_km', '25', 'number', 'Precio por kilómetro (RD$)'],
      ['pricing', 'price_per_minute', '3', 'number', 'Precio por minuto (RD$)'],
      ['pricing', 'minimum_fare', '80', 'number', 'Tarifa mínima (RD$)'],
      ['pricing', 'cancellation_fee', '50', 'number', 'Cargo por cancelación (RD$)'],
      ['pricing', 'surge_multiplier_max', '3.0', 'number', 'Multiplicador máximo de surge'],
      
      // Configuración de Conductores
      ['drivers', 'commission_percentage', '15', 'number', 'Comisión de la plataforma (%)'],
      ['drivers', 'max_radius_km', '10', 'number', 'Radio máximo de búsqueda (km)'],
      ['drivers', 'auto_assign_enabled', 'true', 'boolean', 'Asignación automática habilitada'],
      ['drivers', 'required_documents', 'license,insurance,registration', 'string', 'Documentos requeridos'],
      ['drivers', 'min_rating_active', '3.5', 'number', 'Rating mínimo para estar activo'],
      
      // Configuración de Viajes
      ['trips', 'max_wait_time_minutes', '10', 'number', 'Tiempo máximo de espera (min)'],
      ['trips', 'free_wait_time_minutes', '5', 'number', 'Tiempo de espera gratuito (min)'],
      ['trips', 'max_destinations', '3', 'number', 'Máximo de destinos por viaje'],
      ['trips', 'allow_cash_payment', 'true', 'boolean', 'Permitir pago en efectivo'],
      ['trips', 'allow_card_payment', 'true', 'boolean', 'Permitir pago con tarjeta'],
      
      // Configuración de Notificaciones
      ['notifications', 'push_enabled', 'true', 'boolean', 'Notificaciones push habilitadas'],
      ['notifications', 'sms_enabled', 'false', 'boolean', 'Notificaciones SMS habilitadas'],
      ['notifications', 'email_enabled', 'true', 'boolean', 'Notificaciones email habilitadas'],
      
      // Configuración del Sistema
      ['system', 'maintenance_mode', 'false', 'boolean', 'Modo mantenimiento'],
      ['system', 'api_version', '1.0.0', 'string', 'Versión del API'],
      ['system', 'min_app_version', '1.0.0', 'string', 'Versión mínima de la app']
    ];
    
    for (const setting of defaultSettings) {
      await client.query(`
        INSERT INTO system_settings (category, setting_key, setting_value, setting_type, description)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (category, setting_key) DO NOTHING
      `, setting);
    }
    
    console.log('✅ Configuraciones por defecto insertadas');
    console.log('🎉 Migración completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error en migración:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createSystemSettingsTable();