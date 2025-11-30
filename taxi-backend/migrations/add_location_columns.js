const { db } = require('../config/database');

const migration = {
    name: 'add_location_columns',
    
    async up() {
        console.log('🔄 Ejecutando migración: add_location_columns');
        
        try {
            // Verificar si las columnas ya existen
            const checkColumns = await db.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'drivers' 
                AND column_name IN ('current_latitude', 'current_longitude')
            `);
            
            if (checkColumns.rows.length >= 2) {
                console.log('ℹ️ Las columnas de ubicación ya existen');
                return { success: true, message: 'Columnas ya existen' };
            }
            
            // Agregar columnas
            await db.query(`
                ALTER TABLE drivers 
                ADD COLUMN IF NOT EXISTS current_latitude DECIMAL(10, 8),
                ADD COLUMN IF NOT EXISTS current_longitude DECIMAL(11, 8)
            `);
            
            console.log('✅ Columnas current_latitude y current_longitude agregadas');
            
            return { success: true, message: 'Migración ejecutada correctamente' };
            
        } catch (error) {
            console.error('❌ Error en migración:', error);
            throw error;
        }
    }
};

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