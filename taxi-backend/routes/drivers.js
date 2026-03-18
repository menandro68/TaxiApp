const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../config/database');

// REGISTRO DE CONDUCTOR
router.post('/register', async (req, res) => {
    try {
        const { name, email, phone, password, license, vehicle_plate, vehicle_model, vehicle_color, vehicleType, referralCode } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const driverVehicleType = vehicleType || 'car';
        const result = await db.query(
            `INSERT INTO drivers (name, email, phone, password, license, vehicle_plate, vehicle_model, vehicle_color, vehicle_type, status, rating, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
             RETURNING id`,
           [name, email, phone, hashedPassword, license || null, vehicle_plate || null, vehicle_model || null, vehicle_color || null, driverVehicleType, 'pending', 5.0]
        );

        const newDriverId = result.rows[0].id;
        let referralApplied = false;

        // PROCESAR CÓDIGO DE REFERIDO SI EXISTE
        if (referralCode && referralCode.trim()) {
            try {
                // Extraer ID del código (últimos 3 dígitos)
                const code = referralCode.trim().toUpperCase();
                const idPart = code.slice(-3);
                const referrerId = parseInt(idPart);

                if (!isNaN(referrerId) && referrerId !== newDriverId) {
                    // Verificar que el referidor existe
                    const referrerCheck = await db.query(
                        'SELECT id, name FROM drivers WHERE id = $1',
                        [referrerId]
                    );

                    if (referrerCheck.rows.length > 0) {
                        // Crear registro de referido
                        await db.query(
                            `INSERT INTO referrals (referrer_id, referred_id, referral_code, status)
                             VALUES ($1, $2, $3, 'pending')`,
                            [referrerId, newDriverId, code]
                        );

                        // Actualizar el conductor con el referidor
                        await db.query(
                            'UPDATE drivers SET referred_by = $1 WHERE id = $2',
                            [referrerId, newDriverId]
                        );

                        referralApplied = true;
                        console.log(`✅ Referido registrado: ${newDriverId} fue referido por ${referrerId} (código: ${code})`);
                    }
                }
            } catch (refError) {
                console.error('⚠️ Error procesando código de referido:', refError.message);
            }
        }

        res.json({
            success: true,
            driverId: newDriverId,
            vehicleType: driverVehicleType,
            referralApplied: referralApplied,
            message: referralApplied 
                ? 'Conductor registrado exitosamente. ¡Código de referido aplicado!'
                : 'Conductor registrado exitosamente'
        });
    } catch (error) {
        console.error('Error en registro de conductor:', error);
        if (error.code === '23505') {
            return res.status(400).json({ error: 'Email ya registrado' });
        }
        res.status(500).json({ error: 'Error en el servidor', details: error.message });
    }
});

// LOGIN DE CONDUCTOR
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const result = await db.query(
            'SELECT * FROM drivers WHERE email = $1',
            [email]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        
        const driver = result.rows[0];
        const validPassword = await bcrypt.compare(password, driver.password);
        
        if (!validPassword) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        
        const token = jwt.sign(
            { id: driver.id, email: driver.email },
            process.env.JWT_SECRET || 'secret_key',
            { expiresIn: '30d' }
        );
        
        // Actualizar estado a activo
        await db.query(
            'UPDATE drivers SET status = $1 WHERE id = $2',
            ['active', driver.id]
        );
        
        res.json({
            success: true,
            token,
            driver: {
                id: driver.id,
                name: driver.name,
                email: driver.email,
                phone: driver.phone,
                vehicle_model: driver.vehicle_model,
                vehicle_plate: driver.vehicle_plate,
                rating: driver.rating
            }
        });
    } catch (error) {
        console.error('Error en login de conductor:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// CREAR CONDUCTOR (desde Admin Panel)
router.post('/', async (req, res) => {
    try {
        const { name, email, phone, password, license, vehicle_plate, vehicle_model, vehicle_color, vehicle_type, status } = req.body;
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const result = await db.query(
            `INSERT INTO drivers (name, email, phone, password, license, vehicle_plate, vehicle_model, vehicle_color, vehicle_type, status, rating, total_trips, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
             RETURNING *`,
            [name, email, phone, hashedPassword, license, vehicle_plate, vehicle_model, vehicle_color, vehicle_type || 'car', status || 'active', 4.8, 0]
        );
        
        res.json({
            success: true,
            message: 'Conductor agregado exitosamente',
            driver: result.rows[0]
        });
    } catch (error) {
        console.error('Error agregando conductor:', error);
        if (error.code === '23505') {
            return res.status(400).json({ error: 'Email ya registrado' });
        }
        res.status(500).json({ error: 'Error agregando conductor' });
    }
});

// OBTENER TODOS LOS CONDUCTORES
router.get('/', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM drivers ORDER BY created_at DESC');
        
        res.json({
            success: true,
            drivers: result.rows || []
        });
    } catch (error) {
        console.error('Error obteniendo conductores:', error);
        res.status(500).json({ error: 'Error obteniendo conductores' });
    }
});

// ACTUALIZAR ESTADO DEL CONDUCTOR (ONLINE/OFFLINE)
router.put('/status', async (req, res) => {
    try {
        const { driverId, status, isOnline } = req.body;

        console.log('📡 Recibida petición de cambio de estado:', { driverId, status, isOnline });

        // Bloquear si intenta ponerse online estando suspendido
        if (status === 'online') {
            // Auto-expirar suspensiones vencidas
            await db.query(
                `UPDATE driver_suspensions SET status = 'expired' 
                 WHERE driver_id = $1 AND status = 'active' AND type = 'temporal' AND expires_at < NOW()`,
                [driverId]
            );
            const suspCheck = await db.query(
                `SELECT id, reason, expires_at FROM driver_suspensions 
                 WHERE driver_id = $1 AND status = 'active' LIMIT 1`,
                [driverId]
            );
            if (suspCheck.rows.length > 0) {
                const susp = suspCheck.rows[0];
                return res.status(403).json({ 
                    error: 'Conductor suspendido', 
                    suspended: true,
                    reason: susp.reason,
                    expiresAt: susp.expires_at
                });
            }
        }

        const result = await db.query(
            'UPDATE drivers SET status = $1 WHERE id = $2 RETURNING *',
            [status, driverId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Conductor no encontrado' });
        }
        
        console.log(`✅ Estado actualizado: Conductor ${driverId} ahora está ${status}`);
        
        res.json({
            success: true,
            message: `Conductor ${status === 'online' ? 'conectado' : 'desconectado'} exitosamente`,
            driver: result.rows[0]
        });
    } catch (error) {
        console.error('Error actualizando estado:', error);
        res.status(500).json({ error: 'Error actualizando estado del conductor' });
    }
});

// ==========================================
// OBTENER CONDUCTORES DISPONIBLES (CORREGIDO)
// ==========================================
router.get('/available', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT 
                d.id, 
                d.name, 
                d.rating, 
                d.vehicle_model, 
                d.vehicle_plate, 
                d.status, 
                d.total_trips as completed_trips,
                d.current_latitude as latitude,
                d.current_longitude as longitude
             FROM drivers d
          WHERE d.status = 'online' AND d.last_seen > NOW() - INTERVAL '60 seconds'
             ORDER BY d.rating DESC 
             LIMIT 10`
        );

        res.json({
            success: true,
            count: result.rows.length,
            drivers: result.rows || []
        });
    } catch (error) {
        console.error('Error obteniendo conductores disponibles:', error);
        res.status(500).json({ error: 'Error obteniendo conductores disponibles' });
    }
});

// ==========================================
// REGISTRAR TOKEN FCM DEL CONDUCTOR
// ==========================================
router.post('/fcm-token', async (req, res) => {
    try {
        const { driverId, fcmToken } = req.body;
        
        if (!driverId || !fcmToken) {
            return res.status(400).json({ error: 'driverId y fcmToken son requeridos' });
        }
        
        console.log('📱 Registrando token FCM para conductor:', driverId);
        
        const result = await db.query(
            'UPDATE drivers SET fcm_token = $1 WHERE id = $2 RETURNING id, name',
            [fcmToken, driverId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Conductor no encontrado' });
        }
        
        console.log(`✅ Token FCM registrado para conductor ${result.rows[0].name} (ID: ${driverId})`);
        
        res.json({
            success: true,
            message: 'Token FCM registrado correctamente'
        });
    } catch (error) {
        console.error('Error guardando token FCM:', error);
        res.status(500).json({ error: 'Error al guardar token FCM' });
    }
});

// ==========================================
// ACTUALIZAR UBICACIÓN DEL CONDUCTOR
// ==========================================
router.post('/location', async (req, res) => {
    try {
        const { driverId, latitude, longitude, heading, speed, accuracy, status } = req.body;
        
        if (!driverId || !latitude || !longitude) {
            return res.status(400).json({ error: 'driverId, latitude y longitude son requeridos' });
        }
        
        console.log(`📍 Actualizando ubicación conductor ${driverId}: ${latitude}, ${longitude}, speed: ${speed}`);
        
        const result = await db.query(
            `UPDATE drivers 
           SET current_latitude = $1, current_longitude = $2, current_speed = $3, status = COALESCE($4, status), last_seen = NOW()
             WHERE id = $5 
             RETURNING id, name, current_latitude, current_longitude, current_speed`,
            [latitude, longitude, speed || 0, status, driverId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Conductor no encontrado' });
        }
        
        const driver = result.rows[0];

        // DETECCIÓN DE LLEGADA EN BACKEND
        try {
            const tripResult = await db.query(
                `SELECT id, pickup_lat, pickup_lng, user_id FROM trips 
                 WHERE driver_id = $1 AND status = 'assigned'
                 LIMIT 1`,
                [driverId]
            );
            if (tripResult.rows.length > 0) {
                const trip = tripResult.rows[0];
                if (trip.pickup_lat && trip.pickup_lng) {
                    const R = 6371000;
                    const dLat = (trip.pickup_lat - latitude) * Math.PI / 180;
                    const dLon = (trip.pickup_lng - longitude) * Math.PI / 180;
                    const a = Math.sin(dLat/2)**2 + Math.cos(latitude * Math.PI/180) * Math.cos(trip.pickup_lat * Math.PI/180) * Math.sin(dLon/2)**2;
                    const distanceMeters = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                    console.log(`📍 Conductor ${driverId} a ${distanceMeters.toFixed(0)}m del pickup`);
                    if (distanceMeters < 80) {
                        // Actualizar viaje a 'arrived'
                        await db.query(`UPDATE trips SET status = 'arrived' WHERE id = $1 AND status = 'assigned'`, [trip.id]);
                        const admin = require('firebase-admin');
                        // FCM al conductor
                        const driverFcm = await db.query(`SELECT fcm_token, name FROM drivers WHERE id = $1`, [driverId]);
                        if (driverFcm.rows[0]?.fcm_token) {
                            await admin.messaging().send({
                                notification: { title: '✅ Llegaste', body: 'Has llegado al punto de recogida del pasajero' },
                                data: { type: 'DRIVER_ARRIVED_CONFIRMATION', tripId: trip.id.toString() },
                                token: driverFcm.rows[0].fcm_token
                            }).catch(e => console.error('FCM conductor:', e.message));
                        }
                        // FCM al pasajero
                        const userFcm = await db.query(`SELECT fcm_token, name FROM users WHERE id = $1`, [trip.user_id]);
                        if (userFcm.rows[0]?.fcm_token) {
                            await admin.messaging().send({
                                notification: { title: '🚗 ¡Tu conductor llegó!', body: 'Tu conductor está esperándote' },
                                data: { type: 'DRIVER_ARRIVED', tripId: trip.id.toString() },
                                token: userFcm.rows[0].fcm_token
                            }).catch(e => console.error('FCM usuario:', e.message));
                        }
                        console.log(`✅ Llegada detectada por backend para viaje ${trip.id}`);
                    }
                }
            }
        } catch (arrivalError) {
            console.error('⚠️ Error detección llegada:', arrivalError.message);
        }

        res.json({
            success: true,
            message: 'Ubicación actualizada',
            driver: driver
        });
    } catch (error) {
        console.error('Error actualizando ubicación:', error);
        res.status(500).json({ error: 'Error actualizando ubicación' });
    }
});

// ============================================
// OBTENER UBICACIÓN DEL CONDUCTOR
// ============================================
router.get('/:id/location', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query(
            `SELECT id, name, current_latitude as latitude, current_longitude as longitude, current_speed as speed 
             FROM drivers WHERE id = $1`,
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Conductor no encontrado' });
        }
        
        const driver = result.rows[0];
        
        res.json({
            success: true,
            driverId: driver.id,
            name: driver.name,
            latitude: driver.latitude,
            longitude: driver.longitude,
            speed: parseFloat(driver.speed) || 0
        });
    } catch (error) {
        console.error('Error obteniendo ubicación:', error);
        res.status(500).json({ error: 'Error obteniendo ubicación' });
    }
});

// =============================================
// VERIFICAR SUSPENSIÓN ACTIVA DEL CONDUCTOR
// =============================================
router.get('/check-suspension/:driverId', async (req, res) => {
    try {
        const { driverId } = req.params;

        // Primero, auto-levantar suspensiones expiradas
        await db.query(
            `UPDATE driver_suspensions SET status = 'expired' 
             WHERE driver_id = $1 AND status = 'active' AND type = 'temporal' AND expires_at < NOW()`,
            [driverId]
        );

        // Si el conductor estaba suspendido pero ya expiró, ponerlo offline
        const driverResult = await db.query(`SELECT status FROM drivers WHERE id = $1`, [driverId]);
        if (driverResult.rows.length > 0 && driverResult.rows[0].status === 'suspended') {
            const activeSuspension = await db.query(
                `SELECT id FROM driver_suspensions WHERE driver_id = $1 AND status = 'active' LIMIT 1`,
                [driverId]
            );
            if (activeSuspension.rows.length === 0) {
                await db.query(`UPDATE drivers SET status = 'offline' WHERE id = $1`, [driverId]);
            }
        }

        // Buscar suspensión activa
        const suspensionResult = await db.query(
            `SELECT id, type, reason, duration_hours, expires_at, suspended_at
             FROM driver_suspensions 
             WHERE driver_id = $1 AND status = 'active'
             ORDER BY created_at DESC LIMIT 1`,
            [driverId]
        );

        if (suspensionResult.rows.length > 0) {
            const suspension = suspensionResult.rows[0];
            const hoursRemaining = suspension.expires_at 
                ? Math.max(0, (new Date(suspension.expires_at) - new Date()) / (1000 * 60 * 60))
                : null;

            // Contar cancelaciones en 24h
            const cancellationsResult = await db.query(
                `SELECT COUNT(*) as count FROM driver_cancellations 
                 WHERE driver_id = $1 AND created_at > NOW() - INTERVAL '24 hours'`,
                [driverId]
            );

            return res.json({
                isSuspended: true,
                type: suspension.type === 'temporal' ? 'TEMPORARY' : 'PERMANENT',
                reason: suspension.reason,
                hoursRemaining: hoursRemaining ? parseFloat(hoursRemaining.toFixed(2)) : null,
                expiresAt: suspension.expires_at,
                cancellationsIn24h: parseInt(cancellationsResult.rows[0].count)
            });
        }

        res.json({ isSuspended: false });

    } catch (error) {
        console.error('Error verificando suspensión:', error);
        res.status(500).json({ error: 'Error verificando suspensión' });
    }
});

// ELIMINAR CONDUCTOR
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM driver_locations WHERE driver_id = $1', [id]);
    await db.query('DELETE FROM driver_suspensions WHERE driver_id = $1', [id]);
    await db.query('DELETE FROM driver_cancellations WHERE driver_id = $1', [id]);
    await db.query('DELETE FROM driver_documents WHERE driver_id = $1', [id]);
    await db.query('DELETE FROM communication_reads WHERE driver_id = $1', [id]);
    await db.query('DELETE FROM wallet_deposits WHERE driver_id = $1', [id]);
    await db.query('UPDATE trips SET driver_id = NULL WHERE driver_id = $1', [id]);
    await db.query('UPDATE trips SET pending_driver_id = NULL WHERE pending_driver_id = $1', [id]);
    const result = await db.query('DELETE FROM drivers WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Conductor no encontrado' });
    }
    console.log('Conductor eliminado:', id);
    res.json({ success: true, message: 'Conductor eliminado exitosamente' });
  } catch (err) {
    console.error('Error eliminando conductor:', err);
    res.status(500).json({ error: 'Error eliminando conductor', details: err.message });
  }
});

module.exports = router;