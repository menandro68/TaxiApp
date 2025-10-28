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
    router.post('/create', async (req, res) => {
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
            'UPDATE drivers SET status = $1, is_online = $2 WHERE id = $3 RETURNING *',
            [status, isOnline === true || isOnline === 1, driverId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Conductor no encontrado' });
        }
        
        console.log(`✅ Estado actualizado: Conductor ${driverId} ahora está ${isOnline ? 'ONLINE' : 'OFFLINE'}`);
        
        res.json({
            success: true,
            message: `Conductor ${isOnline ? 'conectado' : 'desconectado'} exitosamente`,
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
                dl.latitude,
                dl.longitude
             FROM drivers d
             LEFT JOIN driver_locations dl ON d.id = dl.driver_id
             WHERE d.status = 'active'
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

module.exports = router;