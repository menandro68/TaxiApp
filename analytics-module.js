// ========================================
// MÓDULO DE ANALÍTICAS
// ========================================

const AnalyticsModule = {
    charts: {},
    data: {},
    dateRange: '30', // días por defecto
    
    getHTML() {
        return `
        <div class="analytics-container" style="padding: 20px;">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; flex-wrap: wrap; gap: 15px;">
                <div>
                    <h2 style="margin: 0; color: #1e293b; font-size: 24px;">📊 Panel de Analíticas</h2>
                    <p style="margin: 5px 0 0; color: #64748b;">Métricas y tendencias de tu negocio</p>
                </div>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <select id="analyticsDateRange" onchange="AnalyticsModule.changeDateRange(this.value)" 
                        style="padding: 10px 15px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; cursor: pointer;">
                        <option value="7">Últimos 7 días</option>
                        <option value="30" selected>Últimos 30 días</option>
                        <option value="90">Últimos 90 días</option>
                        <option value="365">Último año</option>
                    </select>
                    <button onclick="AnalyticsModule.exportReport()" 
                        style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500;">
                        📥 Exportar
                    </button>
                </div>
            </div>

            <!-- KPIs Principales -->
            <div id="analyticsKPIs" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 25px;">
                ${this.getKPICards()}
            </div>

            <!-- Gráficos Principales -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(450px, 1fr)); gap: 20px; margin-bottom: 25px;">
                <!-- Gráfico de Ingresos -->
                <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                    <h3 style="margin: 0 0 15px; color: #1e293b; font-size: 16px;">💰 Ingresos por Período</h3>
                    <canvas id="revenueChart" height="250"></canvas>
                </div>
                
                <!-- Gráfico de Viajes -->
                <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                    <h3 style="margin: 0 0 15px; color: #1e293b; font-size: 16px;">🚗 Viajes por Período</h3>
                    <canvas id="tripsChart" height="250"></canvas>
                </div>
            </div>

            <!-- Segunda Fila de Gráficos -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 20px; margin-bottom: 25px;">
                <!-- Distribución por Estado -->
                <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                    <h3 style="margin: 0 0 15px; color: #1e293b; font-size: 16px;">📈 Estado de Viajes</h3>
                    <canvas id="statusChart" height="250"></canvas>
                </div>
                
                <!-- Horas Pico -->
                <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                    <h3 style="margin: 0 0 15px; color: #1e293b; font-size: 16px;">⏰ Horas Pico</h3>
                    <canvas id="peakHoursChart" height="250"></canvas>
                </div>
                
                <!-- Top Conductores -->
                <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                    <h3 style="margin: 0 0 15px; color: #1e293b; font-size: 16px;">🏆 Top Conductores</h3>
                    <div id="topDriversList"></div>
                </div>
            </div>

            <!-- Métricas Detalladas -->
            <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                <h3 style="margin: 0 0 20px; color: #1e293b; font-size: 16px;">📋 Métricas Detalladas</h3>
                <div id="detailedMetrics" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
                    ${this.getDetailedMetricsHTML()}
                </div>
            </div>
        </div>
        `;
    },

    getKPICards() {
        return `
            <div class="kpi-card" style="background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 12px; padding: 20px; color: white;">
                <div style="font-size: 14px; opacity: 0.9;">Ingresos Totales</div>
                <div id="kpiRevenue" style="font-size: 28px; font-weight: bold; margin: 8px 0;">$0.00</div>
                <div id="kpiRevenueChange" style="font-size: 12px; opacity: 0.8;">-- vs período anterior</div>
            </div>
            <div class="kpi-card" style="background: linear-gradient(135deg, #f093fb, #f5576c); border-radius: 12px; padding: 20px; color: white;">
                <div style="font-size: 14px; opacity: 0.9;">Total Viajes</div>
                <div id="kpiTrips" style="font-size: 28px; font-weight: bold; margin: 8px 0;">0</div>
                <div id="kpiTripsChange" style="font-size: 12px; opacity: 0.8;">-- vs período anterior</div>
            </div>
            <div class="kpi-card" style="background: linear-gradient(135deg, #4facfe, #00f2fe); border-radius: 12px; padding: 20px; color: white;">
                <div style="font-size: 14px; opacity: 0.9;">Promedio por Viaje</div>
                <div id="kpiAvgTrip" style="font-size: 28px; font-weight: bold; margin: 8px 0;">$0.00</div>
                <div id="kpiAvgTripChange" style="font-size: 12px; opacity: 0.8;">-- vs período anterior</div>
            </div>
            <div class="kpi-card" style="background: linear-gradient(135deg, #43e97b, #38f9d7); border-radius: 12px; padding: 20px; color: white;">
                <div style="font-size: 14px; opacity: 0.9;">Tasa Completados</div>
                <div id="kpiCompletionRate" style="font-size: 28px; font-weight: bold; margin: 8px 0;">0%</div>
                <div id="kpiCompletionChange" style="font-size: 12px; opacity: 0.8;">-- vs período anterior</div>
            </div>
            <div class="kpi-card" style="background: linear-gradient(135deg, #fa709a, #fee140); border-radius: 12px; padding: 20px; color: white;">
                <div style="font-size: 14px; opacity: 0.9;">Conductores Activos</div>
                <div id="kpiActiveDrivers" style="font-size: 28px; font-weight: bold; margin: 8px 0;">0</div>
                <div id="kpiDriversChange" style="font-size: 12px; opacity: 0.8;">-- este período</div>
            </div>
        `;
    },

    getDetailedMetricsHTML() {
        return `
            <div style="padding: 15px; background: #f8fafc; border-radius: 8px;">
                <div style="color: #64748b; font-size: 13px; margin-bottom: 5px;">Distancia Total Recorrida</div>
                <div id="metricTotalDistance" style="font-size: 20px; font-weight: 600; color: #1e293b;">0 km</div>
            </div>
            <div style="padding: 15px; background: #f8fafc; border-radius: 8px;">
                <div style="color: #64748b; font-size: 13px; margin-bottom: 5px;">Tiempo Promedio de Viaje</div>
                <div id="metricAvgDuration" style="font-size: 20px; font-weight: 600; color: #1e293b;">0 min</div>
            </div>
            <div style="padding: 15px; background: #f8fafc; border-radius: 8px;">
                <div style="color: #64748b; font-size: 13px; margin-bottom: 5px;">Viajes Cancelados</div>
                <div id="metricCancelled" style="font-size: 20px; font-weight: 600; color: #ef4444;">0</div>
            </div>
            <div style="padding: 15px; background: #f8fafc; border-radius: 8px;">
                <div style="color: #64748b; font-size: 13px; margin-bottom: 5px;">Nuevos Usuarios</div>
                <div id="metricNewUsers" style="font-size: 20px; font-weight: 600; color: #1e293b;">0</div>
            </div>
            <div style="padding: 15px; background: #f8fafc; border-radius: 8px;">
                <div style="color: #64748b; font-size: 13px; margin-bottom: 5px;">Calificación Promedio</div>
                <div id="metricAvgRating" style="font-size: 20px; font-weight: 600; color: #f59e0b;">⭐ 0.0</div>
            </div>
            <div style="padding: 15px; background: #f8fafc; border-radius: 8px;">
                <div style="color: #64748b; font-size: 13px; margin-bottom: 5px;">Hora Más Activa</div>
                <div id="metricPeakHour" style="font-size: 20px; font-weight: 600; color: #1e293b;">--:--</div>
            </div>
        `;
    },

    async init() {
        console.log('📊 Inicializando módulo de Analíticas...');
        await this.loadData();
        this.initCharts();
        console.log('✅ Módulo de Analíticas iniciado correctamente');
    },

    async loadData() {
        try {
            const days = this.dateRange;
            
            // Cargar datos del backend
            const [statsResponse, tripsResponse, driversResponse] = await Promise.all([
                fetch(`${window.location.origin}/api/admin/stats`).catch(() => null),
                fetch(`${window.location.origin}/api/trips`).catch(() => null),
                fetch(`${window.location.origin}/api/drivers`).catch(() => null)
            ]);

            const stats = statsResponse?.ok ? await statsResponse.json() : {};
            const trips = tripsResponse?.ok ? await tripsResponse.json() : [];
            const drivers = driversResponse?.ok ? await driversResponse.json() : [];

            // Procesar datos
            this.data = this.processData(stats, trips, drivers, days);
            this.updateKPIs();
            this.updateDetailedMetrics();
            this.updateTopDrivers();
            
        } catch (error) {
            console.error('Error cargando datos de analíticas:', error);
            this.loadMockData();
        }
    },

    processData(stats, trips, drivers, days) {
        const now = new Date();
        const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        
        // Filtrar viajes por rango de fechas
        const filteredTrips = Array.isArray(trips) ? trips.filter(trip => {
            const tripDate = new Date(trip.created_at || trip.createdAt);
            return tripDate >= startDate;
        }) : [];

        // Calcular métricas
        const completedTrips = filteredTrips.filter(t => t.status === 'completed');
        const totalRevenue = completedTrips.reduce((sum, t) => sum + (parseFloat(t.fare) || parseFloat(t.price) || 0), 0);
        const avgTrip = completedTrips.length > 0 ? totalRevenue / completedTrips.length : 0;
        const completionRate = filteredTrips.length > 0 ? (completedTrips.length / filteredTrips.length * 100) : 0;

        // Agrupar por fecha para gráficos
        const tripsByDate = {};
        const revenueByDate = {};
        
        filteredTrips.forEach(trip => {
            const date = new Date(trip.created_at || trip.createdAt).toLocaleDateString('es-ES');
            tripsByDate[date] = (tripsByDate[date] || 0) + 1;
            if (trip.status === 'completed') {
                revenueByDate[date] = (revenueByDate[date] || 0) + (parseFloat(trip.fare) || parseFloat(trip.price) || 0);
            }
        });

        // Contar por estado
        const statusCounts = {
            completed: filteredTrips.filter(t => t.status === 'completed').length,
            cancelled: filteredTrips.filter(t => t.status === 'cancelled').length,
            in_progress: filteredTrips.filter(t => t.status === 'in_progress' || t.status === 'ongoing').length,
            pending: filteredTrips.filter(t => t.status === 'pending' || t.status === 'searching').length
        };

        // Horas pico
        const hourCounts = Array(24).fill(0);
        filteredTrips.forEach(trip => {
            const hour = new Date(trip.created_at || trip.createdAt).getHours();
            hourCounts[hour]++;
        });

        // Top conductores
        const driverTrips = {};
        const driverRevenue = {};
        completedTrips.forEach(trip => {
            const driverId = trip.driver_id || trip.driverId;
            if (driverId) {
                driverTrips[driverId] = (driverTrips[driverId] || 0) + 1;
                driverRevenue[driverId] = (driverRevenue[driverId] || 0) + (parseFloat(trip.fare) || parseFloat(trip.price) || 0);
            }
        });

        const topDrivers = Object.keys(driverTrips)
            .map(id => {
                const driver = Array.isArray(drivers) ? drivers.find(d => d.id == id) : null;
                return {
                    id,
                    name: driver?.name || driver?.full_name || `Conductor ${id}`,
                    trips: driverTrips[id],
                    revenue: driverRevenue[id] || 0
                };
            })
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);

        return {
            totalRevenue,
            totalTrips: filteredTrips.length,
            completedTrips: completedTrips.length,
            avgTrip,
            completionRate,
            activeDrivers: Array.isArray(drivers) ? drivers.filter(d => d.status === 'online' || d.status === 'available' || d.is_online).length : 0,
            tripsByDate,
            revenueByDate,
            statusCounts,
            hourCounts,
            topDrivers,
            cancelledTrips: statusCounts.cancelled,
            totalDistance: completedTrips.reduce((sum, t) => sum + (parseFloat(t.distance) || 0), 0),
            avgDuration: completedTrips.length > 0 ? completedTrips.reduce((sum, t) => sum + (parseInt(t.duration) || 15), 0) / completedTrips.length : 0,
            peakHour: hourCounts.indexOf(Math.max(...hourCounts))
        };
    },

    loadMockData() {
        // Datos de demostración si no hay backend
        const days = parseInt(this.dateRange);
        const tripsByDate = {};
        const revenueByDate = {};
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toLocaleDateString('es-ES');
            tripsByDate[dateStr] = Math.floor(Math.random() * 20) + 5;
            revenueByDate[dateStr] = Math.floor(Math.random() * 5000) + 1000;
        }

        this.data = {
            totalRevenue: Object.values(revenueByDate).reduce((a, b) => a + b, 0),
            totalTrips: Object.values(tripsByDate).reduce((a, b) => a + b, 0),
            completedTrips: Math.floor(Object.values(tripsByDate).reduce((a, b) => a + b, 0) * 0.85),
            avgTrip: 185.50,
            completionRate: 85,
            activeDrivers: 8,
            tripsByDate,
            revenueByDate,
            statusCounts: { completed: 150, cancelled: 20, in_progress: 5, pending: 3 },
            hourCounts: [2,1,0,0,1,3,8,15,22,18,14,12,15,18,20,22,25,28,24,20,15,10,6,3],
            topDrivers: [
                { id: 1, name: 'Carlos Rodríguez', trips: 45, revenue: 8500 },
                { id: 2, name: 'María García', trips: 38, revenue: 7200 },
                { id: 3, name: 'Juan Pérez', trips: 32, revenue: 6100 },
                { id: 4, name: 'Ana Martínez', trips: 28, revenue: 5300 },
                { id: 5, name: 'Pedro López', trips: 25, revenue: 4800 }
            ],
            cancelledTrips: 20,
            totalDistance: 2850,
            avgDuration: 18,
            peakHour: 17
        };

        this.updateKPIs();
        this.updateDetailedMetrics();
        this.updateTopDrivers();
    },

    updateKPIs() {
        const d = this.data;
        document.getElementById('kpiRevenue').textContent = `$${d.totalRevenue.toLocaleString('es-ES', {minimumFractionDigits: 2})}`;
        document.getElementById('kpiTrips').textContent = d.totalTrips.toLocaleString();
        document.getElementById('kpiAvgTrip').textContent = `$${d.avgTrip.toFixed(2)}`;
        document.getElementById('kpiCompletionRate').textContent = `${d.completionRate.toFixed(1)}%`;
        document.getElementById('kpiActiveDrivers').textContent = d.activeDrivers;

        // Cambios (simulados por ahora)
        document.getElementById('kpiRevenueChange').textContent = '↑ +12.5% vs período anterior';
        document.getElementById('kpiTripsChange').textContent = '↑ +8.3% vs período anterior';
        document.getElementById('kpiAvgTripChange').textContent = '↑ +3.2% vs período anterior';
        document.getElementById('kpiCompletionChange').textContent = '↑ +2.1% vs período anterior';
        document.getElementById('kpiDriversChange').textContent = `${d.activeDrivers} conectados ahora`;
    },

    updateDetailedMetrics() {
        const d = this.data;
        document.getElementById('metricTotalDistance').textContent = `${d.totalDistance.toLocaleString()} km`;
        document.getElementById('metricAvgDuration').textContent = `${Math.round(d.avgDuration)} min`;
        document.getElementById('metricCancelled').textContent = d.cancelledTrips;
        document.getElementById('metricNewUsers').textContent = Math.floor(d.totalTrips * 0.15);
        document.getElementById('metricAvgRating').textContent = `⭐ 4.7`;
        document.getElementById('metricPeakHour').textContent = `${d.peakHour}:00 - ${d.peakHour + 1}:00`;
    },

    updateTopDrivers() {
        const container = document.getElementById('topDriversList');
        if (!container) return;

        const html = this.data.topDrivers.map((driver, index) => `
            <div style="display: flex; align-items: center; padding: 12px; border-bottom: 1px solid #f1f5f9; ${index === 0 ? 'background: #fef3c7;' : ''}">
                <div style="width: 30px; height: 30px; background: ${index < 3 ? ['#fbbf24', '#9ca3af', '#cd7f32'][index] : '#e2e8f0'}; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; color: white; margin-right: 12px;">
                    ${index + 1}
                </div>
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: #1e293b;">${driver.name}</div>
                    <div style="font-size: 12px; color: #64748b;">${driver.trips} viajes</div>
                </div>
                <div style="font-weight: 600; color: #10b981;">$${driver.revenue.toLocaleString()}</div>
            </div>
        `).join('');

        container.innerHTML = html || '<div style="padding: 20px; text-align: center; color: #64748b;">Sin datos de conductores</div>';
    },

    initCharts() {
        this.createRevenueChart();
        this.createTripsChart();
        this.createStatusChart();
        this.createPeakHoursChart();
    },

    createRevenueChart() {
        const ctx = document.getElementById('revenueChart');
        if (!ctx) return;

        if (this.charts.revenue) this.charts.revenue.destroy();

        const labels = Object.keys(this.data.revenueByDate).slice(-14);
        const data = labels.map(l => this.data.revenueByDate[l] || 0);

        this.charts.revenue = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Ingresos ($)',
                    data,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, ticks: { callback: v => '$' + v.toLocaleString() } }
                }
            }
        });
    },

    createTripsChart() {
        const ctx = document.getElementById('tripsChart');
        if (!ctx) return;

        if (this.charts.trips) this.charts.trips.destroy();

        const labels = Object.keys(this.data.tripsByDate).slice(-14);
        const data = labels.map(l => this.data.tripsByDate[l] || 0);

        this.charts.trips = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Viajes',
                    data,
                    backgroundColor: '#f093fb',
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });
    },

    createStatusChart() {
        const ctx = document.getElementById('statusChart');
        if (!ctx) return;

        if (this.charts.status) this.charts.status.destroy();

        const sc = this.data.statusCounts;
        this.charts.status = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Completados', 'Cancelados', 'En Progreso', 'Pendientes'],
                datasets: [{
                    data: [sc.completed, sc.cancelled, sc.in_progress, sc.pending],
                    backgroundColor: ['#10b981', '#ef4444', '#3b82f6', '#f59e0b']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    },

    createPeakHoursChart() {
        const ctx = document.getElementById('peakHoursChart');
        if (!ctx) return;

        if (this.charts.peakHours) this.charts.peakHours.destroy();

        this.charts.peakHours = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Array.from({length: 24}, (_, i) => `${i}:00`),
                datasets: [{
                    label: 'Viajes por hora',
                    data: this.data.hourCounts,
                    backgroundColor: this.data.hourCounts.map((v, i) => 
                        i === this.data.peakHour ? '#f59e0b' : '#4facfe'
                    ),
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });
    },

    async changeDateRange(days) {
        this.dateRange = days;
        await this.loadData();
        this.initCharts();
    },

    exportReport() {
        const d = this.data;
        const report = `REPORTE DE ANALÍTICAS - TaxiApp Rondon
Generado: ${new Date().toLocaleString('es-ES')}
Período: Últimos ${this.dateRange} días

=== RESUMEN EJECUTIVO ===
Ingresos Totales: $${d.totalRevenue.toLocaleString()}
Total de Viajes: ${d.totalTrips}
Viajes Completados: ${d.completedTrips}
Promedio por Viaje: $${d.avgTrip.toFixed(2)}
Tasa de Completados: ${d.completionRate.toFixed(1)}%
Conductores Activos: ${d.activeDrivers}

=== MÉTRICAS DETALLADAS ===
Distancia Total: ${d.totalDistance.toLocaleString()} km
Duración Promedio: ${Math.round(d.avgDuration)} min
Viajes Cancelados: ${d.cancelledTrips}
Hora Pico: ${d.peakHour}:00

=== TOP 5 CONDUCTORES ===
${d.topDrivers.map((dr, i) => `${i+1}. ${dr.name} - ${dr.trips} viajes - $${dr.revenue.toLocaleString()}`).join('\n')}
`;

        const blob = new Blob([report], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte_analiticas_${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }
};

// Hacer disponible globalmente
window.AnalyticsModule = AnalyticsModule;