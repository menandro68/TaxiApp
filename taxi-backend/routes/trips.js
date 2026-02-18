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
      // Mapear tipos de vehículo de la app usuario a tipos de conductor en BD
        const userVehicleType = tripData.vehicle_type || 'economy';
        const VEHICLE_TYPE_MAP = {
            'economy': 'car',
            'comfort': 'car', 
            'premium': 'car',
            'car': 'car',
            'moto': 'moto',
            'motorcycle': 'moto',
            'paquete_carro': 'car',
            'paquete_moto': 'moto'
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

        // Calcular tiempo estimado de viaje (pickup → destino)
        const tripDistanceKm = (tripData.destination_lat && tripData.destination_lng) 
            ? calculateDistance(pickupCoords.latitude, pickupCoords.longitude, tripData.destination_lat, tripData.destination_lng)
            : 0;
        const estimatedMinutes = Math.max(5, Math.round((tripDistanceKm / 30) * 60)); // 30 km/h promedio ciudad

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
                    searchRadius: radius.toString(),
                    thirdPartyName: tripData.third_party_name || '',
                    thirdPartyPhone: tripData.third_party_phone || '',
                    estimatedTime: `${estimatedMinutes} min`
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
async function startProgressiveSearch(tripId, pickupCoords, tripData, userData, excludeDriverIds = []) {
    console.log(`🚀 Iniciando búsqueda progresiva para viaje ${tripId}`);
    
    const notifiedDriverIds = [...excludeDriverIds]; // Incluir conductores excluidos desde el inicio
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
     const { user_id, pickup_location, destination, vehicle_type, payment_method, estimated_price, pickup_coords, destination_coords, additional_stops, trip_code, third_party_name, third_party_phone } = req.body;

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
        const pendingPenalty = penaltyResult.rows[0]?.pending_penalty || 0;
        const finalPrice = (estimated_price || 0) + pendingPenalty;

        // Si tiene penalidad, resetearla
        if (pendingPenalty > 0) {
            await db.query(
                `UPDATE users SET pending_penalty = 0 WHERE id = $1`,
                [userIdParsed]
            );
            console.log(`💰 Penalidad de RD$${pendingPenalty} cobrada al usuario ${userIdParsed} en viaje nuevo`);
        }

        // CREAR VIAJE EN ESTADO "PENDING" (sin conductor asignado)
      
        // Asegurar columnas de tercero existan
        try {
          await db.query(`ALTER TABLE trips ADD COLUMN IF NOT EXISTS third_party_name VARCHAR(100)`);
          await db.query(`ALTER TABLE trips ADD COLUMN IF NOT EXISTS third_party_phone VARCHAR(20)`);
          await db.query(`ALTER TABLE trips ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(30)`);
        } catch(e) {}

  const tripResult = await db.query(
            `INSERT INTO trips (user_id, pickup_location, destination, status, price, created_at, pickup_lat, pickup_lng, destination_lat, destination_lng, trip_code, third_party_name, third_party_phone, vehicle_type)
             VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8, $9, $10, $11, $12, $13)
             RETURNING id`,
            [userIdParsed, pickup_location, destination, 'pending', finalPrice, pickup_coords?.latitude || null, pickup_coords?.longitude || null, destination_coords?.latitude || null, destination_coords?.longitude || null, trip_code || null, third_party_name || null, third_party_phone || null, vehicle_type || null]
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
            destination_lng: destination_coords?.longitude,
            third_party_name: third_party_name || null,
            third_party_phone: third_party_phone || null
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
       const { driver_id, driverLat, driverLng, driverIsFinishing } = req.body;

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
                        title: driverIsFinishing ? '🚗 Conductor en camino' : '🚗 Conductor Asignado',
                        body: driverIsFinishing 
                            ? 'Tu conductor está finalizando un servicio cercano y se dirige a tu ubicación en breve 🚗'
                            : `${driver.name} va en camino - ${driver.vehicle_model || 'Vehículo'}`
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
                        driverLng: (driverLng || driver.current_longitude || '').toString(),
                        driverIsFinishing: driverIsFinishing ? 'true' : 'false'
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
// CONDUCTOR CANCELA - REASIGNAR A OTRO CONDUCTOR
// CON PENALIZACIÓN PROGRESIVA (24H RESET)
// 1ra: 1h | 2da: 2h | 3ra: 4h | 4ta: 12h
// =============================================
router.put('/:tripId/driver-cancel', async (req, res) => {
    try {
        const { tripId } = req.params;
        const { driver_id, reason } = req.body;

        console.log(`🔄 Conductor ${driver_id} canceló viaje ${tripId} - Buscando nuevo conductor...`);

        // Obtener info del viaje
        const tripResult = await db.query(
            `SELECT t.*, u.name as user_name, u.phone as user_phone, u.fcm_token as user_fcm_token,
                    d.name as driver_name, d.fcm_token as driver_fcm_token
             FROM trips t
             LEFT JOIN users u ON t.user_id = u.id
             LEFT JOIN drivers d ON t.driver_id = d.id
             WHERE t.id = $1`,
            [tripId]
        );

        if (tripResult.rows.length === 0) {
            return res.status(404).json({ error: 'Viaje no encontrado', success: false });
        }

        const trip = tripResult.rows[0];
        const cancelledDriverId = trip.driver_id || parseInt(driver_id);
        const driverName = trip.driver_name || 'Conductor';

        // =============================================
        // PENALIZACIÓN PROGRESIVA POR CANCELACIÓN
        // =============================================
        const PENALTY_HOURS = [1, 2, 4, 12]; // 1ra, 2da, 3ra, 4ta cancelación

        // Contar cancelaciones en las últimas 24 horas
        const cancellationsResult = await db.query(
            `SELECT COUNT(*) as count FROM driver_cancellations 
             WHERE driver_id = $1 AND created_at > NOW() - INTERVAL '24 hours'`,
            [cancelledDriverId]
        );
        const cancellationsIn24h = parseInt(cancellationsResult.rows[0].count);
        const cancellationNumber = cancellationsIn24h + 1; // Esta es la cancelación actual

        // Determinar horas de suspensión
        const penaltyIndex = Math.min(cancellationNumber - 1, PENALTY_HOURS.length - 1);
        const suspensionHours = PENALTY_HOURS[penaltyIndex];

        console.log(`⚠️ Conductor ${driverName} (ID:${cancelledDriverId}) - Cancelación #${cancellationNumber} en 24h → Suspensión: ${suspensionHours}h`);

        // Registrar la cancelación
        await db.query(
            `INSERT INTO driver_cancellations (driver_id, trip_id, reason, cancellation_number, suspension_hours)
             VALUES ($1, $2, $3, $4, $5)`,
            [cancelledDriverId, tripId, reason || 'Cancelado por conductor', cancellationNumber, suspensionHours]
        );

        // Crear suspensión temporal
        const expiresAt = new Date(Date.now() + suspensionHours * 60 * 60 * 1000);
        await db.query(
            `INSERT INTO driver_suspensions (driver_id, driver_name, type, reason, duration_hours, expires_at, status, created_by)
             VALUES ($1, $2, 'temporal', $3, $4, $5, 'active', 'system_auto_cancellation')`,
            [cancelledDriverId, driverName, `Cancelación #${cancellationNumber} después de aceptar viaje`, suspensionHours, expiresAt]
        );

        // Actualizar estado del conductor a SUSPENDIDO (NO online)
        await db.query(
            `UPDATE drivers SET status = 'suspended' WHERE id = $1`,
            [cancelledDriverId]
        );

        console.log(`🔒 Conductor ${driverName} SUSPENDIDO por ${suspensionHours}h hasta ${expiresAt.toLocaleString()}`);

        // Notificar al conductor de su suspensión
        if (trip.driver_fcm_token) {
            try {
                const admin = require('firebase-admin');
                await admin.messaging().send({
                    notification: {
                        title: `🔒 Suspensión: ${suspensionHours} hora(s)`,
                 body: `Cancelación #${cancellationNumber}. Suspendido hasta las ${expiresAt.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'America/Santo_Domingo' })}.`
                    },
                    data: {
                        type: 'DRIVER_SUSPENDED',
                        suspensionHours: suspensionHours.toString(),
                        cancellationNumber: cancellationNumber.toString(),
                        expiresAt: expiresAt.toISOString()
                    },
                    token: trip.driver_fcm_token,
                    android: { priority: 'high' }
                });
                console.log(`✅ Conductor notificado de suspensión`);
            } catch (fcmError) {
                console.error('⚠️ Error notificando conductor:', fcmError.message);
            }
        }

        // Volver el viaje a estado PENDING y quitar conductor
        await db.query(
            `UPDATE trips SET status = 'pending', driver_id = NULL WHERE id = $1`,
            [tripId]
        );

        console.log(`✅ Viaje ${tripId} vuelto a estado PENDING`);

        // Notificar al usuario
        if (trip.user_fcm_token) {
            try {
                const admin = require('firebase-admin');
                await admin.messaging().send({
                    notification: {
                        title: '🔄 Buscando otro conductor',
                        body: 'El conductor anterior canceló. Estamos buscando otro conductor para ti.'
                    },
                    data: {
                        type: 'DRIVER_CANCELLED_REASSIGNING',
                        tripId: tripId.toString()
                    },
                    token: trip.user_fcm_token
                });
                console.log(`✅ Usuario notificado de reasignación`);
            } catch (fcmError) {
                console.error('⚠️ Error notificando usuario:', fcmError.message);
            }
        }

        // Reiniciar búsqueda progresiva
        const pickupCoords = { latitude: trip.pickup_lat, longitude: trip.pickup_lng };
        const tripData = {
            pickup_location: trip.pickup_location,
            destination: trip.destination,
            estimated_price: trip.price,
            payment_method: trip.payment_method,
            vehicle_type: trip.vehicle_type,
            destination_lat: trip.destination_lat,
            destination_lng: trip.destination_lng
        };
        const userData = { user_id: trip.user_id, name: trip.user_name, phone: trip.user_phone };

        // Excluir al conductor que canceló de la nueva búsqueda
        const excludeDrivers = [cancelledDriverId];
        startProgressiveSearch(parseInt(tripId), pickupCoords, tripData, userData, excludeDrivers)
            .then(result => console.log(`🏁 Nueva búsqueda completada:`, result))
            .catch(error => console.error(`❌ Error en búsqueda:`, error));

        res.json({ 
            success: true, 
            message: 'Buscando nuevo conductor...', 
            status: 'pending',
            penalty: {
                cancellationNumber,
                suspensionHours,
                expiresAt: expiresAt.toISOString()
            }
        });

    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ error: 'Error al reasignar viaje', success: false });
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
// LIBERAR CONDUCTOR CUANDO EL VIAJE SE COMPLETA
        if (status === 'completed' && trip.driver_id) {
            try {
                await db.query(
                    `UPDATE drivers SET status = 'online' WHERE id = $1`,
                    [trip.driver_id]
                );
                console.log(`✅ Conductor ${trip.driver_id} liberado a status 'online'`);
            } catch (driverError) {
                console.error('⚠️ Error liberando conductor:', driverError.message);
            }
        }

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

            // REGISTRAR COMISIÓN EN BILLETERA AL LLEGAR
            try {
                await db.query(`CREATE TABLE IF NOT EXISTS wallet_transactions (
                    id SERIAL PRIMARY KEY,
                    driver_id INTEGER NOT NULL,
                    type VARCHAR(20) NOT NULL,
                    trip_amount DECIMAL(10,2) DEFAULT 0,
                    commission_amount DECIMAL(10,2) DEFAULT 0,
                    deposit_amount DECIMAL(10,2) DEFAULT 0,
                    balance_after DECIMAL(10,2) DEFAULT 0,
                    trip_id INTEGER,
                    description TEXT,
                    created_at TIMESTAMP DEFAULT NOW()
                )`);

                const lastTx = await db.query(
                    `SELECT balance_after FROM wallet_transactions WHERE driver_id = $1 ORDER BY created_at DESC LIMIT 1`,
                    [trip.driver_id]
                );
                const currentBalance = lastTx.rows.length > 0 ? parseFloat(lastTx.rows[0].balance_after) : 0;
                const tripPrice = parseFloat(trip.price) || 0;
                const commissionAmount = Math.round(tripPrice * 10) / 100;
                const newBalance = currentBalance - commissionAmount;

                await db.query(
                    `INSERT INTO wallet_transactions (driver_id, type, trip_amount, commission_amount, deposit_amount, balance_after, trip_id, description)
                     VALUES ($1, 'commission', $2, $3, 0, $4, $5, $6)`,
                    [trip.driver_id, tripPrice, commissionAmount, newBalance, tripId, `Comisión 10% - Viaje #${tripId}`]
                );
                console.log(`💰 Comisión RD$${commissionAmount} registrada al llegar. Balance: RD$${newBalance}`);
            } catch (walletError) {
                console.error('⚠️ Error registrando comisión:', walletError.message);
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

// =============================================
// POLLING: VIAJES PENDIENTES PARA CONDUCTOR
// Versión robusta con validaciones completas
// =============================================
router.get('/pending-for-driver/:driverId', async (req, res) => {
    try {
        const { driverId } = req.params;
        const parsedDriverId = parseInt(driverId);

        // 1. VERIFICAR QUE EL CONDUCTOR EXISTE Y OBTENER SU INFO
        const driverResult = await db.query(
            `SELECT id, name, current_latitude, current_longitude, vehicle_type, status
             FROM drivers WHERE id = $1`,
            [parsedDriverId]
        );

        if (driverResult.rows.length === 0) {
            return res.json({ success: false, error: 'Conductor no encontrado' });
        }

        const driver = driverResult.rows[0];

        // 2. VERIFICAR QUE EL CONDUCTOR ESTÁ DISPONIBLE (no busy, no offline)
        if (driver.status === 'busy') {
            return res.json({ success: true, trip: null, reason: 'driver_busy' });
        }

        if (driver.status !== 'online' && driver.status !== 'available') {
            return res.json({ success: true, trip: null, reason: 'driver_not_online' });
        }

        // 3. VERIFICAR QUE EL CONDUCTOR NO TIENE UN VIAJE ACTIVO
        const activeTripsResult = await db.query(
            `SELECT id, status FROM trips 
             WHERE driver_id = $1 
             AND status NOT IN ('completed', 'cancelled')
             LIMIT 1`,
            [parsedDriverId]
        );

        if (activeTripsResult.rows.length > 0) {
            console.log(`🚫 POLLING: Conductor ${driverId} ya tiene viaje activo ${activeTripsResult.rows[0].id}`);
            return res.json({ 
                success: true, 
                trip: null, 
                reason: 'driver_has_active_trip',
                activeTripId: activeTripsResult.rows[0].id
            });
        }

        // 4. VERIFICAR UBICACIÓN DEL CONDUCTOR
        if (!driver.current_latitude || !driver.current_longitude) {
            return res.json({ success: true, trip: null, reason: 'no_location' });
        }

        // 5. OBTENER IDs DE CONDUCTORES BLOQUEADOS
        const blockedByUsersResult = await db.query(
            `SELECT DISTINCT user_id FROM blocked_drivers WHERE driver_id = $1`,
            [parsedDriverId]
        );
        const usersWhoBlockedThisDriver = blockedByUsersResult.rows.map(r => r.user_id);

        // 6. BUSCAR VIAJES VERDADERAMENTE PENDIENTES
        // - status = 'pending'
        // - driver_id IS NULL (no asignados)
        // - Creados en los últimos 5 minutos
        // - Con coordenadas válidas
        // - No de usuarios que bloquearon a este conductor
        let tripsQuery = `
            SELECT t.*, u.name as user_name, u.phone as user_phone
            FROM trips t
            LEFT JOIN users u ON t.user_id = u.id
            WHERE t.status = 'pending'
            AND t.driver_id IS NULL
            AND t.pickup_lat IS NOT NULL
            AND t.pickup_lng IS NOT NULL
            AND t.created_at > NOW() - INTERVAL '5 minutes'
        `;
        
        const queryParams = [];
        
        if (usersWhoBlockedThisDriver.length > 0) {
            queryParams.push(usersWhoBlockedThisDriver);
            tripsQuery += ` AND t.user_id != ALL($${queryParams.length}::int[])`;
        }
        
        tripsQuery += ` ORDER BY t.created_at ASC LIMIT 10`;

        const tripsResult = await db.query(tripsQuery, queryParams);

        if (tripsResult.rows.length === 0) {
            return res.json({ success: true, trip: null, reason: 'no_pending_trips' });
        }

        // 7. FILTRAR POR DISTANCIA (máximo 3km)
        const MAX_RADIUS_KM = 3;

        for (const trip of tripsResult.rows) {
            const distance = calculateDistance(
                driver.current_latitude,
                driver.current_longitude,
                trip.pickup_lat,
                trip.pickup_lng
            );

            if (distance <= MAX_RADIUS_KM) {
                console.log(`📡 POLLING: Viaje ${trip.id} disponible para conductor ${driverId} (${distance.toFixed(2)}km)`);

                return res.json({
                    success: true,
                    trip: {
                        id: trip.id,
                        user_name: trip.user_name,
                        user_phone: trip.user_phone,
                        pickup_location: trip.pickup_location,
                        destination: trip.destination,
                        price: trip.price,
                        pickup_lat: trip.pickup_lat,
                        pickup_lng: trip.pickup_lng,
                        destination_lat: trip.destination_lat,
                        destination_lng: trip.destination_lng,
                        payment_method: trip.payment_method || 'cash',
                        vehicle_type: trip.vehicle_type || 'economy',
                     trip_code: trip.trip_code,
                        third_party_name: trip.third_party_name || null,
                        third_party_phone: trip.third_party_phone || null,
                        distance: distance.toFixed(2),
                        created_at: trip.created_at
                    }
                });
            }
        }

        // No hay viajes cercanos
        return res.json({ success: true, trip: null, reason: 'no_nearby_trips' });

    } catch (error) {
        console.error('❌ Error en polling de viajes:', error);
        res.status(500).json({ success: false, error: 'Error interno' });
    }
});

// GUARDAR CLAVE DE VERIFICACIÓN DEL VIAJE
router.put('/trip-code/:tripId', async (req, res) => {
  const { tripId } = req.params;
  const { trip_code } = req.body;

  if (!trip_code || trip_code.length !== 4) {
    return res.status(400).json({ error: 'Clave debe ser de 4 dígitos' });
  }

  try {
    try {
      await db.query(`ALTER TABLE trips ADD COLUMN IF NOT EXISTS trip_code VARCHAR(4)`);
    } catch (e) {}
    await db.query(`UPDATE trips SET trip_code = $1 WHERE id = $2`, [trip_code, tripId]);
    console.log(`🔑 Clave ${trip_code} guardada para viaje ${tripId}`);
    res.json({ success: true, message: 'Clave guardada' });
  } catch (err) {
    console.error('Error guardando clave:', err);
    res.status(500).json({ error: 'Error guardando clave' });
  }
});

// VALIDAR CLAVE DE VERIFICACIÓN DEL VIAJE
router.post('/verify-code/:tripId', async (req, res) => {
  const { tripId } = req.params;
  const { trip_code } = req.body;

  try {
    const result = await db.query(`SELECT trip_code FROM trips WHERE id = $1`, [tripId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Viaje no encontrado' });
    }
    const trip = result.rows[0];
    if (!trip.trip_code) {
      return res.status(400).json({ success: false, error: 'No hay clave asignada' });
    }
    if (trip.trip_code === trip_code) {
      console.log(`✅ Clave verificada para viaje ${tripId}`);
      res.json({ success: true, message: 'Clave correcta' });
    } else {
      console.log(`❌ Clave incorrecta para viaje ${tripId}: ${trip_code} vs ${trip.trip_code}`);
      res.json({ success: false, message: 'Clave incorrecta' });
    }
  } catch (err) {
    console.error('Error verificando clave:', err);
    res.status(500).json({ error: 'Error verificando clave' });
  }
});

// =============================================
// BILLETERA: Obtener historial de transacciones
// =============================================
router.get('/wallet/:driverId', async (req, res) => {
    try {
        const { driverId } = req.params;
        
        await db.query(`CREATE TABLE IF NOT EXISTS wallet_transactions (
            id SERIAL PRIMARY KEY,
            driver_id INTEGER NOT NULL,
            type VARCHAR(20) NOT NULL,
            trip_amount DECIMAL(10,2) DEFAULT 0,
            commission_amount DECIMAL(10,2) DEFAULT 0,
            deposit_amount DECIMAL(10,2) DEFAULT 0,
            balance_after DECIMAL(10,2) DEFAULT 0,
            trip_id INTEGER,
            description TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        )`);

      const transactions = await db.query(
            `SELECT * FROM wallet_transactions WHERE driver_id = $1 ORDER BY created_at ASC LIMIT 50`,
            [parseInt(driverId)]
        );

        const lastTx = transactions.rows.length > 0 ? transactions.rows[transactions.rows.length - 1] : null;
        const currentBalance = lastTx ? parseFloat(lastTx.balance_after) : 0;

        const totals = await db.query(
            `SELECT 
                COALESCE(SUM(commission_amount), 0) as total_commission,
                COALESCE(SUM(deposit_amount), 0) as total_deposits,
                COALESCE(SUM(trip_amount), 0) as total_services
             FROM wallet_transactions WHERE driver_id = $1`,
            [parseInt(driverId)]
        );

        res.json({
            success: true,
            balance: currentBalance,
            totalCommission: parseFloat(totals.rows[0].total_commission),
            totalDeposits: parseFloat(totals.rows[0].total_deposits),
            totalServices: parseFloat(totals.rows[0].total_services),
            transactions: transactions.rows
        });
    } catch (error) {
        console.error('Error obteniendo billetera:', error);
        res.status(500).json({ error: 'Error obteniendo billetera' });
    }
});

// =============================================
// BILLETERA: Registrar depósito (desde admin)
// =============================================
router.post('/wallet/deposit', async (req, res) => {
    try {
      const { driver_id, amount, description, registered_by } = req.body;

        if (!driver_id || !amount) {
            return res.status(400).json({ error: 'driver_id y amount requeridos' });
        }

        const lastTx = await db.query(
            `SELECT balance_after FROM wallet_transactions WHERE driver_id = $1 ORDER BY created_at DESC LIMIT 1`,
            [driver_id]
        );
        const currentBalance = lastTx.rows.length > 0 ? parseFloat(lastTx.rows[0].balance_after) : 0;
        const newBalance = currentBalance + parseFloat(amount);

        await db.query(
           `INSERT INTO wallet_transactions (driver_id, type, trip_amount, commission_amount, deposit_amount, balance_after, description, registered_by)
             VALUES ($1, 'deposit', 0, 0, $2, $3, $4, $5)`,
            [driver_id, amount, newBalance, description || `Depósito verificado RD$${amount}`, registered_by || 'admin']
        );

        console.log(`💵 Depósito RD$${amount} registrado para conductor ${driver_id}. Nuevo balance: RD$${newBalance}`);

        res.json({
            success: true,
            message: `Depósito de RD$${amount} registrado`,
            newBalance
        });
    } catch (error) {
        console.error('Error registrando depósito:', error);
        res.status(500).json({ error: 'Error registrando depósito' });
    }
});

module.exports = router;