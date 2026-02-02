const { db } = require('../config/database');

const migration = {
    name: 'add_vehicle_type_column',
    
    async up() {
        console.log('🔄 Ejecutando migración: add_vehicle_type_column');
        
        try {
            await db.query(`
                ALTER TABLE drivers 
                ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(20) DEFAULT 'car'
            `);
            
            console.log('✅ Columna vehicle_type agregada a drivers');
            
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