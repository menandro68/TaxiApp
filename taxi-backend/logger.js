const winston = require('winston');
const path = require('path');

// Configurar el formato de los logs
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, ...metadata }) => {
        let msg = `${timestamp} [${level.toUpperCase()}]: ${message}`;
        
        // Si hay metadata adicional, la agregamos
        if (Object.keys(metadata).length > 0) {
            msg += ` | ${JSON.stringify(metadata)}`;
        }
        
        return msg;
    })
);

// Crear el logger
const logger = winston.createLogger({
    level: 'info',
    format: logFormat,
    transports: [
        // Archivo para todos los logs
        new winston.transports.File({ 
            filename: path.join(__dirname, 'logs', 'app.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        // Archivo separado para errores
        new winston.transports.File({ 
            filename: path.join(__dirname, 'logs', 'errors.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        // Archivo para auditoría de seguridad
        new winston.transports.File({ 
            filename: path.join(__dirname, 'logs', 'audit.log'),
            level: 'info',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        })
    ]
});

// Si no estamos en producción, también mostrar en consola
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }));
}

// Funciones especializadas para auditoría
const audit = {
    // Login exitoso
    loginSuccess: (username, ip) => {
        logger.info('LOGIN_SUCCESS', {
            event: 'LOGIN_SUCCESS',
            username,
            ip,
            timestamp: new Date()
        });
    },
    
    // Login fallido
    loginFailed: (username, ip, reason) => {
        logger.warn('LOGIN_FAILED', {
            event: 'LOGIN_FAILED',
            username,
            ip,
            reason,
            timestamp: new Date()
        });
    },
    
    // Creación de registros
    recordCreated: (table, recordId, userId) => {
        logger.info('RECORD_CREATED', {
            event: 'RECORD_CREATED',
            table,
            recordId,
            userId,
            timestamp: new Date()
        });
    },
    
    // Actualización de registros
    recordUpdated: (table, recordId, userId, changes) => {
        logger.info('RECORD_UPDATED', {
            event: 'RECORD_UPDATED',
            table,
            recordId,
            userId,
            changes,
            timestamp: new Date()
        });
    },
    
    // Eliminación de registros
    recordDeleted: (table, recordId, userId) => {
        logger.warn('RECORD_DELETED', {
            event: 'RECORD_DELETED',
            table,
            recordId,
            userId,
            timestamp: new Date()
        });
    },
    
    // Acceso a datos sensibles
    sensitiveAccess: (resource, userId, ip) => {
        logger.warn('SENSITIVE_ACCESS', {
            event: 'SENSITIVE_ACCESS',
            resource,
            userId,
            ip,
            timestamp: new Date()
        });
    },
    
    // Error de seguridad
    securityError: (type, details, ip) => {
        logger.error('SECURITY_ERROR', {
            event: 'SECURITY_ERROR',
            type,
            details,
            ip,
            timestamp: new Date()
        });
    }
};

module.exports = {
    logger,
    audit
};