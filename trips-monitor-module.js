// MÓDULO DE MONITOREO DE VIAJES EN TIEMPO REAL
const TripsMonitorModule = {
    API_URL: ${window.location.origin}/api',
    refreshInterval: null,
    currentTrips: [],
    
    // Inicializar el módulo
    init() {
        console.log('🚕 Módulo de monitoreo de viajes inicializado');
        this.startAutoRefresh();
    },
    
    // HTML de la interfaz
    getHTML() {
        return `
            <div class="trips-monitor-section" style="padding: 20px;">
                <div class="monitor-header" style="margin-bottom: 20px;">
                    <h2 style="color: #333; font-size: 28px; margin-bottom: 10px;">
                        🚖 Viajes en Tiempo Real
                    </h2>
                    <p style="color: #666;">Monitoreo de todos los viajes activos</p>
                </div>
                
                <!-- Estadísticas rápidas -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 30px;">
                    <div style="background: #ffc107; padding: 15px; border-radius: 8px; color: white; text-align: center;">
                        <div style="font-size: 24px; font-weight: bold;" id="trips-pending">0</div>
                        <div style="font-size: 12px;">Pendientes</div>
                    </div>
                    <div style="background: #17a2b8; padding: 15px; border-radius: 8px; color: white; text-align: center;">
                        <div style="font-size: 24px; font-weight: bold;" id="trips-accepted">0</div>
                        <div style="font-size: 12px;">Aceptados</div>
                    </div>
                    <div style="background: #28a745; padding: 15px; border-radius: 8px; color: white; text-align: center;">
                        <div style="font-size: 24px; font-weight: bold;" id="trips-progress">0</div>
                        <div style="font-size: 12px;">En Progreso</div>
                    </div>
                    <div style="background: #6c757d; padding: 15px; border-radius: 8px; color: white; text-align: center;">
                        <div style="font-size: 24px; font-weight: bold;" id="trips-total">0</div>
                        <div style="font-size: 12px;">Total Activos</div>
                    </div>
                </div>
                
                <!-- Lista de viajes activos -->
                <div style="background: white; border-radius: 10px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h3 style="margin-bottom: 15px;">📋 Lista de Viajes Activos</h3>
                    <div id="trips-list" style="overflow-x: auto;">
                        <div style="text-align: center; padding: 40px; color: #999;">
                            Cargando viajes...
                        </div>
                    </div>
                </div>
                
                <!-- Actualización automática -->
                <div style="margin-top: 10px; text-align: right; color: #999; font-size: 12px;">
                    ⚡ Actualización automática cada 5 segundos
                    <span id="last-update"></span>
                </div>
            </div>
        `;
    },
    
    // Cargar viajes activos
    async loadTrips() {
        try {
            const response = await fetch(`${this.API_URL}/trips-monitor/active`);
            const data = await response.json();
            
            if (data.success) {
                this.currentTrips = data.trips;
                this.updateDisplay();
                this.updateStats();
            }
        } catch (error) {
            console.error('Error cargando viajes:', error);
        }
    },
    
    // Actualizar estadísticas
    updateStats() {
        const stats = {
            pending: 0,
            accepted: 0,
            in_progress: 0
        };
        
        this.currentTrips.forEach(trip => {
            if (stats[trip.status] !== undefined) {
                stats[trip.status]++;
            }
        });
        
        document.getElementById('trips-pending').textContent = stats.pending;
        document.getElementById('trips-accepted').textContent = stats.accepted;
        document.getElementById('trips-progress').textContent = stats.in_progress;
        document.getElementById('trips-total').textContent = this.currentTrips.length;
    },
    
    // Actualizar lista de viajes
    updateDisplay() {
        const listContainer = document.getElementById('trips-list');
        
        if (!this.currentTrips || this.currentTrips.length === 0) {
            listContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #999;">
                    No hay viajes activos en este momento
                </div>
            `;
            return;
        }
        
        let html = '<table style="width: 100%; border-collapse: collapse;">';
        html += `
            <thead>
                <tr style="border-bottom: 2px solid #dee2e6;">
                    <th style="padding: 10px; text-align: left;">ID</th>
                    <th style="padding: 10px; text-align: left;">Estado</th>
                    <th style="padding: 10px; text-align: left;">Pasajero</th>
                    <th style="padding: 10px; text-align: left;">Conductor</th>
                    <th style="padding: 10px; text-align: left;">Origen</th>
                    <th style="padding: 10px; text-align: left;">Destino</th>
                    <th style="padding: 10px; text-align: left;">Precio</th>
                    <th style="padding: 10px; text-align: left;">Hora</th>
                </tr>
            </thead>
            <tbody>
        `;
        
        this.currentTrips.forEach(trip => {
            const statusBadge = this.getStatusBadge(trip.status);
            const time = new Date(trip.created_at).toLocaleTimeString();
            
            html += `
                <tr style="border-bottom: 1px solid #dee2e6;">
                    <td style="padding: 10px;">#${trip.trip_id}</td>
                    <td style="padding: 10px;">${statusBadge}</td>
                    <td style="padding: 10px;">${trip.user_name || 'Usuario #' + trip.user_id}</td>
                    <td style="padding: 10px;">${trip.driver_name || 'Sin asignar'}</td>
                    <td style="padding: 10px; font-size: 12px;">${trip.pickup_location}</td>
                    <td style="padding: 10px; font-size: 12px;">${trip.destination}</td>
                    <td style="padding: 10px;">$${trip.price}</td>
                    <td style="padding: 10px; font-size: 12px;">${time}</td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        listContainer.innerHTML = html;
        
        // Actualizar tiempo de última actualización
        document.getElementById('last-update').textContent = 
            ` - Última actualización: ${new Date().toLocaleTimeString()}`;
    },
    
    // Obtener badge de estado
    getStatusBadge(status) {
        const badges = {
            pending: '<span style="background: #ffc107; color: black; padding: 4px 8px; border-radius: 4px; font-size: 11px;">PENDIENTE</span>',
            accepted: '<span style="background: #17a2b8; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px;">ACEPTADO</span>',
            in_progress: '<span style="background: #28a745; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px;">EN PROGRESO</span>'
        };
        return badges[status] || status;
    },
    
    // Iniciar actualización automática
    startAutoRefresh() {
        this.loadTrips(); // Cargar inmediatamente
        
        // Actualizar cada 5 segundos
        this.refreshInterval = setInterval(() => {
            this.loadTrips();
        }, 5000);
    },
    
    // Detener actualización automática
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    },
    
    // Limpiar al salir
    cleanup() {
        this.stopAutoRefresh();
        this.currentTrips = [];
    }
};

// Hacer disponible globalmente
window.TripsMonitorModule = TripsMonitorModule;