const express = require('express');
const router = express.Router();

// Almacén temporal de alertas
let systemAlerts = [];

// Generar alertas automáticas
function checkSystemAlerts(io, db) {
    console.log('🔄 Sistema de alertas configurado - verificación cada 30 segundos');
    
    setInterval(async () => {
        const alerts = [];
        
        try {
            // Solo verificar cancelaciones recientes
            const recentCancellations = await db.query(`
                SELECT COUNT(*) as count 
                FROM trips 
                WHERE status = 'cancelled' 
                AND created_at > NOW() - INTERVAL '30 minutes'
            `);
            
            const count = parseInt(recentCancellations.rows[0]?.count || 0, 10);
            
            if (count > 3) {
                alerts.push({
                    id: Date.now() + Math.random(),
                    type: 'warning',
                    title: 'Múltiples cancelaciones',
                    message: `${count} viajes cancelados en los últimos 30 minutos`,
                    timestamp: new Date(),
                    resolved: false
                });
            }
        } catch (error) {
            // Silenciar errores para no romper el servidor
            console.error('Error en checkSystemAlerts:', error);
        }
        
        // Enviar alertas nuevas al admin si hay alguna
        if (alerts.length > 0) {
            systemAlerts = [...alerts, ...systemAlerts].slice(0, 50);
            io.emit('new-system-alerts', alerts);
            console.log(`📢 ${alerts.length} nuevas alertas del sistema`);
        }
    }, 30000); // Cada 30 segundos
}

// Obtener alertas activas
router.get('/active', (req, res) => {
    try {
        const activeAlerts = systemAlerts.filter(a => !a.resolved);
        res.json({
            success: true,
            alerts: activeAlerts,
            count: activeAlerts.length
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Obtener todas las alertas
router.get('/all', (req, res) => {
    try {
        res.json({
            success: true,
            alerts: systemAlerts,
            total: systemAlerts.length
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Crear alerta de prueba
router.post('/test', (req, res) => {
    try {
        const testAlert = {
            id: Date.now(),
            type: 'warning',
            title: 'Alerta de Prueba',
            message: 'Esta es una alerta de prueba del sistema',
            timestamp: new Date(),
            resolved: false
        };
        systemAlerts.unshift(testAlert);
        res.json({ 
            success: true, 
            alert: testAlert 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Resolver alerta
router.post('/resolve/:id', (req, res) => {
    try {
        const alert = systemAlerts.find(a => a.id == req.params.id);
        if (alert) {
            alert.resolved = true;
            alert.resolvedAt = new Date();
            res.json({ success: true, message: 'Alerta resuelta' });
        } else {
            res.status(404).json({ error: 'Alerta no encontrada' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = { router, checkSystemAlerts };