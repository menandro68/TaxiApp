// MODULO DE GESTION FINANCIERA Y COMISIONES
var FinancesModule = {
    API_URL: window.location.origin + '/api',
    currentCommission: 10,

    init: function() {
        console.log('Modulo de finanzas inicializado');
        this.loadCommissionConfig();
        this.loadSummary();
        this.loadTransactions();
        this.loadBalances();
    },

    getHTML: function() {
        return '<div class="finances-section" style="padding: 20px;">' +
            '<div class="finances-header" style="margin-bottom: 20px;">' +
                '<h2 style="color: #333; font-size: 28px; margin-bottom: 10px;">💰 Gestion Financiera y Comisiones</h2>' +
                '<p style="color: #666;">Control de pagos, comisiones y balances de conductores</p>' +
            '</div>' +
            '<div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ffc107;">' +
                '<div style="display: flex; align-items: center; justify-content: space-between;">' +
                    '<div><strong>Comision Actual:</strong><span style="font-size: 24px; color: #856404; font-weight: bold; margin-left: 10px;" id="current-commission">10%</span></div>' +
                    '<div><input type="number" id="new-commission" min="0" max="100" step="0.5" style="padding: 5px; width: 80px;" placeholder="10">' +
                    '<button onclick="FinancesModule.updateCommission()" style="background: #ffc107; color: #000; border: none; padding: 5px 15px; border-radius: 4px; cursor: pointer; margin-left: 10px;">Actualizar</button></div>' +
                '</div>' +
            '</div>' +
            '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px;">' +
                '<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px; color: white;">' +
                    '<div style="font-size: 12px; opacity: 0.9;">Ingresos Totales</div>' +
                    '<div style="font-size: 28px; font-weight: bold;" id="total-revenue">$0</div>' +
                '</div>' +
                '<div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 20px; border-radius: 10px; color: white;">' +
                    '<div style="font-size: 12px; opacity: 0.9;">Comisiones Ganadas</div>' +
                    '<div style="font-size: 28px; font-weight: bold;" id="total-commission">$0</div>' +
                '</div>' +
                '<div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 20px; border-radius: 10px; color: white;">' +
                    '<div style="font-size: 12px; opacity: 0.9;">Pagado a Conductores</div>' +
                    '<div style="font-size: 28px; font-weight: bold;" id="total-driver-earnings">$0</div>' +
                '</div>' +
                '<div style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); padding: 20px; border-radius: 10px; color: white;">' +
                    '<div style="font-size: 12px; opacity: 0.9;">Comisiones Pendientes</div>' +
                    '<div style="font-size: 28px; font-weight: bold;" id="pending-commissions">$0</div>' +
                '</div>' +
            '</div>' +
            '<div style="display: flex; gap: 10px; margin-bottom: 20px;">' +
                '<button onclick="FinancesModule.showTab(\'transactions\')" id="tab-transactions" style="padding: 10px 20px; border: none; background: #007bff; color: white; border-radius: 4px; cursor: pointer;">Transacciones</button>' +
                '<button onclick="FinancesModule.showTab(\'balances\')" id="tab-balances" style="padding: 10px 20px; border: none; background: #6c757d; color: white; border-radius: 4px; cursor: pointer;">Balances de Conductores</button>' +
            '</div>' +
            '<div id="transactions-tab" style="background: white; border-radius: 10px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">' +
                '<h3 style="margin-bottom: 15px;">📊 Historial de Transacciones</h3>' +
                '<div id="transactions-list" style="overflow-x: auto;"><div style="text-align: center; padding: 40px; color: #999;">Cargando transacciones...</div></div>' +
            '</div>' +
            '<div id="balances-tab" style="background: white; border-radius: 10px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); display: none;">' +
                '<h3 style="margin-bottom: 15px;">💳 Balances de Conductores</h3>' +
                '<div id="balances-list" style="overflow-x: auto;"><div style="text-align: center; padding: 40px; color: #999;">Cargando balances...</div></div>' +
            '</div>' +
        '</div>';
    },

    loadCommissionConfig: async function() {
        var self = this;
        try {
            var response = await fetch(self.API_URL + '/finances/commission-config');
            var data = await response.json();
            if (data.success) {
                self.currentCommission = data.config.commission_percentage;
                document.getElementById('current-commission').textContent = self.currentCommission + '%';
                document.getElementById('new-commission').value = self.currentCommission;
            }
        } catch (error) {
            console.error('Error cargando configuracion:', error);
        }
    },

    updateCommission: async function() {
        var self = this;
        var newValue = document.getElementById('new-commission').value;
        if (!newValue || newValue < 0 || newValue > 100) {
            alert('Por favor ingrese un porcentaje valido entre 0 y 100');
            return;
        }
        try {
            var response = await fetch(self.API_URL + '/finances/commission-config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ percentage: parseFloat(newValue) })
            });
            if (response.ok) {
                alert('Comision actualizada a ' + newValue + '%');
                await self.loadCommissionConfig();
            }
        } catch (error) {
            alert('Error actualizando comision');
        }
    },

    loadSummary: async function() {
        var self = this;
        try {
            var response = await fetch(self.API_URL + '/finances/summary');
            var data = await response.json();
            if (data.success) {
                document.getElementById('total-revenue').textContent = '$' + (data.summary.totalRevenue || 0).toFixed(2);
                document.getElementById('total-commission').textContent = '$' + (data.summary.totalCommission || 0).toFixed(2);
                document.getElementById('total-driver-earnings').textContent = '$' + (data.summary.totalDriverEarnings || 0).toFixed(2);
                document.getElementById('pending-commissions').textContent = '$' + (data.summary.pendingCommissions || 0).toFixed(2);
            }
        } catch (error) {
            console.error('Error cargando resumen:', error);
        }
    },

    loadTransactions: async function() {
        var self = this;
        try {
            var response = await fetch(self.API_URL + '/finances/transactions');
            var data = await response.json();
            if (data.success) {
                self.displayTransactions(data.transactions);
            }
        } catch (error) {
            console.error('Error cargando transacciones:', error);
        }
    },

    displayTransactions: function(transactions) {
        var container = document.getElementById('transactions-list');
        if (!transactions || transactions.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">No hay transacciones registradas</div>';
            return;
        }
        var html = '<table style="width: 100%; border-collapse: collapse;">' +
            '<thead><tr style="border-bottom: 2px solid #dee2e6;">' +
                '<th style="padding: 10px; text-align: left;">ID</th>' +
                '<th style="padding: 10px; text-align: left;">Conductor</th>' +
                '<th style="padding: 10px; text-align: left;">Viaje</th>' +
                '<th style="padding: 10px; text-align: right;">Monto</th>' +
                '<th style="padding: 10px; text-align: right;">Comision</th>' +
                '<th style="padding: 10px; text-align: right;">Ganancia Conductor</th>' +
                '<th style="padding: 10px; text-align: left;">Fecha</th>' +
            '</tr></thead><tbody>';
        for (var i = 0; i < transactions.length; i++) {
            var trans = transactions[i];
            var date = new Date(trans.created_at).toLocaleDateString();
            html += '<tr style="border-bottom: 1px solid #dee2e6;">' +
                '<td style="padding: 10px;">#' + trans.id + '</td>' +
                '<td style="padding: 10px;">' + (trans.driver_name || 'Conductor #' + trans.driver_id) + '</td>' +
                '<td style="padding: 10px; font-size: 12px;">' + (trans.pickup_location || 'N/A') + '<br>→ ' + (trans.destination || 'N/A') + '</td>' +
                '<td style="padding: 10px; text-align: right; font-weight: bold;">$' + trans.trip_amount + '</td>' +
                '<td style="padding: 10px; text-align: right; color: #dc3545;">-$' + trans.commission_amount + '</td>' +
                '<td style="padding: 10px; text-align: right; color: #28a745;">$' + trans.driver_earnings + '</td>' +
                '<td style="padding: 10px;">' + date + '</td>' +
            '</tr>';
        }
        html += '</tbody></table>';
        container.innerHTML = html;
    },

    loadBalances: async function() {
        var self = this;
        try {
            var response = await fetch(self.API_URL + '/finances/balances');
            var data = await response.json();
            if (data.success) {
                self.displayBalances(data.balances);
            }
        } catch (error) {
            console.error('Error cargando balances:', error);
        }
    },

    displayBalances: function(balances) {
        var container = document.getElementById('balances-list');
        if (!balances || balances.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">No hay balances registrados</div>';
            return;
        }
        var html = '<table style="width: 100%; border-collapse: collapse;">' +
            '<thead><tr style="border-bottom: 2px solid #dee2e6;">' +
                '<th style="padding: 10px; text-align: left;">Conductor</th>' +
                '<th style="padding: 10px; text-align: right;">Ganancias Totales</th>' +
                '<th style="padding: 10px; text-align: right;">Comisiones Pagadas</th>' +
                '<th style="padding: 10px; text-align: right;">Comision Pendiente</th>' +
                '<th style="padding: 10px; text-align: right;">Balance Disponible</th>' +
                '<th style="padding: 10px; text-align: center;">Accion</th>' +
            '</tr></thead><tbody>';
        for (var i = 0; i < balances.length; i++) {
            var balance = balances[i];
            var isPending = balance.pending_payment > 0;
            var pendingStyle = isPending ? 'color: #dc3545; font-weight: bold;' : '';
            var actionBtn = isPending ? '<button onclick="FinancesModule.processPayment(' + balance.driver_id + ', ' + balance.pending_payment + ')" style="background: #28a745; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">Cobrar Comision</button>' : '-';
            html += '<tr style="border-bottom: 1px solid #dee2e6;">' +
                '<td style="padding: 10px;"><strong>' + (balance.driver_name || 'Conductor #' + balance.driver_id) + '</strong><br><small style="color: #666;">' + (balance.driver_phone || '') + '</small></td>' +
                '<td style="padding: 10px; text-align: right;">$' + (balance.total_earnings || 0) + '</td>' +
                '<td style="padding: 10px; text-align: right;">$' + (balance.total_commission_paid || 0) + '</td>' +
                '<td style="padding: 10px; text-align: right; ' + pendingStyle + '">$' + (balance.pending_payment || 0) + '</td>' +
                '<td style="padding: 10px; text-align: right; color: #28a745; font-weight: bold;">$' + (balance.available_balance || 0) + '</td>' +
                '<td style="padding: 10px; text-align: center;">' + actionBtn + '</td>' +
            '</tr>';
        }
        html += '</tbody></table>';
        container.innerHTML = html;
    },

    processPayment: async function(driverId, amount) {
        var self = this;
        if (!confirm('Confirmar cobro de comision de $' + amount + '?')) return;
        try {
            var response = await fetch(self.API_URL + '/finances/process-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ driverId: driverId, amount: amount })
            });
            var data = await response.json();
            if (data.success) {
                alert('Pago procesado exitosamente');
                await self.loadBalances();
                await self.loadSummary();
            } else {
                alert('Error: ' + data.error);
            }
        } catch (error) {
            alert('Error procesando pago');
        }
    },

    showTab: function(tab) {
        document.getElementById('transactions-tab').style.display = 'none';
        document.getElementById('balances-tab').style.display = 'none';
        document.getElementById('tab-transactions').style.background = '#6c757d';
        document.getElementById('tab-balances').style.background = '#6c757d';
        if (tab === 'transactions') {
            document.getElementById('transactions-tab').style.display = 'block';
            document.getElementById('tab-transactions').style.background = '#007bff';
        } else {
            document.getElementById('balances-tab').style.display = 'block';
            document.getElementById('tab-balances').style.background = '#007bff';
        }
    }
};

window.FinancesModule = FinancesModule;