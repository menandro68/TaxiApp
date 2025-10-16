const { logger, audit } = require('../logger');

// Middleware para verificar autenticación
const authenticate = (req, res, next) => {
    const token = req.headers.authorization;
    
    if (!token) {
        audit.securityError('NO_TOKEN', 'Intento de acceso sin token', req.ip);
        return res.status(401).json({ error: 'No autorizado - Token requerido' });
    }
    
    // Por ahora usamos tokens simples, en producción usar JWT
    if (!token.startsWith('admin-token-')) {
        audit.securityError('INVALID_TOKEN', 'Token inválido', req.ip);
        return res.status(401).json({ error: 'Token inválido' });
    }
    
    // Extraer ID del admin del token (simplificado)
    const adminId = req.headers['x-admin-id'];
    if (!adminId) {
        return res.status(401).json({ error: 'ID de admin requerido' });
    }
    
    // Obtener información del admin de la base de datos
    const db = require('../config/database');
    db.get('SELECT * FROM admins WHERE id = ?', [adminId], (err, admin) => {
        if (err || !admin) {
            return res.status(401).json({ error: 'Admin no encontrado' });
        }
        
        // Agregar admin a la request
        req.admin = admin;
        req.admin.permissions = JSON.parse(admin.permissions || '[]');
        next();
    });
};

// Middleware para verificar permisos específicos
const authorize = (requiredPermission) => {
    return (req, res, next) => {
        if (!req.admin) {
            return res.status(401).json({ error: 'No autenticado' });
        }
        
        const permissions = req.admin.permissions;
        
        // Super admin tiene todos los permisos
        if (permissions.includes('all')) {
            return next();
        }
        
        // Verificar permiso específico
        if (!permissions.includes(requiredPermission)) {
            audit.securityError('UNAUTHORIZED_ACCESS', {
                user: req.admin.username,
                permission: requiredPermission,
                role: req.admin.role
            }, req.ip);
            
            return res.status(403).json({ 
                error: 'No autorizado',
                message: `Permiso requerido: ${requiredPermission}`
            });
        }
        
        next();
    };
};

// Middleware para verificar roles
const requireRole = (roles) => {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    return (req, res, next) => {
        if (!req.admin) {
            return res.status(401).json({ error: 'No autenticado' });
        }
        
        if (!allowedRoles.includes(req.admin.role)) {
            audit.securityError('ROLE_DENIED', {
                user: req.admin.username,
                role: req.admin.role,
                required: allowedRoles
            }, req.ip);
            
            return res.status(403).json({ 
                error: 'Rol no autorizado',
                message: `Roles permitidos: ${allowedRoles.join(', ')}`
            });
        }
        
        next();
    };
};

module.exports = {
    authenticate,
    authorize,
    requireRole
};