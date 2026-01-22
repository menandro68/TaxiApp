// Modulo de Gestion de Tarifas Dinamicas
var PricingModule = {
    getHTML: function() {
        return '<div style="padding: 24px;">' +
            '<div style="background: white; border-radius: 12px; padding: 20px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">' +
                '<h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px;">💰 Gestion de Tarifas Dinamicas</h2>' +
                '<div id="pricingTabs" style="display: flex; gap: 10px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">' +
                    '<button onclick="PricingModule.showTab(\'base\')" class="pricing-tab active" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 8px 8px 0 0; cursor: pointer;">🚗 Tarifas Base</button>' +
                    '<button onclick="PricingModule.showTab(\'surge\')" class="pricing-tab" style="padding: 10px 20px; background: #f3f4f6; color: #6b7280; border: none; border-radius: 8px 8px 0 0; cursor: pointer;">⚡ Surge Pricing</button>' +
                    '<button onclick="PricingModule.showTab(\'zones\')" class="pricing-tab" style="padding: 10px 20px; background: #f3f4f6; color: #6b7280; border: none; border-radius: 8px 8px 0 0; cursor: pointer;">📍 Zonas Especiales</button>' +
                    '<button onclick="PricingModule.showTab(\'history\')" class="pricing-tab" style="padding: 10px 20px; background: #f3f4f6; color: #6b7280; border: none; border-radius: 8px 8px 0 0; cursor: pointer;">📜 Historial</button>' +
                '</div>' +
            '</div>' +
            '<div id="pricingContent">' +
                '<div id="baseTab" class="pricing-tab-content" style="display: block;">' +
                    '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;" id="vehicleCards"></div>' +
                '</div>' +
                '<div id="surgeTab" class="pricing-tab-content" style="display: none;">' +
                    '<div style="background: white; border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">' +
                        '<h3 style="margin: 0 0 20px 0;">⏰ Multiplicadores por Hora</h3>' +
                        '<div id="timeMultipliers"></div>' +
                    '</div>' +
                    '<div style="background: white; border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">' +
                        '<h3 style="margin: 0 0 20px 0;">📅 Multiplicadores por Dia</h3>' +
                        '<div id="dayMultipliers"></div>' +
                    '</div>' +
                    '<div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">' +
                        '<h3 style="margin: 0 0 20px 0;">🌦️ Otros Multiplicadores</h3>' +
                        '<div id="otherMultipliers"></div>' +
                    '</div>' +
                '</div>' +
                '<div id="zonesTab" class="pricing-tab-content" style="display: none;">' +
                    '<div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">' +
                        '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">' +
                            '<h3 style="margin: 0;">📍 Zonas con Recargo</h3>' +
                            '<button onclick="PricingModule.addNewZone()" style="padding: 8px 16px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer;">➕ Nueva Zona</button>' +
                        '</div>' +
                        '<table style="width: 100%; border-collapse: collapse;">' +
                            '<thead><tr style="background: #f9fafb;">' +
                                '<th style="padding: 12px; text-align: left;">Zona</th>' +
                                '<th style="padding: 12px; text-align: left;">Tipo</th>' +
                                '<th style="padding: 12px; text-align: left;">Recargo</th>' +
                                '<th style="padding: 12px; text-align: left;">Multiplicador</th>' +
                                '<th style="padding: 12px; text-align: left;">Estado</th>' +
                                '<th style="padding: 12px; text-align: left;">Acciones</th>' +
                            '</tr></thead>' +
                            '<tbody id="zonesTable"></tbody>' +
                        '</table>' +
                    '</div>' +
                '</div>' +
                '<div id="historyTab" class="pricing-tab-content" style="display: none;">' +
                    '<div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">' +
                        '<h3 style="margin: 0 0 20px 0;">📜 Historial de Cambios</h3>' +
                        '<table style="width: 100%; border-collapse: collapse;">' +
                            '<thead><tr style="background: #f9fafb;">' +
                                '<th style="padding: 12px; text-align: left;">Fecha</th>' +
                                '<th style="padding: 12px; text-align: left;">Tabla</th>' +
                                '<th style="padding: 12px; text-align: left;">Campo</th>' +
                                '<th style="padding: 12px; text-align: left;">Valor Anterior</th>' +
                                '<th style="padding: 12px; text-align: left;">Valor Nuevo</th>' +
                                '<th style="padding: 12px; text-align: left;">Usuario</th>' +
                            '</tr></thead>' +
                            '<tbody id="historyTable"></tbody>' +
                        '</table>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>';
    },

    init: function() {
        this.loadPricingConfig();
        this.loadSurgeMultipliers();
        this.loadSpecialZones();
    },

    showTab: function(tab) {
        var tabs = document.querySelectorAll('.pricing-tab-content');
        for (var i = 0; i < tabs.length; i++) {
            tabs[i].style.display = 'none';
        }
        var buttons = document.querySelectorAll('.pricing-tab');
        for (var j = 0; j < buttons.length; j++) {
            buttons[j].style.background = '#f3f4f6';
            buttons[j].style.color = '#6b7280';
        }
        document.getElementById(tab + 'Tab').style.display = 'block';
        if (event && event.target) {
            event.target.style.background = '#3b82f6';
            event.target.style.color = 'white';
        }
        if (tab === 'history') {
            this.loadHistory();
        }
    },

    loadPricingConfig: async function() {
        var self = this;
        try {
            var response = await fetch(window.location.origin + '/api/pricing/config');
            var data = await response.json();
            var container = document.getElementById('vehicleCards');
            var html = '';
            for (var i = 0; i < data.length; i++) {
                var config = data[i];
                html += '<div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">' +
                    '<h3 style="margin: 0 0 15px 0; color: #1f2937; text-transform: capitalize;">' + self.getVehicleIcon(config.vehicle_type) + ' ' + config.vehicle_type + '</h3>' +
                    '<div>' +
                        '<div style="margin-bottom: 15px;">' +
                            '<label style="display: block; font-size: 0.875rem; color: #6b7280; margin-bottom: 4px;">Tarifa Base</label>' +
                            '<input type="number" id="base_' + config.vehicle_type + '" value="' + config.base_fare + '" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px;">' +
                        '</div>' +
                        '<div style="margin-bottom: 15px;">' +
                            '<label style="display: block; font-size: 0.875rem; color: #6b7280; margin-bottom: 4px;">Por Kilometro</label>' +
                            '<input type="number" id="km_' + config.vehicle_type + '" value="' + config.per_km + '" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px;">' +
                        '</div>' +
                        '<div style="margin-bottom: 15px;">' +
                            '<label style="display: block; font-size: 0.875rem; color: #6b7280; margin-bottom: 4px;">Por Minuto</label>' +
                            '<input type="number" id="min_' + config.vehicle_type + '" value="' + config.per_minute + '" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px;">' +
                        '</div>' +
                        '<div style="margin-bottom: 15px;">' +
                            '<label style="display: block; font-size: 0.875rem; color: #6b7280; margin-bottom: 4px;">Tarifa Minima</label>' +
                            '<input type="number" id="minimum_' + config.vehicle_type + '" value="' + config.minimum_fare + '" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px;">' +
                        '</div>' +
                        '<button onclick="PricingModule.updatePricing(\'' + config.vehicle_type + '\')" style="width: 100%; padding: 10px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">Actualizar</button>' +
                    '</div>' +
                '</div>';
            }
            container.innerHTML = html;
        } catch (error) {
            console.error('Error cargando configuracion:', error);
        }
    },

    loadSurgeMultipliers: async function() {
        var self = this;
        try {
            var response = await fetch(window.location.origin + '/api/pricing/surge');
            var data = await response.json();
            var timeMultipliers = [];
            var dayMultipliers = [];
            var otherMultipliers = [];
            for (var i = 0; i < data.length; i++) {
                if (data[i].type === 'time') {
                    timeMultipliers.push(data[i]);
                } else if (data[i].type === 'day') {
                    dayMultipliers.push(data[i]);
                } else {
                    otherMultipliers.push(data[i]);
                }
            }
            var timeHtml = '';
            for (var j = 0; j < timeMultipliers.length; j++) {
                timeHtml += self.renderMultiplierRow(timeMultipliers[j]);
            }
            document.getElementById('timeMultipliers').innerHTML = timeHtml;
            var dayHtml = '';
            for (var k = 0; k < dayMultipliers.length; k++) {
                dayHtml += self.renderMultiplierRow(dayMultipliers[k]);
            }
            document.getElementById('dayMultipliers').innerHTML = dayHtml;
            var otherHtml = '';
            for (var l = 0; l < otherMultipliers.length; l++) {
                otherHtml += self.renderMultiplierRow(otherMultipliers[l]);
            }
            document.getElementById('otherMultipliers').innerHTML = otherHtml;
        } catch (error) {
            console.error('Error cargando multiplicadores:', error);
        }
    },

    renderMultiplierRow: function(multiplier) {
        return '<div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; border-bottom: 1px solid #e5e7eb;">' +
            '<div>' +
                '<strong>' + multiplier.name + '</strong>' +
                '<span style="color: #6b7280; font-size: 0.875rem; margin-left: 10px;">' + (multiplier.condition_value || '') + '</span>' +
            '</div>' +
            '<div style="display: flex; align-items: center; gap: 10px;">' +
                '<input type="number" step="0.1" value="' + multiplier.multiplier + '" id="mult_' + multiplier.id + '" style="width: 80px; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px;">' +
                '<span>x</span>' +
                '<button onclick="PricingModule.updateMultiplier(' + multiplier.id + ')" style="padding: 6px 12px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;">Guardar</button>' +
            '</div>' +
        '</div>';
    },

    loadSpecialZones: async function() {
        var self = this;
        try {
            var response = await fetch(window.location.origin + '/api/pricing/zones');
            var data = await response.json();
            var tbody = document.getElementById('zonesTable');
            var html = '';
            for (var i = 0; i < data.length; i++) {
                var zone = data[i];
                var statusBg = zone.active ? '#dcfce7' : '#fee2e2';
                var statusColor = zone.active ? '#166534' : '#991b1b';
                var statusText = zone.active ? 'Activa' : 'Inactiva';
                var btnBg = zone.active ? '#fee2e2' : '#dcfce7';
                var btnColor = zone.active ? '#991b1b' : '#166534';
                var btnText = zone.active ? 'Desactivar' : 'Activar';
                html += '<tr style="border-bottom: 1px solid #e5e7eb;">' +
                    '<td style="padding: 12px;">' + zone.zone_name + '</td>' +
                    '<td style="padding: 12px;">' + zone.zone_type + '</td>' +
                    '<td style="padding: 12px;">RD$' + zone.surcharge + '</td>' +
                    '<td style="padding: 12px;">' + zone.multiplier + 'x</td>' +
                    '<td style="padding: 12px;"><span style="padding: 4px 12px; background: ' + statusBg + '; color: ' + statusColor + '; border-radius: 12px; font-size: 0.75rem;">' + statusText + '</span></td>' +
                    '<td style="padding: 12px;"><button onclick="PricingModule.toggleZone(' + zone.id + ', ' + !zone.active + ')" style="padding: 4px 8px; background: ' + btnBg + '; color: ' + btnColor + '; border: none; border-radius: 4px; cursor: pointer;">' + btnText + '</button></td>' +
                '</tr>';
            }
            tbody.innerHTML = html;
        } catch (error) {
            console.error('Error cargando zonas:', error);
        }
    },

    loadHistory: async function() {
        try {
            var response = await fetch(window.location.origin + '/api/pricing/history');
            var data = await response.json();
            var tbody = document.getElementById('historyTable');
            var html = '';
            for (var i = 0; i < data.length; i++) {
                var record = data[i];
                html += '<tr style="border-bottom: 1px solid #e5e7eb;">' +
                    '<td style="padding: 12px; font-size: 0.875rem;">' + new Date(record.change_date).toLocaleString() + '</td>' +
                    '<td style="padding: 12px;">' + record.table_name + '</td>' +
                    '<td style="padding: 12px;">' + record.field_changed + '</td>' +
                    '<td style="padding: 12px;">' + record.old_value + '</td>' +
                    '<td style="padding: 12px; font-weight: 600;">' + record.new_value + '</td>' +
                    '<td style="padding: 12px;">Admin #' + (record.changed_by || 1) + '</td>' +
                '</tr>';
            }
            tbody.innerHTML = html;
        } catch (error) {
            console.error('Error cargando historial:', error);
        }
    },

    getVehicleIcon: function(type) {
        var icons = {
            'economy': '🚗',
            'comfort': '🚙',
            'premium': '🚘',
            'xl': '🚐'
        };
        return icons[type] || '🚗';
    },

    updatePricing: async function(vehicleType) {
        var self = this;
        var data = {
            base_fare: document.getElementById('base_' + vehicleType).value,
            per_km: document.getElementById('km_' + vehicleType).value,
            per_minute: document.getElementById('min_' + vehicleType).value,
            minimum_fare: document.getElementById('minimum_' + vehicleType).value,
            booking_fee: 20
        };
        try {
            var response = await fetch(window.location.origin + '/api/pricing/config/' + vehicleType, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (response.ok) {
                self.showNotification('Tarifa actualizada correctamente', 'success');
            }
        } catch (error) {
            self.showNotification('Error al actualizar tarifa', 'error');
        }
    },

    updateMultiplier: async function(id) {
        var self = this;
        var multiplier = document.getElementById('mult_' + id).value;
        try {
            var response = await fetch(window.location.origin + '/api/pricing/surge/' + id, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ multiplier: multiplier, active: true })
            });
            if (response.ok) {
                self.showNotification('Multiplicador actualizado', 'success');
            }
        } catch (error) {
            self.showNotification('Error al actualizar multiplicador', 'error');
        }
    },

    toggleZone: async function(id, active) {
        var self = this;
        try {
            var response = await fetch(window.location.origin + '/api/pricing/zones/' + id, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ active: active })
            });
            if (response.ok) {
                self.showNotification(active ? 'Zona activada' : 'Zona desactivada', 'success');
                self.loadSpecialZones();
            }
        } catch (error) {
            self.showNotification('Error al actualizar zona', 'error');
        }
    },

    addNewZone: function() {
        alert('Funcionalidad para agregar nueva zona - Por implementar');
    },

    showNotification: function(message, type) {
        var notification = document.createElement('div');
        notification.style.cssText = 'position: fixed; top: 20px; right: 20px; padding: 16px 24px; background: ' + (type === 'success' ? '#10b981' : '#ef4444') + '; color: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 9999;';
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(function() {
            notification.remove();
        }, 3000);
    }
};

window.PricingModule = PricingModule;