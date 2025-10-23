// routes/zones-management.js
const express = require('express');
const router = express.Router();
const db = require('../config/database');

// ==================== FUNCIONES AUXILIARES ====================

function toRad(deg) {
    return deg * (Math.PI/180);
}

function isPointInZone(point, zone) {
    const R = 6371;
    const coords = typeof zone.coordinates === 'string' 
        ? JSON.parse(zone.coordinates) 
        : zone.coordinates;
    
    const dLat = toRad(point.lat - coords.lat);
    const dLon = toRad(point.lng - coords.lng);
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(toRad(coords.lat)) * Math.cos(toRad(point.lat)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return distance <= zone.radius_km;
}

// ==================== ENDPOINTS ====================

// Obtener todas las zonas
router.get('/', async (req, res) => {
    try {
        const { active, type } = req.query;
        
        let query = 'SELECT * FROM special_zones WHERE 1=1';
        const params = [];
        
        if (active !== undefined) {
            params.push(active === 'true');
            query += ` AND active = $${params.length}`;
        }
        
        if (type) {
            params.push(type);
            query += ` AND zone_type = $${params.length}`;
        }
        
        query += ' ORDER BY priority DESC, zone_name ASC';
        
        const result = await db.query(query, params);
        
        const zones = result.rows.map(zone => ({
            ...zone,
            coordinates: typeof zone.coordinates === 'string' 
                ? JSON.parse(zone.coordinates) 
                : zone.coordinates,
            polygon_coords: zone.polygon_coords 
                ? (typeof zone.polygon_coords === 'string' 
                    ? JSON.parse(zone.polygon_coords) 
                    : zone.polygon_coords)
                : null,
            schedule: zone.schedule 
                ? (typeof zone.schedule === 'string' 
                    ? JSON.parse(zone.schedule) 
                    : zone.schedule)
                : null
        }));
        
        res.json(zones);
    } catch (error) {
        console.error('Error obteniendo zonas:', error);
        res.status(500).json({ error: error.message });
    }
});

// Obtener una zona específica
router.get('/:id', async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM special_zones WHERE id = $1',
            [req.params.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Zona no encontrada' });
        }
        
        const zone = result.rows[0];
        zone.coordinates = typeof zone.coordinates === 'string' 
            ? JSON.parse(zone.coordinates) 
            : zone.coordinates;
        zone.polygon_coords = zone.polygon_coords 
            ? (typeof zone.polygon_coords === 'string' 
                ? JSON.parse(zone.polygon_coords) 
                : zone.polygon_coords)
            : null;
        zone.schedule = zone.schedule 
            ? (typeof zone.schedule === 'string' 
                ? JSON.parse(zone.schedule) 
                : zone.schedule)
            : null;
        
        res.json(zone);
    } catch (error) {
        console.error('Error obteniendo zona:', error);
        res.status(500).json({ error: error.message });
    }
});

// Crear nueva zona
router.post('/', async (req, res) => {
    try {
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
        
        if (!zone_name || !zone_type || !coordinates) {
            return res.status(400).json({ 
                error: 'Campos requeridos: zone_name, zone_type, coordinates' 
            });
        }
        
        const result = await db.query(`
            INSERT INTO special_zones 
            (zone_name, zone_type, coordinates, radius_km, polygon_coords, 
             surcharge, multiplier, color, icon, description, restrictions, 
             schedule, priority, active, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true, NOW(), NOW())
            RETURNING *
        `, [
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
        ]);
        
        const zone = result.rows[0];
        zone.coordinates = JSON.parse(zone.coordinates);
        zone.polygon_coords = zone.polygon_coords ? JSON.parse(zone.polygon_coords) : null;
        zone.schedule = zone.schedule ? JSON.parse(zone.schedule) : null;
        
        res.status(201).json({
            success: true,
            message: 'Zona creada exitosamente',
            zone
        });
    } catch (error) {
        console.error('Error creando zona:', error);
        res.status(500).json({ error: error.message });
    }
});

// Actualizar zona
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        const fields = [];
        const values = [];
        let paramCount = 1;
        
        Object.keys(updates).forEach(key => {
            if (key !== 'id') {
                fields.push(`${key} = $${paramCount}`);
                paramCount++;
                
                if (key === 'coordinates' || key === 'polygon_coords' || key === 'schedule') {
                    values.push(JSON.stringify(updates[key]));
                } else if (key === 'active') {
                    values.push(updates[key] ? true : false);
                } else {
                    values.push(updates[key]);
                }
            }
        });
        
        if (fields.length === 0) {
            return res.status(400).json({ error: 'No hay campos para actualizar' });
        }
        
        fields.push(`updated_at = NOW()`);
        values.push(id);
        
        const query = `UPDATE special_zones SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
        
        const result = await db.query(query, values);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Zona no encontrada' });
        }
        
        const zone = result.rows[0];
        zone.coordinates = typeof zone.coordinates === 'string' 
            ? JSON.parse(zone.coordinates) 
            : zone.coordinates;
        zone.polygon_coords = zone.polygon_coords 
            ? (typeof zone.polygon_coords === 'string' 
                ? JSON.parse(zone.polygon_coords) 
                : zone.polygon_coords)
            : null;
        zone.schedule = zone.schedule 
            ? (typeof zone.schedule === 'string' 
                ? JSON.parse(zone.schedule) 
                : zone.schedule)
            : null;
        
        res.json({
            success: true,
            message: 'Zona actualizada exitosamente',
            zone
        });
    } catch (error) {
        console.error('Error actualizando zona:', error);
        res.status(500).json({ error: error.message });
    }
});

// Eliminar zona (soft delete - solo desactiva)
router.delete('/:id', async (req, res) => {
    try {
        const { hard } = req.query;
        
        let result;
        if (hard === 'true') {
            result = await db.query(
                'DELETE FROM special_zones WHERE id = $1 RETURNING id',
                [req.params.id]
            );
        } else {
            result = await db.query(
                'UPDATE special_zones SET active = false WHERE id = $1 RETURNING id',
                [req.params.id]
            );
        }
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Zona no encontrada' });
        }
        
        res.json({
            success: true,
            message: hard === 'true' ? 'Zona eliminada permanentemente' : 'Zona desactivada'
        });
    } catch (error) {
        console.error('Error eliminando zona:', error);
        res.status(500).json({ error: error.message });
    }
});

// Verificar si un punto está en alguna zona
router.post('/check-point', async (req, res) => {
    try {
        const { lat, lng } = req.body;
        
        if (!lat || !lng) {
            return res.status(400).json({ error: 'Se requieren lat y lng' });
        }
        
        const result = await db.query(
            'SELECT * FROM special_zones WHERE active = true'
        );
        
        const zones = result.rows;
        const activeZones = [];
        let totalSurcharge = 0;
        let maxMultiplier = 1.0;
        
        zones.forEach(zone => {
            zone.coordinates = typeof zone.coordinates === 'string' 
                ? JSON.parse(zone.coordinates) 
                : zone.coordinates;
            
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
    } catch (error) {
        console.error('Error verificando punto:', error);
        res.status(500).json({ error: error.message });
    }
});

// Obtener estadísticas de zonas
router.get('/stats/summary', async (req, res) => {
    try {
        const stats = {};
        
        // Total de zonas
        const totalResult = await db.query('SELECT COUNT(*) as count FROM special_zones');
        stats.total = parseInt(totalResult.rows[0].count);
        
        // Zonas activas
        const activeResult = await db.query('SELECT COUNT(*) as count FROM special_zones WHERE active = true');
        stats.active = parseInt(activeResult.rows[0].count);
        
        // Por tipo
        const byTypeResult = await db.query('SELECT zone_type, COUNT(*) as count FROM special_zones GROUP BY zone_type');
        stats.by_type = {};
        byTypeResult.rows.forEach(row => {
            stats.by_type[row.zone_type] = parseInt(row.count);
        });
        
        res.json(stats);
    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;