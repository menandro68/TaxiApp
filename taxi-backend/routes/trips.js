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
        const { user_id, pickup_location, destination, vehicle_type, payment_method, estimated_price, pickup_coords, destination_coords } = req.body;

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
            `INSERT INTO trips (user_id, pickup_location, destination, status, price, created_at, pickup_lat, pickup_lng, destination_lat, destination_lng)
             VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8, $9)
             RETURNING id`,
            [userIdParsed, pickup_location, destination, 'pending', estimated_price || 0, pickup_coords?.latitude || null, pickup_coords?.longitude || null, destination_coords?.latitude || null, destination_coords?.longitude || null]
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

        // ENVIAR NOTIFICACIÓN A TODOS LOS CONDUCTORES DISPONIBLES
        const admin = require('firebase-admin');
        const notifiedDrivers = [];
        
        for (const driver of driversWithDistance) {
            if (driver.fcm_token) {
                const message = {
                    data: {
                        title: '🚕 Nuevo Servicio Disponible',
                        body: `Pasajero: ${user.name || 'Usuario'} - ${driver.distance.toFixed(1)} km de ti`,
                        tripId: tripId.toString(),
                        type: 'NEW_TRIP_REQUEST',
                        user: user.name || 'Usuario',
                        phone: user.phone || '',
                        pickup: pickup_location,
                        destination: destination,
                        distance: driver.distance.toFixed(2),
                        estimatedPrice: (estimated_price || 0).toString(),
                        paymentMethod: payment_method || 'Efectivo',
                        vehicleType: vehicle_type || 'Estándar',
                        pickupLat: pickup_coords.latitude.toString(),
                        pickupLng: pickup_coords.longitude.toString(),
                        destinationLat: destination_coords?.latitude?.toString() || '',
                        destinationLng: destination_coords?.longitude?.toString() || ''
                    },
                    token: driver.fcm_token
                };

                try {
                    await admin.messaging().send(message);
                    console.log(`✅ Notificación enviada a ${driver.name} (${driver.distance.toFixed(2)} km)`);
                    notifiedDrivers.push({ id: driver.id, name: driver.name, distance: driver.distance.toFixed(2) });
                } catch (error) {
                    console.error(`❌ Error enviando a ${driver.name}:`, error.message);
                }
            }
        }

        console.log(`📱 Total conductores notificados: ${notifiedDrivers.length}`);

        res.json({
            success: true,
            tripId: tripId,
            message: `Viaje creado, ${notifiedDrivers.length} conductores notificados`,
            status: 'pending',
            notifiedDrivers: notifiedDrivers
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
        const { driver_id, driverLat, driverLng } = req.body;

        console.log(`📥 Recibida solicitud de aceptación: viaje=${tripId}, conductor=${driver_id}`);

        if (!driver_id) {
            return res.status(400).json({ error: 'driver_id requerido', success: false });
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

        const trip = result.rows[0];
        console.log(`✅ Viaje ${tripId} actualizado a status=assigned, driver_id=${driver_id}`);

        // Obtener info del conductor
        let driver = { id: driver_id, name: 'Conductor' };
        try {
            const driverResult = await db.query(
                `SELECT id, name, phone, vehicle_model, vehicle_plate, rating, current_latitude, current_longitude
                 FROM drivers WHERE id = $1`,
                [driver_id]
            );
            if (driverResult.rows.length > 0) {
                driver = driverResult.rows[0];
            }
        } catch (driverError) {
            console.error('⚠️ Error obteniendo info del conductor:', driverError.message);
        }

        // Intentar notificar al usuario (no bloquear si falla)
        try {
            const userResult = await db.query(
                `SELECT fcm_token, name FROM users WHERE id = $1`,
                [trip.user_id]
            );
            const user = userResult.rows[0];

            if (user && user.fcm_token) {
                const admin = require('firebase-admin');
                await admin.messaging().send({
                    notification: {
                        title: '🚗 Conductor Asignado',
                        body: `${driver.name} va en camino - ${driver.vehicle_model || 'Vehículo'}`
                    },
                    data: {
                        type: 'DRIVER_ASSIGNED',
                        tripId: tripId.toString(),
                        driverName: driver.name || '',
                        driverPhone: driver.phone || '',
                        vehicleModel: driver.vehicle_model || '',
                        vehiclePlate: driver.vehicle_plate || '',
                        driverLat: (driverLat || driver.current_latitude || '').toString(),
                        driverLng: (driverLng || driver.current_longitude || '').toString()
                    },
                    token: user.fcm_token
                });
                console.log(`✅ Usuario ${user.name} notificado del conductor asignado`);
            }
        } catch (notifyError) {
            console.error('⚠️ Error notificando al usuario (no crítico):', notifyError.message);
        }

        // Actualizar estado del conductor a "busy"
        try {
            await db.query(
                `UPDATE drivers SET status = 'busy' WHERE id = $1`,
                [driver_id]
            );
        } catch (updateError) {
            console.error('⚠️ Error actualizando estado del conductor:', updateError.message);
        }

        console.log(`✅ Viaje ${tripId} aceptado exitosamente por conductor ${driver.name}`);

        res.json({
            success: true,
            message: 'Viaje aceptado exitosamente',
            trip: trip,
            driver: {
                id: driver.id,
                name: driver.name,
                phone: driver.phone || '',
                vehicle: {
                    model: driver.vehicle_model || '',
                    plate: driver.vehicle_plate || ''
                },
                rating: driver.rating || 0,
                location: {
                    latitude: driver.current_latitude || 0,
                    longitude: driver.current_longitude || 0
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
        const { driver_id, pickupLat, pickupLng } = req.body;

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
                        estimatedPrice: (trip.price || 0).toString(),
                        pickupLat: pickupLat || '',
                        pickupLng: pickupLng || ''
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

        const trip = result.rows[0];

        // NOTIFICAR AL USUARIO CUANDO EL CONDUCTOR LLEGA
        if (status === 'arrived') {
            try {
                const userResult = await db.query(
                    `SELECT fcm_token, name FROM users WHERE id = $1`,
                    [trip.user_id]
                );
                const user = userResult.rows[0];

                if (user && user.fcm_token) {
                    const admin = require('firebase-admin');
                    await admin.messaging().send({
                        notification: {
                            title: '🚗 ¡Tu conductor llegó!',
                            body: 'Tu conductor está esperándote en el punto de recogida'
                        },
                        data: {
                            type: 'DRIVER_ARRIVED',
                            tripId: tripId.toString()
                        },
                        token: user.fcm_token
                    });
                    console.log(`✅ Usuario ${user.name} notificado: conductor llegó`);
                }
            } catch (notifyError) {
                console.error('⚠️ Error notificando llegada:', notifyError.message);
            }
        }
        
        res.json({
            success: true,
            message: `Estado actualizado a: ${status}`,
            trip: trip
        });
    } catch (error) {
        console.error('Error actualizando estado:', error);
        res.status(500).json({ error: 'Error al actualizar estado' });
    }
});

// CANCELAR VIAJE - NOTIFICAR AL CONDUCTOR
router.put('/:tripId/cancel', async (req, res) => {
    try {
        const { tripId } = req.params;
        const { reason } = req.body;

        // Obtener info del viaje y conductor
        const tripResult = await db.query(
            `SELECT t.*, d.fcm_token as driver_fcm_token, d.name as driver_name, u.name as user_name
             FROM trips t
             LEFT JOIN drivers d ON t.driver_id = d.id
             LEFT JOIN users u ON t.user_id = u.id
             WHERE t.id = $1`,
            [tripId]
        );

        if (tripResult.rows.length === 0) {
            return res.status(404).json({ error: 'Viaje no encontrado' });
        }

        const trip = tripResult.rows[0];

        // Actualizar estado a cancelado
        await db.query(
            `UPDATE trips SET status = 'cancelled', cancel_reason = $1 WHERE id = $2`,
            [reason || 'Cancelado por el usuario', tripId]
        );

        // Notificar al conductor si tiene FCM token
        if (trip.driver_fcm_token) {
            try {
                const admin = require('firebase-admin');
                await admin.messaging().send({
                    token: trip.driver_fcm_token,
                    notification: {
                        title: 'Viaje Cancelado',
                        body: `El usuario ${trip.user_name || 'Usuario'} ha cancelado el viaje`
                    },
                    data: {
                        type: 'trip_cancelled',
                        tripId: tripId.toString(),
                        reason: reason || 'Cancelado por el usuario'
                    },
                    android: {
                        priority: 'high',
                        notification: {
                            channelId: 'taxi_notifications',
                            sound: 'default'
                        }
                    }
                });
                console.log('Notificacion de cancelacion enviada al conductor');
            } catch (fcmError) {
                console.error('Error enviando notificacion FCM:', fcmError);
            }
        }

        res.json({ success: true, message: 'Viaje cancelado exitosamente' });
    } catch (error) {
        console.error('Error cancelando viaje:', error);
        res.status(500).json({ error: 'Error al cancelar viaje' });
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

// OBTENER HISTORIAL DE VIAJES DEL CONDUCTOR
router.get('/driver-history/:driverId', async (req, res) => {
    try {
        const { driverId } = req.params;
        const { period } = req.query; // 'today', 'week', 'month'
        
        let dateFilter = '';
        const now = new Date();
        
        if (period === 'today') {
            dateFilter = `AND DATE(t.created_at) = CURRENT_DATE`;
        } else if (period === 'week') {
            dateFilter = `AND t.created_at >= NOW() - INTERVAL '7 days'`;
        } else if (period === 'month') {
            dateFilter = `AND t.created_at >= NOW() - INTERVAL '30 days'`;
        }
        
        const result = await db.query(
            `SELECT t.id, t.pickup_location, t.destination, t.price, t.status, 
                    t.created_at, t.updated_at,
                    u.name as user_name, u.phone as user_phone
             FROM trips t
             LEFT JOIN users u ON t.user_id = u.id
             WHERE t.driver_id = $1 
             AND t.status = 'completed'
             ${dateFilter}
             ORDER BY t.created_at DESC`,
            [parseInt(driverId)]
        );
        
        // Calcular totales
        const trips = result.rows;
        const totalEarnings = trips.reduce((sum, t) => sum + parseFloat(t.price || 0), 0);
        const totalTrips = trips.length;
        
        res.json({
            success: true,
            period: period || 'all',
            totalEarnings,
            totalTrips,
            averagePerTrip: totalTrips > 0 ? Math.round(totalEarnings / totalTrips) : 0,
            trips
        });
    } catch (error) {
        console.error('Error al obtener historial del conductor:', error);
        res.status(500).json({ error: 'Error al obtener historial' });
    }
});

module.exports = router;
