// geofencing-module.js - Modulo de Geofencing para TaxiApp
var GeofencingModule = (function() {
    'use strict';

    var map = null;
    var geofenceCircles = new Map();
    var testMarker = null;
    var activeGeofences = [];
    var eventCount = 0;
    var API_URL = window.location.origin;

    var GEOFENCE_COLORS = {
        surcharge: '#fbbf24',
        boundary: '#3b82f6',
        dynamic_pricing: '#ef4444',
        restricted: '#ec4899',
        event: '#8b5cf6',
        custom: '#10b981'
    };

    var MOCK_GEOFENCES = [
        {
            id: 'gf_airport',
            name: 'Aeropuerto Las Americas',
            type: 'surcharge',
            center: { lat: 18.4297, lng: -69.6689 },
            radius: 2,
            active: true,
            surcharge: 200
        },
        {
            id: 'gf_service',
            name: 'Area de Servicio Santo Domingo',
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

    function init() {
        console.log('Inicializando modulo de Geofencing...');
        initMap();
        loadGeofences();
        setupEventListeners();
        startAutoUpdate();
    }

    function initMap() {
        map = L.map('map').setView([18.4861, -69.9312], 11);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: 'OpenStreetMap contributors'
        }).addTo(map);
        setTimeout(function() {
            map.invalidateSize();
        }, 100);
        console.log('Mapa inicializado');
    }

    async function loadGeofences() {
        try {
            var response = await fetch(API_URL + '/api/geofencing/active');
            if (response.ok) {
                var data = await response.json();
                activeGeofences = data.geofences || [];
                console.log('Cargados ' + activeGeofences.length + ' geofences del servidor');
            } else {
                throw new Error('No se pudo conectar con el servidor');
            }
        } catch (error) {
            console.warn('Usando datos de ejemplo:', error.message);
            activeGeofences = MOCK_GEOFENCES;
        }
        updateStats();
        renderGeofenceList();
        drawGeofences();
    }

    function updateStats() {
        var activeCount = activeGeofences.filter(function(g) { return g.active; }).length;
        var restrictedCount = activeGeofences.filter(function(g) { return g.type === 'restricted'; }).length;
        document.getElementById('activeGeofences').textContent = activeCount;
        document.getElementById('restrictedZones').textContent = restrictedCount;
    }

    function renderGeofenceList() {
        var listContainer = document.getElementById('geofenceList');
        if (activeGeofences.length === 0) {
            listContainer.innerHTML = '<div class="loading">No hay geofences configurados</div>';
            return;
        }
        var html = '';
        activeGeofences.forEach(function(gf) {
            html += '<div class="geofence-item ' + (gf.active ? 'active' : '') + '" onclick="GeofencingModule.focusGeofence(\'' + gf.id + '\')">' +
                '<div class="geofence-header">' +
                    '<span>' + gf.name + '</span>' +
                    '<span class="geofence-type type-' + gf.type + '">' + gf.type + '</span>' +
                '</div>' +
                '<div style="font-size: 12px; color: #6b7280;">' +
                    'Radio: ' + gf.radius + ' km' +
                    (gf.surcharge ? ' - Recargo: $' + gf.surcharge : '') +
                    (gf.multiplier ? ' - Multiplicador: ' + gf.multiplier + 'x' : '') +
                    (gf.restriction ? ' - ' + gf.restriction : '') +
                '</div>' +
                (gf.active ? '' : '<div style="color: #ef4444; font-size: 11px; margin-top: 4px;">Inactivo</div>') +
            '</div>';
        });
        listContainer.innerHTML = html;
    }

    function drawGeofences() {
        geofenceCircles.forEach(function(circle) { map.removeLayer(circle); });
        geofenceCircles.clear();
        activeGeofences.forEach(function(gf) {
            if (!gf.active) return;
            var color = GEOFENCE_COLORS[gf.type] || '#999';
            var circle = L.circle([gf.center.lat, gf.center.lng], {
                color: color,
                fillColor: color,
                fillOpacity: 0.2,
                radius: gf.radius * 1000
            }).addTo(map);
            circle.bindPopup('<strong>' + gf.name + '</strong><br>Tipo: ' + gf.type + '<br>Radio: ' + gf.radius + ' km' +
                (gf.surcharge ? '<br>Recargo: $' + gf.surcharge : '') +
                (gf.multiplier ? '<br>Multiplicador: ' + gf.multiplier + 'x' : ''));
            geofenceCircles.set(gf.id, circle);
        });
    }

    function focusGeofence(geofenceId) {
        var gf = activeGeofences.find(function(g) { return g.id === geofenceId; });
        if (!gf) return;
        map.setView([gf.center.lat, gf.center.lng], 14);
        var circle = geofenceCircles.get(geofenceId);
        if (circle) { circle.openPopup(); }
    }

    async function simulateLocation() {
        var userId = document.getElementById('testUserId').value;
        var userType = document.getElementById('testUserType').value;
        var lat = parseFloat(document.getElementById('testLat').value);
        var lng = parseFloat(document.getElementById('testLng').value);
        if (!userId || isNaN(lat) || isNaN(lng)) {
            alert('Por favor complete todos los campos correctamente');
            return;
        }
        if (testMarker) { map.removeLayer(testMarker); }
        var iconUrl = userType === 'driver' ?
            'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjMzM2NmZmIj48cGF0aCBkPSJNMTIgMkM2LjQ4IDIgMiA2LjQ4IDIgMTJzNC40OCAxMCAxMCAxMCAxMC00LjQ4IDEwLTEwUzE3LjUyIDIgMTIgMnptMCA1YzEuNjYgMCAzIDEuMzQgMyAzcy0xLjM0IDMtMyAzLTMtMS4zNC0zLTMgMS4zNC0zIDMtM3oiLz48L3N2Zz4=' :
            'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjMjJjNTVlIj48cGF0aCBkPSJNMTIgMkM2LjQ4IDIgMiA2LjQ4IDIgMTJzNC40OCAxMCAxMCAxMCAxMC00LjQ4IDEwLTEwUzE3LjUyIDIgMTIgMnptMCA1YzEuNjYgMCAzIDEuMzQgMyAzcy0xLjM0IDMtMyAzLTMtMS4zNC0zLTMgMS4zNC0zIDMtM3oiLz48L3N2Zz4=';
        var icon = L.icon({ iconUrl: iconUrl, iconSize: [32, 32], iconAnchor: [16, 32] });
        testMarker = L.marker([lat, lng], { icon: icon }).addTo(map);
        map.setView([lat, lng], 14);
        var activeZones = checkActiveZones(lat, lng);
        var zonesText = activeZones.length > 0 ?
            '<strong>Zonas activas:</strong><br>' + activeZones.map(function(z) { return '- ' + z.name; }).join('<br>') :
            'No esta en ninguna zona especial';
        testMarker.bindPopup('<strong>' + userId + '</strong><br>Tipo: ' + userType + '<br>Ubicacion: ' + lat.toFixed(4) + ', ' + lng.toFixed(4) + '<hr>' + zonesText).openPopup();
        addEventToList({ userId: userId, userType: userType, action: 'TEST', zones: activeZones, timestamp: new Date().toISOString() });
        try {
            var response = await fetch(API_URL + '/api/geofencing/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: userId, userType: userType, lat: lat, lng: lng })
            });
            if (response.ok) {
                var data = await response.json();
                console.log('Respuesta del servidor:', data);
            }
        } catch (error) {
            console.log('Simulacion local (sin servidor)');
        }
    }

    function checkActiveZones(lat, lng) {
        return activeGeofences.filter(function(gf) {
            if (!gf.active) return false;
            var distance = calculateDistance(lat, lng, gf.center.lat, gf.center.lng);
            return distance <= gf.radius;
        });
    }

    function calculateDistance(lat1, lon1, lat2, lon2) {
        var R = 6371;
        var dLat = (lat2 - lat1) * Math.PI / 180;
        var dLon = (lon2 - lon1) * Math.PI / 180;
        var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    function addEventToList(event) {
        var listContainer = document.getElementById('eventsList');
        var time = new Date(event.timestamp).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' });
        var zonesText = event.zones && event.zones.length > 0 ? '<br>Zonas: ' + event.zones.map(function(z) { return z.name; }).join(', ') : '';
        var eventHtml = '<div class="event-item event-' + (event.action === 'ENTER' ? 'enter' : 'exit') + '">' +
            '<div style="display: flex; justify-content: space-between; margin-bottom: 4px;">' +
                '<strong>' + event.userId + '</strong>' +
                '<span style="color: #6b7280; font-size: 11px;">' + time + '</span>' +
            '</div>' +
            '<div style="color: #6b7280;">' + event.userType + ' - ' + (event.action === 'TEST' ? 'Simulacion' : event.action) + zonesText + '</div>' +
        '</div>';
        listContainer.innerHTML = eventHtml + listContainer.innerHTML;
        var events = listContainer.querySelectorAll('.event-item');
        if (events.length > 20) { events[events.length - 1].remove(); }
        eventCount++;
        document.getElementById('totalEvents').textContent = eventCount;
    }

    function refreshMap() {
        console.log('Actualizando mapa...');
        loadGeofences();
    }

    function setupEventListeners() {
        document.addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.key === 'r') {
                e.preventDefault();
                refreshMap();
            }
        });
    }

    function startAutoUpdate() {
        setInterval(function() {
            var activeUsers = Math.floor(Math.random() * 20) + 5;
            document.getElementById('activeUsers').textContent = activeUsers;
        }, 10000);
        setInterval(function() {
            loadGeofences();
        }, 30000);
    }

    return {
        init: init,
        refreshMap: refreshMap,
        simulateLocation: simulateLocation,
        focusGeofence: focusGeofence
    };
})();

window.GeofencingModule = GeofencingModule;