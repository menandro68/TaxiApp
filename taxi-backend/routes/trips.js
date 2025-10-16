const express = require('express');
const router = express.Router();

// Importar la base de datos
const db = require('../config/database');

// FUNCIÓN AUXILIAR: Calcular distancia entre dos puntos (Haversine)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distancia en km
}

// CREAR NUEVO VIAJE CON ASIGNACIÓN AUTOMÁTICA
router.post('/create', async (req, res) => {
  const { user_id, pickup_location, destination, vehicle_type, payment_method, estimated_price, pickup_coords } = req.body;

  // Validar coordenadas de pickup
  if (!pickup_coords || !pickup_coords.latitude || !pickup_coords.longitude) {
    return res.status(400).json({ 
      error: 'Coordenadas de ubicación requeridas',
      success: false 
    });
  }

  const query = `INSERT INTO trips (user_id, pickup_location, destination, status, price)
                 VALUES (?, ?, ?, 'pending', ?)`;

  db.run(query, [user_id, pickup_location, destination, estimated_price || 0], async function(err) {
    if (err) {
      console.error('❌ Error creando viaje:', err);
      return res.status(500).json({ error: 'Error al crear viaje', success: false });
    }

    const tripId = this.lastID;
    console.log(`✅ Viaje ${tripId} creado, buscando conductor...`);

    try {
      // BUSCAR CONDUCTORES DISPONIBLES CON COORDENADAS
      const availableDrivers = await new Promise((resolve, reject) => {
        db.all(
          `SELECT id, name, phone, vehicle_model, vehicle_plate, rating, 
                  current_latitude, current_longitude, fcm_token
           FROM drivers 
           WHERE status = 'available' OR status = 'online'`,
          [],
          (err, drivers) => {
            if (err) reject(err);
            else resolve(drivers || []);
          }
        );
      });

      console.log(`📍 Conductores disponibles: ${availableDrivers.length}`);

      if (availableDrivers.length === 0) {
        console.log('⚠️ No hay conductores disponibles');
        return res.json({
          success: true,
          tripId: tripId,
          message: 'Viaje creado, pero no hay conductores disponibles',
          driverFound: false
        });
      }

      // CALCULAR DISTANCIAS Y BUSCAR EL MÁS CERCANO
      const driversWithDistance = availableDrivers
        .filter(d => d.current_latitude && d.current_longitude)
        .map(driver => ({
          ...driver,
          distance: calculateDistance(
            pickup_coords.latitude,
            pickup_coords.longitude,
            driver.current_latitude,
            driver.current_longitude
          )
        }))
        .sort((a, b) => a.distance - b.distance);

      console.log(`🔍 Conductores con distancia calculada: ${driversWithDistance.length}`);

      if (driversWithDistance.length === 0) {
        console.log('⚠️ Ningún conductor tiene ubicación registrada');
        return res.json({
          success: true,
          tripId: tripId,
          message: 'Viaje creado, buscando conductor...',
          driverFound: false
        });
      }

      // SELECCIONAR CONDUCTOR MÁS CERCANO
      const nearestDriver = driversWithDistance[0];
      console.log(`✅ Conductor más cercano: ${nearestDriver.name} (${nearestDriver.distance.toFixed(2)} km)`);

      // ASIGNAR CONDUCTOR AL VIAJE
      await new Promise((resolve, reject) => {
        db.run(
          `UPDATE trips SET driver_id = ?, status = 'assigned' WHERE id = ?`,
          [nearestDriver.id, tripId],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      // OBTENER INFO DEL USUARIO
      const user = await new Promise((resolve, reject) => {
        db.get(`SELECT name, phone FROM users WHERE id = ?`, [user_id], (err, user) => {
          if (err) reject(err);
          else resolve(user || {});
        });
      });

      // ENVIAR NOTIFICACIÓN FCM AL CONDUCTOR ASIGNADO
      if (nearestDriver.fcm_token) {
        const message = {
          notification: {
            title: '🚗 Nuevo Viaje Asignado',
            body: `Pasajero: ${user.name || 'Usuario'}\nDistancia: ${nearestDriver.distance.toFixed(1)} km`
          },
          data: {
            tripId: tripId.toString(),
            user: user.name || 'Usuario',
            phone: user.phone || '',
            pickup: pickup_location,
            destination: destination,
            distance: nearestDriver.distance.toFixed(2),
            type: 'TRIP_ASSIGNED'
          },
          token: nearestDriver.fcm_token
        };

        try {
          const admin = require('firebase-admin');
          await admin.messaging().send(message);
          console.log(`✅ Notificación enviada a ${nearestDriver.name}`);
        } catch (error) {
          console.error('❌ Error enviando notificación FCM:', error);
        }
      }

      // RESPUESTA CON DATOS DEL CONDUCTOR ASIGNADO
      res.json({
        success: true,
        tripId: tripId,
        message: 'Conductor asignado exitosamente',
        driverFound: true,
        driver: {
          id: nearestDriver.id,
          name: nearestDriver.name,
          phone: nearestDriver.phone,
          vehicle: {
            model: nearestDriver.vehicle_model,
            plate: nearestDriver.vehicle_plate
          },
          rating: nearestDriver.rating,
          distance: nearestDriver.distance.toFixed(2),
          location: {
            latitude: nearestDriver.current_latitude,
            longitude: nearestDriver.current_longitude
          },
          eta: Math.ceil(nearestDriver.distance * 3) // Estimación: 3 min por km
        }
      });

    } catch (error) {
      console.error('❌ Error asignando conductor:', error);
      res.json({
        success: true,
        tripId: tripId,
        message: 'Viaje creado, error buscando conductor',
        driverFound: false
      });
    }
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
  const query = `SELECT * FROM trips`;
  
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