// Importar dependencias
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
require('dotenv').config();
const db = require('./config/database');
const { logger, audit } = require('./logger');
const SessionService = require('./services/sessionService');
const { checkSessionActivity, startInactivityChecker } = require('./middleware/sessionMiddleware');
const { authenticate, authorize, requireRole } = require('./middleware/auth');
// Configurar Firebase Admin
const admin = require('firebase-admin');
const serviceAccount = require('./firebase-admin-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

console.log('🔥 Firebase Admin SDK inicializado');

// Sistema de reportes automatizados
const { iniciarReportesAutomaticos, generarReporteDiario } = require('./reportes-automaticos');
// NUEVO: Sistema de versionado de API
const { setupVersioning } = require('./middleware/apiVersioning');
const { setupSwagger } = require('./config/swagger');

// NUEVO: Importar seguridad con Rate Limiting
const { loginLimiter, apiLimiter, securityHeaders } = require('./security');

// Importar sistema de backup
const cron = require('node-cron');
const { createBackup } = require('./backup');

// Importar sistema de backup encriptado
const backupService = require('./backup-encrypted');

// Crear aplicación Express
const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// ============================================
// WEBSOCKET IMPLEMENTATION
// ============================================

// Maps para gestionar conexiones activas
const connectedUsers = new Map();    // userId -> socketId
const connectedDrivers = new Map();  // driverId -> socketId
const connectedAdmins = new Map();   // adminId -> socketId

// WebSocket - Conexiones en tiempo real
io.on('connection', (socket) => {
  console.log('🔌 Cliente conectado al WebSocket:', socket.id);
  
  // ==========================================
  // EVENTOS DE CONEXIÓN POR TIPO DE USUARIO
  // ==========================================
  
  // Admin se conecta al panel
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
    
    // Enviar estadísticas iniciales
    sendStatsToAdmin(socket);
  });
  
  // Conductor se conecta
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
    
    // Notificar al admin panel
    io.to('admin-room').emit('driver_online', {
      driverId,
      driverName,
      location,
      timestamp: new Date()
    });
  });
  
  // Usuario/Pasajero se conecta
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
  
  // ==========================================
  // EVENTOS DE VIAJES EN TIEMPO REAL
  // ==========================================
  
  // Nuevo viaje creado
  socket.on('new_trip_created', (tripData) => {
    console.log('🆕 Nuevo viaje creado:', tripData.id);
    
    // Notificar a todos los admins
    io.to('admin-room').emit('new_trip_notification', {
      trip: tripData,
      message: `Nuevo viaje: ${tripData.pickup_location} → ${tripData.destination}`,
      timestamp: new Date()
    });
    
    // Notificar a conductores cercanos (simulado)
    io.to('drivers-room').emit('trip_available', {
      tripId: tripData.id,
      pickup: tripData.pickup_location,
      destination: tripData.destination,
      estimatedFare: tripData.price
    });
  });
  
  // Conductor acepta viaje
  socket.on('trip_accepted', (data) => {
    const { tripId, driverId, userId } = data;
    
    console.log(`✅ Viaje ${tripId} aceptado por conductor ${driverId}`);
    
    // Notificar al usuario
    io.to(`user-${userId}`).emit('trip_accepted', {
      tripId,
      driverId,
      message: 'Un conductor ha aceptado tu viaje',
      timestamp: new Date()
    });
    
    // Notificar al admin panel
    io.to('admin-room').emit('trip_status_update', {
      tripId,
      status: 'accepted',
      driverId,
      timestamp: new Date()
    });
  });
  
  // Actualización de estado de viaje
  socket.on('trip_status_update', (data) => {
    const { tripId, status, userId, driverId } = data;
    
    console.log(`🔄 Viaje ${tripId} cambió a estado: ${status}`);
    
    // Notificar a todos los involucrados
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
  
  // ==========================================
  // EVENTOS DE UBICACIÓN EN TIEMPO REAL
  // ==========================================
  
  // Conductor actualiza su ubicación
  socket.on('driver_location_update', (data) => {
    const { driverId, tripId, location } = data;
    
    // Si está en un viaje, notificar al pasajero
    if (tripId) {
      socket.to(`trip-${tripId}`).emit('driver_location', {
        driverId,
        location,
        timestamp: new Date()
      });
    }
    
    // Notificar al admin panel
    io.to('admin-room').emit('driver_location_update', {
      driverId,
      location,
      tripId,
      timestamp: new Date()
    });
  });
  
  // ==========================================
  // EVENTOS DEL PANEL DE ADMINISTRACIÓN
  // ==========================================
  
  // Admin solicita estadísticas actualizadas
  socket.on('request_stats_update', () => {
    sendStatsToAdmin(socket);
  });
  
  // Admin solicita lista de conductores activos
  socket.on('request_active_drivers', () => {
    const activeDriversList = Array.from(connectedDrivers.keys());
    socket.emit('active_drivers_list', {
      drivers: activeDriversList,
      count: activeDriversList.length,
      timestamp: new Date()
    });
  });
  
  // Admin envía notificación broadcast
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
  
  // ==========================================
  // EVENTOS DE PING/PONG PARA HEARTBEAT
  // ==========================================
  
  socket.on('ping', () => {
    socket.emit('pong', {
      timestamp: new Date(),
      socketId: socket.id
    });
  });
  
  // ==========================================
  // EVENTOS HEREDADOS DEL CÓDIGO ORIGINAL
  // ==========================================
  
  // Unir al admin al room de notificaciones (compatibilidad)
  socket.on('join-admin', () => {
    socket.join('admin-room');
    console.log('👨‍💼 Admin unido al room de notificaciones (método legacy)');
  });
  
  // ==========================================
  // EVENTO DE DESCONEXIÓN
  // ==========================================
  
  socket.on('disconnect', () => {
    console.log('❌ Cliente desconectado:', socket.id);
    
    // Remover de todos los maps
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
        
        // Notificar al admin panel
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

// ==========================================
// FUNCIONES AUXILIARES WEBSOCKET
// ==========================================

// Función para enviar estadísticas al admin
function sendStatsToAdmin(socket) {
  // Obtener estadísticas de la base de datos
  db.get("SELECT COUNT(*) as total FROM trips WHERE status = 'pending'", [], (err, pendingTrips) => {
    db.get("SELECT COUNT(*) as total FROM trips WHERE status = 'in_progress'", [], (err, activeTrips) => {
      db.get("SELECT COUNT(*) as total FROM drivers WHERE status = 'active'", [], (err, activeDrivers) => {
        db.get("SELECT COUNT(*) as total FROM users", [], (err, totalUsers) => {
          
          const stats = {
            pendingTrips: pendingTrips ? pendingTrips.total : 0,
            activeTrips: activeTrips ? activeTrips.total : 0,
            activeDrivers: activeDrivers ? activeDrivers.total : 0,
            totalUsers: totalUsers ? totalUsers.total : 0,
            connectedDrivers: connectedDrivers.size,
            connectedUsers: connectedUsers.size,
            timestamp: new Date()
          };
          
          socket.emit('stats_update', stats);
        });
      });
    });
  });
}

// Función para obtener el objeto io (para usar en otros archivos)
function getSocketIO() {
  return io;
}

// Función para notificar nuevo viaje (se llamará desde el endpoint de crear viaje)
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

// ============================================
// CONFIGURACIÓN EXPRESS
// ============================================

// Backup automático diario a las 2:00 AM
cron.schedule('0 2 * * *', () => {
    console.log('⏰ Ejecutando backup automático...');
    createBackup();
});

// Backup inicial al iniciar servidor
createBackup();
console.log('📦 Sistema de backup activado - Se ejecutará diariamente a las 2:00 AM');

// Middleware
app.use(cors());
app.use(express.json());
// app.use(checkSessionActivity); // COMENTADO - Verificar actividad en cada request

// NUEVO: Aplicar headers de seguridad
// app.use(securityHeaders); // COMENTADO TEMPORALMENTE PARA LEAFLET
// NUEVO: Aplicar rate limiting general a toda la API
app.use('/api/', apiLimiter);

// NUEVO: Sistema de versionado de API

setupVersioning(app);
setupSwagger(app);

// NUEVO: Rutas versionadas v1
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

// Usar rutas - SIN AUTENTICACIÓN
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

// Servir el panel de administración
app.get('/admin', (req, res) => {
    const fs = require('fs');
    fs.readFile(path.join(__dirname, 'App.html'), 'utf8', (err, data) => {
        if (err) {
            return res.status(500).send('Error cargando el panel');
        }
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(data);
    });
});

app.get('/App.html', (req, res) => {
    const fs = require('fs');
    fs.readFile(path.join(__dirname, 'App.html'), 'utf8', (err, data) => {
        if (err) {
            return res.status(500).send('Error cargando el panel');
        }
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(data);
    });
});

app.get('/command-center.html', (req, res) => {
    const fs = require('fs');
    fs.readFile(path.join(__dirname, 'command-center.html'), 'utf8', (err, data) => {
        if (err) {
            return res.status(500).send('Error cargando el centro de comando');
        }
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(data);
    });
});

// Servir archivos estáticos (CSS, JS, imágenes)
app.use(express.static(path.join(__dirname, './')));

// Puerto
const PORT = process.env.PORT || 3000;

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ 
    message: 'TaxiApp Backend API funcionando!',
    version: '1.0.0',
    timestamp: new Date()
  });
});

// ==========================================
// ENDPOINTS DEL DASHBOARD
// ==========================================

// Endpoint para estadísticas del dashboard
app.get('/api/admin/stats', async (req, res) => {
    try {
        // Obtener totales básicos
        const stats = {
            totalDrivers: 0,
            totalUsers: 0,
            totalTrips: 0,
            totalRevenue: 0
        };

        // Contar conductores
        db.get('SELECT COUNT(*) as count FROM drivers', (err, row) => {
            if (!err && row) stats.totalDrivers = row.count;
        });

        // Contar usuarios
        db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
            if (!err && row) stats.totalUsers = row.count;
        });

        // Contar viajes
        db.get('SELECT COUNT(*) as count FROM trips', (err, row) => {
            if (!err && row) stats.totalTrips = row.count;
        });

        // Calcular ingresos totales
        db.get('SELECT SUM(fare) as total FROM trips WHERE status = "completed"', (err, row) => {
            if (!err && row) stats.totalRevenue = row.total || 0;
        });

        // Esperar un momento para que las consultas terminen
        setTimeout(() => {
            res.json(stats);
        }, 100);

    } catch (error) {
        console.error('Error en /api/admin/stats:', error);
        res.json({
            totalDrivers: 0,
            totalUsers: 0,
            totalTrips: 0,
            totalRevenue: 0
        });
    }
});

// Endpoint para reporte diario
app.get('/api/admin/reporte-diario', async (req, res) => {
    console.log('📊 Solicitud de reporte recibida');
    try {
        const reporte = await generarReporteDiario();
        console.log('📊 Reporte generado:', reporte);
        res.json({ 
            success: true, 
            reporte: reporte 
        });
    } catch (error) {
        console.error('❌ Error generando reporte:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Endpoint para posiciones y estados de conductores
app.get('/api/admin/drivers/positions', async (req, res) => {
    try {
        // Traer TODOS los conductores con cualquier estado
        db.all('SELECT id, name, status, vehicle_plate, vehicle_model FROM drivers LIMIT 100', 
            [], (err, rows) => {
            if (err) {
                console.error('Error:', err);
                return res.json({ success: false, drivers: [] });
            }
            res.json({
                success: true,
                drivers: rows || [],
                timestamp: new Date().toISOString()
            });
        });
    } catch (error) {
        console.error('Error en positions:', error);
        res.json({ success: false, drivers: [] });
    }
});

// ==========================================
// ENDPOINT PARA APROBAR/RECHAZAR CONDUCTORES
// ==========================================
const NotificationService = require('./services/notificationService');

app.put('/api/admin/drivers/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status, reason } = req.body;
    
    // Validar estados permitidos
    const validStatuses = ['pending', 'active', 'inactive', 'suspended'];
    
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
            success: false, 
            error: 'Estado inválido. Use: pending, active, inactive, suspended' 
        });
    }
    
    // Primero obtener los datos del conductor
  db.get('SELECT id, status, name FROM drivers WHERE id = ?', [id], async (err, driver) => {
        if (err || !driver) {
            return res.status(404).json({ 
                success: false, 
                error: 'Conductor no encontrado' 
            });
        }
        
        // Actualizar estado del conductor
        db.run('UPDATE drivers SET status = ? WHERE id = ?', 
            [status, id], 
            async function(err) {
                if (err) {
                    console.error('Error actualizando estado:', err);
                    return res.status(500).json({ 
                        success: false, 
                        error: 'Error actualizando estado' 
                    });
                }
                
                console.log(`✅ Conductor ${id} actualizado a estado: ${status}`);
                
                // Enviar notificación según el estado
                try {
                    if (status === 'active' && driver.status === 'pending') {
                        // Conductor aprobado
                        await NotificationService.notifyDriverApproval(id, driver.name);
                        console.log('📧 Notificación de aprobación enviada');
                    } else if (status === 'suspended' && driver.status === 'pending') {
                        // Conductor rechazado
                        await NotificationService.notifyDriverRejection(id, driver.name, reason);
                        console.log('📧 Notificación de rechazo enviada');
                    }
                } catch (notifError) {
                    console.error('Error enviando notificación:', notifError);
                    // No fallar la operación si la notificación falla
                }
                
                res.json({ 
                    success: true, 
                    message: `Conductor ${status === 'active' ? 'aprobado' : status === 'suspended' ? 'rechazado' : 'actualizado'}`,
                    driverId: id,
                    newStatus: status,
                    notificationSent: true
                });
            }
        );
    });
});

// ==========================================
// ENDPOINT PARA OBTENER NOTIFICACIONES DE UN CONDUCTOR
// ==========================================
app.get('/api/drivers/:id/notifications', async (req, res) => {
    const { id } = req.params;
    
    try {
        const notifications = await NotificationService.getUserNotifications(id, 'driver');
        res.json({
            success: true,
            notifications: notifications
        });
    } catch (error) {
        console.error('Error obteniendo notificaciones:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo notificaciones'
        });
    }
});

// ==========================================
// ENDPOINTS PARA TRACKING DE CONDUCTORES
// ==========================================

// Endpoint para que conductores actualicen su ubicación
app.post('/api/drivers/location', async (req, res) => {
    const { driverId, latitude, longitude, heading, speed, accuracy, status } = req.body;
    
    if (!driverId || !latitude || !longitude) {
        return res.status(400).json({ 
            success: false, 
            error: 'driverId, latitude y longitude son requeridos' 
        });
    }
    
    try {
        // Verificar si el conductor existe y está activo
        db.get('SELECT id, status FROM drivers WHERE id = ?', [driverId], (err, driver) => {
            if (err || !driver) {
                return res.status(404).json({ 
                    success: false, 
                    error: 'Conductor no encontrado' 
                });
            }
            
            // Verificar si ya existe una ubicación para este conductor
            db.get('SELECT id FROM driver_locations WHERE driver_id = ?', [driverId], (err, existing) => {
                if (existing) {
                    // Actualizar ubicación existente
                    db.run(`UPDATE driver_locations 
                            SET latitude = ?, longitude = ?, heading = ?, speed = ?, 
                                accuracy = ?, status = ?, updated_at = CURRENT_TIMESTAMP 
                            WHERE driver_id = ?`,
                        [latitude, longitude, heading || 0, speed || 0, accuracy || 0, 
                         status || 'online', driverId],
                        function(err) {
                            if (err) {
                                console.error('Error actualizando ubicación:', err);
                                return res.status(500).json({ 
                                    success: false, 
                                    error: 'Error actualizando ubicación' 
                                });
                            }
                            
                            res.json({ 
                                success: true, 
                                message: 'Ubicación actualizada',
                                driverId: driverId
                            });
                        }
                    );
                } else {
                    // Insertar nueva ubicación
                    db.run(`INSERT INTO driver_locations 
                            (driver_id, latitude, longitude, heading, speed, accuracy, status) 
                            VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [driverId, latitude, longitude, heading || 0, speed || 0, 
                         accuracy || 0, status || 'online'],
                        function(err) {
                            if (err) {
                                console.error('Error insertando ubicación:', err);
                                return res.status(500).json({ 
                                    success: false, 
                                    error: 'Error guardando ubicación' 
                                });
                            }
                            
                            res.json({ 
                                success: true, 
                                message: 'Ubicación guardada',
                                driverId: driverId
                            });
                        }
                    );
                }
            });
        });
    } catch (error) {
        console.error('Error en /api/drivers/location:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error del servidor' 
        });
    }
});

// Endpoint para buscar conductores disponibles cerca de una ubicación
app.post('/api/drivers/search', async (req, res) => {
    const { latitude, longitude, radiusKm } = req.body;
    
    if (!latitude || !longitude) {
        return res.status(400).json({ 
            success: false, 
            error: 'latitude y longitude son requeridos' 
        });
    }
    
    const radius = radiusKm || 5; // Radio por defecto 5km
    
    try {
        // Buscar conductores activos con ubicación reciente (últimos 5 minutos)
        const query = `
            SELECT 
                d.id,
                d.name,
                d.phone,
                d.vehicle_plate,
                d.vehicle_model,
                d.vehicle_color,
                d.rating,
                d.total_trips,
                dl.latitude,
                dl.longitude,
                dl.heading,
                dl.speed,
                dl.status,
                dl.updated_at,
                (6371 * acos(cos(radians(?)) * cos(radians(dl.latitude)) * 
                 cos(radians(dl.longitude) - radians(?)) + sin(radians(?)) * 
                 sin(radians(dl.latitude)))) AS distance
            FROM drivers d
            INNER JOIN driver_locations dl ON d.id = dl.driver_id
            WHERE d.status = 'active' 
            AND dl.status IN ('online', 'available')
            AND datetime(dl.updated_at) > datetime('now', '-5 minutes')
            HAVING distance <= ?
            ORDER BY distance ASC
            LIMIT 10
        `;
        
        db.all(query, [latitude, longitude, latitude, radius], (err, drivers) => {
            if (err) {
                console.error('Error buscando conductores:', err);
                return res.status(500).json({ 
                    success: false, 
                    error: 'Error buscando conductores' 
                });
            }
            
            // Formatear respuesta
            const formattedDrivers = drivers.map(driver => ({
                id: driver.id,
                name: driver.name,
                phone: driver.phone,
                vehicle: {
                    make: driver.vehicle_model ? driver.vehicle_model.split(' ')[0] : 'N/A',
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
                distance: Math.round(driver.distance * 100) / 100, // Redondear a 2 decimales
                eta: Math.ceil((driver.distance / 30) * 60), // Estimación: 30 km/h promedio
                lastUpdate: driver.updated_at
            }));
            
            res.json({ 
                success: true, 
                drivers: formattedDrivers,
                count: formattedDrivers.length,
                searchRadius: radius
            });
        });
    } catch (error) {
        console.error('Error en /api/drivers/search:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error del servidor' 
        });
    }
});

// ==========================================
// ENDPOINT DE PRUEBA PARA CREAR VIAJES
// ==========================================

app.post('/api/test-trip', (req, res) => {
    const { userName, origin, destination } = req.body;
    
    // Crear datos del viaje
    const tripData = {
        id: 'TRIP-' + Date.now(),
        userName: userName || 'Usuario Prueba',
        origin: origin || 'Origen Prueba',
        destination: destination || 'Destino Prueba',
        timestamp: new Date().toISOString()
    };
    
    // Enviar notificación a los administradores
    notifyNewTrip(tripData);
    
    res.json({
        success: true,
        message: 'Notificación de viaje enviada',
        trip: tripData
    });
});

// ==========================================
// AUTENTICACIÓN DE ADMINISTRADORES
// ==========================================

// NUEVO: Login con rate limiting específico (máximo 5 intentos cada 15 minutos)
app.post('/api/admin/login', loginLimiter, async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    }
    
    db.get('SELECT * FROM admins WHERE username = ? OR email = ?', 
        [username, username], 
        async (err, admin) => {
            if (err) {
                return res.status(500).json({ error: 'Error del servidor' });
            }
            
            if (!admin) {
                audit.loginFailed(username, req.ip, 'Usuario no encontrado');
                return res.status(401).json({ error: 'Credenciales inválidas' });
            }
            
            // Verificar contraseña
            const validPassword = await bcrypt.compare(password, admin.password);
            
            if (!validPassword) {
                audit.loginFailed(username, req.ip, 'Contraseña incorrecta');
                return res.status(401).json({ error: 'Credenciales inválidas' });
            }
            
            // Registrar login exitoso
            audit.loginSuccess(admin.username, req.ip);
            
            // Crear sesión en la base de datos con el nuevo sistema
            try {
                const sessionData = await SessionService.createSession(
                    admin.id,
                    'admin',
                    req.headers['user-agent'] || 'Unknown Device',
                    req.ip,
                    req.headers['user-agent'] || 'Unknown Browser'
                );
                
                // Login exitoso con tokens mejorados
                res.json({
                    success: true,
                    admin: {
                        id: admin.id,
                        username: admin.username,
                        email: admin.email,
                        role: admin.role,
                        permissions: JSON.parse(admin.permissions || '[]')
                    },
                    token: sessionData.token,              // Token JWT de 15 minutos
                    refreshToken: sessionData.refreshToken, // Refresh token de 30 días
                    expiresIn: '15m',
                    sessionId: sessionData.sessionId
                });
            } catch (sessionError) {
                logger.error('Error creando sesión:', sessionError);
                // Fallback al sistema antiguo si hay error
                res.json({
                    success: true,
                    admin: {
                        id: admin.id,
                        username: admin.username,
                        email: admin.email,
                        role: admin.role,
                        permissions: JSON.parse(admin.permissions || '[]')
                    },
                    token: 'admin-token-' + Date.now()
                });
            }
        }
    );
});

// ==========================================
// REFRESH TOKEN - Renovar sesión
// ==========================================
app.post('/api/admin/refresh', async (req, res) => {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token requerido' });
    }
    
    try {
        const newTokens = await SessionService.refreshToken(refreshToken);
        
        res.json({
            success: true,
            token: newTokens.token,
            refreshToken: newTokens.refreshToken,
            expiresIn: '15m'
        });
    } catch (error) {
        logger.error('Error renovando token:', error);
        return res.status(401).json({ error: 'Refresh token inválido o expirado' });
    }
});

// ==========================================
// GESTIÓN DE SESIONES - Ver sesiones activas
// ==========================================
app.get('/api/admin/sessions', authenticate, async (req, res) => {
    try {
        // Obtener sesiones del usuario actual
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
        logger.error('Error obteniendo sesiones:', error);
        res.status(500).json({ error: 'Error obteniendo sesiones' });
    }
});

// Cerrar una sesión específica
app.delete('/api/admin/sessions/:sessionId', authenticate, async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        // No permitir cerrar la sesión actual
        if (parseInt(sessionId) === req.sessionId) {
            return res.status(400).json({ error: 'No puedes cerrar tu sesión actual' });
        }
        
        await SessionService.invalidateSession(sessionId);
        
        res.json({
            success: true,
            message: 'Sesión cerrada exitosamente'
        });
    } catch (error) {
        logger.error('Error cerrando sesión:', error);
        res.status(500).json({ error: 'Error cerrando sesión' });
    }
});

// Cerrar todas las sesiones excepto la actual
app.post('/api/admin/sessions/logout-all', authenticate, async (req, res) => {
    try {
        // Cerrar todas las sesiones del usuario
        await SessionService.invalidateAllUserSessions(req.admin.id, 'admin');
        
        // Reactivar solo la sesión actual
        await db.run(
            'UPDATE sessions SET is_active = 1 WHERE id = ?',
            [req.sessionId]
        );
        
        res.json({
            success: true,
            message: 'Todas las demás sesiones cerradas'
        });
    } catch (error) {
        logger.error('Error cerrando sesiones:', error);
        res.status(500).json({ error: 'Error cerrando sesiones' });
    }
});

// ==========================================
// GESTIÓN DE ADMINISTRADORES (SOLO SUPER ADMIN)
// ==========================================

// Obtener todos los administradores
app.get('/api/admin/list', authenticate, requireRole('super_admin'), (req, res) => {
    db.all('SELECT id, username, email, role, created_at FROM admins ORDER BY created_at DESC', [], (err, rows) => {
        if (err) {
            logger.error('Error obteniendo admins:', err);
            return res.status(500).json({ error: 'Error del servidor' });
        }
        res.json(rows);
    });
});

// Obtener roles disponibles
app.get('/api/admin/roles', authenticate, requireRole('super_admin'), (req, res) => {
    db.all('SELECT * FROM roles ORDER BY id', [], (err, rows) => {
        if (err) {
            logger.error('Error obteniendo roles:', err);
            return res.status(500).json({ error: 'Error del servidor' });
        }
        res.json(rows);
    });
});

// Actualizar rol de un administrador
app.put('/api/admin/:id/role', authenticate, requireRole('super_admin'), (req, res) => {
    const { role } = req.body;
    const adminId = req.params.id;
    
    // Verificar que no se esté cambiando su propio rol
    if (adminId == req.admin.id) {
        return res.status(400).json({ error: 'No puedes cambiar tu propio rol' });
    }
    
    // Obtener permisos del nuevo rol
    db.get('SELECT permissions FROM roles WHERE name = ?', [role], (err, roleData) => {
        if (err || !roleData) {
            return res.status(400).json({ error: 'Rol inválido' });
        }
        
        // Actualizar el administrador
        db.run('UPDATE admins SET role = ?, permissions = ? WHERE id = ?', 
            [role, roleData.permissions, adminId], 
            function(err) {
                if (err) {
                    logger.error('Error actualizando rol:', err);
                    return res.status(500).json({ error: 'Error actualizando rol' });
                }
                
                if (this.changes === 0) {
                    return res.status(404).json({ error: 'Administrador no encontrado' });
                }
                
                audit.recordUpdated('admins', adminId, req.admin.id, { role });
                
                res.json({ 
                    message: 'Rol actualizado exitosamente',
                    role: role
                });
            }
        );
    });
});

// Crear un nuevo administrador
app.post('/api/admin/create', authenticate, requireRole('super_admin'), async (req, res) => {
    const { username, email, password, role } = req.body;
    
    // Validaciones
    if (!username || !email || !password || !role) {
        return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }
    
    // Verificar si el usuario ya existe
    db.get('SELECT id FROM admins WHERE username = ? OR email = ?', [username, email], async (err, exists) => {
        if (exists) {
            return res.status(400).json({ error: 'El usuario o email ya existe' });
        }
        
        // Obtener permisos del rol
        db.get('SELECT permissions FROM roles WHERE name = ?', [role], async (err, roleData) => {
            if (err || !roleData) {
                return res.status(400).json({ error: 'Rol inválido' });
            }
            
            // Hashear contraseña
            const hashedPassword = await bcrypt.hash(password, 10);
            
            // Insertar nuevo administrador
            db.run('INSERT INTO admins (username, email, password, role, permissions) VALUES (?, ?, ?, ?, ?)',
                [username, email, hashedPassword, role, roleData.permissions],
                function(err) {
                    if (err) {
                        logger.error('Error creando admin:', err);
                        return res.status(500).json({ error: 'Error creando administrador' });
                    }
                    
                    audit.recordCreated('admins', this.lastID, req.admin.id);
                    
                    res.json({
                        success: true,
                        message: 'Administrador creado exitosamente',
                        adminId: this.lastID
                    });
                }
            );
        });
    });
});

// Eliminar un administrador
app.delete('/api/admin/:id', authenticate, requireRole('super_admin'), (req, res) => {
    const adminId = req.params.id;
    
    // Verificar que no se esté eliminando a sí mismo
    if (adminId == req.admin.id) {
        return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
    }
    
    db.run('DELETE FROM admins WHERE id = ?', [adminId], function(err) {
        if (err) {
            logger.error('Error eliminando admin:', err);
            return res.status(500).json({ error: 'Error del servidor' });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Administrador no encontrado' });
        }
        
        audit.recordDeleted('admins', adminId, req.admin.id);
        
        res.json({ message: 'Administrador eliminado exitosamente' });
    });
});

// ==========================================
// INICIALIZACIÓN DEL SISTEMA
// ==========================================

// Iniciar sistema de alertas
checkSystemAlerts(io, db);
console.log('✅ Sistema de alertas iniciado');

// Iniciar backup automático cada 24 horas
backupService.scheduleBackup(24);

// Crear backup inicial al iniciar el servidor
backupService.createBackup();
console.log('🔒 Sistema de backup encriptado activado');

// Iniciar motor de surge pricing automático
const { startSurgeEngine } = require('./routes/surge-engine');
startSurgeEngine();

// Iniciar sistema de reportes
iniciarReportesAutomaticos();

// Iniciar servidor
server.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
  startInactivityChecker(); // Iniciar monitor de sesiones inactivas
  console.log(`🔒 Rate Limiting activado:`);
  console.log(`   - Login: máximo 5 intentos cada 15 minutos`);
  console.log(`   - API general: máximo 100 peticiones cada 15 minutos`);
  console.log(`🛡️ Headers de seguridad aplicados con Helmet`);
  console.log(`🔌 WebSocket activado para conexiones en tiempo real`);
  console.log(`📊 Sistema de estadísticas en tiempo real activado`);
  console.log(`🔄 API Versioning activado - V1 disponible en /api/v1/`);
});

// Exportar funciones si es necesario
module.exports = { getSocketIO };