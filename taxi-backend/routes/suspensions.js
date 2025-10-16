const express = require('express');
const router = express.Router();
const suspensionsModel = require('../models/suspensions');

// Obtener todas las suspensiones activas
router.get('/active', (req, res) => {
    try {
        const suspensions = suspensionsModel.getActiveSuspensions();
        res.json({ success: true, data: suspensions });
    } catch (error) {
        console.error('Error obteniendo suspensiones activas:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Obtener historial completo
router.get('/history', (req, res) => {
    try {
        const suspensions = suspensionsModel.getAllSuspensions();
        res.json({ success: true, data: suspensions });
    } catch (error) {
        console.error('Error obteniendo historial:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Obtener estadísticas
router.get('/stats', (req, res) => {
    try {
        const stats = suspensionsModel.getStatistics();
        res.json({ success: true, data: stats });
    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Obtener suspensiones de un conductor
router.get('/driver/:driverId', (req, res) => {
    try {
        const suspensions = suspensionsModel.getDriverSuspensions(req.params.driverId);
        res.json({ success: true, data: suspensions });
    } catch (error) {
        console.error('Error obteniendo suspensiones del conductor:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Crear nueva suspensión
router.post('/create', (req, res) => {
    try {
        const { driverId, type, reason, durationHours, createdBy } = req.body;
        
        // Validaciones
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

        const result = suspensionsModel.createSuspension(
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
router.post('/lift', (req, res) => {
    try {
        const { suspensionId, liftedBy, liftedReason } = req.body;
        
        if (!suspensionId || !liftedBy || !liftedReason) {
            return res.status(400).json({ 
                success: false, 
                error: 'Faltan campos requeridos' 
            });
        }

        const result = suspensionsModel.liftSuspension(suspensionId, liftedBy, liftedReason);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error levantando suspensión:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Verificar suspensiones expiradas (se debe llamar periódicamente)
router.post('/check-expired', (req, res) => {
    try {
        const expiredCount = suspensionsModel.checkExpiredSuspensions();
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