// Modulo de Reportes Avanzados para el Panel de Administracion
var ReportsModule = {
    getHTML: function() {
        return '<div style="padding: 24px;">' +
            '<div style="background: white; border-radius: 12px; padding: 20px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">' +
                '<h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px;">📊 Reportes Avanzados</h2>' +
                '<div id="reportTabs" style="display: flex; gap: 10px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">' +
                    '<button onclick="ReportsModule.showTab(\'financial\')" class="report-tab active" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 8px 8px 0 0; cursor: pointer;">💰 Financiero</button>' +
                    '<button onclick="ReportsModule.showTab(\'trends\')" class="report-tab" style="padding: 10px 20px; background: #f3f4f6; color: #6b7280; border: none; border-radius: 8px 8px 0 0; cursor: pointer;">📈 Tendencias</button>' +
                    '<button onclick="ReportsModule.showTab(\'kpi\')" class="report-tab" style="padding: 10px 20px; background: #f3f4f6; color: #6b7280; border: none; border-radius: 8px 8px 0 0; cursor: pointer;">🎯 KPIs</button>' +
                    '<button onclick="ReportsModule.showTab(\'zones\')" class="report-tab" style="padding: 10px 20px; background: #f3f4f6; color: #6b7280; border: none; border-radius: 8px 8px 0 0; cursor: pointer;">🗺️ Zonas</button>' +
                '</div>' +
            '</div>' +
            '<div id="reportContent">' +
                '<div id="financialTab" class="report-tab-content" style="display: block;">' +
                    '<div style="background: white; border-radius: 12px; padding: 15px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">' +
                        '<div style="display: flex; gap: 10px; align-items: center;">' +
                            '<label style="font-weight: 600;">Periodo:</label>' +
                            '<select id="financialPeriod" onchange="ReportsModule.updateFinancialReport()" style="padding: 8px; border: 1px solid #d1d5db; border-radius: 6px;">' +
                                '<option value="week">Ultima Semana</option>' +
                                '<option value="month" selected>Ultimo Mes</option>' +
                                '<option value="quarter">Ultimo Trimestre</option>' +
                                '<option value="year">Ultimo Año</option>' +
                            '</select>' +
                            '<button onclick="ReportsModule.exportFinancialReport()" style="margin-left: auto; padding: 8px 16px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer;">📥 Exportar Excel</button>' +
                        '</div>' +
                    '</div>' +
                    '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 20px;">' +
                        '<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 12px; color: white;">' +
                            '<div style="font-size: 14px; opacity: 0.9;">Ingresos Totales</div>' +
                            '<div id="totalRevenue" style="font-size: 32px; font-weight: bold; margin: 10px 0;">RD$0</div>' +
                            '<div style="font-size: 12px;">📈 <span id="revenueChange">+0%</span> vs periodo anterior</div>' +
                        '</div>' +
                        '<div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 20px; border-radius: 12px; color: white;">' +
                            '<div style="font-size: 14px; opacity: 0.9;">Comisiones Ganadas</div>' +
                            '<div id="totalCommissions" style="font-size: 32px; font-weight: bold; margin: 10px 0;">RD$0</div>' +
                            '<div style="font-size: 12px;">20% de ingresos brutos</div>' +
                        '</div>' +
                        '<div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 20px; border-radius: 12px; color: white;">' +
                            '<div style="font-size: 14px; opacity: 0.9;">Pagos a Conductores</div>' +
                            '<div id="driverPayouts" style="font-size: 32px; font-weight: bold; margin: 10px 0;">RD$0</div>' +
                            '<div style="font-size: 12px;">80% de ingresos brutos</div>' +
                        '</div>' +
                        '<div style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); padding: 20px; border-radius: 12px; color: white;">' +
                            '<div style="font-size: 14px; opacity: 0.9;">Flujo de Caja Neto</div>' +
                            '<div id="netCashFlow" style="font-size: 32px; font-weight: bold; margin: 10px 0;">RD$0</div>' +
                            '<div style="font-size: 12px;">Despues de gastos operativos</div>' +
                        '</div>' +
                    '</div>' +
                    '<div style="background: white; border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">' +
                        '<h3 style="margin: 0 0 20px 0;">📊 Ingresos por Dia</h3>' +
                        '<canvas id="revenueChart" width="400" height="200"></canvas>' +
                    '</div>' +
                    '<div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">' +
                        '<h3 style="margin: 0 0 20px 0;">🚗 Top Conductores por Rentabilidad</h3>' +
                        '<table style="width: 100%; border-collapse: collapse;">' +
                            '<thead><tr style="background: #f9fafb;">' +
                                '<th style="padding: 12px; text-align: left; font-weight: 600;">Conductor</th>' +
                                '<th style="padding: 12px; text-align: left; font-weight: 600;">Viajes</th>' +
                                '<th style="padding: 12px; text-align: left; font-weight: 600;">Ingresos</th>' +
                                '<th style="padding: 12px; text-align: left; font-weight: 600;">Comision</th>' +
                                '<th style="padding: 12px; text-align: left; font-weight: 600;">Rating</th>' +
                                '<th style="padding: 12px; text-align: left; font-weight: 600;">Tasa Completado</th>' +
                            '</tr></thead>' +
                            '<tbody id="driverProfitabilityTable"></tbody>' +
                        '</table>' +
                    '</div>' +
                '</div>' +
                '<div id="trendsTab" class="report-tab-content" style="display: none;">' +
                    '<div style="background: white; border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">' +
                        '<h3 style="margin: 0 0 20px 0;">📅 Comparacion Mes a Mes</h3>' +
                        '<canvas id="monthlyComparisonChart" width="400" height="200"></canvas>' +
                    '</div>' +
                    '<div style="background: white; border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">' +
                        '<h3 style="margin: 0 0 20px 0;">🔮 Proyecciones</h3>' +
                        '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">' +
                            '<div style="border: 2px solid #3b82f6; border-radius: 8px; padding: 15px; text-align: center;">' +
                                '<div style="color: #6b7280; font-size: 14px;">Proximos 30 dias</div>' +
                                '<div id="projection30Days" style="color: #3b82f6; font-size: 24px; font-weight: bold; margin: 10px 0;">RD$0</div>' +
                            '</div>' +
                            '<div style="border: 2px solid #8b5cf6; border-radius: 8px; padding: 15px; text-align: center;">' +
                                '<div style="color: #6b7280; font-size: 14px;">Proximo Trimestre</div>' +
                                '<div id="projectionQuarter" style="color: #8b5cf6; font-size: 24px; font-weight: bold; margin: 10px 0;">RD$0</div>' +
                            '</div>' +
                            '<div style="border: 2px solid #10b981; border-radius: 8px; padding: 15px; text-align: center;">' +
                                '<div style="color: #6b7280; font-size: 14px;">Proyeccion Anual</div>' +
                                '<div id="projectionYear" style="color: #10b981; font-size: 24px; font-weight: bold; margin: 10px 0;">RD$0</div>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div id="kpiTab" class="report-tab-content" style="display: none;">' +
                    '<div style="background: white; border-radius: 12px; padding: 15px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">' +
                        '<div style="display: flex; gap: 10px; align-items: center;">' +
                            '<label style="font-weight: 600;">Agrupar por:</label>' +
                            '<select id="kpiPeriod" onchange="ReportsModule.updateKPIs()" style="padding: 8px; border: 1px solid #d1d5db; border-radius: 6px;">' +
                                '<option value="day">Dia</option>' +
                                '<option value="week" selected>Semana</option>' +
                                '<option value="month">Mes</option>' +
                                '<option value="quarter">Trimestre</option>' +
                            '</select>' +
                        '</div>' +
                    '</div>' +
                    '<div id="kpiGrid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;"></div>' +
                '</div>' +
                '<div id="zonesTab" class="report-tab-content" style="display: none;">' +
                    '<div style="background: white; border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">' +
                        '<h3 style="margin: 0 0 20px 0;">⏰ Horas Pico</h3>' +
                        '<canvas id="peakHoursChart" width="400" height="200"></canvas>' +
                    '</div>' +
                    '<div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">' +
                        '<h3 style="margin: 0 0 20px 0;">🗺️ Analisis por Zonas</h3>' +
                        '<table style="width: 100%; border-collapse: collapse;">' +
                            '<thead><tr style="background: #f9fafb;">' +
                                '<th style="padding: 12px; text-align: left;">Zona</th>' +
                                '<th style="padding: 12px; text-align: left;">Viajes</th>' +
                                '<th style="padding: 12px; text-align: left;">Ingresos</th>' +
                                '<th style="padding: 12px; text-align: left;">Tarifa Promedio</th>' +
                                '<th style="padding: 12px; text-align: left;">Usuarios Unicos</th>' +
                            '</tr></thead>' +
                            '<tbody id="zonesTable"></tbody>' +
                        '</table>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>';
    },

    init: function() {
        this.loadFinancialReport('month');
        this.setupEventListeners();
    },

    showTab: function(tab) {
        var tabs = document.querySelectorAll('.report-tab-content');
        for (var i = 0; i < tabs.length; i++) {
            tabs[i].style.display = 'none';
        }
        var buttons = document.querySelectorAll('.report-tab');
        for (var j = 0; j < buttons.length; j++) {
            buttons[j].style.background = '#f3f4f6';
            buttons[j].style.color = '#6b7280';
        }
        document.getElementById(tab + 'Tab').style.display = 'block';
        if (event && event.target) {
            event.target.style.background = '#3b82f6';
            event.target.style.color = 'white';
        }
        switch(tab) {
            case 'financial': this.loadFinancialReport(); break;
            case 'trends': this.loadTrendsReport(); break;
            case 'kpi': this.loadKPIReport(); break;
            case 'zones': this.loadZonesReport(); break;
        }
    },

    loadFinancialReport: async function(period) {
        var self = this;
        var selectedPeriod = period || document.getElementById('financialPeriod').value;
        try {
            var response = await fetch(window.location.origin + '/api/reports/financial/revenue/' + selectedPeriod);
            var result = await response.json();
            if (result.success && result.data.length > 0) {
                var totalRevenue = 0;
                for (var i = 0; i < result.data.length; i++) {
                    totalRevenue += result.data[i].total_revenue;
                }
                var totalCommission = totalRevenue * 0.20;
                var totalPayout = totalRevenue * 0.80;
                document.getElementById('totalRevenue').textContent = 'RD$' + totalRevenue.toLocaleString('es-DO');
                document.getElementById('totalCommissions').textContent = 'RD$' + totalCommission.toLocaleString('es-DO');
                document.getElementById('driverPayouts').textContent = 'RD$' + totalPayout.toLocaleString('es-DO');
                document.getElementById('netCashFlow').textContent = 'RD$' + totalCommission.toLocaleString('es-DO');
                self.createRevenueChart(result.data);
            }
            var profitResponse = await fetch(window.location.origin + '/api/reports/financial/driver-profitability/30');
            var profitResult = await profitResponse.json();
            if (profitResult.success) {
                self.updateDriverProfitabilityTable(profitResult.data);
            }
        } catch (error) {
            console.error('Error cargando reporte financiero:', error);
        }
    },

    loadTrendsReport: async function() {
        var self = this;
        try {
            var response = await fetch(window.location.origin + '/api/reports/trends/monthly-comparison');
            var result = await response.json();
            if (result.success) {
                self.createMonthlyComparisonChart(result.data);
            }
            var projResponse = await fetch(window.location.origin + '/api/reports/trends/projections');
            var projResult = await projResponse.json();
            if (projResult.success) {
                var proj = projResult.data;
                document.getElementById('projection30Days').textContent = 'RD$' + parseFloat(proj.next_30_days.projected_revenue).toLocaleString('es-DO');
                document.getElementById('projectionQuarter').textContent = 'RD$' + parseFloat(proj.next_quarter.projected_revenue).toLocaleString('es-DO');
                document.getElementById('projectionYear').textContent = 'RD$' + parseFloat(proj.next_year.projected_revenue).toLocaleString('es-DO');
            }
        } catch (error) {
            console.error('Error cargando tendencias:', error);
        }
    },

    loadKPIReport: async function() {
        var self = this;
        var period = document.getElementById('kpiPeriod').value;
        try {
            var response = await fetch(window.location.origin + '/api/reports/kpi/by-period/' + period);
            var result = await response.json();
            if (result.success) {
                self.updateKPIGrid(result.data);
            }
        } catch (error) {
            console.error('Error cargando KPIs:', error);
        }
    },

    loadZonesReport: async function() {
        var self = this;
        try {
            var peakResponse = await fetch(window.location.origin + '/api/reports/kpi/peak-hours');
            var peakResult = await peakResponse.json();
            if (peakResult.success) {
                self.createPeakHoursChart(peakResult.data);
            }
            var zonesResponse = await fetch(window.location.origin + '/api/reports/kpi/zones');
            var zonesResult = await zonesResponse.json();
            if (zonesResult.success) {
                self.updateZonesTable(zonesResult.data);
            }
        } catch (error) {
            console.error('Error cargando analisis de zonas:', error);
        }
    },

    createRevenueChart: function(data) {
        var ctx = document.getElementById('revenueChart');
        if (!ctx) return;
        var labels = [];
        var values = [];
        for (var i = data.length - 1; i >= 0; i--) {
            labels.push(data[i].date);
            values.push(data[i].total_revenue);
        }
        new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Ingresos Diarios',
                    data: values,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    },

    createMonthlyComparisonChart: function(data) {
        var ctx = document.getElementById('monthlyComparisonChart');
        if (!ctx) return;
        var labels = [];
        var revenues = [];
        var trips = [];
        for (var i = data.length - 1; i >= 0; i--) {
            labels.push(data[i].month);
            revenues.push(data[i].total_revenue);
            trips.push(data[i].total_trips);
        }
        new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Ingresos', data: revenues, backgroundColor: '#3b82f6' },
                    { label: 'Viajes', data: trips, backgroundColor: '#10b981', yAxisID: 'y1' }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { type: 'linear', display: true, position: 'left' },
                    y1: { type: 'linear', display: true, position: 'right' }
                }
            }
        });
    },

    createPeakHoursChart: function(data) {
        var ctx = document.getElementById('peakHoursChart');
        if (!ctx) return;
        var hourlyData = data.hourly_breakdown || [];
        var tripsByHour = [];
        var maxTrips = 0;
        for (var h = 0; h < 24; h++) {
            var count = 0;
            for (var i = 0; i < hourlyData.length; i++) {
                if (hourlyData[i].hour === h) {
                    count += hourlyData[i].total_trips;
                }
            }
            tripsByHour.push(count);
            if (count > maxTrips) maxTrips = count;
        }
        var labels = [];
        var colors = [];
        for (var j = 0; j < 24; j++) {
            labels.push(j + ':00');
            var intensity = maxTrips > 0 ? tripsByHour[j] / maxTrips : 0;
            colors.push('rgba(59, 130, 246, ' + (0.3 + intensity * 0.7) + ')');
        }
        new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{ label: 'Viajes por Hora', data: tripsByHour, backgroundColor: colors }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    },

    updateDriverProfitabilityTable: function(drivers) {
        var tbody = document.getElementById('driverProfitabilityTable');
        if (!tbody) return;
        var html = '';
        var limit = Math.min(drivers.length, 5);
        for (var i = 0; i < limit; i++) {
            var driver = drivers[i];
            var revenue = driver.total_revenue ? driver.total_revenue.toLocaleString('es-DO') : '0';
            var commission = driver.company_commission ? driver.company_commission.toLocaleString('es-DO') : '0';
            var rating = driver.avg_rating ? driver.avg_rating.toFixed(1) : 'N/A';
            var completionRate = driver.completion_rate || 0;
            var completionColor = completionRate > 90 ? '#10b981' : '#f59e0b';
            html += '<tr style="border-bottom: 1px solid #e5e7eb;">' +
                '<td style="padding: 12px;">' + driver.name + '</td>' +
                '<td style="padding: 12px;">' + driver.total_trips + '</td>' +
                '<td style="padding: 12px;">RD$' + revenue + '</td>' +
                '<td style="padding: 12px;">RD$' + commission + '</td>' +
                '<td style="padding: 12px;">⭐ ' + rating + '</td>' +
                '<td style="padding: 12px;"><span style="color: ' + completionColor + '">' + completionRate + '%</span></td>' +
            '</tr>';
        }
        tbody.innerHTML = html;
    },

    updateKPIGrid: function(kpis) {
        var grid = document.getElementById('kpiGrid');
        if (!grid) return;
        var html = '';
        var limit = Math.min(kpis.length, 6);
        for (var i = 0; i < limit; i++) {
            var kpi = kpis[i];
            var revenue = kpi.total_revenue ? kpi.total_revenue.toLocaleString('es-DO') : '0';
            var avgFare = kpi.avg_fare ? kpi.avg_fare.toFixed(0) : '0';
            var completionRate = kpi.completion_rate || 0;
            var completionColor = completionRate > 90 ? '#10b981' : '#f59e0b';
            html += '<div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">' +
                '<div style="font-size: 14px; color: #6b7280; margin-bottom: 10px;">Periodo: ' + kpi.period + '</div>' +
                '<div style="display: grid; gap: 10px;">' +
                    '<div style="display: flex; justify-content: space-between;"><span>Viajes:</span><strong>' + kpi.total_trips + '</strong></div>' +
                    '<div style="display: flex; justify-content: space-between;"><span>Ingresos:</span><strong>RD$' + revenue + '</strong></div>' +
                    '<div style="display: flex; justify-content: space-between;"><span>Tarifa Promedio:</span><strong>RD$' + avgFare + '</strong></div>' +
                    '<div style="display: flex; justify-content: space-between;"><span>Tasa Completado:</span><strong style="color: ' + completionColor + '">' + completionRate + '%</strong></div>' +
                '</div>' +
            '</div>';
        }
        grid.innerHTML = html;
    },

    updateZonesTable: function(zones) {
        var tbody = document.getElementById('zonesTable');
        if (!tbody) return;
        var html = '';
        var limit = Math.min(zones.length, 10);
        for (var i = 0; i < limit; i++) {
            var zone = zones[i];
            var revenue = zone.total_revenue ? zone.total_revenue.toLocaleString('es-DO') : '0';
            var avgFare = zone.avg_fare ? zone.avg_fare.toFixed(0) : '0';
            html += '<tr style="border-bottom: 1px solid #e5e7eb;">' +
                '<td style="padding: 12px;">' + (zone.zone || 'Sin zona') + '</td>' +
                '<td style="padding: 12px;">' + zone.total_trips + '</td>' +
                '<td style="padding: 12px;">RD$' + revenue + '</td>' +
                '<td style="padding: 12px;">RD$' + avgFare + '</td>' +
                '<td style="padding: 12px;">' + zone.unique_users + '</td>' +
            '</tr>';
        }
        tbody.innerHTML = html;
    },

    updateFinancialReport: function() {
        this.loadFinancialReport();
    },

    updateKPIs: function() {
        this.loadKPIReport();
    },

    exportFinancialReport: async function() {
        var period = document.getElementById('financialPeriod').value;
        try {
            var response = await fetch(window.location.origin + '/api/reports/financial/revenue/' + period);
            var result = await response.json();
            if (result.success) {
                var csv = this.convertToCSV(result.data);
                var blob = new Blob([csv], { type: 'text/csv' });
                var url = URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = url;
                a.download = 'reporte_financiero_' + period + '_' + new Date().toISOString().split('T')[0] + '.csv';
                a.click();
            }
        } catch (error) {
            console.error('Error exportando reporte:', error);
        }
    },

    convertToCSV: function(data) {
        if (!data || data.length === 0) return '';
        var headers = Object.keys(data[0]);
        var csvHeaders = headers.join(',');
        var csvRows = '';
        for (var i = 0; i < data.length; i++) {
            var row = [];
            for (var j = 0; j < headers.length; j++) {
                row.push(data[i][headers[j]]);
            }
            csvRows += row.join(',') + '\n';
        }
        return csvHeaders + '\n' + csvRows;
    },

    setupEventListeners: function() {
        // Event listeners configurados inline en el HTML
    }
};

window.ReportsModule = ReportsModule;