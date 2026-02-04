const express = require('express');
const router = express.Router();
const { db } = require('../config/database');

// =============================================
// CONFIGURACIÓN DE BÚSQUEDA PROGRESIVA
// =============================================
const SEARCH_CONFIG = {
    radii: [0.5, 1, 1.5, 2.5, 3],  // Radios en km: 500m, 1km, 1.5km, 2.5km, 3km
    delayBetweenRounds: 8000,      // 8 segundos entre rondas
    maxRounds: 5
};

// Almacén temporal para procesos de búsqueda activos
const activeSearches = new Map();

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

// =============================================
// FUNCIÓN: Notificar conductores en un radio específico
// =============================================
async function notifyDriversInRadius(tripId, pickupCoords, radius, notifiedDriverIds, tripData, userData) {
    try {
        console.log(`📡 Buscando conductores en radio de ${radius}km para viaje ${tripId}...`);
        
        // Buscar conductores disponibles que no hayan sido notificados
        // Filtrar por tipo de vehículo: moto solo notifica a motos, car solo a carros
        // Mapear tipos de veh�culo de la app usuario a tipos de conductor en BD
        // App usuario env�a: economy, comfort, premium, moto
        // BD conductores tiene: car, moto
        const userVehicleType = tripData.vehicle_type || 'economy';
        const VEHICLE_TYPE_MAP = {
            'economy': 'car',
            'comfort': 'car',
            'premium': 'car',
            'car': 'car',
            'moto': 'moto',
            'motorcycle': 'moto'
        };
        const requestedVehicleType = VEHICLE_TYPE_MAP[userVehicleType] || 'car';
    // Obtener IDs de conductores bloqueados por este usuario
        const blockedResult = await db.query(
            `SELECT driver_id FROM blocked_drivers WHERE user_id = $1`,
            [userData.user_id]
        );
        const blockedIds = blockedResult.rows.map(r => r.driver_id);

        const driversResult = await db.query(
            `SELECT id, name, phone, vehicle_model, vehicle_plate, rating,
                    current_latitude, current_longitude, fcm_token, vehicle_type
             FROM drivers
             WHERE status IN ('available', 'online')
             AND last_seen > NOW() - INTERVAL '5 minutes'
             AND fcm_token IS NOT NULL
             AND id != ALL($1::int[])
             AND id != ALL($2::int[])
             AND (vehicle_type = $3 OR vehicle_type IS NULL)`,
            [notifiedDriverIds, blockedIds, requestedVehicleType]
        );
        
        console.log(`🚗 Tipo de vehículo solicitado: ${requestedVehicleType}`);

        const availableDrivers = driversResult.rows || [];
        console.log(`🔍 Conductores disponibles (no notificados): ${availableDrivers.length}`);

        if (availableDrivers.length === 0) {
            return { notified: [], newNotifiedIds: [] };
        }

        // Filtrar conductores dentro del radio
        const driversInRadius = availableDrivers
            .filter(d => d.current_latitude && d.current_longitude)
            .map(driver => ({
                ...driver,
                distance: calculateDistance(
                    pickupCoords.latitude,
                    pickupCoords.longitude,
                    driver.current_latitude,
                    driver.current_longitude
                )
            }))
            .filter(d => d.distance <= radius)
            .sort((a, b) => a.distance - b.distance);

        console.log(`📍 Conductores dentro de ${radius}km: ${driversInRadius.length}`);

        if (driversInRadius.length === 0) {
            return { notified: [], newNotifiedIds: [] };
        }

        // Enviar notificaciones FCM
        const admin = require('firebase-admin');
        const notifiedDrivers = [];
        const newNotifiedIds = [];

        for (const driver of driversInRadius) {
            const message = {
                data: {
                    title: '🚕 Nuevo Servicio Disponible',
                    body: `Pasajero: ${userData.name || 'Usuario'} - ${driver.distance.toFixed(1)} km de ti`,
                    tripId: tripId.toString(),
                    type: 'NEW_TRIP_REQUEST',
                    user: userData.name || 'Usuario',
                    phone: userData.phone || '',
                    pickup: tripData.pickup_location,
                    destination: tripData.destination,
                    distance: driver.distance.toFixed(2),
                    estimatedPrice: (tripData.estimated_price || 0).toString(),
                    paymentMethod: tripData.payment_method || 'Efectivo',
                    vehicleType: tripData.vehicle_type || 'Estándar',
                    pickupLat: pickupCoords.latitude.toString(),
                    pickupLng: pickupCoords.longitude.toString(),
                    destinationLat: tripData.destination_lat?.toString() || '',
                    destinationLng: tripData.destination_lng?.toString() || '',
                    searchRadius: radius.toString()
                },
                token: driver.fcm_token
            };

            try {
                await admin.messaging().send(message);
                console.log(`✅ Notificación enviada a ${driver.name} (${driver.distance.toFixed(2)} km) - Radio ${radius}km`);
                notifiedDrivers.push({ 
                    id: driver.id, 
                    name: driver.name, 
                    distance: driver.distance.toFixed(2),
                    radius: radius
                });
                newNotifiedIds.push(driver.id);
            } catch (error) {
                console.error(`❌ Error enviando a ${driver.name}:`, error.message);
            }
        }

        return { notified: notifiedDrivers, newNotifiedIds };

    } catch (error) {
        console.error('❌ Error en notifyDriversInRadius:', error);
        return { notified: [], newNotifiedIds: [] };
    }
}

// =============================================
// FUNCIÓN: Proceso de búsqueda progresiva
// =============================================
async function startProgressiveSearch(tripId, pickupCoords, tripData, userData) {
    console.log(`🚀 Iniciando búsqueda progresiva para viaje ${tripId}`);
    
    const notifiedDriverIds = [];
    const allNotifiedDrivers = [];
    
    // Guardar referencia del proceso
    const searchProcess = {
        tripId,
        active: true,
        currentRound: 0,
        notifiedDriverIds: []
    };
    activeSearches.set(tripId, searchProcess);

    for (let round = 0; round < SEARCH_CONFIG.maxRounds; round++) {
        // Verificar si el viaje sigue pendiente
        const tripCheck = await db.query(
            `SELECT status FROM trips WHERE id = $1`,
            [tripId]
        );

        if (tripCheck.rows.length === 0 || tripCheck.rows[0].status !== 'pending') {
            console.log(`⏹️ Viaje ${tripId} ya no está pendiente. Deteniendo búsqueda.`);
            activeSearches.delete(tripId);
            return { stopped: true, reason: 'trip_not_pending', notifiedDrivers: allNotifiedDrivers };
        }

        // Verificar si la búsqueda fue cancelada
        const currentSearch = activeSearches.get(tripId);
        if (!currentSearch || !currentSearch.active) {
            console.log(`⏹️ Búsqueda cancelada para viaje ${tripId}`);
            return { stopped: true, reason: 'cancelled', notifiedDrivers: allNotifiedDrivers };
        }

        const radius = SEARCH_CONFIG.radii[round];
        console.log(`\n📢 RONDA ${round + 1}/${SEARCH_CONFIG.maxRounds} - Radio: ${radius}km`);

        // Actualizar ronda actual
        searchProcess.currentRound = round + 1;

        // Notificar conductores en este radio
        const { notified, newNotifiedIds } = await notifyDriversInRadius(
            tripId, 
            pickupCoords, 
            radius, 
            notifiedDriverIds,
            tripData,
            userData
        );

        // Agregar IDs notificados para no repetir
        notifiedDriverIds.push(...newNotifiedIds);
        allNotifiedDrivers.push(...notified);
        searchProcess.notifiedDriverIds = notifiedDriverIds;

        console.log(`📊 Ronda ${round + 1}: ${notified.length} nuevos conductores notificados`);
        console.log(`📊 Total acumulado: ${notifiedDriverIds.length} conductores notificados`);

        // Si es la última ronda, no esperar
        if (round < SEARCH_CONFIG.maxRounds - 1) {
            console.log(`⏳ Esperando ${SEARCH_CONFIG.delayBetweenRounds/1000}s antes de la siguiente ronda...`);
            await new Promise(resolve => setTimeout(resolve, SEARCH_CONFIG.delayBetweenRounds));
        }
    }

    console.log(`\n✅ Búsqueda progresiva completada para viaje ${tripId}`);
    console.log(`📊 Total conductores notificados: ${allNotifiedDrivers.length}`);
    
    activeSearches.delete(tripId);
    
    return { 
        completed: true, 
        totalNotified: allNotifiedDrivers.length,
        notifiedDrivers: allNotifiedDrivers 
    };
}

// =============================================
// CREAR NUEVO VIAJE - CON NOTIFICACIÓN PROGRESIVA
// =============================================
router.post('/create', async (req, res) => {
    try {
        const { user_id, pickup_location, destination, vehicle_type, payment_method, estimated_price, pickup_coords, destination_coords, additional_stops } = req.body;

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

        // VERIFICAR SI EL USUARIO TIENE PENALIDAD PENDIENTE
        const penaltyResult = await db.query(
            `SELECT pending_penalty FROM users WHERE id = $1`,
            [userIdParsed]
        );
       console.log('DEBUG PENALTY - userIdParsed:', userIdParsed, 'penaltyResult:', JSON.stringify(penaltyResult.rows));
        const pendingPenalty = penaltyResult.rows[0]?.pending_penalty || 0;
        const finalPrice = (estimated_price || 0) + pendingPenalty;
        console.log('DEBUG PENALTY - pendingPenalty:', pendingPenalty, 'estimated_price:', estimated_price, 'finalPrice:', finalPrice);

        // Si tiene penalidad, resetearla
        if (pendingPenalty > 0) {
            await db.query(
                `UPDATE users SET pending_penalty = 0 WHERE id = $1`,
                [userIdParsed]
            );
            console.log(`💰 Penalidad de RD$${pendingPenalty} cobrada al usuario ${userIdParsed} en viaje nuevo`);
        }

        // CREAR VIAJE EN ESTADO "PENDING" (sin conductor asignado)
        const tripResult = await db.query(
            `INSERT INTO trips (user_id, pickup_location, destination, status, price, created_at, pickup_lat, pickup_lng, destination_lat, destination_lng)
             VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8, $9)
             RETURNING id`,
            [userIdParsed, pickup_location, destination, 'pending', finalPrice, pickup_coords?.latitude || null, pickup_coords?.longitude || null, destination_coords?.latitude || null, destination_coords?.longitude || null]
        );

        const tripId = tripResult.rows[0].id;
        console.log(`✅ Viaje ${tripId} creado en estado PENDING`);

        // OBTENER INFO DEL USUARIO
        const userResult = await db.query(
            `SELECT name, phone FROM users WHERE id = $1`,
            [userIdParsed]
        );
       const user = { ...userResult.rows[0], user_id: userIdParsed } || {};

        // Preparar datos para búsqueda progresiva
        const tripData = {
            pickup_location,
            destination,
            estimated_price,
            payment_method,
            vehicle_type,
            destination_lat: destination_coords?.latitude,
            destination_lng: destination_coords?.longitude
        };

        // INICIAR BÚSQUEDA PROGRESIVA EN SEGUNDO PLANO
        // No bloqueamos la respuesta - el proceso corre en paralelo
        startProgressiveSearch(tripId, pickup_coords, tripData, user)
            .then(result => {
                console.log(`🏁 Búsqueda progresiva finalizada para viaje ${tripId}:`, result);
            })
            .catch(error => {
                console.error(`❌ Error en búsqueda progresiva para viaje ${tripId}:`, error);
            });

        // Responder inmediatamente al cliente
        res.json({
            success: true,
            tripId: tripId,
            message: pendingPenalty > 0 
                ? `Viaje creado. Se aplicó un cargo de RD$${pendingPenalty} por cancelación anterior. Total: RD$${finalPrice}`
                : 'Viaje creado, iniciando búsqueda progresiva de conductores...',
            status: 'pending',
            penaltyApplied: pendingPenalty > 0,
            penaltyAmount: pendingPenalty,
            finalPrice: finalPrice,
            searchConfig: {
                radii: SEARCH_CONFIG.radii,
                delaySeconds: SEARCH_CONFIG.delayBetweenRounds / 1000,
                maxRounds: SEARCH_CONFIG.maxRounds
            }
        });

    } catch (error) {
        console.error('❌ Error creando viaje:', error);
        res.status(500).json({ error: 'Error al crear viaje', success: false });
    }
});

// =============================================
// ENDPOINT: Obtener estado de búsqueda
// =============================================
router.get('/search-status/:tripId', async (req, res) => {
    try {
        const { tripId } = req.params;
        const search = activeSearches.get(parseInt(tripId));
        
        if (search) {
            res.json({
                success: true,
                active: search.active,
                currentRound: search.currentRound,
                totalRounds: SEARCH_CONFIG.maxRounds,
                currentRadius: SEARCH_CONFIG.radii[search.currentRound - 1] || 0,
                notifiedCount: search.notifiedDriverIds.length
            });
        } else {
            // Verificar estado del viaje
            const tripResult = await db.query(
                `SELECT status, driver_id FROM trips WHERE id = $1`,
                [tripId]
            );
            
            if (tripResult.rows.length > 0) {
                const trip = tripResult.rows[0];
                res.json({
                    success: true,
                    active: false,
                    tripStatus: trip.status,
                    driverAssigned: trip.driver_id !== null
                });
            } else {
                res.status(404).json({ error: 'Viaje no encontrado' });
            }
        }
    } catch (error) {
        console.error('Error obteniendo estado de búsqueda:', error);
        res.status(500).json({ error: 'Error interno' });
    }
});

// =============================================
// CONDUCTOR ACEPTA EL VIAJE
// =============================================
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

        // DETENER BÚSQUEDA PROGRESIVA SI ESTÁ ACTIVA
        const activeSearch = activeSearches.get(parseInt(tripId));
        if (activeSearch) {
            activeSearch.active = false;
            console.log(`⏹️ Búsqueda progresiva detenida para viaje ${tripId} - Conductor aceptó`);
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
                        driverId: driver.id.toString(),
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

// =============================================
// ASIGNAR CONDUCTOR A VIAJE (legado)
// =============================================
router.put('/assign/:tripId', async (req, res) => {
    try {
        const { tripId } = req.params;
        const { driver_id, price } = req.body;

        // DETENER BÚSQUEDA PROGRESIVA SI ESTÁ ACTIVA
        const activeSearch = activeSearches.get(parseInt(tripId));
        if (activeSearch) {
            activeSearch.active = false;
            console.log(`⏹️ Búsqueda progresiva detenida para viaje ${tripId} - Asignación manual`);
        }

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

// =============================================
// CONDUCTOR RECHAZA EL VIAJE
// =============================================
router.post('/reject/:tripId', async (req, res) => {
    try {
        const { tripId } = req.params;
        const { driver_id } = req.body;

        console.log(`❌ Conductor ${driver_id} rechazó viaje ${tripId}`);

        // El rechazo no detiene la búsqueda progresiva
        // Solo registramos que este conductor rechazó
        
        res.json({
            success: true,
            message: 'Rechazo registrado. La búsqueda continúa con otros conductores.'
        });

    } catch (error) {
        console.error('❌ Error rechazando viaje:', error);
        res.status(500).json({ error: 'Error al rechazar viaje', success: false });
    }
});

// =============================================
// CANCELAR VIAJE - DETENER BÚSQUEDA
// =============================================
router.put('/:tripId/cancel', async (req, res) => {
    try {
        const { tripId } = req.params;
        const { reason } = req.body;

        // DETENER BÚSQUEDA PROGRESIVA SI ESTÁ ACTIVA
        const activeSearch = activeSearches.get(parseInt(tripId));
        if (activeSearch) {
            activeSearch.active = false;
            activeSearches.delete(parseInt(tripId));
            console.log(`⏹️ Búsqueda progresiva detenida para viaje ${tripId} - Cancelado`);
        }

        // Obtener info del viaje y conductor
        const tripResult = await db.query(
            `SELECT t.*,
                    COALESCE(d1.fcm_token, d2.fcm_token) as driver_fcm_token,
                    COALESCE(d1.name, d2.name) as driver_name,
                    u.name as user_name
             FROM trips t
             LEFT JOIN drivers d1 ON t.driver_id = d1.id
             LEFT JOIN drivers d2 ON t.pending_driver_id = d2.id
             LEFT JOIN users u ON t.user_id = u.id
             WHERE t.id = $1`,
            [tripId]
        );

        if (tripResult.rows.length === 0) {
            return res.status(404).json({ error: 'Viaje no encontrado' });
        }

        const trip = tripResult.rows[0];

        // VERIFICAR SI PASARON MÁS DE 5 MINUTOS DESDE LA CREACIÓN
        const createdAt = new Date(trip.created_at);
        const now = new Date();
        const minutesSinceCreation = (now - createdAt) / (1000 * 60);
        let penaltyApplied = false;
        const PENALTY_AMOUNT = 50;
        const PENALTY_MINUTES = 5;

        if (minutesSinceCreation >= PENALTY_MINUTES) {
            // Aplicar penalidad al usuario
            await db.query(
                `UPDATE users SET pending_penalty = pending_penalty + $1 WHERE id = $2`,
                [PENALTY_AMOUNT, trip.user_id]
            );
            penaltyApplied = true;
            console.log(`💰 Penalidad de RD$${PENALTY_AMOUNT} aplicada al usuario ${trip.user_id} (canceló después de ${minutesSinceCreation.toFixed(1)} min)`);
        }

        // Actualizar estado a cancelado
        await db.query(
            `UPDATE trips SET status = 'cancelled' WHERE id = $1`,
            [tripId]
        );

        // Notificar al conductor si tiene FCM token
        if (trip.driver_fcm_token) {
            try {
                const admin = require('firebase-admin');
                await admin.messaging().send({
                    token: trip.driver_fcm_token,
                    data: {
                        type: 'trip_cancelled',
                        tripId: tripId.toString(),
                        reason: reason || 'Cancelado por el usuario'
                    },
                    android: {
                        priority: 'high'
                    }
                });
                console.log('Notificación de cancelación enviada al conductor');
            } catch (fcmError) {
                console.error('Error enviando notificación FCM:', fcmError);
            }
        }

        res.json({ 
            success: true, 
            message: penaltyApplied 
                ? `Viaje cancelado. Se aplicó una tarifa de cancelación de RD$${PENALTY_AMOUNT} que será cobrada en su próximo viaje.`
                : 'Viaje cancelado exitosamente',
            penaltyApplied,
            penaltyAmount: penaltyApplied ? PENALTY_AMOUNT : 0
        });
    } catch (error) {
        console.error('Error cancelando viaje:', error);
        res.status(500).json({ error: 'Error al cancelar viaje' });
    }
});

// =============================================
// ACTUALIZAR ESTADO DEL VIAJE
// =============================================
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

// =============================================
// OBTENER VIAJES ACTIVOS
// =============================================
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

// =============================================
// OBTENER HISTORIAL DE VIAJES
// =============================================
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

// =============================================
// OBTENER TODOS LOS VIAJES
// =============================================
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

// =============================================
// OBTENER HISTORIAL DE VIAJES DEL CONDUCTOR
// =============================================
router.get('/driver-history/:driverId', async (req, res) => {
    try {
        const { driverId } = req.params;
        const { period } = req.query;
        
        let dateFilter = '';

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

