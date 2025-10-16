const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Obtener todos los viajes activos
router.get('/active', (req, res) => {
    const query = `
        SELECT 
            t.id as trip_id,
            t.status,
            t.pickup_location,
            t.destination,
            t.price,
            t.created_at,
            d.id as driver_id,
            d.name as driver_name,
            d.phone as driver_phone,
            d.vehicle_model,
            d.vehicle_plate,
            d.vehicle_color,
            u.id as user_id,
            u.name as user_name,
            u.phone as user_phone
        FROM trips t
        LEFT JOIN drivers d ON t.driver_id = d.id
        LEFT JOIN users u ON t.user_id = u.id
        WHERE t.status IN ('pending', 'accepted', 'in_progress')
        ORDER BY t.created_at DESC
    `;
    
    db.all(query, [], (err, trips) => {
        if (err) {
            console.error('Error obteniendo viajes:', err);
            return res.status(500).json({ 
                success: false, 
                error: 'Error al obtener viajes activos' 
            });
        }
        
        // Agregar coordenadas simuladas para visualización
        const tripsWithLocation = trips.map(trip => ({
            ...trip,
            pickup_coords: {
                lat: 18.4861 + (Math.random() - 0.5) * 0.05,
                lng: -69.9312 + (Math.random() - 0.5) * 0.05
            },
            destination_coords: {
                lat: 18.4861 + (Math.random() - 0.5) * 0.05,
                lng: -69.9312 + (Math.random() - 0.5) * 0.05
            },
            driver_location: trip.driver_id ? {
                lat: 18.4861 + (Math.random() - 0.5) * 0.05,
                lng: -69.9312 + (Math.random() - 0.5) * 0.05
            } : null
        }));
        
        res.json({
            success: true,
            count: tripsWithLocation.length,
            trips: tripsWithLocation
        });
    });
});

// Obtener estadísticas de viajes
router.get('/stats', (req, res) => {
    const queries = {
        pending: "SELECT COUNT(*) as count FROM trips WHERE status = 'pending'",
        accepted: "SELECT COUNT(*) as count FROM trips WHERE status = 'accepted'",
        in_progress: "SELECT COUNT(*) as count FROM trips WHERE status = 'in_progress'",
        completed_today: `
            SELECT COUNT(*) as count FROM trips 
            WHERE status = 'completed' 
            AND date(created_at) = date('now')
        `
    };
    
    const stats = {};
    let completed = 0;
    
    Object.keys(queries).forEach(key => {
        db.get(queries[key], [], (err, row) => {
            stats[key] = row ? row.count : 0;
            completed++;
            
            if (completed === Object.keys(queries).length) {
                res.json({
                    success: true,
                    stats
                });
            }
        });
    });
});

// Crear viaje de prueba
router.post('/create-test', (req, res) => {
    const testTrip = {
        user_id: 1,
        driver_id: Math.random() > 0.5 ? 1 : null,
        pickup_location: 'Plaza Central, Santo Domingo',
        destination: 'Aeropuerto Las Américas',
        status: ['pending', 'accepted', 'in_progress'][Math.floor(Math.random() * 3)],
        price: 500 + Math.floor(Math.random() * 1500)
    };
    
    db.run(
        `INSERT INTO trips (user_id, driver_id, pickup_location, destination, status, price) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [testTrip.user_id, testTrip.driver_id, testTrip.pickup_location, 
         testTrip.destination, testTrip.status, testTrip.price],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            res.json({
                success: true,
                message: 'Viaje de prueba creado',
                tripId: this.lastID
            });
        }
    );
});

module.exports = router;