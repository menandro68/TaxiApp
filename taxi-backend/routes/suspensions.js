const express = require('express');
const router = express.Router();
const db = require('../config/database');

// ==========================================
// OBTENER SUSPENSIONES ACTIVAS
// ==========================================
router.get('/active', async (req, res) => {
    try {
        const query = `
            SELECT 
                ds.id,
                ds.driver_id,
                ds.type,
                ds.reason,
                ds.duration_hours,
                ds.expires_at,
                ds.status,
                ds.suspended_at,
                ds.lifted_at,
                d.name as driver_name,
                d.email as driver_email,
                d.phone as driver_phone,
                d.vehicle_plate
            FROM driver_suspensions ds
            JOIN drivers d ON ds.driver_id = d.id
            WHERE ds.status = 'active'
            ORDER BY ds.suspended_at DESC
        `;
        
        const result = await db.query(query);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error obteniendo suspensiones activas:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==========================================
// OBTENER HISTORIAL COMPLETO
// ==========================================
router.get('/history', async (req, res) => {
    try {
        const query = `
            SELECT 
                ds.id,
                ds.driver_id,
                ds.type,
                ds.reason,
                ds.duration_hours,
                ds.expires_at,
                ds.status,
                ds.suspended_at,
                ds.lifted_at,
                d.name as driver_name,
                d.email as driver_email,
                d.vehicle_plate
            FROM driver_suspensions ds
            JOIN drivers d ON ds.driver_id = d.id
            ORDER BY ds.suspended_at DESC
            LIMIT 100
        `;
        
        const result = await db.query(query);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error obteniendo historial:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==========================================
// OBTENER ESTADÍSTICAS DE SUSPENSIONES
// ==========================================
router.get('/stats', async (req, res) => {
    try {
        const stats = {};
        
        // Suspensiones activas
        const activeResult = await db.query(
            "SELECT COUNT(*) as count FROM driver_suspensions WHERE status = 'active'"
        );
        stats.active = parseInt(activeResult.rows[0]?.count || 0);
        
        // Suspensiones temporales activas
        const temporalResult = await db.query(
            "SELECT COUNT(*) as count FROM driver_suspensions WHERE type = 'temporal' AND status = 'active'"
        );
        stats.temporal = parseInt(temporalResult.rows[0]?.count || 0);
        
        // Suspensiones permanentes activas
        const permanentResult = await db.query(
            "SELECT COUNT(*) as count FROM driver_suspensions WHERE type = 'permanent' AND status = 'active'"
        );
        stats.permanent = parseInt(permanentResult.rows[0]?.count || 0);
        
        // Suspensiones levantadas
        const liftedResult = await db.query(
            "SELECT COUNT(*) as count FROM driver_suspensions WHERE status = 'lifted'"
        );
        stats.lifted = parseInt(liftedResult.rows[0]?.count || 0);
        
        // Suspensiones expiradas
        const expiredResult = await db.query(
            "SELECT COUNT(*) as count FROM driver_suspensions WHERE status = 'expired'"
        );
        stats.expired = parseInt(expiredResult.rows[0]?.count || 0);
        
        res.json({ success: true, data: stats });
    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==========================================
// OBTENER SUSPENSIONES DE UN CONDUCTOR
// ==========================================
router.get('/driver/:driverId', async (req, res) => {
    try {
        const { driverId } = req.params;
        
        const query = `
            SELECT * FROM driver_suspensions 
            WHERE driver_id = $1
            ORDER BY suspended_at DESC
        `;
        
        const result = await db.query(query, [driverId]);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error obteniendo suspensiones del conductor:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==========================================
// CREAR NUEVA SUSPENSIÓN
// ==========================================
router.post('/create', async (req, res) => {
    try {
        const { driverId, type, reason, durationHours, createdBy } = req.body;
        
        // Validar campos requeridos
        if (!driverId || !type || !reason) {
            return res.status(400).json({ 
                success: false, 
                error: 'Faltan campos requeridos (driverId, type, reason)' 
            });
        }
        
        if (type === 'temporal' && !durationHours) {
            return res.status(400).json({ 
                success: false, 
                error: 'Las suspensiones temporales requieren duración (durationHours)' 
            });
        }
        
        // Verificar que el conductor existe
        const driverCheck = await db.query(
            'SELECT id, name FROM drivers WHERE id = $1',
            [driverId]
        );
        
        if (driverCheck.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Conductor no encontrado' 
            });
        }
        
        const driverName = driverCheck.rows[0].name;
        
        // Calcular fecha de expiración si es temporal
        let expiresAt = null;
        if (type === 'temporal' && durationHours) {
            const expDate = new Date();
            expDate.setHours(expDate.getHours() + durationHours);
            expiresAt = expDate.toISOString();
        }
        
        // Insertar suspensión
        const insertQuery = `
            INSERT INTO driver_suspensions 
            (driver_id, driver_name, type, reason, duration_hours, expires_at, status, created_by, suspended_at)
            VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, NOW())
            RETURNING id, driver_id, type, status, suspended_at
        `;
        
        const result = await db.query(insertQuery, [
            driverId,
            driverName,
            type,
            reason,
            durationHours,
            expiresAt,
            createdBy || 'admin'
        ]);
        
        // Actualizar estado del conductor a 'suspended'
        await db.query(
            'UPDATE drivers SET status = $1 WHERE id = $2',
            ['suspended', driverId]
        );
        
        res.json({ 
            success: true, 
            data: result.rows[0],
            message: `Suspensión creada para conductor ${driverName}` 
        });
    } catch (error) {
        console.error('Error creando suspensión:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==========================================
// LEVANTAR SUSPENSIÓN
// ==========================================
router.post('/lift', async (req, res) => {
    try {
        const { suspensionId, liftedBy, liftedReason } = req.body;
        
        if (!suspensionId || !liftedBy || !liftedReason) {
            return res.status(400).json({ 
                success: false, 
                error: 'Faltan campos requeridos (suspensionId, liftedBy, liftedReason)' 
            });
        }
        
        // Obtener información de la suspensión
        const suspensionQuery = 'SELECT * FROM driver_suspensions WHERE id = $1';
        const suspensionResult = await db.query(suspensionQuery, [suspensionId]);
        
        if (suspensionResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Suspensión no encontrada' 
            });
        }
        
        const suspension = suspensionResult.rows[0];
        
        // Actualizar la suspensión
        const updateQuery = `
            UPDATE driver_suspensions 
            SET status = 'lifted',
                lifted_at = NOW(),
                lifted_by = $1,
                lifted_reason = $2
            WHERE id = $3
            RETURNING *
        `;
        
        const result = await db.query(updateQuery, [liftedBy, liftedReason, suspensionId]);
        
        // Reactivar el conductor
        await db.query(
            'UPDATE drivers SET status = $1 WHERE id = $2',
            ['active', suspension.driver_id]
        );
        
        res.json({ 
            success: true, 
            data: result.rows[0],
            message: `Suspensión levantada para conductor ${suspension.driver_name}` 
        });
    } catch (error) {
        console.error('Error levantando suspensión:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==========================================
// VERIFICAR Y ACTUALIZAR SUSPENSIONES EXPIRADAS
// ==========================================
router.post('/check-expired', async (req, res) => {
    try {
        // Obtener suspensiones temporales que han expirado
        const query = `
            SELECT * FROM driver_suspensions 
            WHERE type = 'temporal' 
            AND status = 'active'
            AND expires_at < NOW()
        `;
        
        const result = await db.query(query);
        const expiredSuspensions = result.rows;
        
        // Actualizar cada suspensión expirada
        for (const suspension of expiredSuspensions) {
            // Marcar como expirada
            await db.query(
                'UPDATE driver_suspensions SET status = $1 WHERE id = $2',
                ['expired', suspension.id]
            );
            
            // Reactivar el conductor
            await db.query(
                'UPDATE drivers SET status = $1 WHERE id = $2',
                ['active', suspension.driver_id]
            );
        }
        
        res.json({ 
            success: true, 
            message: `${expiredSuspensions.length} suspensiones expiradas actualizadas`,
            data: { expiredCount: expiredSuspensions.length }
        });
    } catch (error) {
        console.error('Error verificando suspensiones expiradas:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;