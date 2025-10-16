const db = require('../config/database');

class NotificationService {
    // Guardar notificación en la base de datos
    static async createNotification(userId, userType, title, message, type = 'info') {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO notifications (user_id, user_type, title, message, type)
                VALUES (?, ?, ?, ?, ?)
            `;
            
            db.run(query, [userId, userType, title, message, type], function(err) {
                if (err) {
                    console.error('Error creando notificación:', err);
                    reject(err);
                } else {
                    console.log(`📨 Notificación creada para ${userType} ${userId}`);
                    resolve({ id: this.lastID, userId, userType, title, message });
                }
            });
        });
    }
    
    // Notificar aprobación de conductor
    static async notifyDriverApproval(driverId, driverName) {
        const title = '✅ ¡Cuenta Aprobada!';
        const message = `Hola ${driverName}, tu cuenta ha sido aprobada. Ya puedes comenzar a recibir viajes.`;
        
        return await this.createNotification(driverId, 'driver', title, message, 'success');
    }
    
    // Notificar rechazo de conductor
    static async notifyDriverRejection(driverId, driverName, reason = '') {
        const title = '❌ Cuenta No Aprobada';
        const message = `Hola ${driverName}, tu cuenta no ha sido aprobada. ${reason ? 'Razón: ' + reason : 'Por favor, contacta soporte para más información.'}`;
        
        return await this.createNotification(driverId, 'driver', title, message, 'error');
    }
    
    // Obtener notificaciones de un usuario
    static async getUserNotifications(userId, userType) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT * FROM notifications 
                WHERE user_id = ? AND user_type = ?
                ORDER BY created_at DESC
                LIMIT 20
            `;
            
            db.all(query, [userId, userType], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            });
        });
    }
    
    // Marcar notificación como leída
    static async markAsRead(notificationId) {
        return new Promise((resolve, reject) => {
            db.run(
                'UPDATE notifications SET read_status = 1 WHERE id = ?',
                [notificationId],
                (err) => {
                    if (err) reject(err);
                    else resolve(true);
                }
            );
        });
    }
}

module.exports = NotificationService;