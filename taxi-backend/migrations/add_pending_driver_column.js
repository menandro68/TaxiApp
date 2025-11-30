const { db } = require('../config/database');

const migration = {
    name: 'add_pending_driver_column',
    
    async up() {
        console.log('🔄 Ejecutando migración: add_pending_driver_column');
        
        try {
            await db.query(`
                ALTER TABLE trips 
                ADD COLUMN IF NOT EXISTS pending_driver_id INTEGER REFERENCES drivers(id)
            `);
            
            console.log('✅ Columna pending_driver_id agregada a trips');
            
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