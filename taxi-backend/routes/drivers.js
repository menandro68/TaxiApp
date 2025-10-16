const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Importar la base de datos
const db = require('../config/database');

// REGISTRO DE CONDUCTOR
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password, license, vehicle_plate, vehicle_model, vehicle_color } = req.body;
    
    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insertar en la base de datos
    const query = `INSERT INTO drivers (name, email, phone, password, license, vehicle_plate, vehicle_model, vehicle_color) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    
    db.run(query, [name, email, phone, hashedPassword, license, vehicle_plate, vehicle_model, vehicle_color], function(err) {
      if (err) {
        return res.status(400).json({ error: 'Email ya registrado' });
      }
      
      res.json({ 
        success: true, 
        driverId: this.lastID,
        message: 'Conductor registrado exitosamente' 
      });
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// LOGIN DE CONDUCTOR
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  
  const query = `SELECT * FROM drivers WHERE email = ?`;
  
  db.get(query, [email], async (err, driver) => {
    if (err || !driver) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    // Verificar contraseña
    const validPassword = await bcrypt.compare(password, driver.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    // Crear token JWT
    const token = jwt.sign(
      { id: driver.id, email: driver.email },
      process.env.JWT_SECRET || 'secret_key',
      { expiresIn: '30d' }
    );
    
    // Actualizar estado a activo
    db.run(`UPDATE drivers SET status = 'active' WHERE id = ?`, [driver.id]);
    
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
  });
});

// OBTENER TODOS LOS CONDUCTORES
router.get('/', (req, res) => {
  const query = `SELECT * FROM drivers`;
  
  db.all(query, [], (err, drivers) => {
    if (err) {
      return res.status(500).json({ error: 'Error obteniendo conductores' });
    }
    
    res.json({
      success: true,
      drivers: drivers || []
    });
  });
});

// ACTUALIZAR ESTADO DEL CONDUCTOR (ONLINE/OFFLINE)
router.put('/status', (req, res) => {
  const { driverId, status, isOnline } = req.body;
  
  console.log('📡 Recibida petición de cambio de estado:', { driverId, status, isOnline });
  
  const query = `UPDATE drivers SET status = ?, is_online = ? WHERE id = ?`;
  
  db.run(query, [status, isOnline ? 1 : 0, driverId], function(err) {
    if (err) {
      console.error('❌ Error actualizando estado:', err);
      return res.status(500).json({ error: 'Error actualizando estado del conductor' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Conductor no encontrado' });
    }
    
    console.log(`✅ Estado actualizado: Conductor ${driverId} ahora está ${isOnline ? 'ONLINE' : 'OFFLINE'}`);
    
    res.json({
      success: true,
      message: `Conductor ${isOnline ? 'conectado' : 'desconectado'} exitosamente`
    });
  });
});

module.exports = router;