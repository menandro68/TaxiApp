const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Obtener configuración de tarifas base
router.get('/config', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM pricing_config WHERE active = true');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Actualizar tarifa base
router.put('/config/:vehicleType', async (req, res) => {
    try {
        const { vehicleType } = req.params;
        const { base_fare, per_km, per_minute, minimum_fare, booking_fee } = req.body;
        
        const result = await db.query(
            `UPDATE pricing_config 
             SET base_fare = $1, per_km = $2, per_minute = $3, minimum_fare = $4, booking_fee = $5, updated_at = NOW()
             WHERE vehicle_type = $6
             RETURNING *`,
            [base_fare, per_km, per_minute, minimum_fare, booking_fee, vehicleType]
        );
        
        res.json({ success: true, updated: result.rows.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obtener multiplicadores de surge
router.get('/surge', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM surge_multipliers WHERE active = true ORDER BY type, priority');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Actualizar multiplicador de surge
router.put('/surge/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { multiplier, active } = req.body;
        
        const result = await db.query(
            'UPDATE surge_multipliers SET multiplier = $1, active = $2 WHERE id = $3 RETURNING *',
            [multiplier, active, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Multiplicador no encontrado' });
        }
        
        res.json({ success: true, updated: result.rows.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obtener zonas especiales
router.get('/zones', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM special_zones WHERE active = true');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Crear nueva zona especial
router.post('/zones', async (req, res) => {
    try {
        const { zone_name, zone_type, surcharge, multiplier, coordinates, radius_km } = req.body;
        
        const result = await db.query(
            `INSERT INTO special_zones (zone_name, zone_type, surcharge, multiplier, coordinates, radius_km, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW())
             RETURNING id`,
            [zone_name, zone_type, surcharge, multiplier, coordinates, radius_km]
        );
        
        res.json({ success: true, id: result.rows[0].id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Actualizar zona especial
router.put('/zones/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { zone_name, surcharge, multiplier, active } = req.body;
        
        const result = await db.query(
            'UPDATE special_zones SET zone_name = $1, surcharge = $2, multiplier = $3, active = $4 WHERE id = $5 RETURNING *',
            [zone_name, surcharge, multiplier, active, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Zona no encontrada' });
        }
        
        res.json({ success: true, updated: result.rows.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obtener historial de cambios
router.get('/history', async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM pricing_history ORDER BY change_date DESC LIMIT 100'
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;