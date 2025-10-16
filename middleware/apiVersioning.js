/**
 * API Versioning Middleware para TaxiApp
 * Proporciona versionado profesional de APIs
 */

const { logger } = require('../logger');

/**
 * Middleware principal de versionado de API
 */
const apiVersioning = {
    
    /**
     * Middleware para detectar y validar la versión de API
     */
    detectVersion: (req, res, next) => {
        // Detectar versión desde la URL
        const urlVersion = req.path.match(/^\/api\/v(\d+)\//);
        
        // Detectar versión desde headers
        const headerVersion = req.headers['api-version'] || req.headers['x-api-version'];
        
        // Detectar versión desde query params
        const queryVersion = req.query.version;
        
        // Prioridad: URL > Header > Query > Default
        let version = null;
        
        if (urlVersion) {
            version = urlVersion[1];
        } else if (headerVersion) {
            version = headerVersion.replace('v', '');
        } else if (queryVersion) {
            version = queryVersion.replace('v', '');
        } else {
            version = '1'; // Versión por defecto
        }
        
        // Validar que la versión sea un número
        const versionNumber = parseInt(version);
        if (isNaN(versionNumber) || versionNumber < 1) {
            return res.status(400).json({
                success: false,
                error: 'Versión de API inválida',
                supportedVersions: ['v1'],
                requestedVersion: version
            });
        }
        
        // Verificar si la versión está soportada
        const supportedVersions = [1]; // Agregar nuevas versiones aquí
        if (!supportedVersions.includes(versionNumber)) {
            return res.status(400).json({
                success: false,
                error: 'Versión de API no soportada',
                supportedVersions: supportedVersions.map(v => `v${v}`),
                requestedVersion: `v${version}`
            });
        }
        
        // Agregar información de versión al request
        req.apiVersion = {
            number: versionNumber,
            string: `v${versionNumber}`,
            path: `/api/v${versionNumber}`
        };
        
        next();
    },
    
    /**
     * Middleware para agregar headers de versión a las respuestas
     */
    addVersionHeaders: (req, res, next) => {
        const originalSend = res.send;
        
        res.send = function(body) {
            // Agregar headers de versión
            this.set({
                'API-Version': req.apiVersion ? req.apiVersion.string : 'v1',
                'API-Supported-Versions': 'v1',
                'API-Latest-Version': 'v1',
                'API-Deprecated': 'false'
            });
            
            // Modificar respuesta JSON para incluir metadatos de API
            if (this.get('Content-Type') && this.get('Content-Type').includes('application/json')) {
                try {
                    const jsonBody = JSON.parse(body);
                    
                    // Agregar metadata solo si es un objeto
                    if (typeof jsonBody === 'object' && jsonBody !== null && !Array.isArray(jsonBody)) {
                        jsonBody._api = {
                            version: req.apiVersion ? req.apiVersion.string : 'v1',
                            timestamp: new Date().toISOString(),
                            endpoint: req.path
                        };
                        body = JSON.stringify(jsonBody);
                    }
                } catch (e) {
                    // Si no es JSON válido, continuar sin modificar
                }
            }
            
            originalSend.call(this, body);
        };
        
        next();
    },
    
    /**
     * Middleware para logging de versiones de API
     */
    logVersionUsage: (req, res, next) => {
        const version = req.apiVersion ? req.apiVersion.string : 'unknown';
        
        logger.info(`API Request`, {
            version: version,
            endpoint: req.path,
            method: req.method,
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });
        
        next();
    },
    
    /**
     * Router para redireccionar URLs sin versión a v1
     */
    redirectToV1: (req, res, next) => {
        // Solo redireccionar rutas que empiecen con /api/ pero no tengan versión
        if (req.path.startsWith('/api/') && !req.path.match(/^\/api\/v\d+/)) {
            const newPath = req.path.replace('/api/', '/api/v1/');
            
            logger.info(`Redirecting to v1: ${req.path} -> ${newPath}`);
            
            return res.redirect(301, newPath + (req.url.includes('?') ? '?' + req.url.split('?')[1] : ''));
        }
        
        next();
    },
    
    /**
     * Middleware de compatibilidad hacia atrás
     */
    backwardCompatibility: (req, res, next) => {
        // Permitir que las rutas actuales sigan funcionando
        // mientras se implementa gradualmente el versionado
        
        if (req.path.startsWith('/api/') && !req.path.match(/^\/api\/v\d+/)) {
            // Agregar versión por defecto para rutas legacy
            req.apiVersion = {
                number: 1,
                string: 'v1',
                path: '/api/v1',
                legacy: true
            };
        }
        
        next();
    },
    
    /**
     * Middleware para manejo de deprecación
     */
    handleDeprecation: (deprecatedVersion, message) => {
        return (req, res, next) => {
            if (req.apiVersion && req.apiVersion.number === deprecatedVersion) {
                res.set({
                    'API-Deprecated': 'true',
                    'API-Deprecation-Date': new Date().toISOString(),
                    'API-Sunset-Date': new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 días
                    'API-Deprecation-Message': message || 'Esta versión de la API será descontinuada'
                });
                
                logger.warn(`Deprecated API version used`, {
                    version: req.apiVersion.string,
                    endpoint: req.path,
                    ip: req.ip
                });
            }
            next();
        };
    }
};

/**
 * Función helper para crear un router versionado
 */
const createVersionedRouter = (version) => {
    const express = require('express');
    const router = express.Router();
    
    // Aplicar middleware específico de versión
    router.use(apiVersioning.detectVersion);
    router.use(apiVersioning.addVersionHeaders);
    router.use(apiVersioning.logVersionUsage);
    
    return router;
};

/**
 * Función para configurar el sistema de versionado en Express
 */
const setupVersioning = (app) => {
    // Aplicar middleware global
    app.use(apiVersioning.backwardCompatibility);
    app.use(apiVersioning.addVersionHeaders);
    app.use(apiVersioning.logVersionUsage);
    
    console.log('✅ Sistema de versionado de API configurado');
    console.log('📋 Versiones soportadas: v1');
    console.log('🔄 Compatibilidad hacia atrás: Habilitada');
};

module.exports = {
    apiVersioning,
    createVersionedRouter,
    setupVersioning
};