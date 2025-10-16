// routes/dynamic-pricing.js
const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'taxiapp.db');

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
    ],
    specialEvents: []
};

// Inicializar tablas si no existen
function initializeTables() {
    const db = new sqlite3.Database(dbPath);
    
    // Tabla de configuración de franjas horarias
    db.run(`
        CREATE TABLE IF NOT EXISTS time_slot_pricing (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            slot_name VARCHAR(50),
            start_time TIME,
            end_time TIME,
            multiplier REAL DEFAULT 1.0,
            active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    // Tabla de multiplicadores por día
    db.run(`
        CREATE TABLE IF NOT EXISTS day_multipliers (
            day_of_week INTEGER PRIMARY KEY,
            day_name VARCHAR(20),
            multiplier REAL DEFAULT 1.0,
            active BOOLEAN DEFAULT 1
        )
    `);
    
    // Tabla de niveles de demanda
    db.run(`
        CREATE TABLE IF NOT EXISTS demand_levels (
            level VARCHAR(20) PRIMARY KEY,
            level_name VARCHAR(50),
            multiplier REAL DEFAULT 1.0,
            threshold INTEGER DEFAULT 0,
            active BOOLEAN DEFAULT 1
        )
    `);
    
    // Tabla de eventos especiales
    db.run(`
        CREATE TABLE IF NOT EXISTS special_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_name VARCHAR(100),
            start_date DATETIME,
            end_date DATETIME,
            multiplier REAL DEFAULT 1.0,
            zone_id INTEGER,
            description TEXT,
            active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    // Tabla de histórico de tarifas aplicadas
    db.run(`
        CREATE TABLE IF NOT EXISTS pricing_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            trip_id INTEGER,
            base_price REAL,
            final_price REAL,
            total_multiplier REAL,
            time_multiplier REAL,
            day_multiplier REAL,
            demand_multiplier REAL,
            weather_multiplier REAL,
            zone_multiplier REAL,
            event_multiplier REAL,
            applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    // Verificar si hay datos, si no, insertar defaults
    db.get('SELECT COUNT(*) as count FROM time_slot_pricing', (err, row) => {
        if (!err && row.count === 0) {
            DEFAULT_CONFIG.timeSlots.forEach(slot => {
                db.run(`
                    INSERT INTO time_slot_pricing (slot_name, start_time, end_time, multiplier, active)
                    VALUES (?, ?, ?, ?, ?)
                `, [slot.name, slot.startTime, slot.endTime, slot.multiplier, slot.active]);
            });
        }
    });
    
    db.get('SELECT COUNT(*) as count FROM day_multipliers', (err, row) => {
        if (!err && row.count === 0) {
            DEFAULT_CONFIG.dayMultipliers.forEach(day => {
                db.run(`
                    INSERT INTO day_multipliers (day_of_week, day_name, multiplier, active)
                    VALUES (?, ?, ?, 1)
                `, [day.day, day.name, day.multiplier]);
            });
        }
    });
    
    db.get('SELECT COUNT(*) as count FROM demand_levels', (err, row) => {
        if (!err && row.count === 0) {
            DEFAULT_CONFIG.demandLevels.forEach(level => {
                db.run(`
                    INSERT INTO demand_levels (level, level_name, multiplier, threshold, active)
                    VALUES (?, ?, ?, ?, 1)
                `, [level.level, level.name, level.multiplier, level.threshold]);
            });
        }
    });
    
    db.close();
}

// Inicializar tablas al cargar el módulo
initializeTables();

// ==================== ENDPOINTS ====================

// Obtener configuración actual completa
router.get('/config', (req, res) => {
    const db = new sqlite3.Database(dbPath);
    const config = {};
    
    // Obtener franjas horarias
    db.all('SELECT * FROM time_slot_pricing ORDER BY start_time', (err, timeSlots) => {
        if (err) return res.status(500).json({ error: err.message });
        config.timeSlots = timeSlots;
        
        // Obtener multiplicadores por día
        db.all('SELECT * FROM day_multipliers ORDER BY day_of_week', (err, days) => {
            if (err) return res.status(500).json({ error: err.message });
            config.dayMultipliers = days;
            
            // Obtener niveles de demanda
            db.all('SELECT * FROM demand_levels ORDER BY threshold', (err, demand) => {
                if (err) return res.status(500).json({ error: err.message });
                config.demandLevels = demand;
                
                // Obtener eventos especiales activos
                db.all(`
                    SELECT * FROM special_events 
                    WHERE active = 1 AND end_date > datetime('now')
                    ORDER BY start_date
                `, (err, events) => {
                    if (err) return res.status(500).json({ error: err.message });
                    config.specialEvents = events || [];
                    
                    // Agregar configuración de clima (estática por ahora)
                    config.weatherMultipliers = DEFAULT_CONFIG.weatherMultipliers;
                    
                    db.close();
                    res.json(config);
                });
            });
        });
    });
});

// Actualizar franja horaria
router.put('/time-slot/:id', (req, res) => {
    const db = new sqlite3.Database(dbPath);
    const { id } = req.params;
    const { multiplier, active } = req.body;
    
    db.run(
        `UPDATE time_slot_pricing 
         SET multiplier = ?, active = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [multiplier, active ? 1 : 0, id],
        function(err) {
            db.close();
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, changes: this.changes });
        }
    );
});

// Actualizar multiplicador de día
router.put('/day/:day', (req, res) => {
    const db = new sqlite3.Database(dbPath);
    const { day } = req.params;
    const { multiplier, active } = req.body;
    
    db.run(
        `UPDATE day_multipliers 
         SET multiplier = ?, active = ? 
         WHERE day_of_week = ?`,
        [multiplier, active ? 1 : 0, day],
        function(err) {
            db.close();
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, changes: this.changes });
        }
    );
});

// Actualizar nivel de demanda
router.put('/demand/:level', (req, res) => {
    const db = new sqlite3.Database(dbPath);
    const { level } = req.params;
    const { multiplier, threshold, active } = req.body;
    
    db.run(
        `UPDATE demand_levels 
         SET multiplier = ?, threshold = ?, active = ? 
         WHERE level = ?`,
        [multiplier, threshold, active ? 1 : 0, level],
        function(err) {
            db.close();
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, changes: this.changes });
        }
    );
});

// Crear evento especial
router.post('/event', (req, res) => {
    const db = new sqlite3.Database(dbPath);
    const { event_name, start_date, end_date, multiplier, zone_id, description } = req.body;
    
    db.run(
        `INSERT INTO special_events (event_name, start_date, end_date, multiplier, zone_id, description, active)
         VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [event_name, start_date, end_date, multiplier, zone_id, description],
        function(err) {
            if (err) {
                db.close();
                return res.status(500).json({ error: err.message });
            }
            
            // Obtener el evento recién creado
            db.get('SELECT * FROM special_events WHERE id = ?', [this.lastID], (err, event) => {
                db.close();
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true, event });
            });
        }
    );
});

// Eliminar evento especial
router.delete('/event/:id', (req, res) => {
    const db = new sqlite3.Database(dbPath);
    const { id } = req.params;
    
    db.run('UPDATE special_events SET active = 0 WHERE id = ?', [id], function(err) {
        db.close();
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, changes: this.changes });
    });
});

// Calcular multiplicador actual
router.get('/current-multiplier', (req, res) => {
    const db = new sqlite3.Database(dbPath);
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
    db.get(
        `SELECT * FROM time_slot_pricing 
         WHERE active = 1 AND ? BETWEEN start_time AND end_time`,
        [currentTime],
        (err, timeSlot) => {
            if (!err && timeSlot) {
                multiplier.time = timeSlot.multiplier;
                multiplier.details.timeSlot = timeSlot.slot_name;
            }
            
            // Obtener multiplicador de día
            db.get(
                'SELECT * FROM day_multipliers WHERE day_of_week = ? AND active = 1',
                [currentDay],
                (err, day) => {
                    if (!err && day) {
                        multiplier.day = day.multiplier;
                        multiplier.details.day = day.day_name;
                    }
                    
                    // Calcular total
                    multiplier.total = multiplier.time * multiplier.day * multiplier.demand * multiplier.weather * multiplier.event;
                    
                    db.close();
                    res.json(multiplier);
                }
            );
        }
    );
});

// Obtener estadísticas de tarifas
router.get('/stats', (req, res) => {
    const db = new sqlite3.Database(dbPath);
    
    const stats = {
        today: {},
        week: {},
        month: {}
    };
    
    // Estadísticas del día
    db.get(`
        SELECT 
            COUNT(*) as trips,
            AVG(total_multiplier) as avg_multiplier,
            MAX(total_multiplier) as max_multiplier,
            AVG(final_price - base_price) as avg_surge_amount
        FROM pricing_history
        WHERE DATE(applied_at) = DATE('now')
    `, (err, today) => {
        if (!err) stats.today = today;
        
        // Estadísticas de la semana
        db.get(`
            SELECT 
                COUNT(*) as trips,
                AVG(total_multiplier) as avg_multiplier,
                MAX(total_multiplier) as max_multiplier,
                AVG(final_price - base_price) as avg_surge_amount
            FROM pricing_history
            WHERE DATE(applied_at) >= DATE('now', '-7 days')
        `, (err, week) => {
            if (!err) stats.week = week;
            
            // Estadísticas del mes
            db.get(`
                SELECT 
                    COUNT(*) as trips,
                    AVG(total_multiplier) as avg_multiplier,
                    MAX(total_multiplier) as max_multiplier,
                    AVG(final_price - base_price) as avg_surge_amount
                FROM pricing_history
                WHERE DATE(applied_at) >= DATE('now', 'start of month')
            `, (err, month) => {
                if (!err) stats.month = month;
                
                db.close();
                res.json(stats);
            });
        });
    });
});

module.exports = router;