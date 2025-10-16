const db = require('../config/database');

class DocumentModel {
  // Obtener todos los documentos de un conductor
  static getByDriverId(driverId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM driver_documents 
        WHERE driver_id = ? 
        ORDER BY uploaded_at DESC
      `;
      db.all(sql, [driverId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // Obtener todos los documentos pendientes
  static getPendingDocuments() {
    return new Promise((resolve, reject) => {
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
      db.all(sql, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // Obtener un documento por ID
  static getById(id) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM driver_documents WHERE id = ?';
      db.get(sql, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  // Crear nuevo documento
  static create(documentData) {
    return new Promise((resolve, reject) => {
      const { driver_id, document_type, document_url, document_name, expiry_date } = documentData;
      const sql = `
        INSERT INTO driver_documents 
        (driver_id, document_type, document_url, document_name, expiry_date)
        VALUES (?, ?, ?, ?, ?)
      `;
      db.run(sql, [driver_id, document_type, document_url, document_name, expiry_date], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, ...documentData });
      });
    });
  }

  // Actualizar estado del documento
  static updateStatus(id, status, reviewedBy, rejectionReason = null) {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE driver_documents 
        SET status = ?, 
            reviewed_at = CURRENT_TIMESTAMP,
            reviewed_by = ?,
            rejection_reason = ?
        WHERE id = ?
      `;
      db.run(sql, [status, reviewedBy, rejectionReason, id], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  }

  // Obtener estadísticas de documentos
  static getStats() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          status,
          COUNT(*) as count
        FROM driver_documents
        GROUP BY status
      `;
      db.all(sql, [], (err, rows) => {
        if (err) reject(err);
        else {
          const stats = {
            pending: 0,
            approved: 0,
            rejected: 0,
            total: 0
          };
          rows.forEach(row => {
            stats[row.status] = row.count;
            stats.total += row.count;
          });
          resolve(stats);
        }
      });
    });
  }
}

module.exports = DocumentModel;