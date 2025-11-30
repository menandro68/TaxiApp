/**
 * Migración: Agregar columna fcm_token a tabla drivers
 * Fecha: 2025-11-30
 * Descripción: Permite almacenar tokens de Firebase Cloud Messaging para notificaciones push
 */

const { db } = require('../config/database');

const migration = {
    name: 'add_fcm_token_column',
    
    async up() {
        console.log('🔄 Ejecutando migración: add_fcm_token_column');
        
        try {
            // Verificar si la columna ya existe
            const checkColumn = await db.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'drivers' AND column_name = 'fcm_token'
            `);
            
            if (checkColumn.rows.length > 0) {
                console.log('ℹ️ La columna fcm_token ya existe en la tabla drivers');
                return { success: true, message: 'Columna ya existe' };
            }
            
            // Agregar columna fcm_token
            await db.query(`
                ALTER TABLE drivers 
                ADD COLUMN fcm_token VARCHAR(500) NULL
            `);
            
            console.log('✅ Columna fcm_token agregada exitosamente a la tabla drivers');
            
            // Crear índice para búsquedas rápidas por token
            await db.query(`
                CREATE INDEX IF NOT EXISTS idx_drivers_fcm_token 
                ON drivers(fcm_token) 
                WHERE fcm_token IS NOT NULL
            `);
            
            console.log('✅ Índice idx_drivers_fcm_token creado');
            
            // Registrar migración en tabla de control (si existe)
            try {
                await db.query(`
                    CREATE TABLE IF NOT EXISTS migrations (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(255) UNIQUE NOT NULL,
                        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                `);
                
                await db.query(`
                    INSERT INTO migrations (name) VALUES ($1)
                    ON CONFLICT (name) DO NOTHING
                `, ['add_fcm_token_column']);
                
                console.log('✅ Migración registrada en tabla de control');
            } catch (err) {
                console.log('ℹ️ No se pudo registrar en tabla de migraciones:', err.message);
            }
            
            return { success: true, message: 'Migración ejecutada correctamente' };
            
        } catch (error) {
            console.error('❌ Error en migración:', error);
            throw error;
        }
    },
    
    async down() {
        console.log('🔄 Revirtiendo migración: add_fcm_token_column');
        
        try {
            await db.query(`
                ALTER TABLE drivers 
                DROP COLUMN IF EXISTS fcm_token
            `);
            
            await db.query(`
                DROP INDEX IF EXISTS idx_drivers_fcm_token
            `);
            
            await db.query(`
                DELETE FROM migrations WHERE name = $1
            `, ['add_fcm_token_column']);
            
            console.log('✅ Migración revertida correctamente');
            return { success: true, message: 'Migración revertida' };
            
        } catch (error) {
            console.error('❌ Error revirtiendo migración:', error);
            throw error;
        }
    }
};

// Ejecutar si se llama directamente
if (require.main === module) {
    migration.up()
        .then(result => {
            console.log('📋 Resultado:', result);
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Error fatal:', error);
            process.exit(1);
        });
}

module.exports = migration;