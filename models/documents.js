const db = require('../config/database');

class DocumentModel {
  // Obtener todos los documentos de un conductor
  static async getByDriverId(driverId) {
    try {
      const sql = `
        SELECT * FROM driver_documents 
        WHERE driver_id = $1 
        ORDER BY uploaded_at DESC
      `;
      const result = await db.query(sql, [driverId]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Obtener todos los documentos pendientes
  static async getPendingDocuments() {
    try {
      const sql = `
        SELECT 
          dd.*,
          d.name as driver_name,
          d.email as driver_email,
          d.phone as driver_phone
        FROM driver_documents dd
        LEFT JOIN drivers d ON dd.driver_id = d.id
        WHERE dd.status = 'pending'
        ORDER BY dd.uploaded_at ASC
      `;
      const result = await db.query(sql);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Obtener un documento por ID
  static async getById(id) {
    try {
      const sql = 'SELECT * FROM driver_documents WHERE id = $1';
      const result = await db.query(sql, [id]);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Crear nuevo documento
  static async create(documentData) {
    try {
      const { driver_id, document_type, document_url, document_name, expiry_date } = documentData;
      const sql = `
        INSERT INTO driver_documents 
        (driver_id, document_type, document_url, document_name, expiry_date)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `;
      const result = await db.query(sql, [driver_id, document_type, document_url, document_name, expiry_date]);
      return { id: result.rows[0].id, ...documentData };
    } catch (error) {
      throw error;
    }
  }

  // Actualizar estado del documento
  static async updateStatus(id, status, reviewedBy, rejectionReason = null) {
    try {
      const sql = `
        UPDATE driver_documents 
        SET status = $1, 
            reviewed_at = CURRENT_TIMESTAMP,
            reviewed_by = $2,
            rejection_reason = $3
        WHERE id = $4
        RETURNING id
      `;
      const result = await db.query(sql, [status, reviewedBy, rejectionReason, id]);
      return { rows: result.rows, rowCount: result.rowCount };
    } catch (error) {
      throw error;
    }
  }

  // Obtener estadísticas de documentos
  static async getStats() {
    try {
      const sql = `
        SELECT 
          status,
          COUNT(*) as count
        FROM driver_documents
        GROUP BY status
      `;
      const result = await db.query(sql);
      const stats = {
        pending: 0,
        approved: 0,
        rejected: 0,
        total: 0
      };
      result.rows.forEach(row => {
        stats[row.status] = parseInt(row.count, 10);
        stats.total += parseInt(row.count, 10);
      });
      return stats;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = DocumentModel;