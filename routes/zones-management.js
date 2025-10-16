// routes/zones-management.js
const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'taxiapp.db');

// ==================== FUNCIONES AUXILIARES ====================

// Calcular si un punto está dentro de una zona circular
function isPointInZone(point, zone) {
    const R = 6371; // Radio de la Tierra en km
    const coords = JSON.parse(zone.coordinates);
    
    const dLat = toRad(point.lat - coords.lat);
    const dLon = toRad(point.lng - coords.lng);
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(toRad(coords.lat)) * Math.cos(toRad(point.lat)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return distance <= zone.radius_km;
}

function toRad(deg) {
    return deg * (Math.PI/180);
}

// ==================== ENDPOINTS ====================

// Obtener todas las zonas
router.get('/', (req, res) => {
    const db = new sqlite3.Database(dbPath);
    const { active, type } = req.query;
    
    let query = 'SELECT * FROM special_zones WHERE 1=1';
    const params = [];
    
    if (active !== undefined) {
        query += ' AND active = ?';
        params.push(active === 'true' ? 1 : 0);
    }
    
    if (type) {
        query += ' AND zone_type = ?';
        params.push(type);
    }
    
    query += ' ORDER BY priority DESC, zone_name ASC';
    
    db.all(query, params, (err, zones) => {
        db.close();
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        // Parsear coordenadas JSON
        zones = zones.map(zone => ({
            ...zone,
            coordinates: JSON.parse(zone.coordinates),
            polygon_coords: zone.polygon_coords ? JSON.parse(zone.polygon_coords) : null,
            schedule: zone.schedule ? JSON.parse(zone.schedule) : null,
            active: zone.active === 1
        }));
        
        res.json(zones);
    });
});

// Obtener una zona específica
router.get('/:id', (req, res) => {
    const db = new sqlite3.Database(dbPath);
    
    db.get('SELECT * FROM special_zones WHERE id = ?', [req.params.id], (err, zone) => {
        db.close();
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!zone) {
            return res.status(404).json({ error: 'Zona no encontrada' });
        }
        
        zone.coordinates = JSON.parse(zone.coordinates);
        zone.polygon_coords = zone.polygon_coords ? JSON.parse(zone.polygon_coords) : null;
        zone.schedule = zone.schedule ? JSON.parse(zone.schedule) : null;
        zone.active = zone.active === 1;
        
        res.json(zone);
    });
});

// Crear nueva zona
router.post('/', (req, res) => {
    const db = new sqlite3.Database(dbPath);
    const {
        zone_name,
        zone_type,
        coordinates,
        radius_km = 1.0,
        polygon_coords,
        surcharge = 0,
        multiplier = 1.0,
        color = '#FF6B6B',
        icon = 'map-pin',
        description,
        restrictions,
        schedule,
        priority = 0
    } = req.body;
    
    // Validaciones
    if (!zone_name || !zone_type || !coordinates) {
        db.close();
        return res.status(400).json({ 
            error: 'Campos requeridos: zone_name, zone_type, coordinates' 
        });
    }
    
    const query = `
        INSERT INTO special_zones 
        (zone_name, zone_type, coordinates, radius_km, polygon_coords, 
         surcharge, multiplier, color, icon, description, restrictions, 
         schedule, priority, active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `;
    
    const params = [
        zone_name,
        zone_type,
        JSON.stringify(coordinates),
        radius_km,
        polygon_coords ? JSON.stringify(polygon_coords) : null,
        surcharge,
        multiplier,
        color,
        icon,
        description,
        restrictions,
        schedule ? JSON.stringify(schedule) : null,
        priority
    ];
    
    db.run(query, params, function(err) {
        if (err) {
            db.close();
            return res.status(500).json({ error: err.message });
        }
        
        // Obtener la zona recién creada
        db.get('SELECT * FROM special_zones WHERE id = ?', [this.lastID], (err, zone) => {
            db.close();
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            zone.coordinates = JSON.parse(zone.coordinates);
            zone.polygon_coords = zone.polygon_coords ? JSON.parse(zone.polygon_coords) : null;
            zone.schedule = zone.schedule ? JSON.parse(zone.schedule) : null;
            zone.active = zone.active === 1;
            
            res.status(201).json({
                success: true,
                message: 'Zona creada exitosamente',
                zone
            });
        });
    });
});

// Actualizar zona
router.put('/:id', (req, res) => {
    const db = new sqlite3.Database(dbPath);
    const { id } = req.params;
    const updates = req.body;
    
    // Construir query dinámicamente
    const fields = [];
    const values = [];
    
    Object.keys(updates).forEach(key => {
        if (key !== 'id') {
            fields.push(`${key} = ?`);
            
            // Convertir objetos a JSON string
            if (key === 'coordinates' || key === 'polygon_coords' || key === 'schedule') {
                values.push(JSON.stringify(updates[key]));
            } else if (key === 'active') {
                values.push(updates[key] ? 1 : 0);
            } else {
                values.push(updates[key]);
            }
        }
    });
    
    if (fields.length === 0) {
        db.close();
        return res.status(400).json({ error: 'No hay campos para actualizar' });
    }
    
    // Agregar updated_at
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    
    const query = `UPDATE special_zones SET ${fields.join(', ')} WHERE id = ?`;
    
    db.run(query, values, function(err) {
        if (err) {
            db.close();
            return res.status(500).json({ error: err.message });
        }
        
        if (this.changes === 0) {
            db.close();
            return res.status(404).json({ error: 'Zona no encontrada' });
        }
        
        // Obtener la zona actualizada
        db.get('SELECT * FROM special_zones WHERE id = ?', [id], (err, zone) => {
            db.close();
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            zone.coordinates = JSON.parse(zone.coordinates);
            zone.polygon_coords = zone.polygon_coords ? JSON.parse(zone.polygon_coords) : null;
            zone.schedule = zone.schedule ? JSON.parse(zone.schedule) : null;
            zone.active = zone.active === 1;
            
            res.json({
                success: true,
                message: 'Zona actualizada exitosamente',
                zone
            });
        });
    });
});

// Eliminar zona (soft delete - solo desactiva)
router.delete('/:id', (req, res) => {
    const db = new sqlite3.Database(dbPath);
    const { hard } = req.query;
    
    let query;
    if (hard === 'true') {
        query = 'DELETE FROM special_zones WHERE id = ?';
    } else {
        query = 'UPDATE special_zones SET active = 0 WHERE id = ?';
    }
    
    db.run(query, [req.params.id], function(err) {
        db.close();
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Zona no encontrada' });
        }
        
        res.json({
            success: true,
            message: hard === 'true' ? 'Zona eliminada permanentemente' : 'Zona desactivada'
        });
    });
});

// Verificar si un punto está en alguna zona
router.post('/check-point', (req, res) => {
    const db = new sqlite3.Database(dbPath);
    const { lat, lng } = req.body;
    
    if (!lat || !lng) {
        db.close();
        return res.status(400).json({ error: 'Se requieren lat y lng' });
    }
    
    db.all('SELECT * FROM special_zones WHERE active = 1', (err, zones) => {
        db.close();
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        const activeZones = [];
        let totalSurcharge = 0;
        let maxMultiplier = 1.0;
        
        zones.forEach(zone => {
            zone.coordinates = JSON.parse(zone.coordinates);
            if (isPointInZone({ lat, lng }, zone)) {
                activeZones.push({
                    id: zone.id,
                    name: zone.zone_name,
                    type: zone.zone_type,
                    surcharge: zone.surcharge,
                    multiplier: zone.multiplier,
                    color: zone.color,
                    icon: zone.icon
                });
                totalSurcharge += zone.surcharge;
                maxMultiplier = Math.max(maxMultiplier, zone.multiplier);
            }
        });
        
        res.json({
            point: { lat, lng },
            in_zones: activeZones.length > 0,
            zones: activeZones,
            total_surcharge: totalSurcharge,
            final_multiplier: maxMultiplier
        });
    });
});

// Obtener estadísticas de zonas
router.get('/stats/summary', (req, res) => {
    const db = new sqlite3.Database(dbPath);
    
    const queries = {
        total: 'SELECT COUNT(*) as count FROM special_zones',
        active: 'SELECT COUNT(*) as count FROM special_zones WHERE active = 1',
        by_type: 'SELECT zone_type, COUNT(*) as count FROM special_zones GROUP BY zone_type'
    };
    
    const stats = {};
    let completed = 0;
    
    // Total de zonas
    db.get(queries.total, (err, row) => {
        if (!err) stats.total = row.count;
        completed++;
        if (completed === 3) sendResponse();
    });
    
    // Zonas activas
    db.get(queries.active, (err, row) => {
        if (!err) stats.active = row.count;
        completed++;
        if (completed === 3) sendResponse();
    });
    
    // Por tipo
    db.all(queries.by_type, (err, rows) => {
        if (!err) {
            stats.by_type = {};
            rows.forEach(row => {
                stats.by_type[row.zone_type] = row.count;
            });
        }
        completed++;
        if (completed === 3) sendResponse();
    });
    
    function sendResponse() {
        db.close();
        res.json(stats);
    }
});

module.exports = router;