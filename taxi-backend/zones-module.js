// zones-module.js - Sistema de Gestión de Zonas
(function() {
    'use strict';
    
    window.ZonesModule = {
        currentZones: [],
        map: null,
        markers: [],
        circles: [],
        selectedZone: null,
        isDrawing: false,
        
        // Tipos de zona con configuración
        zoneTypes: {
            airport: { 
                name: 'Aeropuerto', 
                color: '#4A90E2', 
                icon: '✈️',
                defaultSurcharge: 200 
            },
            tourist: { 
                name: 'Turística', 
                color: '#F5A623', 
                icon: '📸',
                defaultSurcharge: 50 
            },
            premium: { 
                name: 'Premium', 
                color: '#7ED321', 
                icon: '⭐',
                defaultMultiplier: 1.3 
            },
            restricted: { 
                name: 'Restringida', 
                color: '#D0021B', 
                icon: '⚠️',
                defaultMultiplier: 1.5 
            },
            commercial: { 
                name: 'Comercial', 
                color: '#9013FE', 
                icon: '🛍️',
                defaultSurcharge: 30 
            },
            residential: { 
                name: 'Residencial', 
                color: '#50E3C2', 
                icon: '🏠',
                defaultMultiplier: 1.0 
            },
            danger: { 
                name: 'Peligrosa', 
                color: '#FF0000', 
                icon: '🚫',
                defaultMultiplier: 2.0 
            },
            event: { 
                name: 'Evento', 
                color: '#FF6B6B', 
                icon: '🎉',
                defaultSurcharge: 100 
            }
        },
        
        init: function() {
            this.loadZones();
            this.initializeMap();
            this.bindEvents();
            this.loadStats();
        },
        
        bindEvents: function() {
            // Botón nueva zona
            document.getElementById('btnNewZone')?.addEventListener('click', () => {
                this.openZoneModal();
            });
            
            // Filtros
            document.getElementById('zoneTypeFilter')?.addEventListener('change', (e) => {
                this.filterZones(e.target.value);
            });
            
            // Buscar zona
            document.getElementById('searchZone')?.addEventListener('input', (e) => {
                this.searchZones(e.target.value);
            });
            
            // Modal eventos
            document.getElementById('saveZone')?.addEventListener('click', () => {
                this.saveZone();
            });
            
            // Cerrar modal
            document.querySelector('.close-modal')?.addEventListener('click', () => {
                this.closeModal();
            });
        },
        
        initializeMap: function() {
            // Inicializar mapa de Google
            const mapContainer = document.getElementById('zonesMap');
            if (!mapContainer) return;
            
            this.map = new google.maps.Map(mapContainer, {
                center: { lat: 18.4719, lng: -69.8923 }, // Santo Domingo
                zoom: 12,
                styles: [
                    {
                        featureType: "poi",
                        elementType: "labels",
                        stylers: [{ visibility: "off" }]
                    }
                ]
            });
            
            // Herramientas de dibujo
            this.drawingManager = new google.maps.drawing.DrawingManager({
                drawingMode: null,
                drawingControl: true,
                drawingControlOptions: {
                    position: google.maps.ControlPosition.TOP_CENTER,
                    drawingModes: ['circle']
                },
                circleOptions: {
                    fillColor: '#FF6B6B',
                    fillOpacity: 0.3,
                    strokeWeight: 2,
                    clickable: true,
                    editable: true,
                    zIndex: 1
                }
            });
            
            this.drawingManager.setMap(this.map);
            
            // Evento cuando se completa el dibujo
            google.maps.event.addListener(this.drawingManager, 'circlecomplete', (circle) => {
                this.handleNewCircle(circle);
            });
        },
        
        loadZones: async function() {
            try {
                const response = await fetch(${window.location.origin}/api/zones');
                const zones = await response.json();
                this.currentZones = zones;
                this.renderZonesList(zones);
                this.renderZonesOnMap(zones);
                this.updateStats();
            } catch (error) {
                console.error('Error cargando zonas:', error);
                this.showNotification('Error al cargar zonas', 'error');
            }
        },
        
        renderZonesList: function(zones) {
            const container = document.getElementById('zonesList');
            if (!container) return;
            
            if (zones.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">📍</div>
                        <h3>No hay zonas configuradas</h3>
                        <p>Crea tu primera zona especial</p>
                    </div>
                `;
                return;
            }
            
            container.innerHTML = zones.map(zone => {
                const type = this.zoneTypes[zone.zone_type] || {};
                return `
                    <div class="zone-card ${!zone.active ? 'inactive' : ''}" data-zone-id="${zone.id}">
                        <div class="zone-header">
                            <span class="zone-icon">${type.icon || '📍'}</span>
                            <div class="zone-info">
                                <h4>${zone.zone_name}</h4>
                                <span class="zone-type">${type.name || zone.zone_type}</span>
                            </div>
                            <div class="zone-status">
                                <label class="switch">
                                    <input type="checkbox" 
                                           ${zone.active ? 'checked' : ''} 
                                           onchange="ZonesModule.toggleZone(${zone.id}, this.checked)">
                                    <span class="slider round"></span>
                                </label>
                            </div>
                        </div>
                        
                        <div class="zone-body">
                            <div class="zone-metrics">
                                <div class="metric">
                                    <span class="label">Recargo:</span>
                                    <span class="value">$${zone.surcharge}</span>
                                </div>
                                <div class="metric">
                                    <span class="label">Multiplicador:</span>
                                    <span class="value">${zone.multiplier}x</span>
                                </div>
                                <div class="metric">
                                    <span class="label">Radio:</span>
                                    <span class="value">${zone.radius_km} km</span>
                                </div>
                            </div>
                            
                            ${zone.description ? `
                                <div class="zone-description">${zone.description}</div>
                            ` : ''}
                            
                            ${zone.restrictions ? `
                                <div class="zone-restrictions">
                                    <i class="fas fa-exclamation-triangle"></i>
                                    ${zone.restrictions}
                                </div>
                            ` : ''}
                        </div>
                        
                        <div class="zone-actions">
                            <button class="btn-sm btn-edit" onclick="ZonesModule.editZone(${zone.id})">
                                <i class="fas fa-edit"></i> Editar
                            </button>
                            <button class="btn-sm btn-view" onclick="ZonesModule.centerOnZone(${zone.id})">
                                <i class="fas fa-map"></i> Ver en mapa
                            </button>
                            <button class="btn-sm btn-delete" onclick="ZonesModule.deleteZone(${zone.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        },
        
        renderZonesOnMap: function(zones) {
            // Limpiar marcadores y círculos anteriores
            this.clearMapElements();
            
            zones.forEach(zone => {
                if (!zone.active) return;
                
                const type = this.zoneTypes[zone.zone_type] || {};
                const coords = zone.coordinates;
                
                // Crear círculo
                const circle = new google.maps.Circle({
                    strokeColor: type.color || '#FF0000',
                    strokeOpacity: 0.8,
                    strokeWeight: 2,
                    fillColor: type.color || '#FF0000',
                    fillOpacity: 0.35,
                    map: this.map,
                    center: coords,
                    radius: zone.radius_km * 1000,
                    clickable: true,
                    zoneId: zone.id
                });
                
                // Crear marcador central
                const marker = new google.maps.Marker({
                    position: coords,
                    map: this.map,
                    title: zone.zone_name,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 8,
                        fillColor: type.color || '#FF0000',
                        fillOpacity: 1,
                        strokeColor: '#FFFFFF',
                        strokeWeight: 2
                    }
                });
                
                // Info window
                const infoWindow = new google.maps.InfoWindow({
                    content: `
                        <div class="map-info-window">
                            <h4>${type.icon} ${zone.zone_name}</h4>
                            <p>${type.name}</p>
                            <div class="info-metrics">
                                <span>Recargo: $${zone.surcharge}</span>
                                <span>Multiplicador: ${zone.multiplier}x</span>
                            </div>
                            ${zone.description ? `<p class="info-desc">${zone.description}</p>` : ''}
                        </div>
                    `
                });
                
                marker.addListener('click', () => {
                    infoWindow.open(this.map, marker);
                });
                
                circle.addListener('click', () => {
                    this.selectZone(zone.id);
                });
                
                this.markers.push(marker);
                this.circles.push(circle);
            });
        },
        
        clearMapElements: function() {
            this.markers.forEach(marker => marker.setMap(null));
            this.circles.forEach(circle => circle.setMap(null));
            this.markers = [];
            this.circles = [];
        },
        
        handleNewCircle: function(circle) {
            const center = circle.getCenter();
            const radius = circle.getRadius() / 1000; // Convertir a km
            
            // Abrir modal con datos del círculo
            this.openZoneModal({
                coordinates: {
                    lat: center.lat(),
                    lng: center.lng()
                },
                radius_km: radius.toFixed(2)
            });
            
            // Eliminar el círculo temporal
            circle.setMap(null);
        },
        
        openZoneModal: function(preData = {}) {
            const modal = document.getElementById('zoneModal');
            if (!modal) {
                this.createModal();
            }
            
            // Limpiar formulario
            document.getElementById('zoneForm').reset();
            
            // Si hay datos previos (del mapa)
            if (preData.coordinates) {
                document.getElementById('zoneLat').value = preData.coordinates.lat;
                document.getElementById('zoneLng').value = preData.coordinates.lng;
                document.getElementById('zoneRadius').value = preData.radius_km || 1;
            }
            
            document.getElementById('zoneModal').style.display = 'block';
        },
        
        editZone: function(zoneId) {
            const zone = this.currentZones.find(z => z.id === zoneId);
            if (!zone) return;
            
            this.selectedZone = zone;
            this.openZoneModal();
            
            // Llenar formulario con datos de la zona
            document.getElementById('zoneName').value = zone.zone_name;
            document.getElementById('zoneType').value = zone.zone_type;
            document.getElementById('zoneLat').value = zone.coordinates.lat;
            document.getElementById('zoneLng').value = zone.coordinates.lng;
            document.getElementById('zoneRadius').value = zone.radius_km;
            document.getElementById('zoneSurcharge').value = zone.surcharge;
            document.getElementById('zoneMultiplier').value = zone.multiplier;
            document.getElementById('zoneDescription').value = zone.description || '';
            document.getElementById('zoneRestrictions').value = zone.restrictions || '';
            document.getElementById('zonePriority').value = zone.priority || 0;
            document.getElementById('zoneColor').value = zone.color;
        },
        
        saveZone: async function() {
            const form = document.getElementById('zoneForm');
            const formData = new FormData(form);
            
            const zoneData = {
                zone_name: formData.get('zone_name'),
                zone_type: formData.get('zone_type'),
                coordinates: {
                    lat: parseFloat(formData.get('lat')),
                    lng: parseFloat(formData.get('lng'))
                },
                radius_km: parseFloat(formData.get('radius_km')),
                surcharge: parseFloat(formData.get('surcharge')) || 0,
                multiplier: parseFloat(formData.get('multiplier')) || 1,
                color: formData.get('color'),
                description: formData.get('description'),
                restrictions: formData.get('restrictions'),
                priority: parseInt(formData.get('priority')) || 0
            };
            
            try {
                const url = this.selectedZone 
                    ? `http://localhost:3000/api/zones/${this.selectedZone.id}`
                    : ${window.location.origin}/api/zones';
                    
                const method = this.selectedZone ? 'PUT' : 'POST';
                
                const response = await fetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(zoneData)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    this.showNotification(
                        this.selectedZone ? 'Zona actualizada' : 'Zona creada',
                        'success'
                    );
                    this.closeModal();
                    this.loadZones();
                } else {
                    throw new Error(result.error);
                }
            } catch (error) {
                console.error('Error guardando zona:', error);
                this.showNotification('Error al guardar zona', 'error');
            }
        },
        
        toggleZone: async function(zoneId, active) {
            try {
                const response = await fetch(`http://localhost:3000/api/zones/${zoneId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ active })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    this.showNotification(
                        active ? 'Zona activada' : 'Zona desactivada',
                        'success'
                    );
                    this.loadZones();
                }
            } catch (error) {
                console.error('Error:', error);
                this.showNotification('Error al cambiar estado', 'error');
            }
        },
        
        deleteZone: async function(zoneId) {
            if (!confirm('¿Estás seguro de eliminar esta zona?')) return;
            
            try {
                const response = await fetch(`http://localhost:3000/api/zones/${zoneId}`, {
                    method: 'DELETE'
                });
                
                const result = await response.json();
                
                if (result.success) {
                    this.showNotification('Zona eliminada', 'success');
                    this.loadZones();
                }
            } catch (error) {
                console.error('Error:', error);
                this.showNotification('Error al eliminar zona', 'error');
            }
        },
        
        centerOnZone: function(zoneId) {
            const zone = this.currentZones.find(z => z.id === zoneId);
            if (!zone) return;
            
            this.map.setCenter(zone.coordinates);
            this.map.setZoom(14);
            
            // Resaltar la zona
            const circle = this.circles.find(c => c.zoneId === zoneId);
            if (circle) {
                circle.setOptions({
                    strokeWeight: 4,
                    fillOpacity: 0.5
                });
                
                setTimeout(() => {
                    circle.setOptions({
                        strokeWeight: 2,
                        fillOpacity: 0.35
                    });
                }, 2000);
            }
        },
        
        filterZones: function(type) {
            const filtered = type === 'all' 
                ? this.currentZones 
                : this.currentZones.filter(z => z.zone_type === type);
            this.renderZonesList(filtered);
        },
        
        searchZones: function(query) {
            const filtered = this.currentZones.filter(z => 
                z.zone_name.toLowerCase().includes(query.toLowerCase()) ||
                z.description?.toLowerCase().includes(query.toLowerCase())
            );
            this.renderZonesList(filtered);
        },
        
        loadStats: async function() {
            try {
                const response = await fetch(${window.location.origin}/api/zones/stats/summary');
                const stats = await response.json();
                this.updateStats(stats);
            } catch (error) {
                console.error('Error cargando estadísticas:', error);
            }
        },
        
        updateStats: function(stats = {}) {
            document.getElementById('totalZones').textContent = stats.total || 0;
            document.getElementById('activeZones').textContent = stats.active || 0;
            document.getElementById('inactiveZones').textContent = (stats.total - stats.active) || 0;
            
            // Calcular ingresos potenciales
            const avgSurcharge = this.currentZones.reduce((sum, z) => sum + z.surcharge, 0) / (this.currentZones.length || 1);
            document.getElementById('avgSurcharge').textContent = `$${avgSurcharge.toFixed(0)}`;
        },
        
        createModal: function() {
            // Este método crea el modal dinámicamente si no existe
            // Lo implementaremos en el HTML
        },
        
        closeModal: function() {
            document.getElementById('zoneModal').style.display = 'none';
            this.selectedZone = null;
        },
        
        selectZone: function(zoneId) {
            console.log('Zona seleccionada:', zoneId);
        },
        
        showNotification: function(message, type = 'info') {
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.innerHTML = `
                <i class="fas fa-${type === 'success' ? 'check' : 'exclamation'}-circle"></i>
                ${message}
            `;
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.classList.add('show');
            }, 10);
            
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }
    };
})();