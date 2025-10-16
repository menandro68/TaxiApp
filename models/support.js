const db = require('../config/database');

class SupportModel {
  // Crear nuevo ticket
  static createTicket(userId, userType, subject, category, message) {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO support_tickets (user_id, user_type, subject, category, status) 
         VALUES (?, ?, ?, ?, 'open')`,
        [userId, userType, subject, category],
        function(err) {
          if (err) return reject(err);
          
          const ticketId = this.lastID;
          
          // Crear el primer mensaje
          db.run(
            `INSERT INTO support_messages (ticket_id, sender_id, sender_type, message) 
             VALUES (?, ?, ?, ?)`,
            [ticketId, userId, userType, message],
            (msgErr) => {
              if (msgErr) return reject(msgErr);
              resolve({ ticketId, message: 'Ticket creado exitosamente' });
            }
          );
        }
      );
    });
  }

  // Obtener todos los tickets
  static getAllTickets() {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          t.*,
          CASE 
            WHEN t.user_type = 'driver' THEN d.name 
            ELSE u.name 
          END as user_name,
          (SELECT COUNT(*) FROM support_messages WHERE ticket_id = t.id AND is_read = 0 AND sender_type != 'admin') as unread_count
        FROM support_tickets t
        LEFT JOIN drivers d ON t.user_type = 'driver' AND t.user_id = d.id
        LEFT JOIN users u ON t.user_type = 'user' AND t.user_id = u.id
        ORDER BY 
          CASE WHEN t.status = 'open' THEN 0 ELSE 1 END,
          t.created_at DESC
      `;
      
      db.all(query, [], (err, tickets) => {
        if (err) reject(err);
        else resolve(tickets || []);
      });
    });
  }

  // Obtener mensajes de un ticket
  static getTicketMessages(ticketId) {
    return new Promise((resolve, reject) => {
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
        WHERE m.ticket_id = ?
        ORDER BY m.created_at ASC
      `;
      
      db.all(query, [ticketId], (err, messages) => {
        if (err) reject(err);
        else resolve(messages || []);
      });
    });
  }

  // Enviar mensaje como admin
  static sendAdminMessage(ticketId, message, adminId = 1) {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO support_messages (ticket_id, sender_id, sender_type, message) 
         VALUES (?, ?, 'admin', ?)`,
        [ticketId, adminId, message],
        function(err) {
          if (err) reject(err);
          else {
            // Actualizar fecha de actualización del ticket
            db.run(
              'UPDATE support_tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
              [ticketId]
            );
            resolve({ messageId: this.lastID });
          }
        }
      );
    });
  }

  // Cambiar estado del ticket
  static updateTicketStatus(ticketId, status) {
    return new Promise((resolve, reject) => {
      const closedAt = status === 'closed' ? 'CURRENT_TIMESTAMP' : 'NULL';
      db.run(
        `UPDATE support_tickets 
         SET status = ?, updated_at = CURRENT_TIMESTAMP, closed_at = ${closedAt}
         WHERE id = ?`,
        [status, ticketId],
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
  }

  // Marcar mensajes como leídos
  static markMessagesAsRead(ticketId) {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE support_messages 
         SET is_read = 1 
         WHERE ticket_id = ? AND sender_type != 'admin'`,
        [ticketId],
        function(err) {
          if (err) reject(err);
          else resolve({ updated: this.changes });
        }
      );
    });
  }

  // Obtener estadísticas
  static getStats() {
    return new Promise((resolve, reject) => {
      const stats = {};
      
      db.get('SELECT COUNT(*) as total FROM support_tickets', (err, row) => {
        stats.total = row ? row.total : 0;
        
        db.get('SELECT COUNT(*) as open FROM support_tickets WHERE status = "open"', (err, row) => {
          stats.open = row ? row.open : 0;
          
          db.get('SELECT COUNT(*) as closed FROM support_tickets WHERE status = "closed"', (err, row) => {
            stats.closed = row ? row.closed : 0;
            
            db.get('SELECT COUNT(*) as unread FROM support_messages WHERE is_read = 0 AND sender_type != "admin"', (err, row) => {
              stats.unread = row ? row.unread : 0;
              resolve(stats);
            });
          });
        });
      });
    });
  }
}

module.exports = SupportModel;