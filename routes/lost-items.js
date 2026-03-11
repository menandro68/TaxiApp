const express = require('express');
const router = express.Router();
const { db } = require('../config/database');

// =============================================
// GET - Obtener todos los reportes (admin)
// =============================================
router.get('/', async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT li.*, 
                u.name as user_name, u.phone as user_phone,
                d.name as driver_name_db, d.phone as driver_phone
            FROM lost_items li
            LEFT JOIN users u ON li.user_id = u.id
            LEFT JOIN drivers d ON li.driver_id = d.id
        `;
        const params = [];

        if (status) {
            query += ` WHERE li.status = $1`;
            params.push(status);
        }

        query += ` ORDER BY li.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await db.query(query, params);

        const countResult = await db.query(
            `SELECT COUNT(*) FROM lost_items ${status ? "WHERE status = $1" : ""}`,
            status ? [status] : []
        );

        res.json({
            success: true,
            data: result.rows,
            total: parseInt(countResult.rows[0].count),
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (error) {
        console.error('❌ Error obteniendo objetos perdidos:', error.message);
        res.status(500).json({ error: 'Error obteniendo reportes', success: false });
    }
});

// =============================================
// POST - Crear reporte (app pasajero)
// =============================================
router.post('/', async (req, res) => {
    try {
        const {
            user_id, trip_id, item_category, item_description,
            additional_details, contact_phone, driver_id,
            driver_name, vehicle_plate
        } = req.body;

        if (!item_description) {
            return res.status(400).json({ error: 'Descripción del objeto es requerida', success: false });
        }

        const result = await db.query(
            `INSERT INTO lost_items 
                (user_id, trip_id, item_category, item_description, additional_details, 
                 contact_phone, driver_id, driver_name, vehicle_plate, status)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending') RETURNING *`,
            [user_id, trip_id, item_category, item_description,
             additional_details, contact_phone, driver_id, driver_name, vehicle_plate]
        );

        console.log(`✅ Reporte de objeto perdido creado: ID ${result.rows[0].id}`);
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('❌ Error creando reporte:', error.message);
        res.status(500).json({ error: 'Error creando reporte', success: false });
    }
});

// =============================================
// PUT - Actualizar estado (admin)
// =============================================
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, admin_notes } = req.body;

        const resolved_at = status === 'resolved' ? 'NOW()' : 'NULL';

        const result = await db.query(
            `UPDATE lost_items SET status = $1, admin_notes = $2, 
             resolved_at = ${resolved_at}, updated_at = NOW()
             WHERE id = $3 RETURNING *`,
            [status, admin_notes, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Reporte no encontrado', success: false });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('❌ Error actualizando reporte:', error.message);
        res.status(500).json({ error: 'Error actualizando reporte', success: false });
    }
});

// =============================================
// GET - Reportes de un usuario específico
// =============================================
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await db.query(
            `SELECT * FROM lost_items WHERE user_id = $1 ORDER BY created_at DESC`,
            [userId]
        );
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('❌ Error obteniendo reportes del usuario:', error.message);
        res.status(500).json({ error: 'Error obteniendo reportes', success: false });
    }
});

module.exports = router;