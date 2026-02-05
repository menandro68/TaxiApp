const express = require('express');
const router = express.Router();

// Importar la base de datos
const db = require('../config/database');

// CREAR NUEVO VIAJE
router.post('/create', async (req, res) => {
  const { user_id, pickup_location, destination, pickup_coords, destination_coords, estimated_price, vehicle_type, payment_method } = req.body;
  
  // Extraer coordenadas
  const pickupLat = pickup_coords?.latitude || null;
  const pickupLng = pickup_coords?.longitude || null;
  const destLat = destination_coords?.latitude || null;
  const destLng = destination_coords?.longitude || null;
  
  console.log('📍 Coordenadas recibidas:', { pickupLat, pickupLng, destLat, destLng });
  
  const query = `INSERT INTO trips (user_id, pickup_location, destination, status, price, pickup_lat, pickup_lng, destination_lat, destination_lng)  
                 VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?)`;
  
  db.run(query, [user_id, pickup_location, destination, estimated_price || 0, pickupLat, pickupLng, destLat, destLng], async function(err) {
    if (err) {
      console.error('❌ Error creando viaje:', err);
      return res.status(500).json({ error: 'Error al crear viaje' });
    }
    
    const tripId = this.lastID;
    console.log('✅ Viaje creado con ID:', tripId);
    
    // Obtener tokens FCM de conductores disponibles
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
              pickupLat: pickupLat ? pickupLat.toString() : '',
              pickupLng: pickupLng ? pickupLng.toString() : '',
              destinationLat: destLat ? destLat.toString() : '',
              destinationLng: destLng ? destLng.toString() : '',
              estimatedPrice: (estimated_price || 0).toString(),
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
  const query = `SELECT id, user_id, driver_id, pickup_location, destination, status, price, pickup_lat, pickup_lng, destination_lat, destination_lng, created_at FROM trips ORDER BY created_at DESC LIMIT 100`;
  
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

// GUARDAR CLAVE DE VERIFICACIÓN DEL VIAJE
router.put('/trip-code/:tripId', (req, res) => {
  const { tripId } = req.params;
  const { trip_code } = req.body;

  if (!trip_code || trip_code.length !== 4) {
    return res.status(400).json({ error: 'Clave debe ser de 4 dígitos' });
  }

  // Agregar columna si no existe
  db.run(`ALTER TABLE trips ADD COLUMN trip_code VARCHAR(4)`, () => {
    // Ignorar error si ya existe la columna
    db.run(`UPDATE trips SET trip_code = ? WHERE id = ?`, [trip_code, tripId], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error guardando clave' });
      }
      console.log(`🔑 Clave ${trip_code} guardada para viaje ${tripId}`);
      res.json({ success: true, message: 'Clave guardada' });
    });
  });
});

// VALIDAR CLAVE DE VERIFICACIÓN DEL VIAJE
router.post('/verify-code/:tripId', (req, res) => {
  const { tripId } = req.params;
  const { trip_code } = req.body;

  db.get(`SELECT trip_code FROM trips WHERE id = ?`, [tripId], (err, trip) => {
    if (err) {
      return res.status(500).json({ error: 'Error verificando clave' });
    }
    if (!trip) {
      return res.status(404).json({ success: false, error: 'Viaje no encontrado' });
    }
    if (!trip.trip_code) {
      return res.status(400).json({ success: false, error: 'No hay clave asignada a este viaje' });
    }
    if (trip.trip_code === trip_code) {
      console.log(`✅ Clave verificada correctamente para viaje ${tripId}`);
      res.json({ success: true, message: 'Clave correcta' });
    } else {
      console.log(`❌ Clave incorrecta para viaje ${tripId}: ${trip_code} vs ${trip.trip_code}`);
      res.json({ success: false, message: 'Clave incorrecta' });
    }
  });
});

module.exports = router;