// routes/surge-engine.js - Motor de Surge Pricing Automático
const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'taxiapp.db');

// ==================== CONFIGURACIÓN DEL ALGORITMO ====================
const SURGE_CONFIG = {
    // Umbrales de activación
    thresholds: {
        minRequestsPerMinute: 3,      // Mínimo de solicitudes por minuto para considerar surge
        driverUtilization: 0.8,       // 80% de conductores ocupados = surge
        avgWaitTime: 5,               // Más de 5 min de espera promedio = surge
        requestToDriverRatio: 2        // 2 solicitudes por cada conductor libre = surge
    },
    
    // Factores de multiplicador
    multiplierFactors: {
        low: { min: 1.0, max: 1.2 },      // Demanda baja
        medium: { min: 1.2, max: 1.5 },   // Demanda media
        high: { min: 1.5, max: 2.0 },     // Demanda alta
        extreme: { min: 2.0, max: 3.0 }   // Demanda extrema
    },
    
    // Configuración de zonas
    zoneRadius: 2, // Radio en km para calcular demanda por zona
    
    // Intervalos de actualización
    updateInterval: 30000, // Actualizar cada 30 segundos
    dataWindow: 300000,    // Ventana de datos de 5 minutos
    
    // Suavizado
    smoothingFactor: 0.3   // Factor de suavizado para evitar cambios bruscos
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

// Inicializar tablas necesarias
function initializeTables() {
    const db = new sqlite3.Database(dbPath);
    
    // Tabla para métricas en tiempo real
    db.run(`
        CREATE TABLE IF NOT EXISTS surge_metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            zone_id INTEGER,
            zone_name VARCHAR(100),
            lat REAL,
            lng REAL,
            active_trips INTEGER DEFAULT 0,
            available_drivers INTEGER DEFAULT 0,
            pending_requests INTEGER DEFAULT 0,
            avg_wait_time REAL DEFAULT 0,
            requests_per_minute REAL DEFAULT 0,
            current_multiplier REAL DEFAULT 1.0,
            recommended_multiplier REAL DEFAULT 1.0,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    // Tabla para historial de surge
    db.run(`
        CREATE TABLE IF NOT EXISTS surge_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            zone_id INTEGER,
            multiplier_before REAL,
            multiplier_after REAL,
            trigger_reason VARCHAR(100),
            metrics TEXT,
            activated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            deactivated_at DATETIME
        )
    `);
    
    // Tabla para solicitudes (tracking)
    db.run(`
        CREATE TABLE IF NOT EXISTS trip_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            origin_lat REAL,
            origin_lng REAL,
            destination_lat REAL,
            destination_lng REAL,
            status VARCHAR(50),
            wait_time INTEGER,
            surge_multiplier REAL DEFAULT 1.0,
            requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            assigned_at DATETIME,
            completed_at DATETIME
        )
    `);
    
    db.close();
}

// ==================== ALGORITMO DE CÁLCULO ====================

// Calcular multiplicador basado en métricas
function calculateMultiplier(metrics) {
    let score = 0;
    let factors = [];
    
    // Factor 1: Ratio de utilización de conductores
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
    
    // Factor 2: Solicitudes pendientes vs conductores disponibles
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
    
    // Factor 3: Tiempo de espera promedio
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
    
    // Factor 4: Velocidad de solicitudes
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
    
    // Determinar nivel de surge
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

// Aplicar suavizado al multiplicador
function smoothMultiplier(newMultiplier, currentMultiplier) {
    const smooth = SURGE_CONFIG.smoothingFactor;
    return currentMultiplier + (newMultiplier - currentMultiplier) * smooth;
}

// ==================== ENDPOINTS ====================

// Obtener estado actual del surge pricing
router.get('/status', (req, res) => {
    res.json({
        active: surgeState.isActive,
        multiplier: surgeState.currentMultiplier,
        zones: surgeState.zones,
        metrics: surgeState.metrics,
        lastUpdate: surgeState.lastUpdate
    });
});

// Actualizar métricas (llamado por el sistema cada X segundos)
router.post('/update-metrics', async (req, res) => {
    const db = new sqlite3.Database(dbPath);
    
    try {
        // Obtener métricas actuales del sistema
        const metrics = await new Promise((resolve, reject) => {
            db.get(`
                SELECT 
                    (SELECT COUNT(*) FROM trips WHERE status = 'in_progress') as activeTrips,
                    (SELECT COUNT(*) FROM drivers WHERE status = 'available' AND is_online = 1) as availableDrivers,
                    (SELECT COUNT(*) FROM trips WHERE status = 'pending') as pendingRequests,
                    (SELECT AVG(julianday(assigned_at) - julianday(created_at)) * 24 * 60 
                     FROM trips 
                     WHERE assigned_at IS NOT NULL 
                     AND created_at >= datetime('now', '-5 minutes')) as avgWaitTime,
                    (SELECT COUNT(*) * 1.0 / 5 
                     FROM trips 
                     WHERE created_at >= datetime('now', '-5 minutes')) as requestsPerMinute
            `, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        // Actualizar métricas globales
        surgeState.metrics = {
            activeTrips: metrics.activeTrips || 0,
            availableDrivers: metrics.availableDrivers || 0,
            pendingRequests: metrics.pendingRequests || 0,
            avgWaitTime: parseFloat((metrics.avgWaitTime || 0).toFixed(1)),
            requestsPerMinute: parseFloat((metrics.requestsPerMinute || 0).toFixed(1))
        };
        
        // Calcular nuevo multiplicador
        const calculation = calculateMultiplier(surgeState.metrics);
        
        // Aplicar suavizado
        const smoothedMultiplier = smoothMultiplier(
            calculation.multiplier, 
            surgeState.currentMultiplier
        );
        
        // Determinar si activar surge
        const shouldActivate = calculation.score > 0;
        
        // Actualizar estado
        const previousMultiplier = surgeState.currentMultiplier;
        surgeState.currentMultiplier = parseFloat(smoothedMultiplier.toFixed(1));
        surgeState.isActive = shouldActivate;
        surgeState.lastUpdate = new Date();
        
        // Guardar en base de datos
        db.run(`
            INSERT INTO surge_metrics 
            (zone_name, active_trips, available_drivers, pending_requests, 
             avg_wait_time, requests_per_minute, current_multiplier, recommended_multiplier)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
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
        
        // Si hubo cambio significativo, registrar en historial
        if (Math.abs(previousMultiplier - surgeState.currentMultiplier) > 0.1) {
            db.run(`
                INSERT INTO surge_history 
                (zone_id, multiplier_before, multiplier_after, trigger_reason, metrics)
                VALUES (?, ?, ?, ?, ?)
            `, [
                0, // Global zone
                previousMultiplier,
                surgeState.currentMultiplier,
                calculation.factors.join(', '),
                JSON.stringify(surgeState.metrics)
            ]);
        }
        
        db.close();
        
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
        db.close();
        console.error('Error actualizando métricas:', error);
        res.status(500).json({ error: error.message });
    }
});

// Obtener métricas por zona
router.get('/zone-metrics/:lat/:lng', async (req, res) => {
    const { lat, lng } = req.params;
    const db = new sqlite3.Database(dbPath);
    
    try {
        // Calcular métricas para una zona específica (radio de 2km)
        const metrics = await new Promise((resolve, reject) => {
            db.get(`
                SELECT 
                    COUNT(CASE WHEN status = 'in_progress' 
                         AND (pickup_lat - ?) * (pickup_lat - ?) + (pickup_lng - ?) * (pickup_lng - ?) < 0.0003 
                         THEN 1 END) as activeTrips,
                    COUNT(CASE WHEN status = 'pending' 
                         AND (pickup_lat - ?) * (pickup_lat - ?) + (pickup_lng - ?) * (pickup_lng - ?) < 0.0003 
                         THEN 1 END) as pendingRequests
                FROM trips
            `, [lat, lat, lng, lng, lat, lat, lng, lng], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        db.close();
        res.json(metrics);
        
    } catch (error) {
        db.close();
        res.status(500).json({ error: error.message });
    }
});

// Simular solicitud de viaje (para testing)
router.post('/simulate-request', (req, res) => {
    const { origin_lat, origin_lng, destination_lat, destination_lng } = req.body;
    const db = new sqlite3.Database(dbPath);
    
    db.run(`
        INSERT INTO trip_requests 
        (origin_lat, origin_lng, destination_lat, destination_lng, status, surge_multiplier)
        VALUES (?, ?, ?, ?, 'pending', ?)
    `, [origin_lat, origin_lng, destination_lat, destination_lng, surgeState.currentMultiplier], function(err) {
        db.close();
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ 
                success: true, 
                requestId: this.lastID,
                surgeMultiplier: surgeState.currentMultiplier 
            });
        }
    });
});

// Obtener historial de surge
router.get('/history', (req, res) => {
    const db = new sqlite3.Database(dbPath);
    
    db.all(`
        SELECT * FROM surge_history 
        ORDER BY activated_at DESC 
        LIMIT 50
    `, (err, rows) => {
        db.close();
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows.map(row => ({
                ...row,
                metrics: JSON.parse(row.metrics || '{}')
            })));
        }
    });
});

// Inicializar motor de surge automático
function startSurgeEngine() {
    console.log('🚀 Motor de Surge Pricing Automático iniciado');
    
    // Actualizar métricas automáticamente
    setInterval(async () => {
        try {
            const response = await fetch('http://localhost:3000/api/surge/update-metrics', {
                method: 'POST'
            });
            const data = await response.json();
            
            if (data.surge && data.surge.active) {
                console.log(`⚡ Surge activo: ${data.surge.multiplier}x - ${data.surge.factors.join(', ')}`);
            }
        } catch (error) {
            // Silenciar errores de actualización automática
        }
    }, SURGE_CONFIG.updateInterval);
}

// Inicializar tablas al cargar
initializeTables();

// Exportar para uso en otras partes del sistema
module.exports = router;
module.exports.surgeState = surgeState;
module.exports.startSurgeEngine = startSurgeEngine;