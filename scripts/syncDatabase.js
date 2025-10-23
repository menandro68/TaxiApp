const { sequelize, User, Driver, Trip, Session } = require('../models');

async function syncDatabase() {
  try {
    console.log('?? Sincronizando base de datos PostgreSQL...');
    
    // Sincronizar modelos con la BD
    await sequelize.sync({ alter: true });
    
    console.log('? Base de datos sincronizada exitosamente');
    console.log('?? Tablas creadas/actualizadas:');
    console.log('   - users');
    console.log('   - drivers');
    console.log('   - trips');
    console.log('   - sessions');
    
    process.exit(0);
  } catch (error) {
    console.error('? Error sincronizando base de datos:', error);
    process.exit(1);
  }
}

syncDatabase();
