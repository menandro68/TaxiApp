// Importar dependencias
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const http = require('http');
const socketIO = require('socket.io');
require('dotenv').config();
const db = require('./config/database');
const { logger, audit } = require('./logger');
const SessionService = require('./services/sessionService');
const { checkSessionActivity, startInactivityChecker } = require('./middleware/sessionMiddleware');
const { authenticate, authorize, requireRole } = require('./middleware/auth');

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
createBackup();
console.log('📦 Sistema de backup activado - Se ejecutará diariamente a las 2:00 AM');

// Middleware
app.use(cors());
app.use(express.json());
app.use(checkSessionActivity); // Verificar actividad en cada request

// NUEVO: Aplicar headers de seguridad
app.use(securityHeaders);

// NUEVO: Aplicar rate limiting general a toda la API
app.use('/api/', apiLimiter);

// Importar rutas
const driverRoutes = require('./routes/drivers');
const userRoutes = require('./routes/users');
const tripRoutes = require('./routes/trips');
const adminRoutes = require('./routes/admin');

// Usar rutas - PROTEGIDAS CON PERMISOS
app.use('/api/drivers', authenticate, authorize('drivers.view'), driverRoutes);
app.use('/api/users', authenticate, authorize('users.view'), userRoutes);
app.use('/api/trips', authenticate, authorize('trips.view'), tripRoutes);
app.use('/api/admin', adminRoutes);

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
backupService.createBackup();
console.log('🔒 Sistema de backup encriptado activado');

// Iniciar servidor
server.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
  startInactivityChecker(); // Iniciar monitor de sesiones inactivas
  console.log(`🔒 Rate Limiting activado:`);
  console.log(`   - Login: máximo 5 intentos cada 15 minutos`);
  console.log(`   - API general: máximo 100 peticiones cada 15 minutos`);
  console.log(`🛡️ Headers de seguridad aplicados con Helmet`);
});