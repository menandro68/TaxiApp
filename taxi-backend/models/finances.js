const db = require('../config/database');

class FinanceModel {
  // Obtener configuración de comisión
  static getCommissionConfig() {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM commission_config WHERE active = 1 LIMIT 1', (err, row) => {
        if (err) reject(err);
        else resolve(row || { commission_percentage: 10.00 });
      });
    });
  }

  // Actualizar porcentaje de comisión
  static updateCommissionPercentage(percentage) {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE commission_config SET commission_percentage = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
        [percentage],
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
  }

  // Registrar transacción financiera cuando se completa un viaje
  static async recordTransaction(tripId, driverId, tripAmount) {
    const config = await this.getCommissionConfig();
    const commissionPercentage = config.commission_percentage;
    const commissionAmount = (tripAmount * commissionPercentage / 100).toFixed(2);
    const driverEarnings = (tripAmount - commissionAmount).toFixed(2);

    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO financial_transactions 
         (trip_id, driver_id, trip_amount, commission_percentage, commission_amount, driver_earnings) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [tripId, driverId, tripAmount, commissionPercentage, commissionAmount, driverEarnings],
        async function(err) {
          if (err) return reject(err);
          
          // Actualizar balance del conductor
          await FinanceModel.updateDriverBalance(driverId, driverEarnings, commissionAmount);
          
          resolve({
            transactionId: this.lastID,
            tripAmount,
            commissionAmount,
            driverEarnings,
            commissionPercentage
          });
        }
      );
    });
  }

  // Actualizar balance del conductor
  static updateDriverBalance(driverId, earnings, commission) {
    return new Promise((resolve, reject) => {
      // Primero verificar si existe el balance
      db.get('SELECT * FROM driver_balances WHERE driver_id = ?', [driverId], (err, balance) => {
        if (err) return reject(err);
        
        if (balance) {
          // Actualizar balance existente
          db.run(
            `UPDATE driver_balances SET 
             total_earnings = total_earnings + ?,
             total_commission_paid = total_commission_paid + ?,
             pending_payment = pending_payment + ?,
             available_balance = available_balance + ?,
             updated_at = CURRENT_TIMESTAMP
             WHERE driver_id = ?`,
            [earnings, commission, commission, earnings, driverId],
            (err) => {
              if (err) reject(err);
              else resolve({ updated: true });
            }
          );
        } else {
          // Crear nuevo balance
          db.run(
            `INSERT INTO driver_balances 
             (driver_id, total_earnings, total_commission_paid, pending_payment, available_balance)
             VALUES (?, ?, ?, ?, ?)`,
            [driverId, earnings, commission, commission, earnings],
            (err) => {
              if (err) reject(err);
              else resolve({ created: true });
            }
          );
        }
      });
    });
  }

  // Obtener resumen financiero
  static getFinancialSummary() {
    return new Promise((resolve, reject) => {
      const summary = {};
      
      // Total de ingresos
      db.get('SELECT SUM(trip_amount) as total_revenue FROM financial_transactions', (err, row) => {
        summary.totalRevenue = row ? row.total_revenue || 0 : 0;
        
        // Total de comisiones
        db.get('SELECT SUM(commission_amount) as total_commission FROM financial_transactions', (err, row) => {
          summary.totalCommission = row ? row.total_commission || 0 : 0;
          
          // Total pagado a conductores
          db.get('SELECT SUM(driver_earnings) as total_driver_earnings FROM financial_transactions', (err, row) => {
            summary.totalDriverEarnings = row ? row.total_driver_earnings || 0 : 0;
            
            // Comisiones pendientes de pago
            db.get('SELECT SUM(pending_payment) as pending FROM driver_balances', (err, row) => {
              summary.pendingCommissions = row ? row.pending || 0 : 0;
              
              resolve(summary);
            });
          });
        });
      });
    });
  }

  // Obtener transacciones con filtros
  static getTransactions(filters = {}) {
    return new Promise((resolve, reject) => {
      let query = `
        SELECT 
          ft.*,
          d.name as driver_name,
          d.phone as driver_phone,
          t.pickup_location,
          t.destination
        FROM financial_transactions ft
        LEFT JOIN drivers d ON ft.driver_id = d.id
        LEFT JOIN trips t ON ft.trip_id = t.id
        WHERE 1=1
      `;
      
      const params = [];
      
      if (filters.driverId) {
        query += ' AND ft.driver_id = ?';
        params.push(filters.driverId);
      }
      
      if (filters.status) {
        query += ' AND ft.status = ?';
        params.push(filters.status);
      }
      
      if (filters.dateFrom) {
        query += ' AND DATE(ft.created_at) >= DATE(?)';
        params.push(filters.dateFrom);
      }
      
      if (filters.dateTo) {
        query += ' AND DATE(ft.created_at) <= DATE(?)';
        params.push(filters.dateTo);
      }
      
      query += ' ORDER BY ft.created_at DESC';
      
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  // Obtener balance de un conductor
  static getDriverBalance(driverId) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT 
          db.*,
          d.name as driver_name,
          d.phone as driver_phone
         FROM driver_balances db
         LEFT JOIN drivers d ON db.driver_id = d.id
         WHERE db.driver_id = ?`,
        [driverId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  // Obtener todos los balances
  static getAllBalances() {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT 
          db.*,
          d.name as driver_name,
          d.phone as driver_phone,
          d.vehicle_model
         FROM driver_balances db
         LEFT JOIN drivers d ON db.driver_id = d.id
         ORDER BY db.pending_payment DESC`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  // Procesar pago de comisión
  static processCommissionPayment(driverId, amount) {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE driver_balances 
         SET pending_payment = pending_payment - ?,
             last_payment_date = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE driver_id = ? AND pending_payment >= ?`,
        [amount, driverId, amount],
        function(err) {
          if (err) reject(err);
          else if (this.changes === 0) {
            reject(new Error('Saldo insuficiente o conductor no encontrado'));
          } else {
            resolve({ success: true, amountPaid: amount });
          }
        }
      );
    });
  }
}

module.exports = FinanceModel;