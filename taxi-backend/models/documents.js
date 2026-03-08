const { db } = require('../config/database');

class DocumentModel {
  static async getByDriverId(driverId) {
    return db.getAll('SELECT * FROM driver_documents WHERE driver_id = $1 ORDER BY uploaded_at DESC', [driverId]);
  }

  static async getPendingDocuments() {
    return db.getAll(`
      SELECT dd.*, d.name as driver_name, d.email as driver_email, d.phone as driver_phone
      FROM driver_documents dd
      LEFT JOIN drivers d ON dd.driver_id = d.id
      WHERE dd.status = 'pending'
      ORDER BY dd.uploaded_at ASC
    `, []);
  }

  static async getAllDocuments() {
    return db.getAll(`
      SELECT dd.*, d.name as driver_name, d.email as driver_email, d.phone as driver_phone
      FROM driver_documents dd
      LEFT JOIN drivers d ON dd.driver_id = d.id
      ORDER BY dd.uploaded_at DESC
    `, []);
  }

  static async getById(id) {
    return db.getOne('SELECT * FROM driver_documents WHERE id = $1', [id]);
  }

  static async create(documentData) {
    const { driver_id, document_type, document_url, document_name, expiry_date } = documentData;
    return db.getOne(`
      INSERT INTO driver_documents (driver_id, document_type, document_url, document_name, expiry_date)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [driver_id, document_type, document_url, document_name, expiry_date]);
  }

  static async updateStatus(id, status, reviewedBy, rejectionReason = null) {
    return db.getOne(`
      UPDATE driver_documents
      SET status = $1, reviewed_at = CURRENT_TIMESTAMP, reviewed_by = $2, rejection_reason = $3
      WHERE id = $4
      RETURNING *
    `, [status, reviewedBy, rejectionReason, id]);
  }

  static async getStats() {
    const rows = await db.getAll('SELECT status, COUNT(*) as count FROM driver_documents GROUP BY status', []);
    const stats = { pending: 0, approved: 0, rejected: 0, total: 0 };
    rows.forEach(row => {
      stats[row.status] = parseInt(row.count);
      stats.total += parseInt(row.count);
    });
    return stats;
  }
}

module.exports = DocumentModel;