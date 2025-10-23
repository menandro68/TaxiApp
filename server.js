// ========================================
// IMPORTACIONES
// ========================================
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
require('dotenv').config();

const { logger, audit } = require('./logger');
const SessionService = require('./services/sessionService');
const { checkSessionActivity, startInactivityChecker } = require('./middleware/sessionMiddleware');
const { authenticate, authorize, requireRole } = require('./middleware/auth');
const admin = require('firebase-admin');
const serviceAccount = require('./firebase-admin-key.json');
const { iniciarReportesAutomaticos, generarReporteDiario } = require('./reportes-automaticos');
const { setupVersioning } = require('./middleware/apiVersioning');
const { setupSwagger } = require('./config/swagger');
const { loginLimiter, apiLimiter, securityHeaders } = require('./security');
const cron = require('node-cron');
const { createBackup } = require('./backup');
const backupService = require('./backup-encrypted');
const NotificationService = require('./services/notificationService');

// ========================================
// CONFIGURACIÓN DE FIREBASE
// ========================================
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
console.log('🔥 Firebase Admin SDK inicializado');

// ========================================
// POOL DE CONEXIONES POSTGRESQL
// ========================================
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// ========================================
// CAPA DE ABSTRACCIÓN DE BASE DE DATOS
// ========================================
class DatabaseService {
  async getOne(query, params = []) {
    try {
      const result = await pool.query(query, params);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Database query error:', error);
      throw error;
    }
  }

  async getAll(query, params = []) {
    try {
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Database query error:', error);
      throw error;
    }
  }

  async run(query, params = []) {
    try {
      const result = await pool.query(query, params);
      return {
        changes: result.rowCount,
        lastID: result.rows[0]?.id
      };
    } catch (error) {
      logger.error('Database execution error:', error);
      throw error;
    }
  }

  async transaction(callback) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

const db = new DatabaseService();

// ========================================
// CONFIGURACIÓN EXPRESS
// ========================================
const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Maps para gestionar conexiones WebSocket
const connectedUsers = new Map();
const connectedDrivers = new Map();
const connectedAdmins = new Map();

// ========================================
// WEBSOCKET IMPLEMENTATION
// ========================================
io.on('connection', (socket) => {
  console.log('🔌 Cliente conectado al WebSocket:', socket.id);

  socket.on('admin_connect', (data) => {
    const { adminId, adminName } = data;
    connectedAdmins.set(adminId, socket.id);
    socket.join('admin-room');
    console.log(`👨‍💼 Admin conectado: ${adminName} (${adminId})`);
    
    socket.emit('connection_confirmed', {
      success: true,
      message: 'Admin conectado exitosamente',
      userType: 'admin',
      socketId: socket.id
    });
    
    sendStatsToAdmin(socket);
  });

  socket.on('driver_connect', (data) => {
    const { driverId, driverName, location } = data;
    connectedDrivers.set(driverId, socket.id);
    socket.join('drivers-room');
    socket.join(`driver-${driverId}`);
    console.log(`🚗 Conductor conectado: ${driverName} (${driverId})`);
    
    socket.emit('connection_confirmed', {
      success: true,
      message: 'Conductor conectado exitosamente',
      userType: 'driver',
      socketId: socket.id
    });
    
    io.to('admin-room').emit('driver_online', {
      driverId,
      driverName,
      location,
      timestamp: new Date()
    });
  });

  socket.on('user_connect', (data) => {
    const { userId, userName } = data;
    connectedUsers.set(userId, socket.id);
    socket.join('users-room');
    socket.join(`user-${userId}`);
    console.log(`👤 Usuario conectado: ${userName} (${userId})`);
    
    socket.emit('connection_confirmed', {
      success: true,
      message: 'Usuario conectado exitosamente',
      userType: 'user',
      socketId: socket.id
    });
  });

  socket.on('new_trip_created', (tripData) => {
    console.log('🆕 Nuevo viaje creado:', tripData.id);
    
    io.to('admin-room').emit('new_trip_notification', {
      trip: tripData,
      message: `Nuevo viaje: ${tripData.pickup_location} → ${tripData.destination}`,
      timestamp: new Date()
    });
    
    io.to('drivers-room').emit('trip_available', {
      tripId: tripData.id,
      pickup: tripData.pickup_location,
      destination: tripData.destination,
      estimatedFare: tripData.price
    });
  });

  socket.on('trip_accepted', (data) => {
    const { tripId, driverId, userId } = data;
    console.log(`✅ Viaje ${tripId} aceptado por conductor ${driverId}`);
    
    io.to(`user-${userId}`).emit('trip_accepted', {
      tripId,
      driverId,
      message: 'Un conductor ha aceptado tu viaje',
      timestamp: new Date()
    });
    
    io.to('admin-room').emit('trip_status_update', {
      tripId,
      status: 'accepted',
      driverId,
      timestamp: new Date()
    });
  });

  socket.on('trip_status_update', (data) => {
    const { tripId, status, userId, driverId } = data;
    console.log(`🔄 Viaje ${tripId} cambió a estado: ${status}`);
    
    io.to(`user-${userId}`).emit('trip_status_changed', {
      tripId,
      status,
      timestamp: new Date()
    });
    
    io.to(`driver-${driverId}`).emit('trip_status_changed', {
      tripId,
      status,
      timestamp: new Date()
    });
    
    io.to('admin-room').emit('trip_status_update', {
      tripId,
      status,
      timestamp: new Date()
    });
  });

  socket.on('driver_location_update', (data) => {
    const { driverId, tripId, location } = data;
    
    if (tripId) {
      socket.to(`trip-${tripId}`).emit('driver_location', {
        driverId,
        location,
        timestamp: new Date()
      });
    }
    
    io.to('admin-room').emit('driver_location_update', {
      driverId,
      location,
      tripId,
      timestamp: new Date()
    });
  });

  socket.on('request_stats_update', () => {
    sendStatsToAdmin(socket);
  });

  socket.on('request_active_drivers', () => {
    const activeDriversList = Array.from(connectedDrivers.keys());
    socket.emit('active_drivers_list', {
      drivers: activeDriversList,
      count: activeDriversList.length,
      timestamp: new Date()
    });
  });

  socket.on('admin_broadcast', (data) => {
    const { message, type, targetAudience } = data;
    console.log(`📢 Admin broadcast: ${message}`);
    
    switch(targetAudience) {
      case 'drivers':
        io.to('drivers-room').emit('admin_notification', {
          message,
          type,
          timestamp: new Date()
        });
        break;
      case 'users':
        io.to('users-room').emit('admin_notification', {
          message,
          type,
          timestamp: new Date()
        });
        break;
      case 'all':
        io.emit('admin_notification', {
          message,
          type,
          timestamp: new Date()
        });
        break;
    }
  });

  socket.on('ping', () => {
    socket.emit('pong', {
      timestamp: new Date(),
      socketId: socket.id
    });
  });

  socket.on('join-admin', () => {
    socket.join('admin-room');
    console.log('👨‍💼 Admin unido al room de notificaciones');
  });

  socket.on('disconnect', () => {
    console.log('❌ Cliente desconectado:', socket.id);
    
    for (const [userId, socketId] of connectedUsers.entries()) {
      if (socketId === socket.id) {
        connectedUsers.delete(userId);
        console.log(`👤 Usuario desconectado: ${userId}`);
        break;
      }
    }
    
    for (const [driverId, socketId] of connectedDrivers.entries()) {
      if (socketId === socket.id) {
        connectedDrivers.delete(driverId);
        console.log(`🚗 Conductor desconectado: ${driverId}`);
        
        io.to('admin-room').emit('driver_offline', {
          driverId,
          timestamp: new Date()
        });
        break;
      }
    }
    
    for (const [adminId, socketId] of connectedAdmins.entries()) {
      if (socketId === socket.id) {
        connectedAdmins.delete(adminId);
        console.log(`👨‍💼 Admin desconectado: ${adminId}`);
        break;
      }
    }
  });
});

// ========================================
// FUNCIONES AUXILIARES WEBSOCKET
// ========================================
async function sendStatsToAdmin(socket) {
  try {
    const stats = await Promise.all([
      db.getOne("SELECT COUNT(*) as total FROM trips WHERE status = 'pending'"),
      db.getOne("SELECT COUNT(*) as total FROM trips WHERE status = 'in_progress'"),
      db.getOne("SELECT COUNT(*) as total FROM drivers WHERE status = 'active'"),
      db.getOne("SELECT COUNT(*) as count FROM users")
    ]).then(([pending, active, drivers, users]) => ({
      pendingTrips: pending?.total || 0,
      activeTrips: active?.total || 0,
      activeDrivers: drivers?.total || 0,
      totalUsers: users?.count || 0,
      connectedDrivers: connectedDrivers.size,
      connectedUsers: connectedUsers.size,
      timestamp: new Date()
    }));
    
    socket.emit('stats_update', stats);
  } catch (error) {
    logger.error('Error sending stats to admin:', error);
  }
}

function getSocketIO() {
  return io;
}

function notifyNewTrip(tripData) {
  io.to('admin-room').emit('new-trip', {
    id: tripData.id,
    user: tripData.userName || 'Usuario',
    origin: tripData.origin || 'Origen',
    destination: tripData.destination || 'Destino',
    timestamp: new Date().toISOString()
  });
  console.log('📢 Notificación de nuevo viaje enviada');
}

// ========================================
// CONFIGURACIÓN DE MIDDLEWARE
// ========================================
app.use(cors());
app.use(express.json());
app.use('/api/', apiLimiter);

setupVersioning(app);
setupSwagger(app);

app.use('/api/v1', require('./routes/v1/index'));

// Importar rutas
const driverRoutes = require('./routes/drivers');
const userRoutes = require('./routes/users');
const tripRoutes = require('./routes/trips');
const adminRoutes = require('./routes/admin');
const documentRoutes = require('./routes/documents');
const tripsMonitorRoutes = require('./routes/trips-monitor');
const supportRoutes = require('./routes/support');
const financeRoutes = require('./routes/finances');
const reportRoutes = require('./routes/reports');
const pricingRoutes = require('./routes/pricing');
const { router: alertsRouter, checkSystemAlerts } = require('./routes/alerts');
const suspensionsRouter = require('./routes/suspensions');
const zonesRouter = require('./routes/zones-management');
const dynamicPricingRouter = require('./routes/dynamic-pricing');
const surgeRouter = require('./routes/surge-engine');

app.use('/api/trips-monitor', tripsMonitorRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/users', userRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/finances', financeRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/alerts', alertsRouter);
app.use('/api/suspensions', suspensionsRouter);
app.use('/api/zones', require('./routes/zones-management'));
app.use('/api/dynamic-pricing', dynamicPricingRouter);
app.use('/api/surge', surgeRouter);
app.use('/api/geofencing', require('./routes/geofencing-engine'));

// ========================================
// ENDPOINTS - PANEL DE ADMINISTRACIÓN
// ========================================
app.get('/admin', async (req, res) => {
  try {
    const fs = require('fs').promises;
    const data = await fs.readFile(path.join(__dirname, 'App.html'), 'utf8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(data);
  } catch (error) {
    logger.error('Error loading admin panel:', error);
    res.status(500).send('Error cargando el panel');
  }
});

app.get('/App.html', async (req, res) => {
  try {
    const fs = require('fs').promises;
    const data = await fs.readFile(path.join(__dirname, 'App.html'), 'utf8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(data);
  } catch (error) {
    logger.error('Error loading App.html:', error);
    res.status(500).send('Error cargando el panel');
  }
});

app.get('/command-center.html', async (req, res) => {
  try {
    const fs = require('fs').promises;
    const data = await fs.readFile(path.join(__dirname, 'command-center.html'), 'utf8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(data);
  } catch (error) {
    logger.error('Error loading command center:', error);
    res.status(500).send('Error cargando el centro de comando');
  }
});

app.use(express.static(path.join(__dirname, './')));

// ========================================
// ENDPOINTS DEL DASHBOARD
// ========================================
app.get('/api/admin/stats', async (req, res) => {
  try {
    const [drivers, users, trips, revenue] = await Promise.all([
      db.getOne('SELECT COUNT(*) as count FROM drivers'),
      db.getOne('SELECT COUNT(*) as count FROM users'),
      db.getOne('SELECT COUNT(*) as count FROM trips'),
      db.getOne('SELECT COALESCE(SUM(fare), 0) as total FROM trips WHERE status = $1', ['completed'])
    ]);

    const stats = {
      totalDrivers: drivers?.count || 0,
      totalUsers: users?.count || 0,
      totalTrips: trips?.count || 0,
      totalRevenue: revenue?.total || 0,
      timestamp: new Date()
    };

    res.json(stats);
  } catch (error) {
    logger.error('Error in /api/admin/stats:', error);
    res.status(500).json({
      totalDrivers: 0,
      totalUsers: 0,
      totalTrips: 0,
      totalRevenue: 0
    });
  }
});

app.get('/api/admin/reporte-diario', async (req, res) => {
  try {
    console.log('📊 Solicitud de reporte recibida');
    const reporte = await generarReporteDiario();
    console.log('📊 Reporte generado:', reporte);
    res.json({
      success: true,
      reporte: reporte
    });
  } catch (error) {
    logger.error('Error generating report:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/admin/drivers/positions', async (req, res) => {
  try {
    const drivers = await db.getAll(
      'SELECT id, name, status, vehicle_plate, vehicle_model FROM drivers LIMIT 100'
    );

    res.json({
      success: true,
      drivers: drivers || [],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error in positions:', error);
    res.json({ success: false, drivers: [] });
  }
});

// ========================================
// ENDPOINT PARA APROBAR/RECHAZAR CONDUCTORES
// ========================================
app.put('/api/admin/drivers/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    const validStatuses = ['pending', 'active', 'inactive', 'suspended'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Estado inválido'
      });
    }

    const driver = await db.getOne(
      'SELECT id, status, name FROM drivers WHERE id = $1',
      [id]
    );

    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'Conductor no encontrado'
      });
    }

    const result = await db.run(
      'UPDATE drivers SET status = $1, updated_at = NOW() WHERE id = $2',
      [status, id]
    );

    if (result.changes === 0) {
      return res.status(500).json({
        success: false,
        error: 'Error actualizando estado'
      });
    }

    console.log(`✅ Conductor ${id} actualizado a estado: ${status}`);

    let notificationSent = false;
    try {
      if (status === 'active' && driver.status === 'pending') {
        await NotificationService.notifyDriverApproval(id, driver.name);
        notificationSent = true;
        console.log('📧 Notificación de aprobación enviada');
      } else if (status === 'suspended' && driver.status !== 'suspended') {
        await NotificationService.notifyDriverRejection(id, driver.name, reason);
        notificationSent = true;
        console.log('📧 Notificación de rechazo enviada');
      }
    } catch (notifError) {
      logger.error('Error sending notification:', notifError);
    }

    res.json({
      success: true,
      message: `Conductor ${status === 'active' ? 'aprobado' : 'actualizado'}`,
      driverId: id,
      newStatus: status,
      notificationSent
    });
  } catch (error) {
    logger.error('Error updating driver status:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ========================================
// ENDPOINT PARA OBTENER NOTIFICACIONES
// ========================================
app.get('/api/drivers/:id/notifications', async (req, res) => {
  try {
    const { id } = req.params;
    const notifications = await NotificationService.getUserNotifications(id, 'driver');
    res.json({
      success: true,
      notifications: notifications
    });
  } catch (error) {
    logger.error('Error getting notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo notificaciones'
    });
  }
});

// ========================================
// ENDPOINTS PARA TRACKING DE CONDUCTORES
// ========================================
app.post('/api/drivers/location', async (req, res) => {
  try {
    const { driverId, latitude, longitude, heading, speed, accuracy, status } = req.body;

    if (!driverId || !latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'driverId, latitude y longitude son requeridos'
      });
    }

    const driver = await db.getOne(
      'SELECT id, status FROM drivers WHERE id = $1',
      [driverId]
    );

    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'Conductor no encontrado'
      });
    }

    const existing = await db.getOne(
      'SELECT id FROM driver_locations WHERE driver_id = $1',
      [driverId]
    );

    if (existing) {
      await db.run(
        `UPDATE driver_locations 
         SET latitude = $1, longitude = $2, heading = $3, speed = $4, 
             accuracy = $5, status = $6, updated_at = NOW() 
         WHERE driver_id = $7`,
        [latitude, longitude, heading || 0, speed || 0, accuracy || 0, status || 'online', driverId]
      );
    } else {
      await db.run(
        `INSERT INTO driver_locations 
         (driver_id, latitude, longitude, heading, speed, accuracy, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
        [driverId, latitude, longitude, heading || 0, speed || 0, accuracy || 0, status || 'online']
      );
    }

    res.json({
      success: true,
      message: existing ? 'Ubicación actualizada' : 'Ubicación guardada',
      driverId: driverId
    });
  } catch (error) {
    logger.error('Error in /api/drivers/location:', error);
    res.status(500).json({
      success: false,
      error: 'Error del servidor'
    });
  }
});

app.post('/api/drivers/search', async (req, res) => {
  try {
    const { latitude, longitude, radiusKm } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'latitude y longitude son requeridos'
      });
    }

    const radius = radiusKm || 5;

    const query = `
      SELECT 
        d.id, d.name, d.phone, d.vehicle_plate, d.vehicle_model, d.vehicle_color, d.rating, d.total_trips,
        dl.latitude, dl.longitude, dl.heading, dl.speed, dl.status, dl.updated_at,
        ROUND(ST_Distance(
          ST_SetSRID(ST_Point(dl.longitude, dl.latitude), 4326)::geography,
          ST_SetSRID(ST_Point($2, $1), 4326)::geography
        ) / 1000.0, 2)::NUMERIC as distance
      FROM drivers d
      INNER JOIN driver_locations dl ON d.id = dl.driver_id
      WHERE d.status = 'active' 
        AND dl.status = ANY($3::TEXT[])
        AND dl.updated_at > NOW() - INTERVAL '5 minutes'
        AND ST_Distance(
          ST_SetSRID(ST_Point(dl.longitude, dl.latitude), 4326)::geography,
          ST_SetSRID(ST_Point($2, $1), 4326)::geography
        ) / 1000.0 <= $4
      ORDER BY distance ASC
      LIMIT 10
    `;

    const drivers = await db.getAll(query, [latitude, longitude, ['online', 'available'], radius]);

    const formattedDrivers = drivers.map(driver => ({
      id: driver.id,
      name: driver.name,
      phone: driver.phone,
      vehicle: {
        make: driver.vehicle_model?.split(' ')[0] || 'N/A',
        model: driver.vehicle_model || 'N/A',
        plate: driver.vehicle_plate || 'N/A',
        color: driver.vehicle_color || 'N/A'
      },
      rating: driver.rating,
      trips: driver.total_trips,
      location: {
        latitude: driver.latitude,
        longitude: driver.longitude
      },
      heading: driver.heading,
      speed: driver.speed,
      status: driver.status,
      distance: driver.distance,
      eta: Math.ceil((driver.distance / 30) * 60),
      lastUpdate: driver.updated_at
    }));

    res.json({
      success: true,
      drivers: formattedDrivers,
      count: formattedDrivers.length,
      searchRadius: radius
    });
  } catch (error) {
    logger.error('Error in /api/drivers/search:', error);
    res.status(500).json({
      success: false,
      error: 'Error del servidor'
    });
  }
});

// ========================================
// ENDPOINT DE PRUEBA PARA CREAR VIAJES
// ========================================
app.post('/api/test-trip', (req, res) => {
  const { userName, origin, destination } = req.body;
  const tripData = {
    id: 'TRIP-' + Date.now(),
    userName: userName || 'Usuario Prueba',
    origin: origin || 'Origen Prueba',
    destination: destination || 'Destino Prueba',
    timestamp: new Date().toISOString()
  };

  notifyNewTrip(tripData);

  res.json({
    success: true,
    message: 'Notificación de viaje enviada',
    trip: tripData
  });
});

// ========================================
// AUTENTICACIÓN DE ADMINISTRADORES
// ========================================
app.post('/api/admin/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    }

    const admin = await db.getOne(
      'SELECT * FROM admins WHERE username = $1 OR email = $1',
      [username]
    );

    if (!admin) {
      audit.loginFailed(username, req.ip, 'Usuario no encontrado');
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const validPassword = await bcrypt.compare(password, admin.password);

    if (!validPassword) {
      audit.loginFailed(username, req.ip, 'Contraseña incorrecta');
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    audit.loginSuccess(admin.username, req.ip);

    const sessionData = await SessionService.createSession(
      admin.id,
      'admin',
      req.headers['user-agent'] || 'Unknown Device',
      req.ip,
      req.headers['user-agent'] || 'Unknown Browser'
    );

    res.json({
      success: true,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        permissions: JSON.parse(admin.permissions || '[]')
      },
      token: sessionData.token,
      refreshToken: sessionData.refreshToken,
      expiresIn: '15m',
      sessionId: sessionData.sessionId
    });
  } catch (error) {
    logger.error('Error in login:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ========================================
// REFRESH TOKEN
// ========================================
app.post('/api/admin/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token requerido' });
    }

    const newTokens = await SessionService.refreshToken(refreshToken);

    res.json({
      success: true,
      token: newTokens.token,
      refreshToken: newTokens.refreshToken,
      expiresIn: '15m'
    });
  } catch (error) {
    logger.error('Error refreshing token:', error);
    res.status(401).json({ error: 'Refresh token inválido o expirado' });
  }
});

// ========================================
// GESTIÓN DE SESIONES
// ========================================
app.get('/api/admin/sessions', authenticate, async (req, res) => {
  try {
    const sessions = await SessionService.getUserSessions(req.admin.id, 'admin');

    res.json({
      success: true,
      sessions: sessions.map(s => ({
        id: s.id,
        device: s.device_info,
        ip: s.ip_address,
        lastActivity: s.last_activity,
        createdAt: s.created_at,
        isCurrent: s.id === req.sessionId
      }))
    });
  } catch (error) {
    logger.error('Error getting sessions:', error);
    res.status(500).json({ error: 'Error obteniendo sesiones' });
  }
});

app.delete('/api/admin/sessions/:sessionId', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (parseInt(sessionId) === req.sessionId) {
      return res.status(400).json({ error: 'No puedes cerrar tu sesión actual' });
    }

    await SessionService.invalidateSession(sessionId);

    res.json({
      success: true,
      message: 'Sesión cerrada exitosamente'
    });
  } catch (error) {
    logger.error('Error closing session:', error);
    res.status(500).json({ error: 'Error cerrando sesión' });
  }
});

app.post('/api/admin/sessions/logout-all', authenticate, async (req, res) => {
  try {
    await SessionService.invalidateAllUserSessions(req.admin.id, 'admin');
    
    await db.run(
      'UPDATE sessions SET is_active = TRUE WHERE id = $1',
      [req.sessionId]
    );

    res.json({
      success: true,
      message: 'Todas las demás sesiones cerradas'
    });
  } catch (error) {
    logger.error('Error logging out all sessions:', error);
    res.status(500).json({ error: 'Error cerrando sesiones' });
  }
});

// ========================================
// GESTIÓN DE ADMINISTRADORES
// ========================================
app.get('/api/admin/list', authenticate, requireRole('super_admin'), async (req, res) => {
  try {
    const admins = await db.getAll(
      'SELECT id, username, email, role, created_at FROM admins ORDER BY created_at DESC'
    );
    res.json(admins);
  } catch (error) {
    logger.error('Error getting admins:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.get('/api/admin/roles', authenticate, requireRole('super_admin'), async (req, res) => {
  try {
    const roles = await db.getAll('SELECT * FROM roles ORDER BY id');
    res.json(roles);
  } catch (error) {
    logger.error('Error getting roles:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.put('/api/admin/:id/role', authenticate, requireRole('super_admin'), async (req, res) => {
  try {
    const { role } = req.body;
    const adminId = req.params.id;

    if (adminId == req.admin.id) {
      return res.status(400).json({ error: 'No puedes cambiar tu propio rol' });
    }

    const roleData = await db.getOne(
      'SELECT permissions FROM roles WHERE name = $1',
      [role]
    );

    if (!roleData) {
      return res.status(400).json({ error: 'Rol inválido' });
    }

    const result = await db.run(
      'UPDATE admins SET role = $1, permissions = $2, updated_at = NOW() WHERE id = $3',
      [role, roleData.permissions, adminId]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Administrador no encontrado' });
    }

    audit.recordUpdated('admins', adminId, req.admin.id, { role });

    res.json({
      message: 'Rol actualizado exitosamente',
      role: role
    });
  } catch (error) {
    logger.error('Error updating role:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.post('/api/admin/create', authenticate, requireRole('super_admin'), async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password || !role) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    const exists = await db.getOne(
      'SELECT id FROM admins WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (exists) {
      return res.status(400).json({ error: 'El usuario o email ya existe' });
    }

    const roleData = await db.getOne(
      'SELECT permissions FROM roles WHERE name = $1',
      [role]
    );

    if (!roleData) {
      return res.status(400).json({ error: 'Rol inválido' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await db.run(
      'INSERT INTO admins (username, email, password, role, permissions, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())',
      [username, email, hashedPassword, role, roleData.permissions]
    );

    audit.recordCreated('admins', result.lastID, req.admin.id);

    res.json({
      success: true,
      message: 'Administrador creado exitosamente',
      adminId: result.lastID
    });
  } catch (error) {
    logger.error('Error creating admin:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.delete('/api/admin/:id', authenticate, requireRole('super_admin'), async (req, res) => {
  try {
    const adminId = req.params.id;

    if (adminId == req.admin.id) {
      return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
    }

    const result = await db.run(
      'DELETE FROM admins WHERE id = $1',
      [adminId]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Administrador no encontrado' });
    }

    audit.recordDeleted('admins', adminId, req.admin.id);

    res.json({ message: 'Administrador eliminado exitosamente' });
  } catch (error) {
    logger.error('Error deleting admin:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ========================================
// RUTAS ESTÁTICAS Y DE PRUEBA
// ========================================
app.get('/', (req, res) => {
  res.json({
    message: 'TaxiApp Backend API funcionando!',
    version: '1.0.0',
    timestamp: new Date()
  });
});

// ========================================
// CONFIGURACIÓN DE BACKUP Y TAREAS
// ========================================
cron.schedule('0 2 * * *', async () => {
  console.log('⏰ Ejecutando backup automático...');
  try {
    await createBackup();
  } catch (error) {
    logger.error('Error in backup:', error);
  }
});

try {
  createBackup();
} catch (error) {
  logger.error('Error creating initial backup:', error);
}

console.log('📦 Sistema de backup activado - Se ejecutará diariamente a las 2:00 AM');

backupService.scheduleBackup(24);
backupService.createBackup();
console.log('🔒 Sistema de backup encriptado activado');

// ========================================
// INICIALIZACIÓN DEL SISTEMA
// ========================================
checkSystemAlerts(io, db);
console.log('✅ Sistema de alertas iniciado');

const { startSurgeEngine } = require('./routes/surge-engine');
startSurgeEngine();

iniciarReportesAutomaticos();

// ========================================
// INICIAR SERVIDOR
// ========================================
const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
  startInactivityChecker();
  console.log(`🔒 Rate Limiting activado:`);
  console.log(`   - Login: máximo 5 intentos cada 15 minutos`);
  console.log(`   - API general: máximo 100 peticiones cada 15 minutos`);
  console.log(`🛡️ PostgreSQL configurado`);
  console.log(`🔌 WebSocket activado para conexiones en tiempo real`);
  console.log(`📊 Sistema de estadísticas en tiempo real activado`);
  console.log(`🔄 API Versioning activado - V1 disponible en /api/v1/`);
});

module.exports = { getSocketIO, db, pool };