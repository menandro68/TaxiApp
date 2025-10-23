const { Sequelize } = require('sequelize');
const path = require('path');

// Configuración Sequelize + SQLite (para desarrollo local)
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../taxiapp.db'),
  logging: false
});

// Probar conexión
sequelize.authenticate()
  .then(() => {
    console.log('? Conexión a SQLite exitosa');
  })
  .catch(err => {
    console.error('? Error conectando a SQLite:', err);
  });

module.exports = sequelize;
