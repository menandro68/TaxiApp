const sequelize = require('../config/database-local');
const User = require('./User');
const Driver = require('./Driver');
const Trip = require('./Trip');
const Session = require('./Session');

// Relaciones
User.hasMany(Trip, { foreignKey: 'user_id' });
Trip.belongsTo(User, { foreignKey: 'user_id' });

Driver.hasMany(Trip, { foreignKey: 'driver_id' });
Trip.belongsTo(Driver, { foreignKey: 'driver_id' });

User.hasMany(Session, { foreignKey: 'user_id' });
Session.belongsTo(User, { foreignKey: 'user_id' });

module.exports = {
  sequelize,
  User,
  Driver,
  Trip,
  Session
};
