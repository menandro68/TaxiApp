// routes/surge-engine.js - Motor de Surge Pricing Automático
const express = require('express');
const router = express.Router();
const db = require('../config/database');

// ==================== CONFIGURACIÓN DEL ALGORITMO ====================
const SURGE_CONFIG = {
    thresholds: {
        minRequestsPerMinute: 3,
        driverUtilization: 0.8,
        avgWaitTime: 5,
        requestToDriverRatio: 2
    },
    multiplierFactors: {
        low: { min: 1.0, max: 1.2 },
        medium: { min: 1.2, max: 1.5 },
        high: { min: 1.5, max: 2.0 },
        extreme: { min: 2.0, max: 3.0 }
    },
    zoneRadius: 2,
    updateInterval: 30000,
    dataWindow: 300000,
    smoothingFactor: 0.3
};

// Variables globales para el estado del sistema
let surgeState = {
    isActive: false,
    currentMultiplier: 1.0,
    zones: {},
    lastUpdate: null,
    metrics: {
        activeTrips: 0,
        availableDrivers: 0,
        pendingRequests: 0,
        avgWaitTime: 0,
        requestsPerMinute: 0
    }
};

// ==================== ALGORITMO DE CÁLCULO ====================

function calculateMultiplier(metrics) {
    let score = 0;
    let factors = [];
    
    const utilizationRate = metrics.activeTrips / (metrics.availableDrivers + metrics.activeTrips || 1);
    if (utilizationRate > 0.9) {
        score += 3;
        factors.push('Utilización muy alta: ' + (utilizationRate * 100).toFixed(0) + '%');
    } else if (utilizationRate > 0.8) {
        score += 2;
        factors.push('Utilización alta: ' + (utilizationRate * 100).toFixed(0) + '%');
    } else if (utilizationRate > 0.7) {
        score += 1;
        factors.push('Utilización moderada: ' + (utilizationRate * 100).toFixed(0) + '%');
    }
    
    const requestRatio = metrics.pendingRequests / (metrics.availableDrivers || 1);
    if (requestRatio > 3) {
        score += 3;
        factors.push('Muchas solicitudes pendientes');
    } else if (requestRatio > 2) {
        score += 2;
        factors.push('Solicitudes pendientes moderadas');
    } else if (requestRatio > 1) {
        score += 1;
        factors.push('Algunas solicitudes pendientes');
    }
    
    if (metrics.avgWaitTime > 10) {
        score += 3;
        factors.push('Tiempo de espera muy alto: ' + metrics.avgWaitTime + ' min');
    } else if (metrics.avgWaitTime > 7) {
        score += 2;
        factors.push('Tiempo de espera alto: ' + metrics.avgWaitTime + ' min');
    } else if (metrics.avgWaitTime > 5) {
        score += 1;
        factors.push('Tiempo de espera moderado: ' + metrics.avgWaitTime + ' min');
    }
    
    if (metrics.requestsPerMinute > 10) {
        score += 3;
        factors.push('Demanda muy alta: ' + metrics.requestsPerMinute + ' req/min');
    } else if (metrics.requestsPerMinute > 5) {
        score += 2;
        factors.push('Demanda alta: ' + metrics.requestsPerMinute + ' req/min');
    } else if (metrics.requestsPerMinute > 3) {
        score += 1;
        factors.push('Demanda moderada: ' + metrics.requestsPerMinute + ' req/min');
    }
    
    let multiplier = 1.0;
    let level = 'normal';
    
    if (score >= 9) {
        level = 'extreme';
        multiplier = SURGE_CONFIG.multiplierFactors.extreme.min + 
                    (Math.random() * (SURGE_CONFIG.multiplierFactors.extreme.max - SURGE_CONFIG.multiplierFactors.extreme.min));
    } else if (score >= 6) {
        level = 'high';
        multiplier = SURGE_CONFIG.multiplierFactors.high.min + 
                    (Math.random() * (SURGE_CONFIG.multiplierFactors.high.max - SURGE_CONFIG.multiplierFactors.high.min));
    } else if (score >= 3) {
        level = 'medium';
        multiplier = SURGE_CONFIG.multiplierFactors.medium.min + 
                    (Math.random() * (SURGE_CONFIG.multiplierFactors.medium.max - SURGE_CONFIG.multiplierFactors.medium.min));
    } else if (score >= 1) {
        level = 'low';
        multiplier = SURGE_CONFIG.multiplierFactors.low.min + 
                    (Math.random() * (SURGE_CONFIG.multiplierFactors.low.max - SURGE_CONFIG.multiplierFactors.low.min));
    }
    
    return {
        multiplier: parseFloat(multiplier.toFixed(1)),
        level: level,
        score: score,
        factors: factors
    };
}

function smoothMultiplier(newMultiplier, currentMultiplier) {
    const smooth = SURGE_CONFIG.smoothingFactor;
    return currentMultiplier + (newMultiplier - currentMultiplier) * smooth;
}

// ==================== ENDPOINTS ====================

router.get('/status', (req, res) => {
    res.json({
        active: surgeState.isActive,
        multiplier: surgeState.currentMultiplier,
        zones: surgeState.zones,
        metrics: surgeState.metrics,
        lastUpdate: surgeState.lastUpdate
    });
});

router.post('/update-metrics', async (req, res) => {
    try {
        const metricsResult = await db.query(`
            SELECT 
                (SELECT COUNT(*) FROM trips WHERE status = 'in_progress')::int as activeTrips,
                (SELECT COUNT(*) FROM drivers WHERE status = 'available' AND is_online = true)::int as availableDrivers,
                (SELECT COUNT(*) FROM trips WHERE status = 'pending')::int as pendingRequests,
                COALESCE((SELECT AVG(EXTRACT(EPOCH FROM (assigned_at - created_at))/60) 
                 FROM trips 
                 WHERE assigned_at IS NOT NULL 
                 AND created_at >= NOW() - INTERVAL '5 minutes'), 0)::float as avgWaitTime,
                COALESCE((SELECT COUNT(*) * 1.0 / 5 
                 FROM trips 
                 WHERE created_at >= NOW() - INTERVAL '5 minutes'), 0)::float as requestsPerMinute
        `);
        
        const metrics = metricsResult.rows[0];
        
        surgeState.metrics = {
            activeTrips: metrics.activetrips || 0,
            availableDrivers: metrics.availabledrivers || 0,
            pendingRequests: metrics.pendingrequests || 0,
            avgWaitTime: parseFloat((metrics.avgwaittime || 0).toFixed(1)),
            requestsPerMinute: parseFloat((metrics.requestsperminute || 0).toFixed(1))
        };
        
        const calculation = calculateMultiplier(surgeState.metrics);
        const smoothedMultiplier = smoothMultiplier(calculation.multiplier, surgeState.currentMultiplier);
        const shouldActivate = calculation.score > 0;
        const previousMultiplier = surgeState.currentMultiplier;
        
        surgeState.currentMultiplier = parseFloat(smoothedMultiplier.toFixed(1));
        surgeState.isActive = shouldActivate;
        surgeState.lastUpdate = new Date();
        
        // Guardar métricas
        await db.query(`
            INSERT INTO surge_metrics 
            (zone_name, active_trips, available_drivers, pending_requests, 
             avg_wait_time, requests_per_minute, current_multiplier, recommended_multiplier, timestamp)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        `, [
            'Global',
            surgeState.metrics.activeTrips,
            surgeState.metrics.availableDrivers,
            surgeState.metrics.pendingRequests,
            surgeState.metrics.avgWaitTime,
            surgeState.metrics.requestsPerMinute,
            surgeState.currentMultiplier,
            calculation.multiplier
        ]);
        
        // Registrar cambios significativos
        if (Math.abs(previousMultiplier - surgeState.currentMultiplier) > 0.1) {
            await db.query(`
                INSERT INTO surge_history 
                (zone_id, multiplier_before, multiplier_after, trigger_reason, metrics, activated_at)
                VALUES ($1, $2, $3, $4, $5, NOW())
            `, [
                0,
                previousMultiplier,
                surgeState.currentMultiplier,
                calculation.factors.join(', '),
                JSON.stringify(surgeState.metrics)
            ]);
        }
        
        res.json({
            success: true,
            surge: {
                active: surgeState.isActive,
                multiplier: surgeState.currentMultiplier,
                level: calculation.level,
                score: calculation.score,
                factors: calculation.factors,
                metrics: surgeState.metrics
            }
        });
        
    } catch (error) {
        console.error('Error actualizando métricas:', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/zone-metrics/:lat/:lng', async (req, res) => {
    try {
        const { lat, lng } = req.params;
        
        const result = await db.query(`
            SELECT 
                COUNT(CASE WHEN status = 'in_progress' THEN 1 END)::int as activeTrips,
                COUNT(CASE WHEN status = 'pending' THEN 1 END)::int as pendingRequests
            FROM trips
            WHERE earth_distance(ll_to_earth($1, $2), ll_to_earth(pickup_lat, pickup_lng)) < 2000
        `, [parseFloat(lat), parseFloat(lng)]);
        
        res.json(result.rows[0] || { activeTrips: 0, pendingRequests: 0 });
        
    } catch (error) {
        console.error('Error obteniendo métricas de zona:', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/simulate-request', async (req, res) => {
    try {
        const { origin_lat, origin_lng, destination_lat, destination_lng } = req.body;
        
        const result = await db.query(`
            INSERT INTO trip_requests 
            (origin_lat, origin_lng, destination_lat, destination_lng, status, surge_multiplier, requested_at)
            VALUES ($1, $2, $3, $4, 'pending', $5, NOW())
            RETURNING id
        `, [origin_lat, origin_lng, destination_lat, destination_lng, surgeState.currentMultiplier]);
        
        res.json({
            success: true,
            requestId: result.rows[0].id,
            surgeMultiplier: surgeState.currentMultiplier
        });
        
    } catch (error) {
        console.error('Error simulando solicitud:', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/history', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT * FROM surge_history 
            ORDER BY activated_at DESC 
            LIMIT 50
        `);
        
        res.json(result.rows.map(row => ({
            ...row,
            metrics: typeof row.metrics === 'string' ? JSON.parse(row.metrics) : row.metrics
        })));
        
    } catch (error) {
        console.error('Error obteniendo historial:', error);
        res.status(500).json({ error: error.message });
    }
});

function startSurgeEngine() {
    console.log('🚀 Motor de Surge Pricing Automático iniciado');
    
    setInterval(async () => {
        try {
            // Actualizar métricas internamente sin hacer fetch HTTP
            const metricsResult = await db.query(`
                SELECT 
                    (SELECT COUNT(*) FROM trips WHERE status = 'in_progress')::int as activeTrips,
                    (SELECT COUNT(*) FROM drivers WHERE status = 'available' AND is_online = true)::int as availableDrivers,
                    (SELECT COUNT(*) FROM trips WHERE status = 'pending')::int as pendingRequests,
                    COALESCE((SELECT AVG(EXTRACT(EPOCH FROM (assigned_at - created_at))/60) 
                     FROM trips 
                     WHERE assigned_at IS NOT NULL 
                     AND created_at >= NOW() - INTERVAL '5 minutes'), 0)::float as avgWaitTime,
                    COALESCE((SELECT COUNT(*) * 1.0 / 5 
                     FROM trips 
                     WHERE created_at >= NOW() - INTERVAL '5 minutes'), 0)::float as requestsPerMinute
            `);
            
            const metrics = metricsResult.rows[0];
            surgeState.metrics = {
                activeTrips: metrics.activetrips || 0,
                availableDrivers: metrics.availabledrivers || 0,
                pendingRequests: metrics.pendingrequests || 0,
                avgWaitTime: parseFloat((metrics.avgwaittime || 0).toFixed(1)),
                requestsPerMinute: parseFloat((metrics.requestsperminute || 0).toFixed(1))
            };
            
            const calculation = calculateMultiplier(surgeState.metrics);
            const smoothedMultiplier = smoothMultiplier(calculation.multiplier, surgeState.currentMultiplier);
            
            surgeState.currentMultiplier = parseFloat(smoothedMultiplier.toFixed(1));
            surgeState.isActive = calculation.score > 0;
            surgeState.lastUpdate = new Date();
            
            if (surgeState.isActive) {
                console.log(`⚡ Surge activo: ${surgeState.currentMultiplier}x - ${calculation.factors.join(', ')}`);
            }
        } catch (error) {
            console.error('Error en actualización automática de surge:', error);
        }
    }, SURGE_CONFIG.updateInterval);
}

module.exports = router;
module.exports.surgeState = surgeState;
module.exports.startSurgeEngine = startSurgeEngine;