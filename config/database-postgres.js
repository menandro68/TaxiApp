const { Sequelize } = require('sequelize');
require('dotenv').config();

// Configuración PostgreSQL
const sequelize = new Sequelize(
  process.env.DB_NAME || 'taxiapp_db',
  process.env.DB_USER || 'taxiapp_user',
  process.env.DB_PASSWORD || 'TaxiApp2024!',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: console.log,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// Probar conexión
sequelize.authenticate()
  .then(() => {
    console.log('? Conexión a PostgreSQL exitosa');
  })
  .catch(err => {
    console.error('? Error conectando a PostgreSQL:', err);
  });

module.exports = sequelize;
