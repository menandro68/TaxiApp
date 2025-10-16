const db = require('../config/database');

class KPIAnalytics {
    // Métricas por período (día/semana/mes/trimestre)
    static async getKPIsByPeriod(period = 'day') {
        const periodMapping = {
            'day': "DATE(created_at)",
            'week': "strftime('%Y-W%W', created_at)",
            'month': "strftime('%Y-%m', created_at)",
            'quarter': "strftime('%Y-Q' || ((CAST(strftime('%m', created_at) AS INTEGER) - 1) / 3 + 1), created_at)"
        };

        const groupBy = periodMapping[period] || periodMapping['day'];

        return new Promise((resolve, reject) => {
            const query = `
                SELECT 
                    ${groupBy} as period,
                    COUNT(DISTINCT t.id) as total_trips,
                    COUNT(DISTINCT t.user_id) as unique_users,
                    COUNT(DISTINCT t.driver_id) as active_drivers,
                    SUM(t.fare) as total_revenue,
                    AVG(t.fare) as avg_fare,
                    AVG(t.rating) as avg_rating,
                    SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed_trips,
                    SUM(CASE WHEN t.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_trips,
                    ROUND(CAST(SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) AS FLOAT) * 100 / COUNT(t.id), 2) as completion_rate,
                    AVG(CAST((julianday(t.dropoff_time) - julianday(t.pickup_time)) * 24 * 60 AS INTEGER)) as avg_trip_duration_minutes,
                    SUM(t.distance) as total_distance_km,
                    AVG(t.distance) as avg_distance_km
                FROM trips t
                WHERE t.created_at >= datetime('now', '-365 days')
                GROUP BY ${groupBy}
                ORDER BY period DESC
                LIMIT 100
            `;
            
            db.all(query, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // Comparativas año a año
    static async getYearOverYearComparison() {
        return new Promise((resolve, reject) => {
            const query = `
                WITH yearly_stats AS (
                    SELECT 
                        strftime('%Y', created_at) as year,
                        strftime('%m', created_at) as month,
                        COUNT(*) as trips,
                        SUM(fare) as revenue,
                        COUNT(DISTINCT user_id) as users,
                        COUNT(DISTINCT driver_id) as drivers
                    FROM trips
                    WHERE status = 'completed'
                    GROUP BY strftime('%Y', created_at), strftime('%m', created_at)
                )
                SELECT 
                    current.month,
                    current.year as current_year,
                    current.trips as current_trips,
                    current.revenue as current_revenue,
                    current.users as current_users,
                    previous.year as previous_year,
                    previous.trips as previous_trips,
                    previous.revenue as previous_revenue,
                    previous.users as previous_users,
                    ROUND(((current.revenue - previous.revenue) / previous.revenue) * 100, 2) as revenue_growth_pct,
                    ROUND(((current.trips - previous.trips) / previous.trips) * 100, 2) as trips_growth_pct,
                    ROUND(((current.users - previous.users) / previous.users) * 100, 2) as users_growth_pct
                FROM yearly_stats current
                LEFT JOIN yearly_stats previous ON current.month = previous.month 
                    AND CAST(current.year AS INTEGER) = CAST(previous.year AS INTEGER) + 1
                WHERE current.year = strftime('%Y', 'now')
                ORDER BY current.month
            `;
            
            db.all(query, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // Análisis por zonas
    static async getZoneAnalytics() {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT 
                    pickup_zone as zone,
                    COUNT(*) as total_trips,
                    SUM(fare) as total_revenue,
                    AVG(fare) as avg_fare,
                    AVG(distance) as avg_distance,
                    AVG(rating) as avg_rating,
                    COUNT(DISTINCT user_id) as unique_users,
                    COUNT(DISTINCT driver_id) as active_drivers,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                    SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
                FROM trips
                WHERE created_at >= datetime('now', '-30 days')
                    AND pickup_zone IS NOT NULL
                GROUP BY pickup_zone
                ORDER BY total_revenue DESC
            `;
            
            db.all(query, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // Análisis de horas pico
    static async getPeakHoursAnalysis() {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT 
                    CAST(strftime('%H', created_at) AS INTEGER) as hour,
                    strftime('%w', created_at) as day_of_week,
                    COUNT(*) as total_trips,
                    SUM(fare) as total_revenue,
                    AVG(fare) as avg_fare,
                    AVG(surge_multiplier) as avg_surge,
                    AVG(wait_time) as avg_wait_time,
                    COUNT(DISTINCT driver_id) as drivers_available,
                    ROUND(CAST(COUNT(*) AS FLOAT) / COUNT(DISTINCT driver_id), 2) as trips_per_driver
                FROM trips
                WHERE created_at >= datetime('now', '-30 days')
                GROUP BY hour, day_of_week
                ORDER BY hour, day_of_week
            `;
            
            db.all(query, [], (err, rows) => {
                if (err) reject(err);
                
                // Agrupar por hora y calcular promedios
                const hourlyStats = {};
                rows.forEach(row => {
                    if (!hourlyStats[row.hour]) {
                        hourlyStats[row.hour] = {
                            hour: row.hour,
                            total_trips: 0,
                            total_revenue: 0,
                            days: [],
                            peak_days: []
                        };
                    }
                    hourlyStats[row.hour].total_trips += row.total_trips;
                    hourlyStats[row.hour].total_revenue += row.total_revenue;
                    hourlyStats[row.hour].days.push({
                        day: row.day_of_week,
                        trips: row.total_trips,
                        revenue: row.total_revenue
                    });
                });

                // Identificar horas pico
                const peakHours = Object.values(hourlyStats)
                    .sort((a, b) => b.total_trips - a.total_trips)
                    .slice(0, 5);

                resolve({
                    hourly_breakdown: rows,
                    peak_hours: peakHours,
                    busiest_hour: peakHours[0]
                });
            });
        });
    }
}

module.exports = KPIAnalytics;