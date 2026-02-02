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

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, '../')));

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

// Ruta para página de tracking en tiempo real
app.get('/track/:shareId', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'track.html'));
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
// HEALTH CHECK
// ==========================================
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

module.exports = { app, server, io };