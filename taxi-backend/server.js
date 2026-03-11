// Importar dependencias
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
require('dotenv').config();

// Inicializar Firebase Admin con variables de entorno
const admin = require('firebase-admin');

const firebaseConfig = {
  type: 'service_account',
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL
};

if (firebaseConfig.project_id && firebaseConfig.private_key && firebaseConfig.client_email) {
  admin.initializeApp({
    credential: admin.credential.cert(firebaseConfig)
  });
  console.log('🔥 Firebase Admin inicializado correctamente');
} else {
  console.log('⚠️ Firebase Admin no configurado - faltan variables de entorno');
}

// Importar base de datos
const { db, pool, DatabaseService } = require('./config/database');

// Crear aplicación Express
const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
global.io = io;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, '../')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==========================================
// IMPORTAR RUTAS
// ==========================================
const driverRoutes = require('./routes/drivers');
const userRoutes = require('./routes/users');
const tripRoutes = require('./routes/trips');
const adminRoutes = require('./routes/admin');
const documentRoutes = require('./routes/documents');
const supportRoutes = require('./routes/support');
const financeRoutes = require('./routes/finances');
const reportRoutes = require('./routes/reports');
const pricingRoutes = require('./routes/pricing');
const suspensionsRouter = require('./routes/suspensions');
const zonesRouter = require('./routes/zones-management');
const dynamicPricingRouter = require('./routes/dynamic-pricing');
const surgeRouter = require('./routes/surge-engine');
const trackingRouter = require('./routes/tracking');
const settingsRoutes = require('./routes/settings');
const tripMessagesRouter = require('./routes/trip-messages');
const referralsRouter = require('./routes/referrals');

// ==========================================
// REGISTRAR RUTAS
// ==========================================
app.use('/api/drivers', driverRoutes);
app.use('/api/users', userRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/finances', financeRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/suspensions', suspensionsRouter);
app.use('/api/zones', zonesRouter);
app.use('/api/dynamic-pricing', dynamicPricingRouter);
app.use('/api/surge', surgeRouter);
app.use('/api/tracking', trackingRouter);
app.use('/api/admin/settings', settingsRoutes);
app.use('/api/referrals', referralsRouter);
app.use('/api/trip-messages', tripMessagesRouter);
app.use('/api/admin/wallet', require('./routes/wallet-deposits'));

// Ruta para página de tracking en tiempo real
app.get('/track/:shareId', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'track.html'));
});

// Página de descarga de apps
app.get('/descargar', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'download.html'));
});

// ==========================================
// PÁGINA PRINCIPAL
// ==========================================
app.get('/', (req, res) => {
  const fs = require('fs');
  const appPath = path.join(__dirname, '../App.html');
  
  fs.readFile(appPath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error cargando App.html:', err);
      return res.status(500).send('Error cargando la aplicación');
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(data);
  });
});

// ==========================================
// CONFIG REMOTA PARA APPS
// ==========================================
app.get('/api/config', (req, res) => {
  res.json({
    api_url: 'https://web-production-99844.up.railway.app/api',
    socket_url: 'wss://web-production-99844.up.railway.app',
    version: '1.0.0',
    features: {
      push_notifications: true,
      real_time_tracking: true,
      surge_pricing: true
    }
  });
});

// ==========================================
// HEALTH CHECK Y PÁGINAS ESTÁTICAS
// ==========================================

// Página de eliminación de cuenta
app.get('/delete-account', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Eliminar Cuenta - TaxiApp Rondon</title>
<style>body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:20px;color:#333}h1{color:#dc2626}h2{color:#1e40af;margin-top:30px}p{line-height:1.6}.btn{background:#dc2626;color:white;padding:12px 24px;border:none;border-radius:8px;font-size:16px;cursor:pointer;margin-top:10px}.btn:hover{background:#b91c1c}</style>
</head>
<body>
<h1>Solicitud de Eliminación de Cuenta - Squid Apps RD</h1>
<p><strong>Aplicación:</strong> Squid Conductor / Squid Pasajero</p>

<h2>Cómo solicitar la eliminación de tu cuenta</h2>
<p>Para solicitar la eliminación de tu cuenta y todos los datos asociados, envía un correo electrónico a:</p>
<p><strong><a href="mailto:menandro1968@gmail.com?subject=Solicitud de eliminación de cuenta">menandro1968@gmail.com</a></strong></p>
<p>Incluye en tu correo:</p>
<p>1. Tu nombre completo registrado en la app<br>
2. Tu número de teléfono registrado<br>
3. Tu correo electrónico registrado</p>

<h2>Datos que se eliminan</h2>
<p>Al procesar tu solicitud, eliminaremos: nombre, correo electrónico, número de teléfono, historial de viajes, datos de ubicación, información de pago y cualquier otro dato personal asociado a tu cuenta.</p>

<h2>Datos que se conservan</h2>
<p>Por requisitos legales y fiscales de la República Dominicana, podemos conservar registros financieros y de facturación por un período máximo de 10 años.</p>

<h2>Plazo de procesamiento</h2>
<p>Tu solicitud será procesada en un plazo máximo de 30 días hábiles. Recibirás una confirmación por correo electrónico cuando se complete la eliminación.</p>
</body>
</html>`);
});

// Política de Privacidad
app.get('/privacy', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Política de Privacidad - TaxiApp Rondon</title>
<style>body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:20px;color:#333}h1{color:#2563eb}h2{color:#1e40af;margin-top:30px}p{line-height:1.6}</style>
</head>
<body>
<h1>Política de Privacidad - TaxiApp Rondon</h1>
<p><strong>Última actualización:</strong> 12 de febrero de 2026</p>

<h2>1. Información que Recopilamos</h2>
<p>Recopilamos la siguiente información para proporcionar nuestro servicio de transporte: nombre, número de teléfono, dirección de correo electrónico, ubicación GPS en tiempo real durante el uso de la aplicación, historial de viajes y datos de pago.</p>

<h2>2. Uso de la Información</h2>
<p>Utilizamos su información para: conectar pasajeros con conductores, calcular rutas y tarifas, procesar pagos, mejorar la seguridad del servicio, enviar notificaciones sobre sus viajes y brindar soporte al cliente.</p>

<h2>3. Ubicación GPS</h2>
<p>Nuestra aplicación requiere acceso a su ubicación GPS para funcionar correctamente. La ubicación se utiliza únicamente mientras la aplicación está en uso activo para: mostrar conductores cercanos, calcular rutas y distancias, y compartir ubicación en tiempo real durante un viaje activo.</p>

<h2>4. Compartir Información</h2>
<p>No vendemos ni compartimos su información personal con terceros, excepto: con el conductor o pasajero asignado a su viaje (nombre y ubicación), con proveedores de servicios necesarios para el funcionamiento de la app (Google Maps, Firebase), y cuando sea requerido por ley.</p>

<h2>5. Seguridad</h2>
<p>Implementamos medidas de seguridad técnicas y organizativas para proteger su información, incluyendo cifrado de datos, acceso restringido y almacenamiento seguro en servidores protegidos.</p>

<h2>6. Retención de Datos</h2>
<p>Conservamos su información mientras mantenga una cuenta activa. Puede solicitar la eliminación de sus datos contactándonos directamente.</p>

<h2>7. Derechos del Usuario</h2>
<p>Usted tiene derecho a: acceder a sus datos personales, solicitar corrección de datos inexactos, solicitar eliminación de su cuenta y datos, y retirar su consentimiento en cualquier momento.</p>

<h2>8. Contacto</h2>
<p>Para preguntas sobre esta política de privacidad, contáctenos a: <strong>menandro1968@gmail.com</strong></p>

<h2>9. Cambios</h2>
<p>Nos reservamos el derecho de actualizar esta política. Los cambios serán notificados a través de la aplicación.</p>
</body>
</html>`);
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// TEMPORAL: Ejecutar migración FCM Token
app.get('/run-migration-fcm', async (req, res) => {
    try {
        const migration = require('./migrations/add_fcm_token_column');
        const result = await migration.up();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// TEMPORAL: Ejecutar migración columnas ubicación
app.get('/run-migration-location', async (req, res) => {
    try {
        const migration = require('./migrations/add_location_columns');
        const result = await migration.up();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// TEMPORAL: Ejecutar migración pending_driver_id
app.get('/run-migration-pending', async (req, res) => {
    try {
        const migration = require('./migrations/add_pending_driver_column');
        const result = await migration.up();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// TEMPORAL: Probar notificación FCM
app.get('/test-fcm/:driverId', async (req, res) => {
    try {
        const { driverId } = req.params;
        
        // Obtener token FCM del conductor
        const result = await db.query(
            'SELECT id, name, fcm_token FROM drivers WHERE id = $1',
            [driverId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Conductor no encontrado' });
        }
        
        const driver = result.rows[0];
        
        if (!driver.fcm_token) {
            return res.status(400).json({ error: 'Conductor sin token FCM' });
        }
        
        console.log('📱 Enviando notificación de prueba a:', driver.name);
        console.log('🔑 Token:', driver.fcm_token.substring(0, 30) + '...');
        
        const message = {
            notification: {
                title: '🧪 Prueba de Notificación',
                body: `Hola ${driver.name}, esta es una prueba del sistema FCM`
            },
            data: {
                type: 'TEST',
                timestamp: new Date().toISOString()
            },
            token: driver.fcm_token
        };
        
        const response = await admin.messaging().send(message);
        console.log('✅ Notificación enviada, ID:', response);
        
        res.json({
            success: true,
            message: 'Notificación enviada correctamente',
            messageId: response,
            driver: driver.name
        });
    } catch (error) {
        console.error('❌ Error enviando FCM:', error);
        res.status(500).json({ 
            error: 'Error enviando notificación',
            details: error.message,
            code: error.code
        });
    }
});

// ==========================================
// ENDPOINT: COMUNICADOS MASIVOS A CONDUCTORES
// ==========================================

// Crear tablas si no existen (se ejecuta al iniciar)
const initCommunicationsTables = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS communications (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        sender_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS communication_reads (
        id SERIAL PRIMARY KEY,
        communication_id INTEGER REFERENCES communications(id) ON DELETE CASCADE,
        driver_id INTEGER,
        read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(communication_id, driver_id)
      );
    `);
    console.log('✅ Tablas de comunicados verificadas');
  } catch (error) {
    console.log('⚠️ Error creando tablas de comunicados:', error.message);
  }
};
initCommunicationsTables();

// Enviar comunicado masivo (guarda en BD + envía FCM)
app.post('/api/communications/broadcast', async (req, res) => {
    try {
        const { type, subject, message, recipients } = req.body;
        
        // 1. Guardar comunicado en base de datos
        const insertResult = await pool.query(
          'INSERT INTO communications (type, subject, message) VALUES ($1, $2, $3) RETURNING id',
          [type || 'general', subject, message]
        );
        const communicationId = insertResult.rows[0].id;
        console.log(`📢 Comunicado #${communicationId} guardado en BD`);
        
        // 2. Obtener conductores con token FCM válido
        const driversResult = await pool.query(
            "SELECT id, name, fcm_token FROM drivers WHERE fcm_token IS NOT NULL AND fcm_token != '' AND LENGTH(fcm_token) > 50"
        );
        
        const drivers = driversResult.rows;
        console.log(`📢 Enviando comunicado a ${drivers.length} conductores con FCM`);
        
        let sent = 0;
        let failed = 0;
        
        // 3. Enviar notificación FCM a cada conductor
        for (const driver of drivers) {
            try {
                const fcmMessage = {
                    token: driver.fcm_token,
                    data: {
                        type: 'BROADCAST',
                        communicationId: communicationId.toString(),
                        subject: subject || 'Comunicado',
                        message: message || '',
                        timestamp: Date.now().toString()
                    },
                    android: {
                        priority: 'high'
                    }
                };
                
                await admin.messaging().send(fcmMessage);
                sent++;
                console.log(`✅ Enviado a ${driver.name}`);
            } catch (fcmError) {
                failed++;
                console.error(`❌ Error enviando a ${driver.name}:`, fcmError.message);
            }
        }
        
        res.json({
            success: true,
            message: `Comunicado enviado a ${sent} conductores`,
            communicationId,
            sent,
            failed,
            total: drivers.length
        });
        
    } catch (error) {
        console.error('❌ Error en broadcast:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Obtener comunicados NO LEÍDOS para un conductor
app.get('/api/communications/unread/:driverId', async (req, res) => {
    try {
        const { driverId } = req.params;
        
        const result = await pool.query(`
            SELECT c.id, c.type, c.subject, c.message, c.created_at
            FROM communications c
            WHERE c.id NOT IN (
                SELECT communication_id FROM communication_reads WHERE driver_id = $1
            )
            ORDER BY c.created_at DESC
        `, [driverId]);
        
        res.json({
            success: true,
            unread: result.rows,
            count: result.rows.length
        });
    } catch (error) {
        console.error('❌ Error obteniendo comunicados:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Marcar comunicado como leído
app.post('/api/communications/mark-read', async (req, res) => {
    try {
        const { communicationId, driverId } = req.body;
        
        await pool.query(
            'INSERT INTO communication_reads (communication_id, driver_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [communicationId, driverId]
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error marcando como leído:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Marcar TODOS los comunicados como leídos
app.post('/api/communications/mark-all-read', async (req, res) => {
    try {
        const { driverId } = req.body;
        
        await pool.query(`
            INSERT INTO communication_reads (communication_id, driver_id)
            SELECT id, $1 FROM communications
            WHERE id NOT IN (SELECT communication_id FROM communication_reads WHERE driver_id = $1)
        `, [driverId]);
        
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error marcando todos como leídos:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==========================================
// WEBSOCKET - SISTEMA DE TRIPLE REDUNDANCIA
// ==========================================
const connectedDrivers = new Map(); // driverId -> { socketId, lastHeartbeat }

io.on('connection', (socket) => {
  console.log('🔌 Cliente conectado:', socket.id);

  // Conductor se conecta
  socket.on('driver_connect', (data) => {
    const { driverId } = data;
    connectedDrivers.set(String(driverId), {
      socketId: socket.id,
      lastHeartbeat: Date.now()
    });
    socket.join(`driver-${driverId}`);
    console.log(`🚗 Conductor ${driverId} conectado via WebSocket`);
    socket.emit('connection_confirmed', { success: true, driverId });
  });

  // Heartbeat del conductor
  socket.on('heartbeat', (data) => {
    const { driverId } = data;
    const driver = connectedDrivers.get(String(driverId));
    if (driver) {
      driver.lastHeartbeat = Date.now();
      socket.emit('heartbeat_ack', { timestamp: Date.now() });
    }
  });

  // Conductor confirma recepción de solicitud (ACK)
  socket.on('trip_request_ack', (data) => {
    const { tripId, driverId } = data;
    console.log(`✅ Conductor ${driverId} confirmó recepción del viaje ${tripId}`);
    io.emit('ack_received', { tripId, driverId, timestamp: Date.now() });
  });

  // Desconexión
  socket.on('disconnect', () => {
    for (const [driverId, data] of connectedDrivers.entries()) {
      if (data.socketId === socket.id) {
        connectedDrivers.delete(driverId);
        console.log(`🚗 Conductor ${driverId} desconectado`);
        break;
      }
    }
  });
});

// Función para enviar solicitud con Triple Redundancia
const sendTripRequestToDriver = async (driverId, tripData) => {
  const results = { websocket: false, fcm: false };
  
  // CANAL 1: WebSocket (instantáneo)
  const driver = connectedDrivers.get(String(driverId));
  if (driver) {
    io.to(`driver-${driverId}`).emit('new_trip_request', tripData);
    results.websocket = true;
    console.log(`📡 WebSocket enviado a conductor ${driverId}`);
  }

  // CANAL 2: FCM Push (respaldo)
  try {
    const driverResult = await pool.query('SELECT fcm_token, name FROM drivers WHERE id = $1', [driverId]);
    if (driverResult.rows.length > 0 && driverResult.rows[0].fcm_token) {
      const admin = require('firebase-admin');
      await admin.messaging().send({
        token: driverResult.rows[0].fcm_token,
        notification: {
          title: '🚕 Nueva Solicitud de Viaje',
          body: `Recogida: ${tripData.pickup_address || 'Sin especificar'}`
        },
        data: {
          type: 'new_trip_request',
          tripId: String(tripData.tripId),
          pickup: tripData.pickup_address || '',
          destination: tripData.destination_address || '',
          price: String(tripData.price || 0)
        },
        android: {
          priority: 'high',
          notification: { channelId: 'taxi_requests', priority: 'max' }
        }
      });
      results.fcm = true;
      console.log(`📱 FCM enviado a conductor ${driverId}`);
    }
  } catch (fcmError) {
    console.error('❌ Error FCM:', fcmError.message);
  }

  return results;
};

// Exportar función para uso en routes
global.sendTripRequestToDriver = sendTripRequestToDriver;
global.connectedDrivers = connectedDrivers;

// ==========================================
// MANEJO DE ERRORES 404
// ==========================================
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Ruta no encontrada',
    path: req.path,
    method: req.method
  });
});

// ==========================================
// MANEJO DE ERRORES GLOBAL
// ==========================================
app.use((err, req, res, next) => {
  console.error('Error global:', err);
  res.status(500).json({ 
    error: 'Error interno del servidor',
    message: err.message 
  });
});

// ==========================================
// INICIAR SERVIDOR
// ==========================================
const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor corriendo en puerto ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`📦 Entorno: ${process.env.NODE_ENV || 'development'}`);
});

// ==========================================
// KEEP-ALIVE: Evitar que Railway duerma
// ==========================================
const SELF_URL = process.env.RAILWAY_PUBLIC_DOMAIN
  ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
  : `http://localhost:${process.env.PORT || 3000}`;

setInterval(async () => {
  try {
    const https = require('https');
    const http = require('http');
    const client = SELF_URL.startsWith('https') ? https : http;
    client.get(`${SELF_URL}/health`, (res) => {
      console.log(`💓 Keep-alive ping: ${res.statusCode}`);
    }).on('error', (err) => {
      console.log(`⚠️ Keep-alive error: ${err.message}`);
    });
  } catch (e) {
    console.log('⚠️ Keep-alive excepción:', e.message);
  }
}, 4 * 60 * 1000); // cada 4 minutos

console.log(`💓 Keep-alive activado → pingea cada 4 minutos`);

module.exports = { app, server, io };