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
  const query = `SELECT id, name, email, phone, status, vehicle_model, vehicle_plate, vehicle_color, rating, created_at FROM drivers ORDER BY created_at DESC LIMIT 100`;
  
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

// REGISTRAR TOKEN FCM DEL CONDUCTOR
router.post('/fcm-token', (req, res) => {
  const { driverId, fcmToken } = req.body;
  
  if (!driverId || !fcmToken) {
    return res.status(400).json({ error: 'driverId y fcmToken son requeridos' });
  }
  
  const query = `UPDATE drivers SET fcm_token = ? WHERE id = ?`;
  
  db.run(query, [fcmToken, driverId], function(err) {
    if (err) {
      console.error('Error guardando token FCM:', err);
      return res.status(500).json({ error: 'Error al guardar token FCM' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Conductor no encontrado' });
    }
    
    console.log(`✅ Token FCM registrado para conductor ${driverId}`);
    res.json({
      success: true,
      message: 'Token FCM registrado correctamente'
    });
  });
});

// ACTUALIZAR ESTADO DEL CONDUCTOR
router.put('/status', (req, res) => {
  const { driverId, status, isOnline } = req.body;
  
  if (!driverId) {
    return res.status(400).json({ error: 'driverId es requerido' });
  }

  const query = `UPDATE drivers SET status = ? WHERE id = ?`;
  
  db.run(query, [status, driverId], function(err) {
    if (err) {
      console.error('❌ Error actualizando estado:', err);
      return res.status(500).json({ error: 'Error actualizando estado del conductor' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Conductor no encontrado' });
    }
    
    console.log(`✅ Estado del conductor ${driverId} actualizado a: ${status}`);
    
    res.json({
      success: true,
      message: `Conductor ${isOnline ? 'conectado' : 'desconectado'}`
    });
  });
});

// ============================================
// ACTUALIZAR UBICACIÓN DEL CONDUCTOR
// ============================================
router.put('/location', (req, res) => {
  const { driverId, latitude, longitude } = req.body;
  
  if (!driverId || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'driverId, latitude y longitude son requeridos' });
  }
  
  const query = `UPDATE drivers SET latitude = ?, longitude = ?, location_updated_at = datetime('now') WHERE id = ?`;
  
  db.run(query, [latitude, longitude, driverId], function(err) {
    if (err) {
      console.error('❌ Error actualizando ubicación:', err);
      return res.status(500).json({ error: 'Error actualizando ubicación del conductor' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Conductor no encontrado' });
    }
    
    console.log(`📍 Ubicación del conductor ${driverId} actualizada: ${latitude}, ${longitude}`);
    
    res.json({
      success: true,
      message: 'Ubicación actualizada',
      location: { latitude, longitude }
    });
  });
});

// ============================================
// OBTENER UBICACIÓN DEL CONDUCTOR
// ============================================
router.get('/:id/location', (req, res) => {
  const { id } = req.params;
  
  const query = `SELECT id, name, latitude, longitude, location_updated_at FROM drivers WHERE id = ?`;
  
  db.get(query, [id], (err, driver) => {
    if (err) {
      console.error('❌ Error obteniendo ubicación:', err);
      return res.status(500).json({ error: 'Error obteniendo ubicación del conductor' });
    }
    
    if (!driver) {
      return res.status(404).json({ error: 'Conductor no encontrado' });
    }
    
    res.json({
      success: true,
      driverId: driver.id,
      name: driver.name,
      latitude: driver.latitude,
      longitude: driver.longitude,
      updatedAt: driver.location_updated_at
    });
  });
});

module.exports = router;