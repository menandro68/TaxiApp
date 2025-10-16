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
    const token = jwt.sign(
      { id: userId, type: userType },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '15m' } // Token expira en 15 minutos
    );
    
    const refreshToken = this.generateRefreshToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 días
    
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO sessions (user_id, user_type, token, refresh_token, device_info, 
         ip_address, user_agent, expires_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, userType, token, refreshToken, deviceInfo, ipAddress, userAgent, expiresAt],
        function(err) {
          if (err) reject(err);
          else resolve({ token, refreshToken, sessionId: this.lastID });
        }
      );
    });
  }

  // Actualizar actividad de sesión
  static async updateActivity(token) {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE sessions SET last_activity = CURRENT_TIMESTAMP WHERE token = ? AND is_active = 1`,
        [token],
        (err) => {
          if (err) reject(err);
          else resolve(true);
        }
      );
    });
  }

  // Verificar inactividad (para expiración automática)
  static async checkInactivity(minutes = 30) {
    const inactiveTime = new Date(Date.now() - minutes * 60 * 1000);
    
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE sessions SET is_active = 0 
         WHERE last_activity < ? AND is_active = 1`,
        [inactiveTime],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  }

  // Renovar token con refresh token
  static async refreshToken(refreshToken) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM sessions WHERE refresh_token = ? AND is_active = 1`,
        [refreshToken],
        (err, session) => {
          if (err) return reject(err);
          if (!session) return reject(new Error('Refresh token inválido'));
          
          const newToken = jwt.sign(
            { id: session.user_id, type: session.user_type },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '15m' }
          );
          
          db.run(
            `UPDATE sessions SET token = ?, last_activity = CURRENT_TIMESTAMP WHERE id = ?`,
            [newToken, session.id],
            (err) => {
              if (err) reject(err);
              else resolve({ token: newToken, refreshToken: refreshToken });
            }
          );
        }
      );
    });
  }

  // Obtener sesiones activas de un usuario
  static async getUserSessions(userId, userType) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT id, device_info, ip_address, last_activity, created_at 
         FROM sessions 
         WHERE user_id = ? AND user_type = ? AND is_active = 1
         ORDER BY last_activity DESC`,
        [userId, userType],
        (err, sessions) => {
          if (err) reject(err);
          else resolve(sessions);
        }
      );
    });
  }

  // Cerrar sesión específica
  static async invalidateSession(sessionId) {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE sessions SET is_active = 0 WHERE id = ?`,
        [sessionId],
        (err) => {
          if (err) reject(err);
          else resolve(true);
        }
      );
    });
  }

  // Cerrar todas las sesiones de un usuario
  static async invalidateAllUserSessions(userId, userType) {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE sessions SET is_active = 0 WHERE user_id = ? AND user_type = ?`,
        [userId, userType],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  }

  // Verificar límite de sesiones concurrentes
  static async checkSessionLimit(userId, userType, limit = 3) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT COUNT(*) as count FROM sessions 
         WHERE user_id = ? AND user_type = ? AND is_active = 1`,
        [userId, userType],
        (err, result) => {
          if (err) reject(err);
          else resolve(result.count < limit);
        }
      );
    });
  }
}

module.exports = SessionService;