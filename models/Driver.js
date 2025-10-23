const { DataTypes } = require('sequelize');
const sequelize = require('../config/database-local');

const Driver = sequelize.define('Driver', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  license: {
    type: DataTypes.STRING,
    allowNull: false
  },
  vehiclePlate: {
    type: DataTypes.STRING,
    field: 'vehicle_plate'
  },
  vehicleModel: {
    type: DataTypes.STRING,
    field: 'vehicle_model'
  },
  vehicleColor: {
    type: DataTypes.STRING,
    field: 'vehicle_color'
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'inactive'
  },
  rating: {
    type: DataTypes.FLOAT,
    defaultValue: 5.0
  },
  totalTrips: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'total_trips'
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'drivers',
  timestamps: false
});

module.exports = Driver;
