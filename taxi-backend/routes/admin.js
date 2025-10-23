const express = require('express');
const router = express.Router();
const db = require('../config/database');
const bcrypt = require('bcryptjs');

// OBTENER ESTADÍSTICAS DEL DASHBOARD
router.get('/stats', async (req, res) => {
    try {
        const stats = {};
        
        // Total de usuarios
        const usersResult = await db.query('SELECT COUNT(*) as count FROM users');
        stats.totalUsers = parseInt(usersResult.rows[0]?.count || 0);
        
        // Total de conductores
        const driversResult = await db.query('SELECT COUNT(*) as count FROM drivers');
        stats.totalDrivers = parseInt(driversResult.rows[0]?.count || 0);
        
        // Conductores activos
        const activeDriversResult = await db.query('SELECT COUNT(*) as count FROM drivers WHERE status = $1', ['active']);
        stats.activeDrivers = parseInt(activeDriversResult.rows[0]?.count || 0);
        
        // Total de viajes
        const tripsResult = await db.query('SELECT COUNT(*) as count FROM trips');
        stats.totalTrips = parseInt(tripsResult.rows[0]?.count || 0);
        
        // Viajes completados hoy
        const tripsTodayResult = await db.query(
            'SELECT COUNT(*) as count FROM trips WHERE status = $1 AND DATE(created_at) = CURRENT_DATE',
            ['completed']
        );
        stats.tripsToday = parseInt(tripsTodayResult.rows[0]?.count || 0);
        
        // Ingresos totales
        const revenueResult = await db.query('SELECT SUM(price) as total FROM trips WHERE status = $1', ['completed']);
        stats.totalRevenue = parseFloat(revenueResult.rows[0]?.total || 0);
        
        res.json(stats);
    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({ error: error.message });
    }
});

// OBTENER TODOS LOS CONDUCTORES
router.get('/drivers', async (req, res) => {
    try {
        const query = `SELECT id, name, email, phone, license, vehicle_plate, 
                       vehicle_model, vehicle_color, status, rating, total_trips, created_at 
                       FROM drivers ORDER BY created_at DESC`;
        
        const result = await db.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo conductores:', error);
        res.status(500).json({ error: 'Error al obtener conductores' });
    }
});

// APROBAR/RECHAZAR CONDUCTOR
router.put('/drivers/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        const validStatuses = ['active', 'inactive', 'suspended', 'pending'];
        
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Estado inválido' });
        }
        
        const result = await db.query(
            'UPDATE drivers SET status = $1 WHERE id = $2 RETURNING *',
            [status, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Conductor no encontrado' });
        }
        
        res.json({ success: true, message: `Estado actualizado a: ${status}`, driver: result.rows[0] });
    } catch (error) {
        console.error('Error actualizando conductor:', error);
        res.status(500).json({ error: 'Error al actualizar estado' });
    }
});

// OBTENER TODOS LOS VIAJES
router.get('/trips', async (req, res) => {
    try {
        const query = `SELECT t.*, 
                       u.name as user_name, u.email as user_email,
                       d.name as driver_name, d.vehicle_model
                       FROM trips t
                       LEFT JOIN users u ON t.user_id = u.id
                       LEFT JOIN drivers d ON t.driver_id = d.id
                       ORDER BY t.created_at DESC`;
        
        const result = await db.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo viajes:', error);
        res.status(500).json({ error: 'Error al obtener viajes' });
    }
});

// OBTENER VIAJES EN TIEMPO REAL
router.get('/trips/live', async (req, res) => {
    try {
        const query = `SELECT t.*, 
                       u.name as user_name, u.phone as user_phone,
                       d.name as driver_name, d.phone as driver_phone, d.vehicle_model
                       FROM trips t
                       LEFT JOIN users u ON t.user_id = u.id
                       LEFT JOIN drivers d ON t.driver_id = d.id
                       WHERE t.status IN ('pending', 'assigned', 'accepted', 'arrived', 'started')
                       ORDER BY t.created_at DESC`;
        
        const result = await db.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo viajes activos:', error);
        res.status(500).json({ error: 'Error al obtener viajes activos' });
    }
});

// Login de administrador
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
        }
        
        const result = await db.query(
            'SELECT * FROM admins WHERE username = $1 OR email = $1',
            [username]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        
        const admin = result.rows[0];
        const validPassword = await bcrypt.compare(password, admin.password);
        
        if (!validPassword) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        
        res.json({
            success: true,
            admin: {
                id: admin.id,
                username: admin.username,
                email: admin.email,
                role: admin.role
            },
            token: 'admin-token-' + Date.now()
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// ==========================================
// CRUD DE CONDUCTORES
// ==========================================

// AGREGAR CONDUCTOR
router.post('/drivers', async (req, res) => {
    try {
        const { name, email, phone, password, license, vehicle_plate, vehicle_model, vehicle_color } = req.body;
        
        const hashedPassword = await bcrypt.hash(password || 'password123', 10);
        
        const result = await db.query(
            `INSERT INTO drivers (name, email, phone, password, license, vehicle_plate, vehicle_model, vehicle_color, status, rating, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
             RETURNING id`,
            [name, email, phone, hashedPassword, license, vehicle_plate, vehicle_model, vehicle_color, 'pending', 5.0]
        );
        
        res.json({ success: true, id: result.rows[0].id });
    } catch (error) {
        console.error('Error creando conductor:', error);
        res.status(400).json({ error: error.message });
    }
});

// EDITAR CONDUCTOR
router.put('/drivers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        const fields = [];
        const values = [];
        let paramCount = 1;
        
        Object.keys(updates).forEach(key => {
            fields.push(`${key} = $${paramCount}`);
            values.push(updates[key]);
            paramCount++;
        });
        
        if (fields.length === 0) {
            return res.status(400).json({ error: 'No hay campos para actualizar' });
        }
        
        values.push(id);
        const query = `UPDATE drivers SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
        
        const result = await db.query(query, values);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Conductor no encontrado' });
        }
        
        res.json({ success: true, changes: result.rows.length, driver: result.rows[0] });
    } catch (error) {
        console.error('Error actualizando conductor:', error);
        res.status(400).json({ error: error.message });
    }
});

// ELIMINAR CONDUCTOR
router.delete('/drivers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query(
            'DELETE FROM drivers WHERE id = $1 RETURNING id',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Conductor no encontrado' });
        }
        
        res.json({ success: true, deleted: result.rows.length });
    } catch (error) {
        console.error('Error eliminando conductor:', error);
        res.status(400).json({ error: error.message });
    }
});

// ==========================================
// CRUD DE USUARIOS
// ==========================================

// AGREGAR USUARIO
router.post('/users', async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;
        
        const hashedPassword = await bcrypt.hash(password || 'password123', 10);
        
        const result = await db.query(
            `INSERT INTO users (name, email, phone, password, created_at)
             VALUES ($1, $2, $3, $4, NOW())
             RETURNING id`,
            [name, email, phone, hashedPassword]
        );
        
        res.json({ success: true, id: result.rows[0].id });
    } catch (error) {
        console.error('Error creando usuario:', error);
        res.status(400).json({ error: error.message });
    }
});

// ELIMINAR USUARIO
router.delete('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query(
            'DELETE FROM users WHERE id = $1 RETURNING id',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        res.json({ success: true, deleted: result.rows.length });
    } catch (error) {
        console.error('Error eliminando usuario:', error);
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;