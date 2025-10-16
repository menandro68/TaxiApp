const express = require('express');
const router = express.Router();

// Importar la base de datos
const db = require('../config/database');

// CREAR NUEVO VIAJE
router.post('/create', async (req, res) => {
  const { user_id, pickup_location, destination } = req.body;
  
  const query = `INSERT INTO trips (user_id, pickup_location, destination, status)  
                 VALUES (?, ?, ?, 'pending')`;
  
  db.run(query, [user_id, pickup_location, destination], async function(err) {
    if (err) {
      return res.status(500).json({ error: 'Error al crear viaje' });
    }
    
    const tripId = this.lastID;
    
    // NUEVO: Obtener tokens FCM de conductores disponibles
    db.all(`SELECT fcm_token FROM drivers WHERE status = 'available' AND fcm_token IS NOT NULL`, [], async (err, drivers) => {
      if (err) {
        console.error('Error obteniendo tokens FCM:', err);
      } else if (drivers.length > 0) {
        // Obtener información del usuario que solicitó el viaje
        db.get(`SELECT name, phone FROM users WHERE id = ?`, [user_id], async (err, user) => {
          const tokens = drivers.map(d => d.fcm_token);
          
          const message = {
            notification: {
              title: '🚗 Nueva Solicitud de Viaje',
              body: `Pasajero: ${user?.name || 'Usuario'}\nOrigen: ${pickup_location}\nDestino: ${destination}`
            },
            data: {
              tripId: tripId.toString(),
              user: user?.name || 'Usuario',
              phone: user?.phone || '',
              pickup: pickup_location,
              destination: destination,
              type: 'NEW_TRIP_REQUEST'
            },
            tokens: tokens
          };
          
          try {
            const admin = require('firebase-admin');
            const response = await admin.messaging().sendMulticast(message);
            console.log(`✅ Notificaciones enviadas: ${response.successCount}/${tokens.length}`);
          } catch (error) {
            console.error('❌ Error enviando notificaciones FCM:', error);
          }
        });
      }
    });
    
    res.json({
      success: true,
      tripId: tripId,
      message: 'Viaje creado, buscando conductor...'
    });
  });
});

// ASIGNAR CONDUCTOR A VIAJE
router.put('/assign/:tripId', (req, res) => {
  const { tripId } = req.params;
  const { driver_id, price } = req.body;
  
  const query = `UPDATE trips 
                 SET driver_id = ?, price = ?, status = 'assigned' 
                 WHERE id = ?`;
  
  db.run(query, [driver_id, price, tripId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Error al asignar conductor' });
    }
    
    res.json({
      success: true,
      message: 'Conductor asignado al viaje'
    });
  });
});

// ACTUALIZAR ESTADO DEL VIAJE
router.put('/status/:tripId', (req, res) => {
  const { tripId } = req.params;
  const { status } = req.body;
  
  const validStatuses = ['pending', 'assigned', 'accepted', 'arrived', 'started', 'completed', 'cancelled'];
  
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }
  
  const query = `UPDATE trips SET status = ? WHERE id = ?`;
  
  db.run(query, [status, tripId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Error al actualizar estado' });
    }
    
    res.json({
      success: true,
      message: `Estado actualizado a: ${status}`
    });
  });
});

// OBTENER VIAJES ACTIVOS
router.get('/active', (req, res) => {
  const query = `SELECT t.*, u.name as user_name, u.phone as user_phone,
                 d.name as driver_name, d.phone as driver_phone, d.vehicle_model
                 FROM trips t
                 LEFT JOIN users u ON t.user_id = u.id
                 LEFT JOIN drivers d ON t.driver_id = d.id
                 WHERE t.status NOT IN ('completed', 'cancelled')`;
  
  db.all(query, [], (err, trips) => {
    if (err) {
      return res.status(500).json({ error: 'Error al obtener viajes' });
    }
    res.json(trips);
  });
});

// OBTENER HISTORIAL DE VIAJES
router.get('/history/:userId', (req, res) => {
  const { userId } = req.params;
  
  const query = `SELECT t.*, d.name as driver_name, d.vehicle_model
                 FROM trips t
                 LEFT JOIN drivers d ON t.driver_id = d.id
                 WHERE t.user_id = ?
                 ORDER BY t.created_at DESC`;
  
  db.all(query, [userId], (err, trips) => {
    if (err) {
      return res.status(500).json({ error: 'Error al obtener historial' });
    }
    res.json(trips);
  });
});

// OBTENER TODOS LOS VIAJES
router.get('/', (req, res) => {
 const query = `SELECT id, user_id, driver_id, pickup_location, destination, status, price, created_at FROM trips ORDER BY created_at DESC LIMIT 100`;
  
  db.all(query, [], (err, trips) => {
    if (err) {
      return res.status(500).json({ error: 'Error obteniendo viajes' });
    }
    
    res.json({
      success: true,
      trips: trips || []
    });
  });
});

module.exports = router;