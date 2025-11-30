const express = require('express');
const router = express.Router();
const { db } = require('../config/database');

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

// CREAR NUEVO VIAJE - SIN ASIGNACIÓN AUTOMÁTICA
router.post('/create', async (req, res) => {
    try {
        const { user_id, pickup_location, destination, vehicle_type, payment_method, estimated_price, pickup_coords } = req.body;

        // VALIDAR user_id
        if (!user_id) {
            return res.status(400).json({ 
                error: 'user_id requerido',
                success: false 
            });
        }

        const userIdParsed = parseInt(user_id);
        if (isNaN(userIdParsed)) {
            return res.status(400).json({ 
                error: `user_id inválido: "${user_id}" no es un número`,
                success: false,
                receivedValue: user_id
            });
        }

        if (!pickup_coords || !pickup_coords.latitude || !pickup_coords.longitude) {
            return res.status(400).json({ 
                error: 'Coordenadas de ubicación requeridas',
                success: false 
            });
        }

        // CREAR VIAJE EN ESTADO "PENDING" (sin conductor asignado)
        const tripResult = await db.query(
            `INSERT INTO trips (user_id, pickup_location, destination, status, price, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW())
             RETURNING id`,
            [userIdParsed, pickup_location, destination, 'pending', estimated_price || 0]
        );

        const tripId = tripResult.rows[0].id;
        console.log(`✅ Viaje ${tripId} creado en estado PENDING`);

        // OBTENER INFO DEL USUARIO
        const userResult = await db.query(
            `SELECT name, phone FROM users WHERE id = $1`,
            [userIdParsed]
        );
        const user = userResult.rows[0] || {};

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
            return res.json({
                success: true,
                tripId: tripId,
                message: 'Viaje creado, buscando conductores...',
                driverFound: false
            });
        }

        // CALCULAR DISTANCIAS Y ORDENAR POR CERCANÍA
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

        if (driversWithDistance.length === 0) {
            return res.json({
                success: true,
                tripId: tripId,
                message: 'Viaje creado, esperando conductores con ubicación...',
                driverFound: false
            });
        }

        // ENVIAR NOTIFICACIÓN "NUEVO SERVICIO" AL CONDUCTOR MÁS CERCANO
        const nearestDriver = driversWithDistance[0];
        console.log(`📱 Enviando solicitud a: ${nearestDriver.name} (${nearestDriver.distance.toFixed(2)} km)`);

        if (nearestDriver.fcm_token) {
            const message = {
                notification: {
                    title: '🚕 Nuevo Servicio Disponible',
                    body: `Pasajero: ${user.name || 'Usuario'} - ${nearestDriver.distance.toFixed(1)} km de ti`
                },
                data: {
                    tripId: tripId.toString(),
                    type: 'NEW_TRIP_REQUEST',
                    user: user.name || 'Usuario',
                    phone: user.phone || '',
                    pickup: pickup_location,
                    destination: destination,
                    distance: nearestDriver.distance.toFixed(2),
                    estimatedPrice: (estimated_price || 0).toString(),
                    paymentMethod: payment_method || 'Efectivo',
                    vehicleType: vehicle_type || 'Estándar'
                },
                token: nearestDriver.fcm_token
            };

            try {
                const admin = require('firebase-admin');
                await admin.messaging().send(message);
                console.log(`✅ Solicitud enviada a ${nearestDriver.name}`);
                
                // Guardar qué conductor recibió la solicitud
                await db.query(
                    `UPDATE trips SET pending_driver_id = $1 WHERE id = $2`,
                    [nearestDriver.id, tripId]
                );
            } catch (error) {
                console.error('❌ Error enviando notificación FCM:', error);
            }
        }

        res.json({
            success: true,
            tripId: tripId,
            message: 'Viaje creado, esperando respuesta del conductor',
            status: 'pending',
            notifiedDriver: {
                id: nearestDriver.id,
                name: nearestDriver.name,
                distance: nearestDriver.distance.toFixed(2)
            }
        });

    } catch (error) {
        console.error('❌ Error creando viaje:', error);
        res.status(500).json({ error: 'Error al crear viaje', success: false });
    }
});

// CONDUCTOR ACEPTA EL VIAJE
router.post('/accept/:tripId', async (req, res) => {
    try {
        const { tripId } = req.params;
        const { driver_id } = req.body;

        if (!driver_id) {
            return res.status(400).json({ error: 'driver_id requerido' });
        }

        // Verificar que el viaje existe y está pendiente
        const tripCheck = await db.query(
            `SELECT * FROM trips WHERE id = $1 AND status = 'pending'`,
            [tripId]
        );

        if (tripCheck.rows.length === 0) {
            return res.status(400).json({ 
                error: 'Viaje no disponible o ya fue tomado',
                success: false 
            });
        }

        // Asignar conductor y cambiar estado a "assigned"
        const result = await db.query(
            `UPDATE trips SET driver_id = $1, status = 'assigned' WHERE id = $2 RETURNING *`,
            [driver_id, tripId]
        );

        // Obtener info del conductor
        const driverResult = await db.query(
            `SELECT id, name, phone, vehicle_model, vehicle_plate, rating, current_latitude, current_longitude
             FROM drivers WHERE id = $1`,
            [driver_id]
        );
        const driver = driverResult.rows[0];

        // Obtener info del usuario para notificarle
        const trip = result.rows[0];
        const userResult = await db.query(
            `SELECT fcm_token, name FROM users WHERE id = $1`,
            [trip.user_id]
        );
        const user = userResult.rows[0];

        // Notificar al usuario que un conductor aceptó
        if (user && user.fcm_token) {
            const admin = require('firebase-admin');
            await admin.messaging().send({
                notification: {
                    title: '🚗 Conductor Asignado',
                    body: `${driver.name} va en camino - ${driver.vehicle_model}`
                },
                data: {
                    type: 'DRIVER_ASSIGNED',
                    tripId: tripId.toString(),
                    driverName: driver.name,
                    driverPhone: driver.phone || '',
                    vehicleModel: driver.vehicle_model || '',
                    vehiclePlate: driver.vehicle_plate || ''
                },
                token: user.fcm_token
            });
            console.log(`✅ Usuario ${user.name} notificado del conductor asignado`);
        }

        // Actualizar estado del conductor a "busy"
        await db.query(
            `UPDATE drivers SET status = 'busy' WHERE id = $1`,
            [driver_id]
        );

        console.log(`✅ Viaje ${tripId} aceptado por conductor ${driver.name}`);

        res.json({
            success: true,
            message: 'Viaje aceptado exitosamente',
            trip: result.rows[0],
            driver: {
                id: driver.id,
                name: driver.name,
                phone: driver.phone,
                vehicle: {
                    model: driver.vehicle_model,
                    plate: driver.vehicle_plate
                },
                rating: driver.rating,
                location: {
                    latitude: driver.current_latitude,
                    longitude: driver.current_longitude
                }
            }
        });

    } catch (error) {
        console.error('❌ Error aceptando viaje:', error);
        res.status(500).json({ error: 'Error al aceptar viaje', success: false });
    }
});

// CONDUCTOR RECHAZA EL VIAJE
router.post('/reject/:tripId', async (req, res) => {
    try {
        const { tripId } = req.params;
        const { driver_id } = req.body;

        console.log(`❌ Conductor ${driver_id} rechazó viaje ${tripId}`);

        // Obtener el viaje
        const tripResult = await db.query(
            `SELECT * FROM trips WHERE id = $1`,
            [tripId]
        );

        if (tripResult.rows.length === 0) {
            return res.status(404).json({ error: 'Viaje no encontrado' });
        }

        const trip = tripResult.rows[0];

        // Buscar el siguiente conductor disponible
        const driversResult = await db.query(
            `SELECT id, name, fcm_token, current_latitude, current_longitude
             FROM drivers 
             WHERE status IN ('available', 'online')
             AND id != $1
             AND current_latitude IS NOT NULL`,
            [driver_id]
        );

        if (driversResult.rows.length > 0) {
            // Enviar al siguiente conductor
            const nextDriver = driversResult.rows[0];
            
            // Obtener info del usuario
            const userResult = await db.query(
                `SELECT name, phone FROM users WHERE id = $1`,
                [trip.user_id]
            );
            const user = userResult.rows[0] || {};

            if (nextDriver.fcm_token) {
                const admin = require('firebase-admin');
                await admin.messaging().send({
                    notification: {
                        title: '🚕 Nuevo Servicio Disponible',
                        body: `Pasajero: ${user.name || 'Usuario'}`
                    },
                    data: {
                        tripId: tripId.toString(),
                        type: 'NEW_TRIP_REQUEST',
                        user: user.name || 'Usuario',
                        phone: user.phone || '',
                        pickup: trip.pickup_location,
                        destination: trip.destination,
                        estimatedPrice: (trip.price || 0).toString()
                    },
                    token: nextDriver.fcm_token
                });
                
                // Actualizar pending_driver_id
                await db.query(
                    `UPDATE trips SET pending_driver_id = $1 WHERE id = $2`,
                    [nextDriver.id, tripId]
                );
                
                console.log(`📱 Solicitud reenviada a: ${nextDriver.name}`);
            }

            res.json({
                success: true,
                message: 'Viaje rechazado, buscando otro conductor',
                nextDriver: nextDriver.name
            });
        } else {
            // No hay más conductores disponibles
            res.json({
                success: true,
                message: 'Viaje rechazado, no hay más conductores disponibles'
            });
        }

    } catch (error) {
        console.error('❌ Error rechazando viaje:', error);
        res.status(500).json({ error: 'Error al rechazar viaje', success: false });
    }
});

// ASIGNAR CONDUCTOR A VIAJE (legado)
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
            [parseInt(userId)]
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