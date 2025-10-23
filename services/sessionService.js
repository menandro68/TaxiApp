const db = require('../config/database');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class SessionService {
  // Generar refresh token aleatorio
  static generateRefreshToken() {
    return crypto.randomBytes(40).toString('hex');
  }

  // Crear nueva sesión
  static async createSession(userId, userType, deviceInfo, ipAddress, userAgent) {
    try {
      const token = jwt.sign(
        { id: userId, type: userType },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '15m' } // Token expira en 15 minutos
      );
      
      const refreshToken = this.generateRefreshToken();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 días
      
      const result = await db.query(
        `INSERT INTO sessions (user_id, user_type, token, refresh_token, device_info, 
         ip_address, user_agent, expires_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [userId, userType, token, refreshToken, deviceInfo, ipAddress, userAgent, expiresAt]
      );

      return { token, refreshToken, sessionId: result.rows[0].id };
    } catch (error) {
      throw error;
    }
  }

  // Actualizar actividad de sesión
  static async updateActivity(token) {
    try {
      await db.query(
        `UPDATE sessions SET last_activity = CURRENT_TIMESTAMP WHERE token = $1 AND is_active = true`,
        [token]
      );
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Verificar inactividad (para expiración automática)
  static async checkInactivity(minutes = 30) {
    try {
      const inactiveTime = new Date(Date.now() - minutes * 60 * 1000);
      
      const result = await db.query(
        `UPDATE sessions SET is_active = false
         WHERE last_activity < $1 AND is_active = true
         RETURNING id`,
        [inactiveTime]
      );

      return result.rowCount;
    } catch (error) {
      throw error;
    }
  }

  // Renovar token con refresh token
  static async refreshToken(refreshToken) {
    try {
      const sessionResult = await db.query(
        `SELECT * FROM sessions WHERE refresh_token = $1 AND is_active = true`,
        [refreshToken]
      );

      if (sessionResult.rows.length === 0) {
        throw new Error('Refresh token inválido');
      }

      const session = sessionResult.rows[0];

      const newToken = jwt.sign(
        { id: session.user_id, type: session.user_type },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '15m' }
      );

      await db.query(
        `UPDATE sessions SET token = $1, last_activity = CURRENT_TIMESTAMP WHERE id = $2`,
        [newToken, session.id]
      );

      return { token: newToken, refreshToken: refreshToken };
    } catch (error) {
      throw error;
    }
  }

  // Obtener sesiones activas de un usuario
  static async getUserSessions(userId, userType) {
    try {
      const result = await db.query(
        `SELECT id, device_info, ip_address, last_activity, created_at 
         FROM sessions 
         WHERE user_id = $1 AND user_type = $2 AND is_active = true
         ORDER BY last_activity DESC`,
        [userId, userType]
      );

      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Cerrar sesión específica
  static async invalidateSession(sessionId) {
    try {
      await db.query(
        `UPDATE sessions SET is_active = false WHERE id = $1`,
        [sessionId]
      );
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Cerrar todas las sesiones de un usuario
  static async invalidateAllUserSessions(userId, userType) {
    try {
      const result = await db.query(
        `UPDATE sessions SET is_active = false WHERE user_id = $1 AND user_type = $2
         RETURNING id`,
        [userId, userType]
      );

      return result.rowCount;
    } catch (error) {
      throw error;
    }
  }

  // Verificar límite de sesiones concurrentes
  static async checkSessionLimit(userId, userType, limit = 3) {
    try {
      const result = await db.query(
        `SELECT COUNT(*) as count FROM sessions 
         WHERE user_id = $1 AND user_type = $2 AND is_active = true`,
        [userId, userType]
      );

      const count = parseInt(result.rows[0]?.count || 0, 10);
      return count < limit;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = SessionService;