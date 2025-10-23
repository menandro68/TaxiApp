const { Sequelize } = require('sequelize');
const path = require('path');

// Configuraci�n Sequelize + SQLite (para desarrollo local)
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../taxiapp.db'),
  logging: false
});

// Probar conexi�n
sequelize.authenticate()
  .then(() => {
    console.log('? Conexi�n a SQLite exitosa');
  })
  .catch(err => {
    console.error('? Error conectando a SQLite:', err);
  });

module.exports = sequelize;
