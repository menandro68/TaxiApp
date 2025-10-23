const { DataTypes } = require('sequelize');
const sequelize = require('../config/database-local');

const Session = sequelize.define('Session', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    field: 'user_id'
  },
  userType: {
    type: DataTypes.STRING,
    field: 'user_type'
  },
  token: {
    type: DataTypes.TEXT,
    unique: true
  },
  refreshToken: {
    type: DataTypes.TEXT,
    unique: true,
    field: 'refresh_token'
  },
  deviceInfo: {
    type: DataTypes.STRING,
    field: 'device_info'
  },
  ipAddress: {
    type: DataTypes.STRING,
    field: 'ip_address'
  },
  userAgent: {
    type: DataTypes.STRING,
    field: 'user_agent'
  },
  lastActivity: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'last_activity'
  },
  expiresAt: {
    type: DataTypes.DATE,
    field: 'expires_at'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
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
  tableName: 'sessions',
  timestamps: false
});

module.exports = Session;
