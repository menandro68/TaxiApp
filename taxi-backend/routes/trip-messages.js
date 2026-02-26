const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// Crear tabla al iniciar (si no existe)
const initTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS trip_messages (
        id SERIAL PRIMARY KEY,
        trip_id INTEGER NOT NULL,
        sender_type VARCHAR(10) NOT NULL CHECK(sender_type IN ('user', 'driver')),
        sender_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabla trip_messages verificada');
  } catch (error) {
    console.error('❌ Error creando tabla trip_messages:', error.message);
  }
};
initTable();

// ENVIAR MENSAJE
router.post('/send', async (req, res) => {
  try {
    const { trip_id, sender_type, sender_id, message } = req.body;
    if (!trip_id || !sender_type || !sender_id || !message) {
      return res.status(400).json({ success: false, error: 'Faltan campos requeridos' });
    }
    const result = await pool.query(
      'INSERT INTO trip_messages (trip_id, sender_type, sender_id, message) VALUES ($1, $2, $3, $4) RETURNING *',
      [trip_id, sender_type, sender_id, message]
    );

    // Si el conductor envió el mensaje, notificar al usuario via FCM
    if (sender_type === 'driver') {
      try {
        const tripResult = await pool.query(
          `SELECT t.user_id, u.fcm_token 
           FROM trips t 
           JOIN users u ON t.user_id = u.id 
           WHERE t.id = $1`,
          [trip_id]
        );
        
        if (tripResult.rows[0]?.fcm_token) {
          const admin = require('firebase-admin');
          await admin.messaging().send({
            token: tripResult.rows[0].fcm_token,
            data: {
              type: 'NEW_CHAT_MESSAGE',
              tripId: trip_id.toString(),
              message: message,
              senderType: 'driver'
            },
            android: {
              priority: 'high'
            }
          });
          console.log('✅ Notificación de chat enviada al usuario');
        }
      } catch (fcmError) {
        console.error('⚠️ Error enviando notificación de chat:', fcmError.message);
      }
    }

    res.json({ success: true, message: result.rows[0] });
  } catch (error) {
    console.error('Error enviando mensaje:', error);
    res.status(500).json({ success: false, error: 'Error enviando mensaje' });
  }
});

// OBTENER MENSAJES DE UN VIAJE
router.get('/trip/:tripId', async (req, res) => {
  try {
    const { tripId } = req.params;
    const result = await pool.query(
      'SELECT * FROM trip_messages WHERE trip_id = $1 ORDER BY created_at ASC',
      [tripId]
    );

    res.json({ success: true, messages: result.rows });
  } catch (error) {
    console.error('Error obteniendo mensajes:', error);
    res.status(500).json({ success: false, error: 'Error obteniendo mensajes' });
  }
});

// MARCAR MENSAJES COMO LEÍDOS
router.put('/read/:tripId/:readerType', async (req, res) => {
  try {
    const { tripId, readerType } = req.params;
    const oppositeType = readerType === 'user' ? 'driver' : 'user';

    await pool.query(
      'UPDATE trip_messages SET is_read = true WHERE trip_id = $1 AND sender_type = $2 AND is_read = false',
      [tripId, oppositeType]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error marcando leídos:', error);
    res.status(500).json({ success: false, error: 'Error marcando leídos' });
  }
});

// CONTAR MENSAJES NO LEÍDOS
router.get('/unread/:tripId/:readerType', async (req, res) => {
  try {
    const { tripId, readerType } = req.params;
    const oppositeType = readerType === 'user' ? 'driver' : 'user';

    const result = await pool.query(
      'SELECT COUNT(*) as count FROM trip_messages WHERE trip_id = $1 AND sender_type = $2 AND is_read = false',
      [tripId, oppositeType]
    );

    res.json({ success: true, unread: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('Error contando no leídos:', error);
    res.status(500).json({ success: false, error: 'Error contando no leídos' });
  }
});

module.exports = router;