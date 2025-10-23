// geofencing-module.js - Módulo de Geofencing para TaxiApp
const GeofencingModule = (function() {
    'use strict';

    // Variables privadas
    let map = null;
    let geofenceCircles = new Map();
    let testMarker = null;
    let activeGeofences = [];
    let eventCount = 0;
    const API_URL = ${window.location.origin}'; // Ajusta según tu configuración

    // Colores para diferentes tipos de geofences
    const GEOFENCE_COLORS = {
        surcharge: '#fbbf24',
        boundary: '#3b82f6',
        dynamic_pricing: '#ef4444',
        restricted: '#ec4899',
        event: '#8b5cf6',
        custom: '#10b981'
    };

    // Datos de ejemplo para modo offline
    const MOCK_GEOFENCES = [
        {
            id: 'gf_airport',
            name: 'Aeropuerto Las Américas',
            type: 'surcharge',
            center: { lat: 18.4297, lng: -69.6689 },
            radius: 2,
            active: true,
            surcharge: 200
        },
        {
            id: 'gf_service',
            name: 'Área de Servicio Santo Domingo',
            type: 'boundary',
            center: { lat: 18.4861, lng: -69.9312 },
            radius: 25,
            active: true
        },
        {
            id: 'gf_colonial',
            name: 'Zona Colonial - Alta Demanda',
            type: 'dynamic_pricing',
            center: { lat: 18.4655, lng: -69.8988 },
            radius: 1.5,
            active: true,
            multiplier: 1.5
        },
        {
            id: 'gf_restricted',
            name: 'Los Tres Brazos - Restringida',
            type: 'restricted',
            center: { lat: 18.5142, lng: -69.8574 },
            radius: 2,
            active: true,
            restriction: '22:00 - 06:00'
        },
        {
            id: 'gf_event',
            name: 'Estadio Quisqueya - Evento',
            type: 'event',
            center: { lat: 18.4801, lng: -69.9142 },
            radius: 1,
            active: false
        }
    ];

    // Función de inicialización
    function init() {
        console.log('🚀 Inicializando módulo de Geofencing...');
        initMap();
        loadGeofences();
        setupEventListeners();
        startAutoUpdate();
    }

    // Inicializar mapa
    function initMap() {
        // Centrar en Santo Domingo
        map = L.map('map').setView([18.4861, -69.9312], 11);

        // Capa de tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        console.log('✅ Mapa inicializado');
    }

    // Cargar geofences
    async function loadGeofences() {
        try {
            // Intentar cargar desde el servidor
            const response = await fetch(`${API_URL}/api/geofencing/active`);
            
            if (response.ok) {
                const data = await response.json();
                activeGeofences = data.geofences || [];
                console.log(`📍 Cargados ${activeGeofences.length} geofences del servidor`);
            } else {
                throw new Error('No se pudo conectar con el servidor');
            }
        } catch (error) {
            console.warn('⚠️ Usando datos de ejemplo:', error.message);
            // Usar datos mock si no hay servidor
            activeGeofences = MOCK_GEOFENCES;
        }

        updateStats();
        renderGeofenceList();
        drawGeofences();
    }

    // Actualizar estadísticas
    function updateStats() {
        const activeCount = activeGeofences.filter(g => g.active).length;
        const restrictedCount = activeGeofences.filter(g => g.type === 'restricted').length;

        document.getElementById('activeGeofences').textContent = activeCount;
        document.getElementById('restrictedZones').textContent = restrictedCount;
    }

    // Renderizar lista de geofences
    function renderGeofenceList() {
        const listContainer = document.getElementById('geofenceList');
        
        if (activeGeofences.length === 0) {
            listContainer.innerHTML = '<div class="loading">No hay geofences configurados</div>';
            return;
        }

        listContainer.innerHTML = activeGeofences.map(gf => `
            <div class="geofence-item ${gf.active ? 'active' : ''}" 
                 onclick="GeofencingModule.focusGeofence('${gf.id}')">
                <div class="geofence-header">
                    <span>${gf.name}</span>
                    <span class="geofence-type type-${gf.type}">${gf.type}</span>
                </div>
                <div style="font-size: 12px; color: #6b7280;">
                    Radio: ${gf.radius} km
                    ${gf.surcharge ? ` • Recargo: $${gf.surcharge}` : ''}
                    ${gf.multiplier ? ` • Multiplicador: ${gf.multiplier}x` : ''}
                    ${gf.restriction ? ` • ${gf.restriction}` : ''}
                </div>
                ${gf.active ? '' : '<div style="color: #ef4444; font-size: 11px; margin-top: 4px;">⚠️ Inactivo</div>'}
            </div>
        `).join('');
    }

    // Dibujar geofences en el mapa
    function drawGeofences() {
        // Limpiar círculos anteriores
        geofenceCircles.forEach(circle => map.removeLayer(circle));
        geofenceCircles.clear();

        // Dibujar cada geofence
        activeGeofences.forEach(gf => {
            if (!gf.active) return;

            const color = GEOFENCE_COLORS[gf.type] || '#999';
            
            const circle = L.circle([gf.center.lat, gf.center.lng], {
                color: color,
                fillColor: color,
                fillOpacity: 0.2,
                radius: gf.radius * 1000 // Convertir km a metros
            }).addTo(map);

            // Popup con información
            circle.bindPopup(`
                <strong>${gf.name}</strong><br>
                Tipo: ${gf.type}<br>
                Radio: ${gf.radius} km
                ${gf.surcharge ? `<br>Recargo: $${gf.surcharge}` : ''}
                ${gf.multiplier ? `<br>Multiplicador: ${gf.multiplier}x` : ''}
            `);

            geofenceCircles.set(gf.id, circle);
        });
    }

    // Enfocar en un geofence específico
    function focusGeofence(geofenceId) {
        const gf = activeGeofences.find(g => g.id === geofenceId);
        if (!gf) return;

        map.setView([gf.center.lat, gf.center.lng], 14);
        
        const circle = geofenceCircles.get(geofenceId);
        if (circle) {
            circle.openPopup();
        }
    }

    // Simular ubicación
    async function simulateLocation() {
        const userId = document.getElementById('testUserId').value;
        const userType = document.getElementById('testUserType').value;
        const lat = parseFloat(document.getElementById('testLat').value);
        const lng = parseFloat(document.getElementById('testLng').value);

        if (!userId || isNaN(lat) || isNaN(lng)) {
            alert('Por favor complete todos los campos correctamente');
            return;
        }

        // Remover marcador anterior
        if (testMarker) {
            map.removeLayer(testMarker);
        }

        // Crear nuevo marcador
        const iconUrl = userType === 'driver' ? 
            'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjMzM2NmZmIj48cGF0aCBkPSJNMTIgMkM2LjQ4IDIgMiA2LjQ4IDIgMTJzNC40OCAxMCAxMCAxMCAxMC00LjQ4IDEwLTEwUzE3LjUyIDIgMTIgMnptMCA1YzEuNjYgMCAzIDEuMzQgMyAzcy0xLjM0IDMtMyAzLTMtMS4zNC0zLTMgMS4zNC0zIDMtM3oiLz48L3N2Zz4=' :
            'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjMjJjNTVlIj48cGF0aCBkPSJNMTIgMkM2LjQ4IDIgMiA2LjQ4IDIgMTJzNC40OCAxMCAxMCAxMCAxMC00LjQ4IDEwLTEwUzE3LjUyIDIgMTIgMnptMCA1YzEuNjYgMCAzIDEuMzQgMyAzcy0xLjM0IDMtMyAzLTMtMS4zNC0zLTMgMS4zNC0zIDMtM3oiLz48L3N2Zz4=';

        const icon = L.icon({
            iconUrl: iconUrl,
            iconSize: [32, 32],
            iconAnchor: [16, 32]
        });

        testMarker = L.marker([lat, lng], { icon }).addTo(map);

        // Centrar mapa
        map.setView([lat, lng], 14);

        // Verificar zonas activas
        const activeZones = checkActiveZones(lat, lng);
        
        // Mostrar popup
        testMarker.bindPopup(`
            <strong>${userId}</strong><br>
            Tipo: ${userType}<br>
            Ubicación: ${lat.toFixed(4)}, ${lng.toFixed(4)}<br>
            <hr>
            ${activeZones.length > 0 ? 
                `<strong>Zonas activas:</strong><br>${activeZones.map(z => `- ${z.name}`).join('<br>')}` :
                'No está en ninguna zona especial'}
        `).openPopup();

        // Agregar evento a la lista
        addEventToList({
            userId,
            userType,
            action: 'TEST',
            zones: activeZones,
            timestamp: new Date().toISOString()
        });

        // Intentar enviar al servidor
        try {
            const response = await fetch(`${API_URL}/api/geofencing/check`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, userType, lat, lng })
            });

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Respuesta del servidor:', data);
            }
        } catch (error) {
            console.log('⚠️ Simulación local (sin servidor)');
        }
    }

    // Verificar zonas activas
    function checkActiveZones(lat, lng) {
        return activeGeofences.filter(gf => {
            if (!gf.active) return false;
            
            const distance = calculateDistance(lat, lng, gf.center.lat, gf.center.lng);
            return distance <= gf.radius;
        });
    }

    // Calcular distancia entre dos puntos
    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Radio de la Tierra en km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    // Agregar evento a la lista
    function addEventToList(event) {
        const listContainer = document.getElementById('eventsList');
        const time = new Date(event.timestamp).toLocaleTimeString('es-DO', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        const eventHtml = `
            <div class="event-item event-${event.action === 'ENTER' ? 'enter' : 'exit'}">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <strong>${event.userId}</strong>
                    <span style="color: #6b7280; font-size: 11px;">${time}</span>
                </div>
                <div style="color: #6b7280;">
                    ${event.userType} • ${event.action === 'TEST' ? 'Simulación' : event.action}
                    ${event.zones && event.zones.length > 0 ? 
                        `<br>Zonas: ${event.zones.map(z => z.name).join(', ')}` : ''}
                </div>
            </div>
        `;

        // Agregar al inicio
        listContainer.innerHTML = eventHtml + listContainer.innerHTML;

        // Limitar a 20 eventos
        const events = listContainer.querySelectorAll('.event-item');
        if (events.length > 20) {
            events[events.length - 1].remove();
        }

        // Actualizar contador
        eventCount++;
        document.getElementById('totalEvents').textContent = eventCount;
    }

    // Actualizar mapa
    function refreshMap() {
        console.log('🔄 Actualizando mapa...');
        loadGeofences();
    }

    // Configurar event listeners
    function setupEventListeners() {
        // Atajos de teclado
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'r') {
                e.preventDefault();
                refreshMap();
            }
        });
    }

    // Auto-actualización
    function startAutoUpdate() {
        // Actualizar usuarios activos cada 10 segundos
        setInterval(() => {
            const activeUsers = Math.floor(Math.random() * 20) + 5;
            document.getElementById('activeUsers').textContent = activeUsers;
        }, 10000);

        // Actualizar geofences cada 30 segundos
        setInterval(() => {
            loadGeofences();
        }, 30000);
    }

    // API pública del módulo
    return {
        init,
        refreshMap,
        simulateLocation,
        focusGeofence
    };

})();

// Hacer disponible globalmente para debugging
window.GeofencingModule = GeofencingModule;