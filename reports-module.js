// Módulo de Reportes Avanzados para el Panel de Administración
const ReportsModule = {
    getHTML: function() {
        return `
            <div style="padding: 24px;">
                <!-- Header con Tabs -->
                <div style="background: white; border-radius: 12px; padding: 20px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px;">📊 Reportes Avanzados</h2>
                    
                    <div id="reportTabs" style="display: flex; gap: 10px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
                        <button onclick="ReportsModule.showTab('financial')" class="report-tab active" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 8px 8px 0 0; cursor: pointer;">
                            💰 Financiero
                        </button>
                        <button onclick="ReportsModule.showTab('trends')" class="report-tab" style="padding: 10px 20px; background: #f3f4f6; color: #6b7280; border: none; border-radius: 8px 8px 0 0; cursor: pointer;">
                            📈 Tendencias
                        </button>
                        <button onclick="ReportsModule.showTab('kpi')" class="report-tab" style="padding: 10px 20px; background: #f3f4f6; color: #6b7280; border: none; border-radius: 8px 8px 0 0; cursor: pointer;">
                            🎯 KPIs
                        </button>
                        <button onclick="ReportsModule.showTab('zones')" class="report-tab" style="padding: 10px 20px; background: #f3f4f6; color: #6b7280; border: none; border-radius: 8px 8px 0 0; cursor: pointer;">
                            🗺️ Zonas
                        </button>
                    </div>
                </div>

                <!-- Contenido de Tabs -->
                <div id="reportContent">
                    <!-- Tab Financiero -->
                    <div id="financialTab" class="report-tab-content" style="display: block;">
                        <!-- Filtros de Período -->
                        <div style="background: white; border-radius: 12px; padding: 15px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                            <div style="display: flex; gap: 10px; align-items: center;">
                                <label style="font-weight: 600;">Período:</label>
                                <select id="financialPeriod" onchange="ReportsModule.updateFinancialReport()" style="padding: 8px; border: 1px solid #d1d5db; border-radius: 6px;">
                                    <option value="week">Última Semana</option>
                                    <option value="month" selected>Último Mes</option>
                                    <option value="quarter">Último Trimestre</option>
                                    <option value="year">Último Año</option>
                                </select>
                                <button onclick="ReportsModule.exportFinancialReport()" style="margin-left: auto; padding: 8px 16px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer;">
                                    📥 Exportar Excel
                                </button>
                            </div>
                        </div>

                        <!-- Grid de Métricas Financieras -->
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 20px;">
                            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 12px; color: white;">
                                <div style="font-size: 14px; opacity: 0.9;">Ingresos Totales</div>
                                <div id="totalRevenue" style="font-size: 32px; font-weight: bold; margin: 10px 0;">RD$0</div>
                                <div style="font-size: 12px;">📈 <span id="revenueChange">+0%</span> vs período anterior</div>
                            </div>
                            <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 20px; border-radius: 12px; color: white;">
                                <div style="font-size: 14px; opacity: 0.9;">Comisiones Ganadas</div>
                                <div id="totalCommissions" style="font-size: 32px; font-weight: bold; margin: 10px 0;">RD$0</div>
                                <div style="font-size: 12px;">20% de ingresos brutos</div>
                            </div>
                            <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 20px; border-radius: 12px; color: white;">
                                <div style="font-size: 14px; opacity: 0.9;">Pagos a Conductores</div>
                                <div id="driverPayouts" style="font-size: 32px; font-weight: bold; margin: 10px 0;">RD$0</div>
                                <div style="font-size: 12px;">80% de ingresos brutos</div>
                            </div>
                            <div style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); padding: 20px; border-radius: 12px; color: white;">
                                <div style="font-size: 14px; opacity: 0.9;">Flujo de Caja Neto</div>
                                <div id="netCashFlow" style="font-size: 32px; font-weight: bold; margin: 10px 0;">RD$0</div>
                                <div style="font-size: 12px;">Después de gastos operativos</div>
                            </div>
                        </div>

                        <!-- Gráfico de Ingresos -->
                        <div style="background: white; border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                            <h3 style="margin: 0 0 20px 0;">📊 Ingresos por Día</h3>
                            <canvas id="revenueChart" width="400" height="200"></canvas>
                        </div>

                        <!-- Tabla de Rentabilidad por Conductor -->
                        <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                            <h3 style="margin: 0 0 20px 0;">🚗 Top Conductores por Rentabilidad</h3>
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead>
                                    <tr style="background: #f9fafb;">
                                        <th style="padding: 12px; text-align: left; font-weight: 600;">Conductor</th>
                                        <th style="padding: 12px; text-align: left; font-weight: 600;">Viajes</th>
                                        <th style="padding: 12px; text-align: left; font-weight: 600;">Ingresos</th>
                                        <th style="padding: 12px; text-align: left; font-weight: 600;">Comisión</th>
                                        <th style="padding: 12px; text-align: left; font-weight: 600;">Rating</th>
                                        <th style="padding: 12px; text-align: left; font-weight: 600;">Tasa Completado</th>
                                    </tr>
                                </thead>
                                <tbody id="driverProfitabilityTable">
                                    <!-- Se llenará dinámicamente -->
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Tab Tendencias -->
                    <div id="trendsTab" class="report-tab-content" style="display: none;">
                        <!-- Comparación Mensual -->
                        <div style="background: white; border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                            <h3 style="margin: 0 0 20px 0;">📅 Comparación Mes a Mes</h3>
                            <canvas id="monthlyComparisonChart" width="400" height="200"></canvas>
                        </div>

                        <!-- Proyecciones -->
                        <div style="background: white; border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                            <h3 style="margin: 0 0 20px 0;">🔮 Proyecciones</h3>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                                <div style="border: 2px solid #3b82f6; border-radius: 8px; padding: 15px; text-align: center;">
                                    <div style="color: #6b7280; font-size: 14px;">Próximos 30 días</div>
                                    <div id="projection30Days" style="color: #3b82f6; font-size: 24px; font-weight: bold; margin: 10px 0;">RD$0</div>
                                </div>
                                <div style="border: 2px solid #8b5cf6; border-radius: 8px; padding: 15px; text-align: center;">
                                    <div style="color: #6b7280; font-size: 14px;">Próximo Trimestre</div>
                                    <div id="projectionQuarter" style="color: #8b5cf6; font-size: 24px; font-weight: bold; margin: 10px 0;">RD$0</div>
                                </div>
                                <div style="border: 2px solid #10b981; border-radius: 8px; padding: 15px; text-align: center;">
                                    <div style="color: #6b7280; font-size: 14px;">Proyección Anual</div>
                                    <div id="projectionYear" style="color: #10b981; font-size: 24px; font-weight: bold; margin: 10px 0;">RD$0</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Tab KPIs -->
                    <div id="kpiTab" class="report-tab-content" style="display: none;">
                        <!-- Selector de Período -->
                        <div style="background: white; border-radius: 12px; padding: 15px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                            <div style="display: flex; gap: 10px; align-items: center;">
                                <label style="font-weight: 600;">Agrupar por:</label>
                                <select id="kpiPeriod" onchange="ReportsModule.updateKPIs()" style="padding: 8px; border: 1px solid #d1d5db; border-radius: 6px;">
                                    <option value="day">Día</option>
                                    <option value="week" selected>Semana</option>
                                    <option value="month">Mes</option>
                                    <option value="quarter">Trimestre</option>
                                </select>
                            </div>
                        </div>

                        <!-- Grid de KPIs -->
                        <div id="kpiGrid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
                            <!-- Se llenará dinámicamente -->
                        </div>
                    </div>

                    <!-- Tab Zonas -->
                    <div id="zonesTab" class="report-tab-content" style="display: none;">
                        <!-- Análisis de Horas Pico -->
                        <div style="background: white; border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                            <h3 style="margin: 0 0 20px 0;">⏰ Horas Pico</h3>
                            <canvas id="peakHoursChart" width="400" height="200"></canvas>
                        </div>

                        <!-- Tabla de Zonas -->
                        <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                            <h3 style="margin: 0 0 20px 0;">🗺️ Análisis por Zonas</h3>
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead>
                                    <tr style="background: #f9fafb;">
                                        <th style="padding: 12px; text-align: left;">Zona</th>
                                        <th style="padding: 12px; text-align: left;">Viajes</th>
                                        <th style="padding: 12px; text-align: left;">Ingresos</th>
                                        <th style="padding: 12px; text-align: left;">Tarifa Promedio</th>
                                        <th style="padding: 12px; text-align: left;">Usuarios Únicos</th>
                                    </tr>
                                </thead>
                                <tbody id="zonesTable">
                                    <!-- Se llenará dinámicamente -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    init: function() {
        this.loadFinancialReport('month');
        this.setupEventListeners();
    },

    showTab: function(tab) {
        // Ocultar todos los tabs
        document.querySelectorAll('.report-tab-content').forEach(t => t.style.display = 'none');
        document.querySelectorAll('.report-tab').forEach(b => {
            b.style.background = '#f3f4f6';
            b.style.color = '#6b7280';
        });
        
        // Mostrar tab seleccionado
        document.getElementById(tab + 'Tab').style.display = 'block';
        event.target.style.background = '#3b82f6';
        event.target.style.color = 'white';
        
        // Cargar datos según el tab
        switch(tab) {
            case 'financial':
                this.loadFinancialReport();
                break;
            case 'trends':
                this.loadTrendsReport();
                break;
            case 'kpi':
                this.loadKPIReport();
                break;
            case 'zones':
                this.loadZonesReport();
                break;
        }
    },

    loadFinancialReport: async function(period = null) {
        const selectedPeriod = period || document.getElementById('financialPeriod').value;
        
        try {
            // Cargar datos financieros
            const response = await fetch(`http://localhost:3000/api/reports/financial/revenue/${selectedPeriod}`);
            const result = await response.json();
            
            if (result.success && result.data.length > 0) {
                // Calcular totales
                const totalRevenue = result.data.reduce((sum, row) => sum + row.total_revenue, 0);
                const totalCommission = totalRevenue * 0.20;
                const totalPayout = totalRevenue * 0.80;
                
                // Actualizar métricas
                document.getElementById('totalRevenue').textContent = `RD$${totalRevenue.toLocaleString('es-DO')}`;
                document.getElementById('totalCommissions').textContent = `RD$${totalCommission.toLocaleString('es-DO')}`;
                document.getElementById('driverPayouts').textContent = `RD$${totalPayout.toLocaleString('es-DO')}`;
                document.getElementById('netCashFlow').textContent = `RD$${totalCommission.toLocaleString('es-DO')}`;
                
                // Crear gráfico
                this.createRevenueChart(result.data);
            }
            
            // Cargar rentabilidad de conductores
            const profitResponse = await fetch(`http://localhost:3000/api/reports/financial/driver-profitability/30`);
            const profitResult = await profitResponse.json();
            
            if (profitResult.success) {
                this.updateDriverProfitabilityTable(profitResult.data);
            }
            
        } catch (error) {
            console.error('Error cargando reporte financiero:', error);
        }
    },

    loadTrendsReport: async function() {
        try {
            // Cargar comparación mensual
            const response = await fetch('http://localhost:3000/api/reports/trends/monthly-comparison');
            const result = await response.json();
            
            if (result.success) {
                this.createMonthlyComparisonChart(result.data);
            }
            
            // Cargar proyecciones
            const projResponse = await fetch('http://localhost:3000/api/reports/trends/projections');
            const projResult = await projResponse.json();
            
            if (projResult.success) {
                const proj = projResult.data;
                document.getElementById('projection30Days').textContent = 
                    `RD$${parseFloat(proj.next_30_days.projected_revenue).toLocaleString('es-DO')}`;
                document.getElementById('projectionQuarter').textContent = 
                    `RD$${parseFloat(proj.next_quarter.projected_revenue).toLocaleString('es-DO')}`;
                document.getElementById('projectionYear').textContent = 
                    `RD$${parseFloat(proj.next_year.projected_revenue).toLocaleString('es-DO')}`;
            }
            
        } catch (error) {
            console.error('Error cargando tendencias:', error);
        }
    },

    loadKPIReport: async function() {
        const period = document.getElementById('kpiPeriod').value;
        
        try {
            const response = await fetch(`http://localhost:3000/api/reports/kpi/by-period/${period}`);
            const result = await response.json();
            
            if (result.success) {
                this.updateKPIGrid(result.data);
            }
            
        } catch (error) {
            console.error('Error cargando KPIs:', error);
        }
    },

    loadZonesReport: async function() {
        try {
            // Cargar análisis de horas pico
            const peakResponse = await fetch('http://localhost:3000/api/reports/kpi/peak-hours');
            const peakResult = await peakResponse.json();
            
            if (peakResult.success) {
                this.createPeakHoursChart(peakResult.data);
            }
            
            // Cargar análisis de zonas
            const zonesResponse = await fetch('http://localhost:3000/api/reports/kpi/zones');
            const zonesResult = await zonesResponse.json();
            
            if (zonesResult.success) {
                this.updateZonesTable(zonesResult.data);
            }
            
        } catch (error) {
            console.error('Error cargando análisis de zonas:', error);
        }
    },

    createRevenueChart: function(data) {
        const ctx = document.getElementById('revenueChart').getContext('2d');
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(d => d.date).reverse(),
                datasets: [{
                    label: 'Ingresos Diarios',
                    data: data.map(d => d.total_revenue).reverse(),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                }
            }
        });
    },

    createMonthlyComparisonChart: function(data) {
        const ctx = document.getElementById('monthlyComparisonChart').getContext('2d');
        
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(d => d.month).reverse(),
                datasets: [{
                    label: 'Ingresos',
                    data: data.map(d => d.total_revenue).reverse(),
                    backgroundColor: '#3b82f6'
                }, {
                    label: 'Viajes',
                    data: data.map(d => d.total_trips).reverse(),
                    backgroundColor: '#10b981',
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left'
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right'
                    }
                }
            }
        });
    },

    createPeakHoursChart: function(data) {
        const ctx = document.getElementById('peakHoursChart').getContext('2d');
        const hourlyData = data.hourly_breakdown;
        
        const hours = Array.from({length: 24}, (_, i) => i);
        const tripsByHour = hours.map(hour => {
            const hourData = hourlyData.filter(d => d.hour === hour);
            return hourData.reduce((sum, d) => sum + d.total_trips, 0);
        });
        
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: hours.map(h => `${h}:00`),
                datasets: [{
                    label: 'Viajes por Hora',
                    data: tripsByHour,
                    backgroundColor: hours.map(h => {
                        const intensity = tripsByHour[h] / Math.max(...tripsByHour);
                        return `rgba(59, 130, 246, ${0.3 + intensity * 0.7})`;
                    })
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                }
            }
        });
    },

    updateDriverProfitabilityTable: function(drivers) {
        const tbody = document.getElementById('driverProfitabilityTable');
        tbody.innerHTML = drivers.slice(0, 5).map(driver => `
            <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px;">${driver.name}</td>
                <td style="padding: 12px;">${driver.total_trips}</td>
                <td style="padding: 12px;">RD$${driver.total_revenue?.toLocaleString('es-DO') || 0}</td>
                <td style="padding: 12px;">RD$${driver.company_commission?.toLocaleString('es-DO') || 0}</td>
                <td style="padding: 12px;">⭐ ${driver.avg_rating?.toFixed(1) || 'N/A'}</td>
                <td style="padding: 12px;">
                    <span style="color: ${driver.completion_rate > 90 ? '#10b981' : '#f59e0b'}">
                        ${driver.completion_rate || 0}%
                    </span>
                </td>
            </tr>
        `).join('');
    },

    updateKPIGrid: function(kpis) {
        const grid = document.getElementById('kpiGrid');
        grid.innerHTML = kpis.slice(0, 6).map(kpi => `
            <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <div style="font-size: 14px; color: #6b7280; margin-bottom: 10px;">
                    Período: ${kpi.period}
                </div>
                <div style="display: grid; gap: 10px;">
                    <div style="display: flex; justify-content: space-between;">
                        <span>Viajes:</span>
                        <strong>${kpi.total_trips}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span>Ingresos:</span>
                        <strong>RD$${kpi.total_revenue?.toLocaleString('es-DO') || 0}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span>Tarifa Promedio:</span>
                        <strong>RD$${kpi.avg_fare?.toFixed(0) || 0}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span>Tasa Completado:</span>
                        <strong style="color: ${kpi.completion_rate > 90 ? '#10b981' : '#f59e0b'}">
                            ${kpi.completion_rate || 0}%
                        </strong>
                    </div>
                </div>
            </div>
        `).join('');
    },

    updateZonesTable: function(zones) {
        const tbody = document.getElementById('zonesTable');
        tbody.innerHTML = zones.slice(0, 10).map(zone => `
            <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px;">${zone.zone || 'Sin zona'}</td>
                <td style="padding: 12px;">${zone.total_trips}</td>
                <td style="padding: 12px;">RD$${zone.total_revenue?.toLocaleString('es-DO') || 0}</td>
                <td style="padding: 12px;">RD$${zone.avg_fare?.toFixed(0) || 0}</td>
                <td style="padding: 12px;">${zone.unique_users}</td>
            </tr>
        `).join('');
    },

    updateFinancialReport: function() {
        this.loadFinancialReport();
    },

    updateKPIs: function() {
        this.loadKPIReport();
    },

    exportFinancialReport: async function() {
        const period = document.getElementById('financialPeriod').value;
        
        try {
            const response = await fetch(`http://localhost:3000/api/reports/financial/revenue/${period}`);
            const result = await response.json();
            
            if (result.success) {
                // Crear CSV
                const csv = this.convertToCSV(result.data);
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                
                const a = document.createElement('a');
                a.href = url;
                a.download = `reporte_financiero_${period}_${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
            }
        } catch (error) {
            console.error('Error exportando reporte:', error);
        }
    },

    convertToCSV: function(data) {
        if (!data || data.length === 0) return '';
        
        const headers = Object.keys(data[0]);
        const csvHeaders = headers.join(',');
        const csvRows = data.map(row => 
            headers.map(header => row[header]).join(',')
        ).join('\n');
        
        return csvHeaders + '\n' + csvRows;
    },

    setupEventListeners: function() {
        // Los event listeners ya están configurados inline en el HTML
    }
};

// Hacer disponible globalmente
window.ReportsModule = ReportsModule;