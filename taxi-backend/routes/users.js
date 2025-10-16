const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const encryption = require('../encryption');

// Importar la base de datos
const db = require('../config/database');

// REGISTRO DE USUARIO (PASAJERO) - MODIFICADO CON ENCRIPTACIÓN
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    
    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // NUEVO: Encriptar datos sensibles
    const phoneEncrypted = encryption.encrypt(phone);
    
    // Insertar en la base de datos con datos encriptados
    const query = `INSERT INTO users (name, email, phone, phone_encrypted, password) 
                   VALUES (?, ?, ?, ?, ?)`;
    
    db.run(query, [name, email, 'XXX-XXX-XXXX', phoneEncrypted, hashedPassword], function(err) {
      if (err) {
        console.error('Error al registrar usuario:', err);
        return res.status(400).json({ error: 'Email ya registrado' });
      }
      
      // Log encriptado de registro
      const logData = encryption.encrypt(JSON.stringify({ name, email, action: 'register' }));
      db.run('INSERT INTO encrypted_logs (action, user_id, data_encrypted) VALUES (?, ?, ?)',
        ['user_register', this.lastID, logData]);
      
      res.json({ 
        id: this.lastID,
        name,
        email,
        message: 'Usuario registrado exitosamente'
      });
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// LOGIN DE USUARIO (PASAJERO)
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  
  const query = `SELECT * FROM users WHERE email = ?`;
  
  db.get(query, [email], async (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    // Verificar contraseña
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    // Crear token JWT
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
  });
});

// OBTENER TODOS LOS USUARIOS (para el panel admin)
router.get('/all', (req, res) => {
  const query = `SELECT id, name, email, phone, created_at FROM users`;
  
  db.all(query, [], (err, users) => {
    if (err) {
      return res.status(500).json({ error: 'Error al obtener usuarios' });
    }
    res.json(users);
  });
});

// OBTENER TODOS LOS USUARIOS
router.get('/', (req, res) => {
  const query = `SELECT * FROM users`;
  
  db.all(query, [], (err, users) => {
    if (err) {
      return res.status(500).json({ error: 'Error obteniendo usuarios' });
    }
    
    res.json({
      success: true,
      users: users || []
    });
  });
});

module.exports = router;