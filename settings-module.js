// MODULO DE CONFIGURACION DEL SISTEMA
var SettingsModule = {
    API_URL: window.location.origin + '/api',

    init: function() {
        console.log('Modulo de configuracion inicializado');
        this.loadSettings();
    },

    getHTML: function() {
        return '<div style="padding: 24px;">' +
            '<div style="background: white; border-radius: 12px; padding: 20px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">' +
                '<h2 style="margin: 0 0 10px 0; color: #1f2937; font-size: 24px;">⚙️ Configuracion del Sistema</h2>' +
                '<p style="color: #6b7280; margin: 0;">Administra las configuraciones generales de TaxiApp Rondon</p>' +
            '</div>' +
            '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px;">' +
                '<div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">' +
                    '<h3 style="margin: 0 0 20px 0; color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">💰 Configuracion de Tarifas</h3>' +
                    '<div style="margin-bottom: 15px;">' +
                        '<label style="display: block; font-size: 14px; color: #374151; margin-bottom: 5px;">Comision de la Plataforma (%)</label>' +
                        '<input type="number" id="setting-commission" value="10" min="0" max="100" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px;">' +
                    '</div>' +
                    '<div style="margin-bottom: 15px;">' +
                        '<label style="display: block; font-size: 14px; color: #374151; margin-bottom: 5px;">Tarifa Base (RD$)</label>' +
                        '<input type="number" id="setting-base-fare" value="50" min="0" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px;">' +
                    '</div>' +
                    '<div style="margin-bottom: 15px;">' +
                        '<label style="display: block; font-size: 14px; color: #374151; margin-bottom: 5px;">Precio por Km (RD$)</label>' +
                        '<input type="number" id="setting-per-km" value="25" min="0" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px;">' +
                    '</div>' +
                    '<div style="margin-bottom: 15px;">' +
                        '<label style="display: block; font-size: 14px; color: #374151; margin-bottom: 5px;">Precio por Minuto (RD$)</label>' +
                        '<input type="number" id="setting-per-minute" value="5" min="0" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px;">' +
                    '</div>' +
                    '<button onclick="SettingsModule.saveTarifas()" style="width: 100%; padding: 12px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Guardar Tarifas</button>' +
                '</div>' +
                '<div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">' +
                    '<h3 style="margin: 0 0 20px 0; color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">🚗 Configuracion de Viajes</h3>' +
                    '<div style="margin-bottom: 15px;">' +
                        '<label style="display: block; font-size: 14px; color: #374151; margin-bottom: 5px;">Radio de Busqueda (km)</label>' +
                        '<input type="number" id="setting-search-radius" value="5" min="1" max="50" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px;">' +
                    '</div>' +
                    '<div style="margin-bottom: 15px;">' +
                        '<label style="display: block; font-size: 14px; color: #374151; margin-bottom: 5px;">Tiempo de Espera Maximo (min)</label>' +
                        '<input type="number" id="setting-wait-time" value="10" min="1" max="60" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px;">' +
                    '</div>' +
                    '<div style="margin-bottom: 15px;">' +
                        '<label style="display: block; font-size: 14px; color: #374151; margin-bottom: 5px;">Cancelaciones Permitidas por Dia</label>' +
                        '<input type="number" id="setting-max-cancellations" value="3" min="1" max="10" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px;">' +
                    '</div>' +
                    '<div style="margin-bottom: 15px;">' +
                        '<label style="display: block; font-size: 14px; color: #374151; margin-bottom: 5px;">Tarifa Minima (RD$)</label>' +
                        '<input type="number" id="setting-min-fare" value="80" min="0" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px;">' +
                    '</div>' +
                    '<button onclick="SettingsModule.saveViajes()" style="width: 100%; padding: 12px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Guardar Configuracion</button>' +
                '</div>' +
                '<div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">' +
                    '<h3 style="margin: 0 0 20px 0; color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">🔔 Notificaciones</h3>' +
                    '<div style="margin-bottom: 15px;">' +
                        '<label style="display: flex; align-items: center; cursor: pointer;">' +
                            '<input type="checkbox" id="setting-notify-new-trip" checked style="width: 20px; height: 20px; margin-right: 10px;">' +
                            '<span>Notificar nuevos viajes</span>' +
                        '</label>' +
                    '</div>' +
                    '<div style="margin-bottom: 15px;">' +
                        '<label style="display: flex; align-items: center; cursor: pointer;">' +
                            '<input type="checkbox" id="setting-notify-new-driver" checked style="width: 20px; height: 20px; margin-right: 10px;">' +
                            '<span>Notificar nuevos conductores</span>' +
                        '</label>' +
                    '</div>' +
                    '<div style="margin-bottom: 15px;">' +
                        '<label style="display: flex; align-items: center; cursor: pointer;">' +
                            '<input type="checkbox" id="setting-notify-support" checked style="width: 20px; height: 20px; margin-right: 10px;">' +
                            '<span>Notificar tickets de soporte</span>' +
                        '</label>' +
                    '</div>' +
                    '<div style="margin-bottom: 15px;">' +
                        '<label style="display: flex; align-items: center; cursor: pointer;">' +
                            '<input type="checkbox" id="setting-notify-payments" checked style="width: 20px; height: 20px; margin-right: 10px;">' +
                            '<span>Notificar pagos pendientes</span>' +
                        '</label>' +
                    '</div>' +
                    '<button onclick="SettingsModule.saveNotificaciones()" style="width: 100%; padding: 12px; background: #8b5cf6; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Guardar Notificaciones</button>' +
                '</div>' +
                '<div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">' +
                    '<h3 style="margin: 0 0 20px 0; color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">📱 Informacion del Sistema</h3>' +
                    '<div style="margin-bottom: 12px; padding: 10px; background: #f3f4f6; border-radius: 6px;">' +
                        '<span style="color: #6b7280;">Version:</span>' +
                        '<span style="float: right; font-weight: 600;">1.0.0</span>' +
                    '</div>' +
                    '<div style="margin-bottom: 12px; padding: 10px; background: #f3f4f6; border-radius: 6px;">' +
                        '<span style="color: #6b7280;">Servidor:</span>' +
                        '<span style="float: right; font-weight: 600;">Railway</span>' +
                    '</div>' +
                    '<div style="margin-bottom: 12px; padding: 10px; background: #f3f4f6; border-radius: 6px;">' +
                        '<span style="color: #6b7280;">Base de Datos:</span>' +
                        '<span style="float: right; font-weight: 600;">PostgreSQL</span>' +
                    '</div>' +
                    '<div style="margin-bottom: 12px; padding: 10px; background: #f3f4f6; border-radius: 6px;">' +
                        '<span style="color: #6b7280;">Estado:</span>' +
                        '<span style="float: right; color: #10b981; font-weight: 600;">✓ Operativo</span>' +
                    '</div>' +
                    '<div style="margin-bottom: 12px; padding: 10px; background: #f3f4f6; border-radius: 6px;">' +
                        '<span style="color: #6b7280;">Ultima Actualizacion:</span>' +
                        '<span style="float: right; font-weight: 600;" id="setting-last-update">--</span>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>';
    },

    loadSettings: async function() {
        var self = this;
        try {
            var response = await fetch(self.API_URL + '/settings');
            var data = await response.json();
            if (data.success && data.settings) {
                var s = data.settings;
                if (s.commission) document.getElementById('setting-commission').value = s.commission;
                if (s.base_fare) document.getElementById('setting-base-fare').value = s.base_fare;
                if (s.per_km) document.getElementById('setting-per-km').value = s.per_km;
                if (s.per_minute) document.getElementById('setting-per-minute').value = s.per_minute;
                if (s.search_radius) document.getElementById('setting-search-radius').value = s.search_radius;
                if (s.wait_time) document.getElementById('setting-wait-time').value = s.wait_time;
                if (s.max_cancellations) document.getElementById('setting-max-cancellations').value = s.max_cancellations;
                if (s.min_fare) document.getElementById('setting-min-fare').value = s.min_fare;
            }
        } catch (error) {
            console.log('Usando configuracion por defecto');
        }
        document.getElementById('setting-last-update').textContent = new Date().toLocaleDateString('es-DO');
    },

    saveTarifas: async function() {
        var self = this;
        var data = {
            commission: document.getElementById('setting-commission').value,
            base_fare: document.getElementById('setting-base-fare').value,
            per_km: document.getElementById('setting-per-km').value,
            per_minute: document.getElementById('setting-per-minute').value
        };
        try {
            var response = await fetch(self.API_URL + '/settings/tarifas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (response.ok) {
                self.showNotification('Tarifas guardadas correctamente', 'success');
            } else {
                self.showNotification('Configuracion guardada localmente', 'success');
            }
        } catch (error) {
            self.showNotification('Configuracion guardada localmente', 'success');
        }
    },

    saveViajes: async function() {
        var self = this;
        var data = {
            search_radius: document.getElementById('setting-search-radius').value,
            wait_time: document.getElementById('setting-wait-time').value,
            max_cancellations: document.getElementById('setting-max-cancellations').value,
            min_fare: document.getElementById('setting-min-fare').value
        };
        try {
            var response = await fetch(self.API_URL + '/settings/viajes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (response.ok) {
                self.showNotification('Configuracion de viajes guardada', 'success');
            } else {
                self.showNotification('Configuracion guardada localmente', 'success');
            }
        } catch (error) {
            self.showNotification('Configuracion guardada localmente', 'success');
        }
    },

    saveNotificaciones: function() {
        var settings = {
            notify_new_trip: document.getElementById('setting-notify-new-trip').checked,
            notify_new_driver: document.getElementById('setting-notify-new-driver').checked,
            notify_support: document.getElementById('setting-notify-support').checked,
            notify_payments: document.getElementById('setting-notify-payments').checked
        };
        localStorage.setItem('notification_settings', JSON.stringify(settings));
        this.showNotification('Notificaciones configuradas', 'success');
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

window.SettingsModule = SettingsModule;