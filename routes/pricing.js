const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Obtener configuración de tarifas base
router.get('/config', (req, res) => {
    db.all('SELECT * FROM pricing_config WHERE active = 1', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Actualizar tarifa base
router.put('/config/:vehicleType', (req, res) => {
    const { vehicleType } = req.params;
    const { base_fare, per_km, per_minute, minimum_fare, booking_fee } = req.body;
    
    db.run(
        `UPDATE pricing_config 
         SET base_fare = ?, per_km = ?, per_minute = ?, minimum_fare = ?, booking_fee = ?, updated_at = CURRENT_TIMESTAMP
         WHERE vehicle_type = ?`,
        [base_fare, per_km, per_minute, minimum_fare, booking_fee, vehicleType],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, changes: this.changes });
        }
    );
});

// Obtener multiplicadores de surge
router.get('/surge', (req, res) => {
    db.all('SELECT * FROM surge_multipliers WHERE active = 1 ORDER BY type, priority', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Actualizar multiplicador de surge
router.put('/surge/:id', (req, res) => {
    const { id } = req.params;
    const { multiplier, active } = req.body;
    
    db.run(
        'UPDATE surge_multipliers SET multiplier = ?, active = ? WHERE id = ?',
        [multiplier, active, id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, changes: this.changes });
        }
    );
});

// Obtener zonas especiales
router.get('/zones', (req, res) => {
    db.all('SELECT * FROM special_zones WHERE active = 1', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Crear nueva zona especial
router.post('/zones', (req, res) => {
    const { zone_name, zone_type, surcharge, multiplier, coordinates, radius_km } = req.body;
    
    db.run(
        `INSERT INTO special_zones (zone_name, zone_type, surcharge, multiplier, coordinates, radius_km)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [zone_name, zone_type, surcharge, multiplier, coordinates, radius_km],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: this.lastID });
        }
    );
});

// Actualizar zona especial
router.put('/zones/:id', (req, res) => {
    const { id } = req.params;
    const { zone_name, surcharge, multiplier, active } = req.body;
    
    db.run(
        'UPDATE special_zones SET zone_name = ?, surcharge = ?, multiplier = ?, active = ? WHERE id = ?',
        [zone_name, surcharge, multiplier, active, id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, changes: this.changes });
        }
    );
});

// Obtener historial de cambios
router.get('/history', (req, res) => {
    db.all(
        'SELECT * FROM pricing_history ORDER BY change_date DESC LIMIT 100',
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

module.exports = router;