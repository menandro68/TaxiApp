const db = require('../config/database');

class TrendsAnalytics {
    // Comparativas mes a mes
    static async getMonthlyComparison() {
        try {
            const query = `
                SELECT 
                    TO_CHAR(created_at, 'YYYY-MM') as month,
                    COUNT(*) as total_trips,
                    SUM(fare) as total_revenue,
                    AVG(fare) as avg_fare,
                    COUNT(DISTINCT user_id) as unique_users,
                    COUNT(DISTINCT driver_id) as active_drivers,
                    ROUND(AVG(rating)::numeric, 2) as avg_rating
                FROM trips
                WHERE status = 'completed'
                GROUP BY TO_CHAR(created_at, 'YYYY-MM')
                ORDER BY month DESC
                LIMIT 12
            `;
            
            const result = await db.query(query);
            const rows = result.rows || [];
            
            // Calcular cambios porcentuales
            const trendsData = rows.map((row, index) => {
                if (index < rows.length - 1) {
                    const previousMonth = rows[index + 1];
                    row.revenue_change = ((row.total_revenue - previousMonth.total_revenue) / previousMonth.total_revenue * 100).toFixed(2);
                    row.trips_change = ((row.total_trips - previousMonth.total_trips) / previousMonth.total_trips * 100).toFixed(2);
                    row.users_change = ((row.unique_users - previousMonth.unique_users) / previousMonth.unique_users * 100).toFixed(2);
                } else {
                    row.revenue_change = 0;
                    row.trips_change = 0;
                    row.users_change = 0;
                }
                return row;
            });
            
            return trendsData;
        } catch (error) {
            throw error;
        }
    }

    // Análisis de crecimiento
    static async getGrowthAnalysis(days = 90) {
        try {
            const queries = {
                // Nuevos usuarios por período
                new_users: `
                    SELECT DATE(created_at) as date, COUNT(*) as count
                    FROM users 
                    WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
                    GROUP BY DATE(created_at)
                `,
                // Nuevos conductores por período  
                new_drivers: `
                    SELECT DATE(created_at) as date, COUNT(*) as count
                    FROM drivers 
                    WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
                    GROUP BY DATE(created_at)
                `,
                // Viajes diarios
                daily_trips: `
                    SELECT DATE(created_at) as date, COUNT(*) as count
                    FROM trips 
                    WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
                    GROUP BY DATE(created_at)
                `,
                // Ingresos diarios
                daily_revenue: `
                    SELECT DATE(created_at) as date, SUM(fare) as amount
                    FROM trips 
                    WHERE status = 'completed' AND created_at >= CURRENT_DATE - INTERVAL '${days} days'
                    GROUP BY DATE(created_at)
                `
            };

            const results = {};
            const promises = Object.keys(queries).map(async key => {
                try {
                    const result = await db.query(queries[key]);
                    results[key] = result.rows || [];
                } catch (error) {
                    throw error;
                }
            });

            await Promise.all(promises);
            return results;
        } catch (error) {
            throw error;
        }
    }

    // Proyecciones basadas en tendencias
    static async getProjections() {
        try {
            // Obtener datos de los últimos 3 meses para calcular tendencia
            const query = `
                SELECT 
                    AVG(daily_revenue) as avg_daily_revenue,
                    AVG(daily_trips) as avg_daily_trips,
                    AVG(growth_rate) as avg_growth_rate
                FROM (
                    SELECT 
                        DATE(created_at) as date,
                        SUM(fare) as daily_revenue,
                        COUNT(*) as daily_trips,
                        (SUM(fare) - LAG(SUM(fare)) OVER (ORDER BY DATE(created_at))) / 
                        LAG(SUM(fare)) OVER (ORDER BY DATE(created_at)) * 100 as growth_rate
                    FROM trips
                    WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
                        AND status = 'completed'
                    GROUP BY DATE(created_at)
                ) as subquery
            `;

            const result = await db.query(query);
            const row = result.rows[0];
            
            // Calcular proyecciones
            const projections = {
                current_metrics: row,
                next_30_days: {
                    projected_revenue: (row.avg_daily_revenue * 30 * (1 + row.avg_growth_rate/100)).toFixed(2),
                    projected_trips: Math.round(row.avg_daily_trips * 30 * (1 + row.avg_growth_rate/100))
                },
                next_quarter: {
                    projected_revenue: (row.avg_daily_revenue * 90 * Math.pow(1 + row.avg_growth_rate/100, 3)).toFixed(2),
                    projected_trips: Math.round(row.avg_daily_trips * 90 * Math.pow(1 + row.avg_growth_rate/100, 3))
                },
                next_year: {
                    projected_revenue: (row.avg_daily_revenue * 365 * Math.pow(1 + row.avg_growth_rate/100, 12)).toFixed(2),
                    projected_trips: Math.round(row.avg_daily_trips * 365 * Math.pow(1 + row.avg_growth_rate/100, 12))
                }
            };
            
            return projections;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = TrendsAnalytics;