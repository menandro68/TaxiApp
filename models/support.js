const db = require('../config/database');

class SupportModel {
  // Crear nuevo ticket
  static async createTicket(userId, userType, subject, category, message) {
    try {
      // Iniciar transacción
      await db.query('BEGIN');
      
      // Crear ticket
      const ticketResult = await db.query(
        `INSERT INTO support_tickets (user_id, user_type, subject, category, status) 
         VALUES ($1, $2, $3, $4, 'open')
         RETURNING id`,
        [userId, userType, subject, category]
      );
      
      const ticketId = ticketResult.rows[0].id;
      
      // Crear el primer mensaje
      await db.query(
        `INSERT INTO support_messages (ticket_id, sender_id, sender_type, message) 
         VALUES ($1, $2, $3, $4)`,
        [ticketId, userId, userType, message]
      );
      
      // Confirmar transacción
      await db.query('COMMIT');
      
      return { ticketId, message: 'Ticket creado exitosamente' };
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  }

  // Obtener todos los tickets
  static async getAllTickets() {
    try {
      const query = `
        SELECT 
          t.*,
          CASE 
            WHEN t.user_type = 'driver' THEN d.name 
            ELSE u.name 
          END as user_name,
          (SELECT COUNT(*) FROM support_messages WHERE ticket_id = t.id AND is_read = false AND sender_type != 'admin') as unread_count
        FROM support_tickets t
        LEFT JOIN drivers d ON t.user_type = 'driver' AND t.user_id = d.id
        LEFT JOIN users u ON t.user_type = 'user' AND t.user_id = u.id
        ORDER BY 
          CASE WHEN t.status = 'open' THEN 0 ELSE 1 END,
          t.created_at DESC
      `;
      
      const result = await db.query(query);
      return result.rows || [];
    } catch (error) {
      throw error;
    }
  }

  // Obtener mensajes de un ticket
  static async getTicketMessages(ticketId) {
    try {
      const query = `
        SELECT 
          m.*,
          CASE 
            WHEN m.sender_type = 'admin' THEN 'Soporte'
            WHEN m.sender_type = 'driver' THEN d.name 
            ELSE u.name 
          END as sender_name
        FROM support_messages m
        LEFT JOIN drivers d ON m.sender_type = 'driver' AND m.sender_id = d.id
        LEFT JOIN users u ON m.sender_type = 'user' AND m.sender_id = u.id
        WHERE m.ticket_id = $1
        ORDER BY m.created_at ASC
      `;
      
      const result = await db.query(query, [ticketId]);
      return result.rows || [];
    } catch (error) {
      throw error;
    }
  }

  // Enviar mensaje como admin
  static async sendAdminMessage(ticketId, message, adminId = 1) {
    try {
      const messageResult = await db.query(
        `INSERT INTO support_messages (ticket_id, sender_id, sender_type, message) 
         VALUES ($1, $2, 'admin', $3)
         RETURNING id`,
        [ticketId, adminId, message]
      );
      
      // Actualizar fecha de actualización del ticket
      await db.query(
        'UPDATE support_tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [ticketId]
      );
      
      return { messageId: messageResult.rows[0].id };
    } catch (error) {
      throw error;
    }
  }

  // Cambiar estado del ticket
  static async updateTicketStatus(ticketId, status) {
    try {
      const closedAt = status === 'closed' ? 'CURRENT_TIMESTAMP' : null;
      const result = await db.query(
        `UPDATE support_tickets 
         SET status = $1, updated_at = CURRENT_TIMESTAMP, closed_at = $2
         WHERE id = $3
         RETURNING id`,
        [status, closedAt, ticketId]
      );
      
      return { rows: result.rows, rowCount: result.rowCount };
    } catch (error) {
      throw error;
    }
  }

  // Marcar mensajes como leídos
  static async markMessagesAsRead(ticketId) {
    try {
      const result = await db.query(
        `UPDATE support_messages 
         SET is_read = true
         WHERE ticket_id = $1 AND sender_type != 'admin'
         RETURNING id`,
        [ticketId]
      );
      
      return { updated: result.rowCount };
    } catch (error) {
      throw error;
    }
  }

  // Obtener estadísticas
  static async getStats() {
    try {
      const stats = {};
      
      // Total de tickets
      const totalResult = await db.query('SELECT COUNT(*) as total FROM support_tickets');
      stats.total = parseInt(totalResult.rows[0]?.total || 0, 10);
      
      // Tickets abiertos
      const openResult = await db.query('SELECT COUNT(*) as open FROM support_tickets WHERE status = $1', ['open']);
      stats.open = parseInt(openResult.rows[0]?.open || 0, 10);
      
      // Tickets cerrados
      const closedResult = await db.query('SELECT COUNT(*) as closed FROM support_tickets WHERE status = $1', ['closed']);
      stats.closed = parseInt(closedResult.rows[0]?.closed || 0, 10);
      
      // Mensajes no leídos
      const unreadResult = await db.query(
        'SELECT COUNT(*) as unread FROM support_messages WHERE is_read = false AND sender_type != $1',
        ['admin']
      );
      stats.unread = parseInt(unreadResult.rows[0]?.unread || 0, 10);
      
      return stats;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = SupportModel;