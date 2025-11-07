const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const encryption = require('../encryption');
const { db } = require('../config/database');

// REGISTRO DE USUARIO (PASAJERO)
router.post('/register', async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const phoneEncrypted = encryption.encrypt(phone);
        
        const result = await db.query(
            `INSERT INTO users (name, email, phone, phone_encrypted, password, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW())
             RETURNING id, name, email`,
            [name, email, 'XXX-XXX-XXXX', phoneEncrypted, hashedPassword]
        );
        
        const userId = result.rows[0].id;
        
        // Log encriptado de registro
        const logData = encryption.encrypt(JSON.stringify({ name, email, action: 'register' }));
        await db.query(
            'INSERT INTO encrypted_logs (action, user_id, data_encrypted, created_at) VALUES ($1, $2, $3, NOW())',
            ['user_register', userId, logData]
        );
        
        res.json({
            success: true,
            token: 'user_token_temp',
            refreshToken: 'refresh_token_temp',
            user: {
                id: userId,
                name: result.rows[0].name,
                email: result.rows[0].email
            },
            message: 'Usuario registrado exitosamente'
        });
    } catch (error) {
        console.error('Error en registro:', error);
        if (error.code === '23505') {
            return res.status(400).json({ error: 'Email ya registrado' });
        }
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// LOGIN DE USUARIO (PASAJERO)
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const result = await db.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        
        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password);
        
        if (!validPassword) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET || 'secret_key',
            { expiresIn: '30d' }
        );
        
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone
            }
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// OBTENER TODOS LOS USUARIOS (para el panel admin)
router.get('/all', async (req, res) => {
    try {
        const result = await db.query(
            'SELECT id, name, email, phone, created_at FROM users ORDER BY created_at DESC'
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
});

// OBTENER TODOS LOS USUARIOS
router.get('/', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM users ORDER BY created_at DESC');
        
        res.json({
            success: true,
            users: result.rows || []
        });
    } catch (error) {
        console.error('Error obteniendo usuarios:', error);
        res.status(500).json({ error: 'Error obteniendo usuarios' });
    }
});

module.exports = router;
