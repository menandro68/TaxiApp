const db = require('../config/database');

class FinancialReports {
    // Reporte de ingresos por período
    static async getRevenueByPeriod(startDate, endDate) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as total_trips,
                    SUM(fare) as total_revenue,
                    AVG(fare) as avg_fare,
                    SUM(CASE WHEN status = 'completed' THEN fare ELSE 0 END) as completed_revenue,
                    SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_trips
                FROM trips 
                WHERE created_at BETWEEN ? AND ?
                GROUP BY DATE(created_at)
                ORDER BY date DESC
            `;
            
            db.all(query, [startDate, endDate], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // Análisis de rentabilidad por conductor
    static async getDriverProfitability(period = 30) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT 
                    d.id,
                    d.name,
                    d.vehicle_plate,
                    COUNT(t.id) as total_trips,
                    SUM(t.fare) as total_revenue,
                    AVG(t.fare) as avg_fare_per_trip,
                    AVG(t.rating) as avg_rating,
                    SUM(t.fare) * 0.20 as company_commission,
                    SUM(t.fare) * 0.80 as driver_earnings,
                    ROUND(CAST(SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) AS FLOAT) * 100 / COUNT(t.id), 2) as completion_rate
                FROM drivers d
                LEFT JOIN trips t ON d.id = t.driver_id
                WHERE t.created_at >= datetime('now', '-${period} days')
                GROUP BY d.id
                ORDER BY total_revenue DESC
            `;
            
            db.all(query, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // Reporte de comisiones
    static async getCommissionsReport(startDate, endDate) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT 
                    DATE(t.created_at) as date,
                    COUNT(t.id) as trips,
                    SUM(t.fare) as gross_revenue,
                    SUM(t.fare) * 0.20 as commission_earned,
                    SUM(t.fare) * 0.80 as driver_payouts
                FROM trips t
                WHERE t.status = 'completed' 
                    AND t.created_at BETWEEN ? AND ?
                GROUP BY DATE(t.created_at)
                ORDER BY date DESC
            `;
            
            db.all(query, [startDate, endDate], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // Flujo de caja
    static async getCashFlow(period = 30) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT 
                    DATE(created_at) as date,
                    SUM(CASE WHEN payment_method = 'cash' THEN fare ELSE 0 END) as cash_collected,
                    SUM(CASE WHEN payment_method = 'card' THEN fare ELSE 0 END) as card_payments,
                    SUM(CASE WHEN payment_method = 'wallet' THEN fare ELSE 0 END) as wallet_payments,
                    SUM(fare) as total_collected,
                    SUM(fare) * 0.20 as commission_earned,
                    SUM(fare) * 0.80 as driver_payable
                FROM trips
                WHERE status = 'completed' 
                    AND created_at >= datetime('now', '-${period} days')
                GROUP BY DATE(created_at)
                ORDER BY date DESC
            `;
            
            db.all(query, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }
}

module.exports = FinancialReports;