const express = require('express');
const router = express.Router();

// Almacén temporal de alertas
let systemAlerts = [];

// Generar alertas automáticas
function checkSystemAlerts(io, db) {
    console.log('🔄 Sistema de alertas configurado - verificación cada 30 segundos');
    
    setInterval(() => {
        const alerts = [];
        
        try {
            // Solo verificar cancelaciones recientes (esto sí funciona)
            const recentCancellations = db.prepare(`
                SELECT COUNT(*) as count 
                FROM trips 
                WHERE status = 'cancelled' 
                AND datetime(created_at) > datetime('now', '-30 minutes')
            `).get();
            
            if (recentCancellations && recentCancellations.count > 3) {
                alerts.push({
                    id: Date.now() + Math.random(),
                    type: 'warning',
                    title: 'Múltiples cancelaciones',
                    message: `${recentCancellations.count} viajes cancelados en los últimos 30 minutos`,
                    timestamp: new Date(),
                    resolved: false
                });
            }
        } catch (error) {
            // Silenciar errores para no romper el servidor
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
    const activeAlerts = systemAlerts.filter(a => !a.resolved);
    res.json({
        success: true,
        alerts: activeAlerts,
        count: activeAlerts.length
    });
});

// Obtener todas las alertas
router.get('/all', (req, res) => {
    res.json({
        success: true,
        alerts: systemAlerts,
        total: systemAlerts.length
    });
});

// Crear alerta de prueba
router.post('/test', (req, res) => {
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
});

// Resolver alerta
router.post('/resolve/:id', (req, res) => {
    const alert = systemAlerts.find(a => a.id == req.params.id);
    if (alert) {
        alert.resolved = true;
        alert.resolvedAt = new Date();
        res.json({ success: true, message: 'Alerta resuelta' });
    } else {
        res.status(404).json({ error: 'Alerta no encontrada' });
    }
});

module.exports = { router, checkSystemAlerts };