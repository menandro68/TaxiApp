const db = require('../config/database');

class NotificationService {
    // Guardar notificación en la base de datos
    static async createNotification(userId, userType, title, message, type = 'info') {
        try {
            const query = `
                INSERT INTO notifications (user_id, user_type, title, message, type)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id
            `;
            
            const result = await db.query(query, [userId, userType, title, message, type]);
            console.log(`📨 Notificación creada para ${userType} ${userId}`);
            
            return { 
                id: result.rows[0].id, 
                userId, 
                userType, 
                title, 
                message 
            };
        } catch (error) {
            console.error('Error creando notificación:', error);
            throw error;
        }
    }
    
    // Notificar aprobación de conductor
    static async notifyDriverApproval(driverId, driverName) {
        try {
            const title = '✅ ¡Cuenta Aprobada!';
            const message = `Hola ${driverName}, tu cuenta ha sido aprobada. Ya puedes comenzar a recibir viajes.`;
            
            return await this.createNotification(driverId, 'driver', title, message, 'success');
        } catch (error) {
            throw error;
        }
    }
    
    // Notificar rechazo de conductor
    static async notifyDriverRejection(driverId, driverName, reason = '') {
        try {
            const title = '❌ Cuenta No Aprobada';
            const message = `Hola ${driverName}, tu cuenta no ha sido aprobada. ${reason ? 'Razón: ' + reason : 'Por favor, contacta soporte para más información.'}`;
            
            return await this.createNotification(driverId, 'driver', title, message, 'error');
        } catch (error) {
            throw error;
        }
    }
    
    // Obtener notificaciones de un usuario
    static async getUserNotifications(userId, userType) {
        try {
            const query = `
                SELECT * FROM notifications 
                WHERE user_id = $1 AND user_type = $2
                ORDER BY created_at DESC
                LIMIT 20
            `;
            
            const result = await db.query(query, [userId, userType]);
            return result.rows || [];
        } catch (error) {
            throw error;
        }
    }
    
    // Marcar notificación como leída
    static async markAsRead(notificationId) {
        try {
            await db.query(
                'UPDATE notifications SET read_status = true WHERE id = $1',
                [notificationId]
            );
            return true;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = NotificationService;