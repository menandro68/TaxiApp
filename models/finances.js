const db = require('../config/database');

class FinanceModel {
  // Obtener configuración de comisión
  static async getCommissionConfig() {
    try {
      const result = await db.query('SELECT * FROM commission_config WHERE active = true LIMIT 1');
      return result.rows[0] || { commission_percentage: 10.00 };
    } catch (error) {
      throw error;
    }
  }

  // Actualizar porcentaje de comisión
  static async updateCommissionPercentage(percentage) {
    try {
      const result = await db.query(
        'UPDATE commission_config SET commission_percentage = $1, updated_at = CURRENT_TIMESTAMP WHERE id = 1 RETURNING id',
        [percentage]
      );
      return { rows: result.rows, rowCount: result.rowCount };
    } catch (error) {
      throw error;
    }
  }

  // Registrar transacción financiera cuando se completa un viaje
  static async recordTransaction(tripId, driverId, tripAmount) {
    try {
      const config = await this.getCommissionConfig();
      const commissionPercentage = config.commission_percentage;
      const commissionAmount = (tripAmount * commissionPercentage / 100).toFixed(2);
      const driverEarnings = (tripAmount - commissionAmount).toFixed(2);

      const result = await db.query(
        `INSERT INTO financial_transactions 
         (trip_id, driver_id, trip_amount, commission_percentage, commission_amount, driver_earnings) 
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [tripId, driverId, tripAmount, commissionPercentage, commissionAmount, driverEarnings]
      );

      const transactionId = result.rows[0].id;

      // Actualizar balance del conductor
      await this.updateDriverBalance(driverId, driverEarnings, commissionAmount);

      return {
        transactionId,
        tripAmount,
        commissionAmount,
        driverEarnings,
        commissionPercentage
      };
    } catch (error) {
      throw error;
    }
  }

  // Actualizar balance del conductor
  static async updateDriverBalance(driverId, earnings, commission) {
    try {
      // Primero verificar si existe el balance
      const balanceResult = await db.query('SELECT * FROM driver_balances WHERE driver_id = $1', [driverId]);
      const balance = balanceResult.rows[0];

      if (balance) {
        // Actualizar balance existente
        await db.query(
          `UPDATE driver_balances SET 
           total_earnings = total_earnings + $1,
           total_commission_paid = total_commission_paid + $2,
           pending_payment = pending_payment + $3,
           available_balance = available_balance + $4,
           updated_at = CURRENT_TIMESTAMP
           WHERE driver_id = $5`,
          [earnings, commission, commission, earnings, driverId]
        );
        return { updated: true };
      } else {
        // Crear nuevo balance
        await db.query(
          `INSERT INTO driver_balances 
           (driver_id, total_earnings, total_commission_paid, pending_payment, available_balance)
           VALUES ($1, $2, $3, $4, $5)`,
          [driverId, earnings, commission, commission, earnings]
        );
        return { created: true };
      }
    } catch (error) {
      throw error;
    }
  }

  // Obtener resumen financiero
  static async getFinancialSummary() {
    try {
      const summary = {};

      // Total de ingresos
      const revenueResult = await db.query('SELECT SUM(trip_amount) as total_revenue FROM financial_transactions');
      summary.totalRevenue = parseFloat(revenueResult.rows[0]?.total_revenue || 0);

      // Total de comisiones
      const commissionResult = await db.query('SELECT SUM(commission_amount) as total_commission FROM financial_transactions');
      summary.totalCommission = parseFloat(commissionResult.rows[0]?.total_commission || 0);

      // Total pagado a conductores
      const driverEarningsResult = await db.query('SELECT SUM(driver_earnings) as total_driver_earnings FROM financial_transactions');
      summary.totalDriverEarnings = parseFloat(driverEarningsResult.rows[0]?.total_driver_earnings || 0);

      // Comisiones pendientes de pago
      const pendingResult = await db.query('SELECT SUM(pending_payment) as pending FROM driver_balances');
      summary.pendingCommissions = parseFloat(pendingResult.rows[0]?.pending || 0);

      return summary;
    } catch (error) {
      throw error;
    }
  }

  // Obtener transacciones con filtros
  static async getTransactions(filters = {}) {
    try {
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
      let paramIndex = 1;

      if (filters.driverId) {
        query += ` AND ft.driver_id = $${paramIndex}`;
        params.push(filters.driverId);
        paramIndex++;
      }

      if (filters.status) {
        query += ` AND ft.status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      if (filters.dateFrom) {
        query += ` AND DATE(ft.created_at) >= DATE($${paramIndex})`;
        params.push(filters.dateFrom);
        paramIndex++;
      }

      if (filters.dateTo) {
        query += ` AND DATE(ft.created_at) <= DATE($${paramIndex})`;
        params.push(filters.dateTo);
        paramIndex++;
      }

      query += ' ORDER BY ft.created_at DESC';

      const result = await db.query(query, params);
      return result.rows || [];
    } catch (error) {
      throw error;
    }
  }

  // Obtener balance de un conductor
  static async getDriverBalance(driverId) {
    try {
      const result = await db.query(
        `SELECT 
          db.*,
          d.name as driver_name,
          d.phone as driver_phone
         FROM driver_balances db
         LEFT JOIN drivers d ON db.driver_id = d.id
         WHERE db.driver_id = $1`,
        [driverId]
      );
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Obtener todos los balances
  static async getAllBalances() {
    try {
      const result = await db.query(
        `SELECT 
          db.*,
          d.name as driver_name,
          d.phone as driver_phone,
          d.vehicle_model
         FROM driver_balances db
         LEFT JOIN drivers d ON db.driver_id = d.id
         ORDER BY db.pending_payment DESC`
      );
      return result.rows || [];
    } catch (error) {
      throw error;
    }
  }

  // Procesar pago de comisión
  static async processCommissionPayment(driverId, amount) {
    try {
      const result = await db.query(
        `UPDATE driver_balances 
         SET pending_payment = pending_payment - $1,
             last_payment_date = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE driver_id = $2 AND pending_payment >= $3
         RETURNING id`,
        [amount, driverId, amount]
      );

      if (result.rowCount === 0) {
        throw new Error('Saldo insuficiente o conductor no encontrado');
      }

      return { success: true, amountPaid: amount };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = FinanceModel;