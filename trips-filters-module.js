// Módulo de Filtros Avanzados para Historial de Viajes
const TripsFiltersModule = {
    
    // Estado de los filtros
    filters: {
        dateFrom: '',
        dateTo: '',
        driverId: '',
        userId: '',
        priceMin: '',
        priceMax: '',
        status: 'all',
        searchId: ''
    },

    // Inicializar módulo
    init: function() {
        console.log('Módulo de Filtros de Viajes iniciado');
        this.injectStyles();
    },

    // HTML del panel de filtros
    getFiltersPanel: function() {
        return `
            <div class="trips-filters-panel">
                <div class="filters-header">
                    <h3>🔍 Filtros Avanzados</h3>
                    <button class="btn-toggle-filters" onclick="TripsFiltersModule.toggleFilters()">
                        ⚙️ Mostrar/Ocultar Filtros
                    </button>
                </div>
                
                <div id="filtersContent" class="filters-content">
                    <div class="filters-grid">
                        <!-- Filtro por fechas -->
                        <div class="filter-group">
                            <label>📅 Rango de Fechas</label>
                            <div class="date-range">
                                <input type="date" id="filter-date-from" 
                                       onchange="TripsFiltersModule.updateFilter('dateFrom', this.value)">
                                <span>hasta</span>
                                <input type="date" id="filter-date-to" 
                                       onchange="TripsFiltersModule.updateFilter('dateTo', this.value)">
                            </div>
                        </div>

                        <!-- Filtro por conductor -->
                        <div class="filter-group">
                            <label>🚗 Conductor</label>
                            <select id="filter-driver" 
                                    onchange="TripsFiltersModule.updateFilter('driverId', this.value)">
                                <option value="">Todos los conductores</option>
                                <!-- Se llenará dinámicamente -->
                            </select>
                        </div>

                        <!-- Filtro por usuario -->
                        <div class="filter-group">
                            <label>👤 Usuario</label>
                            <select id="filter-user" 
                                    onchange="TripsFiltersModule.updateFilter('userId', this.value)">
                                <option value="">Todos los usuarios</option>
                                <!-- Se llenará dinámicamente -->
                            </select>
                        </div>

                        <!-- Filtro por precio -->
                        <div class="filter-group">
                            <label>💰 Rango de Precio</label>
                            <div class="price-range">
                                <input type="number" id="filter-price-min" placeholder="Min" 
                                       onchange="TripsFiltersModule.updateFilter('priceMin', this.value)">
                                <span>-</span>
                                <input type="number" id="filter-price-max" placeholder="Max" 
                                       onchange="TripsFiltersModule.updateFilter('priceMax', this.value)">
                            </div>
                        </div>

                        <!-- Filtro por estado -->
                        <div class="filter-group">
                            <label>📊 Estado</label>
                            <select id="filter-status" 
                                    onchange="TripsFiltersModule.updateFilter('status', this.value)">
                                <option value="all">Todos</option>
                                <option value="completed">✅ Completados</option>
                                <option value="cancelled">❌ Cancelados</option>
                                <option value="active">🟢 Activos</option>
                                <option value="pending">⏳ Pendientes</option>
                            </select>
                        </div>

                        <!-- Búsqueda por ID -->
                        <div class="filter-group">
                            <label>🔎 Buscar por ID</label>
                            <input type="text" id="filter-search-id" placeholder="ID del viaje"
                                   onkeyup="TripsFiltersModule.updateFilter('searchId', this.value)">
                        </div>
                    </div>

                    <div class="filters-actions">
                        <button class="btn btn-primary" onclick="TripsFiltersModule.applyFilters()">
                            🔍 Aplicar Filtros
                        </button>
                        <button class="btn btn-secondary" onclick="TripsFiltersModule.clearFilters()">
                            🔄 Limpiar Filtros
                        </button>
                        <button class="btn btn-info" onclick="TripsFiltersModule.exportFiltered()">
                            📊 Exportar Resultados
                        </button>
                    </div>

                    <!-- Estadísticas de resultados -->
                    <div id="filterStats" class="filter-stats">
                        <!-- Se llenará dinámicamente -->
                    </div>
                </div>
            </div>
        `;
    },

    // Función para actualizar filtros
    updateFilter: function(key, value) {
        this.filters[key] = value;
        console.log('Filtro actualizado:', key, value);
    },

    // Aplicar filtros
    applyFilters: function() {
        const filteredTrips = this.filterTrips(appState.trips);
        renderTrips(filteredTrips);
        this.updateStats(filteredTrips);
        NotificationService.success(`${filteredTrips.length} viajes encontrados`);
    },

    // Filtrar viajes
    filterTrips: function(trips) {
        return trips.filter(trip => {
            // Filtro por fecha
            if (this.filters.dateFrom) {
                const tripDate = new Date(trip.date);
                const fromDate = new Date(this.filters.dateFrom);
                if (tripDate < fromDate) return false;
            }
            
            if (this.filters.dateTo) {
                const tripDate = new Date(trip.date);
                const toDate = new Date(this.filters.dateTo);
                toDate.setHours(23, 59, 59);
                if (tripDate > toDate) return false;
            }

            // Filtro por conductor
            if (this.filters.driverId && trip.driverId !== this.filters.driverId) {
                return false;
            }

            // Filtro por usuario
            if (this.filters.userId && trip.userId !== this.filters.userId) {
                return false;
            }

            // Filtro por precio
            if (this.filters.priceMin && trip.price < parseFloat(this.filters.priceMin)) {
                return false;
            }
            
            if (this.filters.priceMax && trip.price > parseFloat(this.filters.priceMax)) {
                return false;
            }

            // Filtro por estado
            if (this.filters.status !== 'all' && trip.status !== this.filters.status) {
                return false;
            }

            // Búsqueda por ID
            if (this.filters.searchId && !trip.id.toString().includes(this.filters.searchId)) {
                return false;
            }

            return true;
        });
    },

    // Limpiar filtros
    clearFilters: function() {
        this.filters = {
            dateFrom: '',
            dateTo: '',
            driverId: '',
            userId: '',
            priceMin: '',
            priceMax: '',
            status: 'all',
            searchId: ''
        };

        // Limpiar inputs
        document.getElementById('filter-date-from').value = '';
        document.getElementById('filter-date-to').value = '';
        document.getElementById('filter-driver').value = '';
        document.getElementById('filter-user').value = '';
        document.getElementById('filter-price-min').value = '';
        document.getElementById('filter-price-max').value = '';
        document.getElementById('filter-status').value = 'all';
        document.getElementById('filter-search-id').value = '';

        // Recargar todos los viajes
        renderTrips(appState.trips);
        NotificationService.info('Filtros limpiados');
    },

    // Actualizar estadísticas
    updateStats: function(trips) {
        const totalRevenue = trips.reduce((sum, trip) => sum + trip.price, 0);
        const avgPrice = trips.length > 0 ? (totalRevenue / trips.length).toFixed(2) : 0;
        
        const statsHtml = `
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-label">Total de viajes:</span>
                    <span class="stat-value">${trips.length}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Ingresos totales:</span>
                    <span class="stat-value">RD$ ${totalRevenue.toLocaleString()}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Precio promedio:</span>
                    <span class="stat-value">RD$ ${avgPrice}</span>
                </div>
            </div>
        `;
        
        const statsElement = document.getElementById('filterStats');
        if (statsElement) {
            statsElement.innerHTML = statsHtml;
        }
    },

    // Exportar resultados filtrados
    exportFiltered: function() {
        const filteredTrips = this.filterTrips(appState.trips);
        this.exportToExcel(filteredTrips);
    },

    // Exportar a Excel
    exportToExcel: function(trips) {
        let csvContent = "ID,Fecha,Hora,Pasajero,Conductor,Origen,Destino,Precio,Estado,Duración,Distancia\n";
        
        trips.forEach(trip => {
            const date = new Date(trip.date);
            const dateStr = date.toLocaleDateString('es-DO');
            const timeStr = date.toLocaleTimeString('es-DO');
            
            csvContent += `${trip.id},${dateStr},${timeStr},${trip.passenger},${trip.driver},`;
            csvContent += `"${trip.origin}","${trip.destination}",${trip.price},${trip.status},`;
            csvContent += `${trip.duration || 'N/A'},${trip.distance || 'N/A'}\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `viajes_filtrados_${Date.now()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        NotificationService.success(`${trips.length} viajes exportados a Excel`);
    },

    // Mostrar/Ocultar filtros
    toggleFilters: function() {
        const content = document.getElementById('filtersContent');
        if (content) {
            content.classList.toggle('collapsed');
        }
    },

    // Cargar conductores y usuarios para los selectores
    loadSelectOptions: function() {
        // Cargar conductores
        const driverSelect = document.getElementById('filter-driver');
        if (driverSelect && appState.drivers) {
            appState.drivers.forEach(driver => {
                const option = document.createElement('option');
                option.value = driver.id;
                option.textContent = driver.name;
                driverSelect.appendChild(option);
            });
        }

        // Cargar usuarios
        const userSelect = document.getElementById('filter-user');
        if (userSelect && appState.users) {
            appState.users.forEach(user => {
                const option = document.createElement('option');
                option.value = user.id;
                option.textContent = user.name;
                userSelect.appendChild(option);
            });
        }
    },

    // Estilos CSS
    styles: `
        <style>
        .trips-filters-panel {
            background: white;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .filters-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #e5e7eb;
        }

        .filters-header h3 {
            margin: 0;
            color: #1f2937;
            font-size: 1.25rem;
        }

        .btn-toggle-filters {
            background: #6b7280;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s;
        }

        .btn-toggle-filters:hover {
            background: #4b5563;
            transform: translateY(-1px);
        }

        .filters-content {
            transition: all 0.3s ease;
        }

        .filters-content.collapsed {
            display: none;
        }

        .filters-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }

        .filter-group {
            display: flex;
            flex-direction: column;
        }

        .filter-group label {
            font-weight: 600;
            color: #374151;
            margin-bottom: 8px;
            font-size: 14px;
        }

        .filter-group input,
        .filter-group select {
            padding: 10px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 14px;
            transition: all 0.3s;
        }

        .filter-group input:focus,
        .filter-group select:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
        }

        .date-range,
        .price-range {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .date-range input,
        .price-range input {
            flex: 1;
        }

        .date-range span,
        .price-range span {
            color: #6b7280;
            font-size: 14px;
        }

        .filters-actions {
            display: flex;
            gap: 10px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
        }

        .filters-actions .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 6px;
            font-weight: 600;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.3s;
        }

        .btn-primary {
            background: #3b82f6;
            color: white;
        }

        .btn-primary:hover {
            background: #2563eb;
            transform: translateY(-2px);
        }

        .btn-secondary {
            background: #6b7280;
            color: white;
        }

        .btn-secondary:hover {
            background: #4b5563;
        }

        .btn-info {
            background: #10b981;
            color: white;
        }

        .btn-info:hover {
            background: #059669;
        }

        .filter-stats {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }

        .stat-item {
            background: #f9fafb;
            padding: 15px;
            border-radius: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .stat-label {
            color: #6b7280;
            font-size: 14px;
        }

        .stat-value {
            font-weight: 700;
            color: #1f2937;
            font-size: 18px;
        }
        </style>
    `,

    // Inyectar estilos
    injectStyles: function() {
        if (!document.getElementById('trips-filters-styles')) {
            const styleElement = document.createElement('div');
            styleElement.id = 'trips-filters-styles';
            styleElement.innerHTML = this.styles;
            document.head.appendChild(styleElement);
        }
    }
};

// Exportar el módulo
window.TripsFiltersModule = TripsFiltersModule;