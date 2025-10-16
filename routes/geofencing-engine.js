const express = require('express');
const router = express.Router();

// Almacenamiento en memoria para tracking de ubicaciones
const locationTracking = new Map();
const geofenceEvents = [];

// Configuración de geofences activos
let activeGeofences = [];

// Función para calcular distancia entre dos puntos (Haversine)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distancia en km
}

// Función para verificar si un punto está dentro de un geofence
function isInsideGeofence(userLat, userLon, geofence) {
    const distance = calculateDistance(
        userLat, userLon,
        geofence.center.lat, geofence.center.lng
    );
    return distance <= geofence.radius;
}

// Cargar geofences desde la base de datos (simulado)
function loadGeofences() {
    activeGeofences = [
        {
            id: 'gf_airport',
            name: 'Aeropuerto Las Américas',
            type: 'surcharge',
            center: { lat: 18.4297, lng: -69.6689 },
            radius: 2, // km
            actions: {
                onEnter: { 
                    notification: 'Entrando a zona de aeropuerto - Recargo de $200',
                    surcharge: 200,
                    alert: true
                },
                onExit: { 
                    notification: 'Saliendo de zona de aeropuerto',
                    alert: false
                }
            },
            active: true
        },
        {
            id: 'gf_service_area',
            name: 'Área de Servicio Santo Domingo',
            type: 'boundary',
            center: { lat: 18.4861, lng: -69.9312 },
            radius: 25, // km
            actions: {
                onEnter: { 
                    notification: 'Dentro del área de servicio',
                    allowPickup: true
                },
                onExit: { 
                    notification: '⚠️ Saliendo del área de servicio - No se permiten nuevos viajes',
                    allowPickup: false,
                    alert: true
                }
            },
            active: true
        },
        {
            id: 'gf_high_demand',
            name: 'Zona Colonial - Alta Demanda',
            type: 'dynamic_pricing',
            center: { lat: 18.4655, lng: -69.8988 },
            radius: 1.5, // km
            actions: {
                onEnter: { 
                    notification: '🔥 Zona de alta demanda - Tarifas +50%',
                    multiplier: 1.5,
                    priority: true
                },
                onExit: { 
                    notification: 'Saliendo de zona de alta demanda',
                    multiplier: 1.0
                }
            },
            active: true,
            schedule: {
                days: [5, 6], // Viernes y Sábado
                hours: { start: 18, end: 23 } // 6PM - 11PM
            }
        },
        {
            id: 'gf_restricted',
            name: 'Zona Restringida - Los Tres Brazos',
            type: 'restricted',
            center: { lat: 18.5142, lng: -69.8574 },
            radius: 2, // km
            actions: {
                onEnter: { 
                    notification: '⛔ Zona restringida después de las 10PM',
                    checkTime: true,
                    restrictedHours: { start: 22, end: 6 }
                },
                onExit: { 
                    notification: 'Saliendo de zona con restricciones'
                }
            },
            active: true
        },
        {
            id: 'gf_event',
            name: 'Estadio Quisqueya - Evento Especial',
            type: 'event',
            center: { lat: 18.4801, lng: -69.9142 },
            radius: 1, // km
            actions: {
                onEnter: { 
                    notification: '⚾ Evento en progreso - Tarifas especiales activas',
                    surcharge: 100,
                    multiplier: 1.3
                },
                onExit: { 
                    notification: 'Saliendo de zona de evento'
                }
            },
            active: false, // Se activa solo durante eventos
            eventDate: null
        }
    ];
}

// Procesar entrada a geofence
function processGeofenceEntry(userId, userType, geofence, location) {
    const event = {
        id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        userType,
        geofenceId: geofence.id,
        geofenceName: geofence.name,
        action: 'ENTER',
        location,
        timestamp: new Date().toISOString(),
        actions: geofence.actions.onEnter
    };

    // Registrar evento
    geofenceEvents.push(event);

    // Ejecutar acciones según el tipo de geofence
    if (geofence.type === 'restricted' && geofence.actions.onEnter.checkTime) {
        const hour = new Date().getHours();
        const { start, end } = geofence.actions.onEnter.restrictedHours;
        
        if ((start > end && (hour >= start || hour < end)) || 
            (start < end && hour >= start && hour < end)) {
            event.restricted = true;
            event.actions.blocked = true;
        }
    }

    // Verificar schedule para zonas dinámicas
    if (geofence.schedule) {
        const now = new Date();
        const day = now.getDay();
        const hour = now.getHours();
        
        if (!geofence.schedule.days.includes(day) ||
            hour < geofence.schedule.hours.start ||
            hour >= geofence.schedule.hours.end) {
            event.actions.multiplier = 1.0; // No aplicar multiplicador fuera del horario
        }
    }

    return event;
}

// Procesar salida de geofence
function processGeofenceExit(userId, userType, geofence, location) {
    const event = {
        id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        userType,
        geofenceId: geofence.id,
        geofenceName: geofence.name,
        action: 'EXIT',
        location,
        timestamp: new Date().toISOString(),
        actions: geofence.actions.onExit
    };

    geofenceEvents.push(event);
    return event;
}

// === ENDPOINTS ===

// Actualizar ubicación y verificar geofences
router.post('/check', (req, res) => {
    const { userId, userType, lat, lng } = req.body;

    if (!userId || !lat || !lng) {
        return res.status(400).json({ 
            error: 'userId, lat, and lng are required' 
        });
    }

    // Obtener estado anterior
    const previousState = locationTracking.get(userId) || {
        insideGeofences: []
    };

    // Verificar geofences actuales
    const currentGeofences = [];
    const events = [];

    activeGeofences.forEach(geofence => {
        if (!geofence.active) return;

        const isInside = isInsideGeofence(lat, lng, geofence);
        const wasInside = previousState.insideGeofences.includes(geofence.id);

        if (isInside && !wasInside) {
            // Entrada a geofence
            const event = processGeofenceEntry(userId, userType, geofence, { lat, lng });
            events.push(event);
            currentGeofences.push(geofence.id);
        } else if (!isInside && wasInside) {
            // Salida de geofence
            const event = processGeofenceExit(userId, userType, geofence, { lat, lng });
            events.push(event);
        } else if (isInside) {
            currentGeofences.push(geofence.id);
        }
    });

    // Actualizar estado
    locationTracking.set(userId, {
        location: { lat, lng },
        insideGeofences: currentGeofences,
        lastUpdate: new Date().toISOString()
    });

    // Preparar respuesta con información relevante
    const activeZones = currentGeofences.map(id => {
        const gf = activeGeofences.find(g => g.id === id);
        return {
            id: gf.id,
            name: gf.name,
            type: gf.type,
            actions: gf.actions.onEnter
        };
    });

    res.json({
        userId,
        location: { lat, lng },
        events,
        activeZones,
        restrictions: events.some(e => e.restricted),
        totalSurcharge: activeZones.reduce((sum, zone) => 
            sum + (zone.actions.surcharge || 0), 0),
        priceMultiplier: Math.max(...activeZones.map(zone => 
            zone.actions.multiplier || 1.0))
    });
});

// Obtener geofences activos
router.get('/active', (req, res) => {
    const geofences = activeGeofences
        .filter(gf => gf.active)
        .map(gf => ({
            id: gf.id,
            name: gf.name,
            type: gf.type,
            center: gf.center,
            radius: gf.radius,
            schedule: gf.schedule
        }));

    res.json({
        count: geofences.length,
        geofences
    });
});

// Activar/desactivar geofence
router.put('/toggle/:id', (req, res) => {
    const { id } = req.params;
    const geofence = activeGeofences.find(gf => gf.id === id);

    if (!geofence) {
        return res.status(404).json({ error: 'Geofence not found' });
    }

    geofence.active = !geofence.active;

    res.json({
        message: `Geofence ${geofence.active ? 'activated' : 'deactivated'}`,
        geofence: {
            id: geofence.id,
            name: geofence.name,
            active: geofence.active
        }
    });
});

// Crear nuevo geofence
router.post('/create', (req, res) => {
    const { name, type, center, radius, actions } = req.body;

    if (!name || !center || !radius) {
        return res.status(400).json({ 
            error: 'name, center, and radius are required' 
        });
    }

    const newGeofence = {
        id: `gf_${Date.now()}`,
        name,
        type: type || 'custom',
        center,
        radius,
        actions: actions || {
            onEnter: { notification: `Entering ${name}` },
            onExit: { notification: `Exiting ${name}` }
        },
        active: true
    };

    activeGeofences.push(newGeofence);

    res.json({
        message: 'Geofence created successfully',
        geofence: newGeofence
    });
});

// Obtener eventos históricos
router.get('/events', (req, res) => {
    const { userId, limit = 50 } = req.query;

    let events = geofenceEvents;

    if (userId) {
        events = events.filter(e => e.userId === userId);
    }

    events = events.slice(-limit);

    res.json({
        count: events.length,
        events: events.reverse()
    });
});

// Obtener estado actual de un usuario
router.get('/status/:userId', (req, res) => {
    const { userId } = req.params;
    const userState = locationTracking.get(userId);

    if (!userState) {
        return res.json({
            userId,
            status: 'no_data',
            insideGeofences: []
        });
    }

    const activeZones = userState.insideGeofences.map(id => {
        const gf = activeGeofences.find(g => g.id === id);
        return {
            id: gf.id,
            name: gf.name,
            type: gf.type
        };
    });

    res.json({
        userId,
        location: userState.location,
        lastUpdate: userState.lastUpdate,
        activeZones
    });
});

// Inicializar geofences al cargar el módulo
loadGeofences();

module.exports = router;