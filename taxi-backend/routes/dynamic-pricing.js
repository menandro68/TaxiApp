// routes/dynamic-pricing.js
const express = require('express');
const router = express.Router();
const db = require('../config/database');

// ==================== CONFIGURACIÓN DEFAULT ====================
const DEFAULT_CONFIG = {
    timeSlots: [
        { id: 1, name: 'Madrugada', startTime: '00:00', endTime: '05:59', multiplier: 1.5, active: true },
        { id: 2, name: 'Hora Pico Mañana', startTime: '06:00', endTime: '08:59', multiplier: 1.3, active: true },
        { id: 3, name: 'Mañana Regular', startTime: '09:00', endTime: '11:59', multiplier: 1.0, active: true },
        { id: 4, name: 'Mediodía', startTime: '12:00', endTime: '16:59', multiplier: 1.0, active: true },
        { id: 5, name: 'Hora Pico Tarde', startTime: '17:00', endTime: '19:59', multiplier: 1.4, active: true },
        { id: 6, name: 'Noche', startTime: '20:00', endTime: '21:59', multiplier: 1.2, active: true },
        { id: 7, name: 'Noche Tardía', startTime: '22:00', endTime: '23:59', multiplier: 1.5, active: true }
    ],
    dayMultipliers: [
        { day: 0, name: 'Domingo', multiplier: 1.1 },
        { day: 1, name: 'Lunes', multiplier: 1.0 },
        { day: 2, name: 'Martes', multiplier: 1.0 },
        { day: 3, name: 'Miércoles', multiplier: 1.0 },
        { day: 4, name: 'Jueves', multiplier: 1.0 },
        { day: 5, name: 'Viernes', multiplier: 1.3 },
        { day: 6, name: 'Sábado', multiplier: 1.2 }
    ],
    demandLevels: [
        { level: 'low', name: 'Baja', multiplier: 0.9, threshold: 0 },
        { level: 'normal', name: 'Normal', multiplier: 1.0, threshold: 5 },
        { level: 'high', name: 'Alta', multiplier: 1.3, threshold: 10 },
        { level: 'very_high', name: 'Muy Alta', multiplier: 1.6, threshold: 20 },
        { level: 'extreme', name: 'Extrema', multiplier: 2.0, threshold: 30 }
    ],
    weatherMultipliers: [
        { condition: 'clear', name: 'Despejado', multiplier: 1.0, icon: '☀️' },
        { condition: 'cloudy', name: 'Nublado', multiplier: 1.0, icon: '☁️' },
        { condition: 'rain', name: 'Lluvia', multiplier: 1.3, icon: '🌧️' },
        { condition: 'heavy_rain', name: 'Lluvia Fuerte', multiplier: 1.5, icon: '⛈️' },
        { condition: 'storm', name: 'Tormenta', multiplier: 2.0, icon: '🌩️' }
    ]
};

// ==================== ENDPOINTS ====================

// Obtener configuración actual completa
router.get('/config', async (req, res) => {
    try {
        const config = {};

        // Obtener franjas horarias
        const timeSlots = await db.query('SELECT * FROM time_slot_pricing ORDER BY start_time');
        config.timeSlots = timeSlots.rows;

        // Obtener multiplicadores por día
        const dayMultipliers = await db.query('SELECT * FROM day_multipliers ORDER BY day_of_week');
        config.dayMultipliers = dayMultipliers.rows;

        // Obtener niveles de demanda
        const demandLevels = await db.query('SELECT * FROM demand_levels ORDER BY threshold');
        config.demandLevels = demandLevels.rows;

        // Obtener eventos especiales activos
        const specialEvents = await db.query(
            "SELECT * FROM special_events WHERE active = true AND end_date > NOW() ORDER BY start_date"
        );
        config.specialEvents = specialEvents.rows || [];

        // Agregar configuración de clima (estática)
        config.weatherMultipliers = DEFAULT_CONFIG.weatherMultipliers;

        res.json(config);
    } catch (error) {
        console.error('Error obteniendo configuración:', error);
        res.status(500).json({ error: error.message });
    }
});

// Actualizar franja horaria
router.put('/time-slot/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { multiplier, active } = req.body;

        const result = await db.query(
            'UPDATE time_slot_pricing SET multiplier = $1, active = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
            [multiplier, active, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Franja horaria no encontrada' });
        }

        res.json({ success: true, timeSlot: result.rows[0] });
    } catch (error) {
        console.error('Error actualizando franja horaria:', error);
        res.status(500).json({ error: error.message });
    }
});

// Actualizar multiplicador de día
router.put('/day/:day', async (req, res) => {
    try {
        const { day } = req.params;
        const { multiplier, active } = req.body;

        const result = await db.query(
            'UPDATE day_multipliers SET multiplier = $1, active = $2 WHERE day_of_week = $3 RETURNING *',
            [multiplier, active, day]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Día no encontrado' });
        }

        res.json({ success: true, dayMultiplier: result.rows[0] });
    } catch (error) {
        console.error('Error actualizando multiplicador de día:', error);
        res.status(500).json({ error: error.message });
    }
});

// Actualizar nivel de demanda
router.put('/demand/:level', async (req, res) => {
    try {
        const { level } = req.params;
        const { multiplier, threshold, active } = req.body;

        const result = await db.query(
            'UPDATE demand_levels SET multiplier = $1, threshold = $2, active = $3 WHERE level = $4 RETURNING *',
            [multiplier, threshold, active, level]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Nivel de demanda no encontrado' });
        }

        res.json({ success: true, demandLevel: result.rows[0] });
    } catch (error) {
        console.error('Error actualizando nivel de demanda:', error);
        res.status(500).json({ error: error.message });
    }
});

// Crear evento especial
router.post('/event', async (req, res) => {
    try {
        const { event_name, start_date, end_date, multiplier, zone_id, description } = req.body;

        const result = await db.query(
            `INSERT INTO special_events (event_name, start_date, end_date, multiplier, zone_id, description, active, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, true, NOW())
             RETURNING *`,
            [event_name, start_date, end_date, multiplier, zone_id, description]
        );

        res.json({ success: true, event: result.rows[0] });
    } catch (error) {
        console.error('Error creando evento especial:', error);
        res.status(500).json({ error: error.message });
    }
});

// Eliminar evento especial
router.delete('/event/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(
            'UPDATE special_events SET active = false WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Evento no encontrado' });
        }

        res.json({ success: true, event: result.rows[0] });
    } catch (error) {
        console.error('Error eliminando evento especial:', error);
        res.status(500).json({ error: error.message });
    }
});

// Calcular multiplicador actual
router.get('/current-multiplier', async (req, res) => {
    try {
        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 5);
        const currentDay = now.getDay();

        let multiplier = {
            base: 1.0,
            time: 1.0,
            day: 1.0,
            demand: 1.0,
            weather: 1.0,
            event: 1.0,
            total: 1.0,
            details: {}
        };

        // Obtener multiplicador de tiempo
        const timeSlot = await db.query(
            "SELECT * FROM time_slot_pricing WHERE active = true AND $1::time BETWEEN start_time AND end_time LIMIT 1",
            [currentTime]
        );

        if (timeSlot.rows.length > 0) {
            multiplier.time = timeSlot.rows[0].multiplier;
            multiplier.details.timeSlot = timeSlot.rows[0].slot_name;
        }

        // Obtener multiplicador de día
        const day = await db.query(
            'SELECT * FROM day_multipliers WHERE day_of_week = $1 AND active = true',
            [currentDay]
        );

        if (day.rows.length > 0) {
            multiplier.day = day.rows[0].multiplier;
            multiplier.details.day = day.rows[0].day_name;
        }

        // Calcular total
        multiplier.total = multiplier.time * multiplier.day * multiplier.demand * multiplier.weather * multiplier.event;

        res.json(multiplier);
    } catch (error) {
        console.error('Error calculando multiplicador actual:', error);
        res.status(500).json({ error: error.message });
    }
});

// Obtener estadísticas de tarifas
router.get('/stats', async (req, res) => {
    try {
        const stats = {
            today: {},
            week: {},
            month: {}
        };

        // Estadísticas del día
        const today = await db.query(`
            SELECT 
                COUNT(*) as trips,
                AVG(total_multiplier) as avg_multiplier,
                MAX(total_multiplier) as max_multiplier,
                AVG(final_price - base_price) as avg_surge_amount
            FROM pricing_history
            WHERE DATE(applied_at) = CURRENT_DATE
        `);
        if (today.rows.length > 0) stats.today = today.rows[0];

        // Estadísticas de la semana
        const week = await db.query(`
            SELECT 
                COUNT(*) as trips,
                AVG(total_multiplier) as avg_multiplier,
                MAX(total_multiplier) as max_multiplier,
                AVG(final_price - base_price) as avg_surge_amount
            FROM pricing_history
            WHERE applied_at >= CURRENT_DATE - INTERVAL '7 days'
        `);
        if (week.rows.length > 0) stats.week = week.rows[0];

        // Estadísticas del mes
        const month = await db.query(`
            SELECT 
                COUNT(*) as trips,
                AVG(total_multiplier) as avg_multiplier,
                MAX(total_multiplier) as max_multiplier,
                AVG(final_price - base_price) as avg_surge_amount
            FROM pricing_history
            WHERE applied_at >= DATE_TRUNC('month', CURRENT_DATE)
        `);
        if (month.rows.length > 0) stats.month = month.rows[0];

        res.json(stats);
    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;