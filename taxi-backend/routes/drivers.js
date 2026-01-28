const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../config/database');

// REGISTRO DE CONDUCTOR
router.post('/register', async (req, res) => {
    try {
        const { name, email, phone, password, license, vehicle_plate, vehicle_model, vehicle_color } = req.body;
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const result = await db.query(
            `INSERT INTO drivers (name, email, phone, password, license, vehicle_plate, vehicle_model, vehicle_color, status, rating, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
             RETURNING id`,
            [name, email, phone, hashedPassword, license, vehicle_plate, vehicle_model, vehicle_color, 'pending', 5.0]
        );
        
        res.json({
            success: true,
            driverId: result.rows[0].id,
            message: 'Conductor registrado exitosamente'
        });
    } catch (error) {
        console.error('Error en registro de conductor:', error);
        if (error.code === '23505') {
            return res.status(400).json({ error: 'Email ya registrado' });
        }
        res.status(500).json({ error: 'Error en el servidor' });
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
        const { name, email, phone, password, license, vehicle_plate, vehicle_model, vehicle_color, status } = req.body;
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const result = await db.query(
            `INSERT INTO drivers (name, email, phone, password, license, vehicle_plate, vehicle_model, vehicle_color, status, rating, total_trips, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
             RETURNING *`,
            [name, email, phone, hashedPassword, license, vehicle_plate, vehicle_model, vehicle_color, status || 'active', 4.8, 0]
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
             WHERE d.status = 'active' AND d.is_online = true
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
             SET current_latitude = $1, current_longitude = $2, current_speed = $3, status = COALESCE($4, status)
             WHERE id = $5 
             RETURNING id, name, current_latitude, current_longitude, current_speed`,
            [latitude, longitude, speed || 0, status, driverId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Conductor no encontrado' });
        }
        
        res.json({
            success: true,
            message: 'Ubicación actualizada',
            driver: result.rows[0]
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

module.exports = router;