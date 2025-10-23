const express = require('express');
const router = express.Router();
const db = require('../config/database');

// FUNCIÓN AUXILIAR: Calcular distancia entre dos puntos (Haversine)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// CREAR NUEVO VIAJE CON ASIGNACIÓN AUTOMÁTICA
router.post('/create', async (req, res) => {
    try {
        const { user_id, pickup_location, destination, vehicle_type, payment_method, estimated_price, pickup_coords } = req.body;

        if (!pickup_coords || !pickup_coords.latitude || !pickup_coords.longitude) {
            return res.status(400).json({ 
                error: 'Coordenadas de ubicación requeridas',
                success: false 
            });
        }

        const tripResult = await db.query(
            `INSERT INTO trips (user_id, pickup_location, destination, status, price, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW())
             RETURNING id`,
            [user_id, pickup_location, destination, 'pending', estimated_price || 0]
        );

        const tripId = tripResult.rows[0].id;
        console.log(`✅ Viaje ${tripId} creado, buscando conductor...`);

        try {
            // BUSCAR CONDUCTORES DISPONIBLES
            const driversResult = await db.query(
                `SELECT id, name, phone, vehicle_model, vehicle_plate, rating, 
                        current_latitude, current_longitude, fcm_token
                 FROM drivers 
                 WHERE status IN ('available', 'online')`
            );

            const availableDrivers = driversResult.rows || [];
            console.log(`📍 Conductores disponibles: ${availableDrivers.length}`);

            if (availableDrivers.length === 0) {
                console.log('⚠️ No hay conductores disponibles');
                return res.json({
                    success: true,
                    tripId: tripId,
                    message: 'Viaje creado, pero no hay conductores disponibles',
                    driverFound: false
                });
            }

            // CALCULAR DISTANCIAS
            const driversWithDistance = availableDrivers
                .filter(d => d.current_latitude && d.current_longitude)
                .map(driver => ({
                    ...driver,
                    distance: calculateDistance(
                        pickup_coords.latitude,
                        pickup_coords.longitude,
                        driver.current_latitude,
                        driver.current_longitude
                    )
                }))
                .sort((a, b) => a.distance - b.distance);

            console.log(`🔍 Conductores con distancia calculada: ${driversWithDistance.length}`);

            if (driversWithDistance.length === 0) {
                console.log('⚠️ Ningún conductor tiene ubicación registrada');
                return res.json({
                    success: true,
                    tripId: tripId,
                    message: 'Viaje creado, buscando conductor...',
                    driverFound: false
                });
            }

            const nearestDriver = driversWithDistance[0];
            console.log(`✅ Conductor más cercano: ${nearestDriver.name} (${nearestDriver.distance.toFixed(2)} km)`);

            // ASIGNAR CONDUCTOR
            await db.query(
                `UPDATE trips SET driver_id = $1, status = $2 WHERE id = $3`,
                [nearestDriver.id, 'assigned', tripId]
            );

            // OBTENER INFO DEL USUARIO
            const userResult = await db.query(
                `SELECT name, phone FROM users WHERE id = $1`,
                [user_id]
            );

            const user = userResult.rows[0] || {};

            // ENVIAR NOTIFICACIÓN FCM AL CONDUCTOR ASIGNADO
            if (nearestDriver.fcm_token) {
                const message = {
                    notification: {
                        title: '🚗 Nuevo Viaje Asignado',
                        body: `Pasajero: ${user.name || 'Usuario'}\nDistancia: ${nearestDriver.distance.toFixed(1)} km`
                    },
                    data: {
                        tripId: tripId.toString(),
                        user: user.name || 'Usuario',
                        phone: user.phone || '',
                        pickup: pickup_location,
                        destination: destination,
                        distance: nearestDriver.distance.toFixed(2),
                        type: 'TRIP_ASSIGNED'
                    },
                    token: nearestDriver.fcm_token
                };

                try {
                    const admin = require('firebase-admin');
                    await admin.messaging().send(message);
                    console.log(`✅ Notificación enviada a ${nearestDriver.name}`);
                } catch (error) {
                    console.error('❌ Error enviando notificación FCM:', error);
                }
            }

            res.json({
                success: true,
                tripId: tripId,
                message: 'Conductor asignado exitosamente',
                driverFound: true,
                driver: {
                    id: nearestDriver.id,
                    name: nearestDriver.name,
                    phone: nearestDriver.phone,
                    vehicle: {
                        model: nearestDriver.vehicle_model,
                        plate: nearestDriver.vehicle_plate
                    },
                    rating: nearestDriver.rating,
                    distance: nearestDriver.distance.toFixed(2),
                    location: {
                        latitude: nearestDriver.current_latitude,
                        longitude: nearestDriver.current_longitude
                    },
                    eta: Math.ceil(nearestDriver.distance * 3)
                }
            });

        } catch (error) {
            console.error('❌ Error asignando conductor:', error);
            res.json({
                success: true,
                tripId: tripId,
                message: 'Viaje creado, error buscando conductor',
                driverFound: false
            });
        }
    } catch (error) {
        console.error('❌ Error creando viaje:', error);
        res.status(500).json({ error: 'Error al crear viaje', success: false });
    }
});

// ASIGNAR CONDUCTOR A VIAJE
router.put('/assign/:tripId', async (req, res) => {
    try {
        const { tripId } = req.params;
        const { driver_id, price } = req.body;
        
        const result = await db.query(
            `UPDATE trips SET driver_id = $1, price = $2, status = $3 WHERE id = $4 RETURNING *`,
            [driver_id, price, 'assigned', tripId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Viaje no encontrado' });
        }
        
        res.json({
            success: true,
            message: 'Conductor asignado al viaje',
            trip: result.rows[0]
        });
    } catch (error) {
        console.error('Error asignando conductor:', error);
        res.status(500).json({ error: 'Error al asignar conductor' });
    }
});

// ACTUALIZAR ESTADO DEL VIAJE
router.put('/status/:tripId', async (req, res) => {
    try {
        const { tripId } = req.params;
        const { status } = req.body;
        
        const validStatuses = ['pending', 'assigned', 'accepted', 'arrived', 'started', 'completed', 'cancelled'];
        
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Estado inválido' });
        }
        
        const result = await db.query(
            `UPDATE trips SET status = $1 WHERE id = $2 RETURNING *`,
            [status, tripId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Viaje no encontrado' });
        }
        
        res.json({
            success: true,
            message: `Estado actualizado a: ${status}`,
            trip: result.rows[0]
        });
    } catch (error) {
        console.error('Error actualizando estado:', error);
        res.status(500).json({ error: 'Error al actualizar estado' });
    }
});

// OBTENER VIAJES ACTIVOS
router.get('/active', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT t.*, u.name as user_name, u.phone as user_phone,
                   d.name as driver_name, d.phone as driver_phone, d.vehicle_model
            FROM trips t
            LEFT JOIN users u ON t.user_id = u.id
            LEFT JOIN drivers d ON t.driver_id = d.id
            WHERE t.status NOT IN ('completed', 'cancelled')
            ORDER BY t.created_at DESC
        `);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener viajes activos:', error);
        res.status(500).json({ error: 'Error al obtener viajes' });
    }
});

// OBTENER HISTORIAL DE VIAJES
router.get('/history/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const result = await db.query(
            `SELECT t.*, d.name as driver_name, d.vehicle_model
             FROM trips t
             LEFT JOIN drivers d ON t.driver_id = d.id
             WHERE t.user_id = $1
             ORDER BY t.created_at DESC`,
            [userId]
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener historial:', error);
        res.status(500).json({ error: 'Error al obtener historial' });
    }
});

// OBTENER TODOS LOS VIAJES
router.get('/', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM trips ORDER BY created_at DESC');
        
        res.json({
            success: true,
            trips: result.rows || []
        });
    } catch (error) {
        console.error('Error obteniendo viajes:', error);
        res.status(500).json({ error: 'Error obteniendo viajes' });
    }
});

module.exports = router;