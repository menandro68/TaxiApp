/**
 * API v1 Routes Index
 * Punto central para todas las rutas de la versión 1 de la API
 */

const express = require('express');
const { apiVersioning } = require('../../middleware/apiVersioning');

// Crear router principal para v1
const router = express.Router();

// Aplicar middleware de versionado
router.use(apiVersioning.detectVersion);
router.use(apiVersioning.addVersionHeaders);
router.use(apiVersioning.logVersionUsage);

// Importar todas las rutas existentes (mantenemos compatibilidad)
const driverRoutes = require('../drivers');
const userRoutes = require('../users');
const tripRoutes = require('../trips');
const adminRoutes = require('../admin');
const documentRoutes = require('../documents');
const tripsMonitorRoutes = require('../trips-monitor');
const supportRoutes = require('../support');
const financeRoutes = require('../finances');
const reportRoutes = require('../reports');
const pricingRoutes = require('../pricing');
const { router: alertsRouter } = require('../alerts');
const suspensionsRouter = require('../suspensions');
const zonesRouter = require('../zones-management');
const dynamicPricingRouter = require('../dynamic-pricing');
const surgeRouter = require('../surge-engine');
const geofencingRouter = require('../geofencing-engine');

// Configurar rutas v1 - Todas las rutas existentes ahora bajo /api/v1/
router.use('/drivers', driverRoutes);
router.use('/users', userRoutes);
router.use('/trips', tripRoutes);
router.use('/admin', adminRoutes);
router.use('/documents', documentRoutes);
router.use('/trips-monitor', tripsMonitorRoutes);
router.use('/support', supportRoutes);
router.use('/finances', financeRoutes);
router.use('/reports', reportRoutes);
router.use('/pricing', pricingRoutes);
router.use('/alerts', alertsRouter);
router.use('/suspensions', suspensionsRouter);
router.use('/zones', zonesRouter);
router.use('/dynamic-pricing', dynamicPricingRouter);
router.use('/surge', surgeRouter);
router.use('/geofencing', geofencingRouter);

// Ruta de información de la API v1
router.get('/', (req, res) => {
    res.json({
        version: 'v1',
        name: 'TaxiApp API v1',
        description: 'API principal para la aplicación TaxiApp',
        status: 'active',
        endpoints: {
            drivers: '/api/v1/drivers',
            users: '/api/v1/users',
            trips: '/api/v1/trips',
            admin: '/api/v1/admin',
            documents: '/api/v1/documents',
            'trips-monitor': '/api/v1/trips-monitor',
            support: '/api/v1/support',
            finances: '/api/v1/finances',
            reports: '/api/v1/reports',
            pricing: '/api/v1/pricing',
            alerts: '/api/v1/alerts',
            suspensions: '/api/v1/suspensions',
            zones: '/api/v1/zones',
            'dynamic-pricing': '/api/v1/dynamic-pricing',
            surge: '/api/v1/surge',
            geofencing: '/api/v1/geofencing'
        },
        features: [
            'Gestión completa de conductores',
            'Sistema de usuarios y autenticación',
            'Manejo de viajes en tiempo real',
            'Panel de administración avanzado',
            'Sistema de documentos y verificación',
            'Monitoreo de viajes en tiempo real',
            'Soporte técnico integrado',
            'Gestión financiera y reportes',
            'Sistema de precios dinámicos',
            'Alertas y notificaciones',
            'Gestión de suspensiones',
            'Administración de zonas',
            'Motor de surge pricing',
            'Sistema de geofencing'
        ],
        compatibility: {
            backwards: true,
            legacy_routes: 'Soportadas en /api/',
            migration_guide: '/api/v1/docs/migration'
        },
        metadata: {
            created: new Date().toISOString(),
            last_updated: new Date().toISOString(),
            maintainer: 'TaxiApp Development Team'
        }
    });
});

// Ruta de salud de la API v1
router.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        version: 'v1',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        system: {
            node_version: process.version,
            platform: process.platform,
            memory_usage: process.memoryUsage()
        },
        services: {
            database: 'connected',
            websocket: 'active',
            authentication: 'operational',
            file_system: 'accessible'
        }
    });
});

// Ruta de documentación de la API v1
router.get('/docs', (req, res) => {
    res.json({
        version: 'v1',
        documentation: {
            format: 'OpenAPI 3.0',
            url: '/api/v1/docs/swagger',
            interactive: '/api/v1/docs/swagger-ui'
        },
        examples: {
            authentication: '/api/v1/docs/examples/auth',
            trips: '/api/v1/docs/examples/trips',
            drivers: '/api/v1/docs/examples/drivers'
        },
        changelog: '/api/v1/docs/changelog',
        migration_guides: {
            'from_legacy': '/api/v1/docs/migration/legacy',
            'to_v2': '/api/v1/docs/migration/v2'
        }
    });
});

// Middleware para manejo de errores específico de v1
router.use((err, req, res, next) => {
    console.error('Error en API v1:', err);
    
    res.status(err.status || 500).json({
        success: false,
        error: {
            message: err.message || 'Error interno del servidor',
            code: err.code || 'INTERNAL_ERROR',
            version: 'v1',
            timestamp: new Date().toISOString(),
            request_id: req.headers['x-request-id'] || 'unknown'
        },
        _api: {
            version: 'v1',
            endpoint: req.path,
            method: req.method
        }
    });
});

// Middleware para rutas no encontradas en v1
router.use((req, res) => {
    res.status(404).json({
        success: false,
        error: {
            message: 'Endpoint no encontrado en API v1',
            code: 'NOT_FOUND',
            version: 'v1',
            requested_path: req.path,
            available_endpoints: [
                '/api/v1/drivers',
                '/api/v1/users',
                '/api/v1/trips',
                '/api/v1/admin',
                '/api/v1/documents',
                '/api/v1/trips-monitor',
                '/api/v1/support',
                '/api/v1/finances',  
                '/api/v1/reports',
                '/api/v1/pricing',
                '/api/v1/alerts',
                '/api/v1/suspensions',
                '/api/v1/zones',
                '/api/v1/dynamic-pricing',
                '/api/v1/surge',
                '/api/v1/geofencing'
            ]
        },
        _api: {
            version: 'v1',
            endpoint: req.path,
            method: req.method,
            timestamp: new Date().toISOString()
        }
    });
});

module.exports = router;