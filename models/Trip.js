const { DataTypes } = require('sequelize');
const sequelize = require('../config/database-local');

const Trip = sequelize.define('Trip', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    field: 'user_id'
  },
  driverId: {
    type: DataTypes.INTEGER,
    field: 'driver_id'
  },
  pickupLocation: {
    type: DataTypes.STRING,
    field: 'pickup_location'
  },
  destination: {
    type: DataTypes.STRING
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'pending'
  },
  price: {
    type: DataTypes.FLOAT
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
  tableName: 'trips',
  timestamps: false
});

module.exports = Trip;
