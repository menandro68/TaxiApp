// ========================================
// MÓDULO CENTRO DE COMANDO
// ========================================

const CommandCenterModule = {
    map: null,
    drivers: {},
    trips: {},
    intervals: [],
    initialized: false,
    SANTO_DOMINGO: [18.4861, -69.9312],

    init: function() {
        // Limpiar siempre antes de inicializar
        this.cleanup();

        // Esperar a que el contenedor esté visible
        setTimeout(() => {
            const mapContainer = document.getElementById('commandCenterMap');
            if (!mapContainer) {
                console.error('Contenedor del mapa no encontrado');
                return;
            }
            
            // Forzar dimensiones antes de inicializar
            mapContainer.style.height = '500px';
            mapContainer.style.width = '100%';
            
            // Limpiar cualquier instancia previa del contenedor
            mapContainer.innerHTML = '';
            
            this.initMap();
            this.initializeDrivers();
            this.updateMetrics();
            this.startIntervals();
            this.initialized = true;
            
            // Forzar redimensionamiento múltiples veces
            setTimeout(() => {
                if (this.map) this.map.invalidateSize();
            }, 100);
            setTimeout(() => {
                if (this.map) this.map.invalidateSize();
            }, 500);
            
            console.log('✅ Centro de Comando iniciado correctamente');
        }, 500);
    },

    cleanup: function() {
        // Limpiar intervalos
        this.intervals.forEach(interval => clearInterval(interval));
        this.intervals = [];

        // Limpiar mapa si existe
        if (this.map) {
            this.map.remove();
            this.map = null;
        }

        // Limpiar drivers y trips
        this.drivers = {};
        this.trips = {};
        this.initialized = false;
    },

    initMap: function() {
        const mapContainer = document.getElementById('commandCenterMap');
        if (!mapContainer) {
            console.error('Contenedor del mapa no encontrado');
            return;
        }

        // Verificar si ya existe una instancia de Leaflet y eliminarla
        if (mapContainer._leaflet_id) {
            mapContainer._leaflet_id = null;
        }
        
        // Limpiar contenido previo
        mapContainer.innerHTML = '';

        // Crear mapa
        this.map = L.map('commandCenterMap').setView(this.SANTO_DOMINGO, 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap',
            maxZoom: 18
        }).addTo(this.map);

        // Forzar redimensionamiento
        setTimeout(() => {
            if (this.map) {
                this.map.invalidateSize();
            }
        }, 300);
    },

    getDriverIcon: function(status) {
        const color = status === 'available' ? '#00ff00' : '#ffaa00';
        return L.divIcon({
            html: `<div style="background: ${color}; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; font-size: 16px;">🚗</div>`,
            className: 'driver-marker',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });
    },

    getUserIcon: function() {
        return L.divIcon({
            html: '<div style="background: #4facfe; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; font-size: 16px;">👤</div>',
            className: 'user-marker',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });
    },

    initializeDrivers: function() {
        if (!this.map) return;

        for (let i = 1; i <= 10; i++) {
            const lat = this.SANTO_DOMINGO[0] + (Math.random() - 0.5) * 0.1;
            const lng = this.SANTO_DOMINGO[1] + (Math.random() - 0.5) * 0.1;
            const status = Math.random() > 0.3 ? 'available' : 'busy';

            const marker = L.marker([lat, lng], {
                icon: this.getDriverIcon(status)
            }).addTo(this.map);

            marker.bindPopup(`
                <strong>Conductor ${i}</strong><br>
                Estado: ${status === 'available' ? '🟢 Disponible' : '🟡 Ocupado'}<br>
                ID: driver_${i}
            `);

            this.drivers[`driver_${i}`] = {
                id: `driver_${i}`,
                name: `Conductor ${i}`,
                lat: lat,
                lng: lng,
                status: status,
                marker: marker
            };
        }
    },

    updateMetrics: function() {
        const available = Object.values(this.drivers).filter(d => d.status === 'available').length;
        const busy = Object.values(this.drivers).filter(d => d.status === 'busy').length;
        const activeTrips = Object.keys(this.trips).length;
        const completed = Math.floor(Math.random() * 50) + 50;

        const el = (id, val) => {
            const element = document.getElementById(id);
            if (element) element.textContent = val;
        };

        el('ccActiveTrips', activeTrips);
        el('ccActiveDrivers', available);
        el('ccWaiting', busy);
        el('ccCompleted', completed);
    },

    moveDrivers: function() {
        Object.values(this.drivers).forEach(driver => {
            if (Math.random() > 0.7) {
                driver.lat += (Math.random() - 0.5) * 0.002;
                driver.lng += (Math.random() - 0.5) * 0.002;

                driver.marker.setLatLng([driver.lat, driver.lng]);

                // Cambiar estado aleatoriamente
                if (Math.random() > 0.9) {
                    driver.status = driver.status === 'available' ? 'busy' : 'available';
                    driver.marker.setIcon(this.getDriverIcon(driver.status));
                }
            }
        });
        this.updateMetrics();
    },

    simulateNewTrip: function() {
        if (!this.map) return;

        const tripId = `trip_${Date.now()}`;
        const userLat = this.SANTO_DOMINGO[0] + (Math.random() - 0.5) * 0.1;
        const userLng = this.SANTO_DOMINGO[1] + (Math.random() - 0.5) * 0.1;

        const userMarker = L.marker([userLat, userLng], {
            icon: this.getUserIcon()
        }).addTo(this.map);

        userMarker.bindPopup(`<strong>Nuevo Viaje</strong><br>ID: ${tripId}`).openPopup();

        this.trips[tripId] = {
            id: tripId,
            marker: userMarker,
            timestamp: new Date()
        };

        this.addAlert(`🚖 Nuevo viaje solicitado: ${tripId.slice(-6)}`, 'info');

        // Remover después de 30 segundos
        setTimeout(() => {
            if (this.trips[tripId] && this.map) {
                this.map.removeLayer(this.trips[tripId].marker);
                delete this.trips[tripId];
                this.updateMetrics();
            }
        }, 30000);
    },

    addAlert: function(message, type = 'warning') {
        const container = document.getElementById('ccAlertsContainer');
        if (!container) return;

        const colors = {
            'info': '#4facfe',
            'warning': '#ffaa00',
            'danger': '#ff4444',
            'success': '#00ff00'
        };

        const alertDiv = document.createElement('div');
        alertDiv.style.cssText = `
            background: #2a2a3e;
            padding: 12px;
            margin-bottom: 10px;
            border-radius: 8px;
            border-left: 4px solid ${colors[type]};
            color: white;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;

        alertDiv.innerHTML = `
            <span>${message}</span>
            <small style="opacity: 0.7;">${new Date().toLocaleTimeString('es-DO')}</small>
        `;

        container.insertBefore(alertDiv, container.firstChild);

        // Mantener máximo 5 alertas
        while (container.children.length > 5) {
            container.removeChild(container.lastChild);
        }
    },

    activateEmergency: function() {
        if (confirm('⚠️ ¿Activar Protocolo de Emergencia?\n\nEsto detendrá todos los servicios y notificará a las autoridades.')) {
            this.addAlert('🚨 PROTOCOLO DE EMERGENCIA ACTIVADO', 'danger');

            // Notificar a todos los conductores
            Object.values(this.drivers).forEach(driver => {
                if (driver.marker) {
                    driver.marker.bindPopup('⚠️ EMERGENCIA ACTIVADA').openPopup();
                }
            });

            if (typeof NotificationService !== 'undefined') {
                NotificationService.error('🚨 PROTOCOLO DE EMERGENCIA ACTIVADO');
            }
        }
    },

    updateTime: function() {
        const timeEl = document.getElementById('commandCenterTime');
        if (timeEl) {
            timeEl.textContent = new Date().toLocaleTimeString('es-DO');
        }
    },

    startIntervals: function() {
        // Actualizar hora cada segundo
        this.intervals.push(setInterval(() => this.updateTime(), 1000));

        // Mover conductores cada 3 segundos
        this.intervals.push(setInterval(() => this.moveDrivers(), 3000));

        // Simular nuevos viajes cada 10 segundos
        this.intervals.push(setInterval(() => {
            if (Math.random() > 0.7) {
                this.simulateNewTrip();
            }
        }, 10000));

        // Alertas aleatorias cada 15 segundos
        this.intervals.push(setInterval(() => {
            const alertTypes = [
                { msg: '✅ Sistema operando normalmente', type: 'success' },
                { msg: '⚠️ Tráfico pesado en Av. 27 de Febrero', type: 'warning' },
                { msg: '📊 Demanda alta en zona Naco', type: 'info' },
                { msg: '🔋 Conductor #5 batería baja', type: 'warning' }
            ];

            if (Math.random() > 0.8) {
                const alert = alertTypes[Math.floor(Math.random() * alertTypes.length)];
                this.addAlert(alert.msg, alert.type);
            }
        }, 15000));

        // Actualizar hora inmediatamente
        this.updateTime();
    }
};

// Hacer disponible globalmente
window.CommandCenterModule = CommandCenterModule;