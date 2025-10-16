// Importar dependencias
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path'); // ← NUEVA LÍNEA AGREGADA
require('dotenv').config();
const db = require('./config/database');
const { logger, audit } = require('./logger');
const SessionService = require('./services/sessionService');
const { checkSessionActivity, startInactivityChecker } = require('./middleware/sessionMiddleware');
const { authenticate, authorize, requireRole } = require('./middleware/auth');

// Sistema de reportes automatizados
const { iniciarReportesAutomaticos, generarReporteDiario } = require('./reportes-automaticos');

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

// Backup automático diario a las 2:00 AM
cron.schedule('0 2 * * *', () => {
    console.log('⏰ Ejecutando backup automático...');
    createBackup();
});

// Backup inicial al iniciar servidor
//createBackup();
//console.log('📦 Sistema de backup activado - Se ejecutará diariamente a las 2:00 AM');

// Middleware
app.use(cors());
app.use(express.json());
// app.use(checkSessionActivity); // COMENTADO - Verificar actividad en cada request

// NUEVO: Aplicar headers de seguridad
app.use(securityHeaders);

// NUEVO: Aplicar rate limiting general a toda la API
app.use('/api/', apiLimiter);

// Importar rutas
const driverRoutes = require('./routes/drivers');
const userRoutes = require('./routes/users');
const tripRoutes = require('./routes/trips');
const adminRoutes = require('./routes/admin');
const documentRoutes = require('./routes/documents');
const tripsMonitorRoutes = require('./routes/trips-monitor'); // ← AQUÍ VA
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
app.use('/api/trips-monitor', tripsMonitorRoutes); // ← SOLO UNA VEZ
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

// ← NUEVAS LÍNEAS AGREGADAS AQUÍ ↓
// Servir el panel de administración
app.get('/admin', (req, res) => {
    const fs = require('fs');
    fs.readFile('C:/Users/menandro68/Documents/DesarolloApp/App.html', 'utf8', (err, data) => {
        if (err) {
            return res.status(500).send('Error cargando el panel');
        }
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(data);
    });
});

app.get('/App.html', (req, res) => {
    const fs = require('fs');
    fs.readFile('C:/Users/menandro68/Documents/DesarolloApp/App.html', 'utf8', (err, data) => {
        if (err) {
            return res.status(500).send('Error cargando el panel');
        }
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(data);
    });
});

// Servir archivos estáticos (CSS, JS, imágenes)
app.use(express.static(path.join(__dirname, '../')));
// ← FIN DE LAS NUEVAS LÍNEAS

// Puerto
const PORT = process.env.PORT || 3000;

// Ruta principal - Servir App.html
app.get('/', (req, res) => {
  const fs = require('fs');
  fs.readFile('C:/Users/menandro68/Documents/DesarolloApp/App.html', 'utf8', (err, data) => {
    if (err) {
      console.error('Error cargando App.html:', err);
      return res.status(500).send('Error cargando el panel');
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(data);
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
        db.all('SELECT id, name, status, vehicle_plate, vehicle_model FROM drivers', 
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
    db.get('SELECT * FROM drivers WHERE id = ?', [id], async (err, driver) => {
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
// SISTEMA DE NOTIFICACIONES DE VIAJES
// ==========================================

// Iniciar sistema de alertas
checkSystemAlerts(io, db);
console.log('✅ Sistema de alertas iniciado');

// Evento cuando se crea un nuevo viaje
io.on('connection', (socket) => {
    console.log('🔌 Cliente conectado al WebSocket:', socket.id);
    
    // Unir al admin al room de notificaciones
    socket.on('join-admin', () => {
        socket.join('admin-room');
        console.log('👨‍💼 Admin unido al room de notificaciones');
    });
    
    socket.on('disconnect', () => {
        console.log('❌ Cliente desconectado:', socket.id);
    });
});

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

// Iniciar backup automático cada 24 horas
backupService.scheduleBackup(24);

// Crear backup inicial al iniciar el servidor
//backupService.createBackup();
//console.log('🔒 Sistema de backup encriptado activado');

// Iniciar motor de surge pricing automático
const { startSurgeEngine } = require('./routes/surge-engine');
startSurgeEngine();

// Iniciar sistema de reportes
iniciarReportesAutomaticos();

// Iniciar servidor
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
  startInactivityChecker(); // Iniciar monitor de sesiones inactivas
  console.log(`🔒 Rate Limiting activado:`);
  console.log(`   - Login: máximo 5 intentos cada 15 minutos`);
  console.log(`   - API general: máximo 100 peticiones cada 15 minutos`);
  console.log(`🛡️ Headers de seguridad aplicados con Helmet`);
});