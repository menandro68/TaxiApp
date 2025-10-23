const express = require('express');
const router = express.Router();
const suspensionsModel = require('../models/suspensions');

// Obtener todas las suspensiones activas
router.get('/active', async (req, res) => {
    try {
        const suspensions = await suspensionsModel.getActiveSuspensions();
        res.json({ success: true, data: suspensions });
    } catch (error) {
        console.error('Error obteniendo suspensiones activas:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Obtener historial completo
router.get('/history', async (req, res) => {
    try {
        const suspensions = await suspensionsModel.getAllSuspensions();
        res.json({ success: true, data: suspensions });
    } catch (error) {
        console.error('Error obteniendo historial:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Obtener estadísticas
router.get('/stats', async (req, res) => {
    try {
        const stats = await suspensionsModel.getStatistics();
        res.json({ success: true, data: stats });
    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Obtener suspensiones de un conductor
router.get('/driver/:driverId', async (req, res) => {
    try {
        const suspensions = await suspensionsModel.getDriverSuspensions(req.params.driverId);
        res.json({ success: true, data: suspensions });
    } catch (error) {
        console.error('Error obteniendo suspensiones del conductor:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Crear nueva suspensión
router.post('/create', async (req, res) => {
    try {
        const { driverId, type, reason, durationHours, createdBy } = req.body;
        
        if (!driverId || !type || !reason) {
            return res.status(400).json({ 
                success: false, 
                error: 'Faltan campos requeridos' 
            });
        }

        if (type === 'temporal' && !durationHours) {
            return res.status(400).json({ 
                success: false, 
                error: 'Las suspensiones temporales requieren duración' 
            });
        }

        const result = await suspensionsModel.createSuspension(
            driverId, 
            type, 
            reason, 
            durationHours, 
            createdBy
        );

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error creando suspensión:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Levantar suspensión
router.post('/lift', async (req, res) => {
    try {
        const { suspensionId, liftedBy, liftedReason } = req.body;
        
        if (!suspensionId || !liftedBy || !liftedReason) {
            return res.status(400).json({ 
                success: false, 
                error: 'Faltan campos requeridos' 
            });
        }

        const result = await suspensionsModel.liftSuspension(suspensionId, liftedBy, liftedReason);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error levantando suspensión:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Verificar suspensiones expiradas
router.post('/check-expired', async (req, res) => {
    try {
        const expiredCount = await suspensionsModel.checkExpiredSuspensions();
        res.json({ 
            success: true, 
            message: `${expiredCount} suspensiones expiradas actualizadas` 
        });
    } catch (error) {
        console.error('Error verificando suspensiones expiradas:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;