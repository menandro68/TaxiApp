// Modulo de Gestion de Suspensiones
var SuspensionsModule = {
    currentView: 'active',
    suspensions: [],
    statistics: {},

    init: function() {
        console.log('Inicializando modulo de suspensiones');
        this.loadStatistics();
        this.loadSuspensions('active');
        this.setupEventListeners();
    },

    loadStatistics: async function() {
        var self = this;
        try {
            var response = await fetch(window.location.origin + '/api/suspensions/stats');
            var result = await response.json();
            if (result.success) {
                self.statistics = result.data;
                self.updateStatisticsDisplay();
            }
        } catch (error) {
            console.error('Error cargando estadisticas:', error);
            self.statistics = { active: 0, temporal: 0, permanent: 0, lifted: 0 };
            self.updateStatisticsDisplay();
        }
    },

    updateStatisticsDisplay: function() {
        var container = document.getElementById('suspensions');
        if (!container) return;

        var statsHTML = '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">' +
            '<div style="background: linear-gradient(135deg, #ff6b6b 0%, #ff8787 100%); padding: 20px; border-radius: 12px; color: white;">' +
                '<h3 style="margin: 0; font-size: 24px;">' + (this.statistics.active || 0) + '</h3>' +
                '<p style="margin: 5px 0 0 0; opacity: 0.9;">Suspensiones Activas</p>' +
            '</div>' +
            '<div style="background: linear-gradient(135deg, #ffd93d 0%, #ffed4e 100%); padding: 20px; border-radius: 12px; color: #333;">' +
                '<h3 style="margin: 0; font-size: 24px;">' + (this.statistics.temporal || 0) + '</h3>' +
                '<p style="margin: 5px 0 0 0;">Temporales</p>' +
            '</div>' +
            '<div style="background: linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%); padding: 20px; border-radius: 12px; color: white;">' +
                '<h3 style="margin: 0; font-size: 24px;">' + (this.statistics.permanent || 0) + '</h3>' +
                '<p style="margin: 5px 0 0 0; opacity: 0.9;">Permanentes</p>' +
            '</div>' +
            '<div style="background: linear-gradient(135deg, #00d2d3 0%, #01a3a4 100%); padding: 20px; border-radius: 12px; color: white;">' +
                '<h3 style="margin: 0; font-size: 24px;">' + (this.statistics.lifted || 0) + '</h3>' +
                '<p style="margin: 5px 0 0 0; opacity: 0.9;">Levantadas</p>' +
            '</div>' +
        '</div>';

        var existingStats = container.querySelector('.suspension-stats');
        if (existingStats) {
            existingStats.innerHTML = statsHTML;
        } else {
            var statsDiv = document.createElement('div');
            statsDiv.className = 'suspension-stats';
            statsDiv.innerHTML = statsHTML;
            if (container.firstChild && container.firstChild.nextSibling) {
                container.insertBefore(statsDiv, container.firstChild.nextSibling);
            } else {
                container.appendChild(statsDiv);
            }
        }
    },

    loadSuspensions: async function(type) {
        var self = this;
        type = type || 'active';
        try {
            var endpoint = type === 'active' ? 'active' : 'history';
            var response = await fetch(window.location.origin + '/api/suspensions/' + endpoint);
            var result = await response.json();
            if (result.success) {
                self.suspensions = result.data;
                self.renderSuspensions();
            }
        } catch (error) {
            console.error('Error cargando suspensiones:', error);
            self.suspensions = [];
            self.renderSuspensions();
        }
    },

    render: function() {
        var container = document.getElementById('suspensions');
        if (!container) return;

        var activeClass = this.currentView === 'active' ? 'active' : '';
        var historyClass = this.currentView === 'history' ? 'active' : '';
        var activeBg = this.currentView === 'active' ? '#007bff' : 'transparent';
        var historyBg = this.currentView === 'history' ? '#007bff' : 'transparent';
        var activeColor = this.currentView === 'active' ? 'white' : '#333';
        var historyColor = this.currentView === 'history' ? 'white' : '#333';

        container.innerHTML = '<div class="suspensions-module">' +
            '<div class="module-header" style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">' +
                '<h2 style="margin: 0;">🚨 Gestion de Suspensiones</h2>' +
                '<button onclick="SuspensionsModule.showSuspendModal()" style="padding: 10px 20px; background: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer;">+ Nueva Suspension</button>' +
            '</div>' +
            '<div class="suspension-stats"></div>' +
            '<div class="tabs" style="display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px;">' +
                '<button onclick="SuspensionsModule.switchView(\'active\')" class="tab-btn ' + activeClass + '" style="padding: 10px 20px; border: none; background: ' + activeBg + '; color: ' + activeColor + '; border-radius: 5px; cursor: pointer;">Suspensiones Activas</button>' +
                '<button onclick="SuspensionsModule.switchView(\'history\')" class="tab-btn ' + historyClass + '" style="padding: 10px 20px; border: none; background: ' + historyBg + '; color: ' + historyColor + '; border-radius: 5px; cursor: pointer;">Historial Completo</button>' +
            '</div>' +
            '<div id="suspensionsList"></div>' +
        '</div>';

        this.loadStatistics();
        this.loadSuspensions(this.currentView);
    },

    switchView: function(view) {
        this.currentView = view;
        this.render();
    },

    renderSuspensions: function() {
        var container = document.getElementById('suspensionsList');
        if (!container) return;

        if (this.suspensions.length === 0) {
            var msg = this.currentView === 'active' ? 'activas' : 'en el historial';
            container.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;"><p>No hay suspensiones ' + msg + '</p></div>';
            return;
        }

        var html = '<div style="overflow-x: auto;"><table style="width: 100%; border-collapse: collapse;">' +
            '<thead><tr style="background: #f8f9fa;">' +
                '<th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Conductor</th>' +
                '<th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Tipo</th>' +
                '<th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Razon</th>' +
                '<th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Duracion</th>' +
                '<th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Fecha</th>' +
                '<th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Estado</th>' +
                '<th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Acciones</th>' +
            '</tr></thead><tbody>';

        for (var i = 0; i < this.suspensions.length; i++) {
            var suspension = this.suspensions[i];
            var typeLabel = suspension.type === 'temporal' ?
                '<span style="background: #ffc107; color: #000; padding: 4px 8px; border-radius: 4px;">Temporal</span>' :
                '<span style="background: #dc3545; color: white; padding: 4px 8px; border-radius: 4px;">Permanente</span>';
            var statusLabel = this.getStatusLabel(suspension.status);
            var duration = suspension.type === 'temporal' ? suspension.duration_hours + ' horas' : 'Indefinida';
            var suspendedDate = new Date(suspension.suspended_at).toLocaleDateString('es-DO');
            var actions = '';
            if (suspension.status === 'active') {
                actions = '<button onclick="SuspensionsModule.showLiftModal(' + suspension.id + ')" style="padding: 6px 12px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">Levantar</button>';
            }
            actions += '<button onclick="SuspensionsModule.viewDetails(' + suspension.id + ')" style="padding: 6px 12px; background: #17a2b8; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; margin-left: 5px;">Detalles</button>';

            html += '<tr style="border-bottom: 1px solid #dee2e6;">' +
                '<td style="padding: 12px;"><div><strong>' + suspension.driver_name + '</strong><br><small style="color: #666;">' + (suspension.driver_email || 'N/A') + '</small></div></td>' +
                '<td style="padding: 12px;">' + typeLabel + '</td>' +
                '<td style="padding: 12px;">' + suspension.reason + '</td>' +
                '<td style="padding: 12px;">' + duration + '</td>' +
                '<td style="padding: 12px;">' + suspendedDate + '</td>' +
                '<td style="padding: 12px;">' + statusLabel + '</td>' +
                '<td style="padding: 12px;">' + actions + '</td>' +
            '</tr>';
        }

        html += '</tbody></table></div>';
        container.innerHTML = html;
    },

    getStatusLabel: function(status) {
        var labels = {
            'active': '<span style="background: #dc3545; color: white; padding: 4px 8px; border-radius: 4px;">Activa</span>',
            'lifted': '<span style="background: #28a745; color: white; padding: 4px 8px; border-radius: 4px;">Levantada</span>',
            'expired': '<span style="background: #6c757d; color: white; padding: 4px 8px; border-radius: 4px;">Expirada</span>'
        };
        return labels[status] || labels.active;
    },

    showSuspendModal: function() {
        var self = this;
        fetch(window.location.origin + '/api/drivers?status=active')
            .then(function(response) { return response.json(); })
            .then(function(result) {
                if (result.success) {
                    self.showSuspendModalWithDrivers(result.data);
                }
            })
            .catch(function(error) {
                console.error('Error obteniendo conductores:', error);
                alert('Error al cargar conductores');
            });
    },

    showSuspendModalWithDrivers: function(drivers) {
        var modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;';

        var driverOptions = '<option value="">Seleccione un conductor...</option>';
        for (var i = 0; i < drivers.length; i++) {
            var d = drivers[i];
            driverOptions += '<option value="' + d.id + '">' + d.name + ' - ' + (d.vehicle_plate || 'Sin placa') + '</option>';
        }

        modal.innerHTML = '<div style="background: white; padding: 30px; border-radius: 10px; width: 90%; max-width: 500px;">' +
            '<h3 style="margin-top: 0;">🚨 Nueva Suspension</h3>' +
            '<div style="margin-bottom: 15px;"><label style="display: block; margin-bottom: 5px;">Conductor:</label>' +
                '<select id="suspendDriverId" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">' + driverOptions + '</select></div>' +
            '<div style="margin-bottom: 15px;"><label style="display: block; margin-bottom: 5px;">Tipo de Suspension:</label>' +
                '<select id="suspendType" onchange="SuspensionsModule.toggleDurationField()" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">' +
                    '<option value="temporal">Temporal</option><option value="permanent">Permanente</option></select></div>' +
            '<div id="durationField" style="margin-bottom: 15px;"><label style="display: block; margin-bottom: 5px;">Duracion (horas):</label>' +
                '<input type="number" id="suspendDuration" value="24" min="1" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;"></div>' +
            '<div style="margin-bottom: 20px;"><label style="display: block; margin-bottom: 5px;">Razon:</label>' +
                '<textarea id="suspendReason" rows="3" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; resize: vertical;" placeholder="Ingrese el motivo de la suspension..."></textarea></div>' +
            '<div style="display: flex; gap: 10px; justify-content: flex-end;">' +
                '<button onclick="SuspensionsModule.closeModal()" style="padding: 10px 20px; border: 1px solid #ddd; background: white; border-radius: 5px; cursor: pointer;">Cancelar</button>' +
                '<button onclick="SuspensionsModule.createSuspension()" style="padding: 10px 20px; background: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer;">Aplicar Suspension</button>' +
            '</div></div>';

        document.body.appendChild(modal);
    },

    toggleDurationField: function() {
        var type = document.getElementById('suspendType').value;
        var durationField = document.getElementById('durationField');
        durationField.style.display = type === 'temporal' ? 'block' : 'none';
    },

    createSuspension: async function() {
        var driverId = document.getElementById('suspendDriverId').value;
        var type = document.getElementById('suspendType').value;
        var reason = document.getElementById('suspendReason').value;
        var durationHours = type === 'temporal' ? parseInt(document.getElementById('suspendDuration').value) : null;

        if (!driverId || !reason) {
            alert('Por favor complete todos los campos requeridos');
            return;
        }

        var self = this;
        try {
            var response = await fetch(window.location.origin + '/api/suspensions/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    driverId: driverId,
                    type: type,
                    reason: reason,
                    durationHours: durationHours,
                    createdBy: 'admin'
                })
            });

            var result = await response.json();
            if (result.success) {
                self.showNotification('Suspension aplicada exitosamente', 'success');
                self.closeModal();
                self.loadStatistics();
                self.loadSuspensions(self.currentView);
            } else {
                alert('Error: ' + result.error);
            }
        } catch (error) {
            console.error('Error creando suspension:', error);
            alert('Error al crear la suspension');
        }
    },

    showLiftModal: function(suspensionId) {
        var modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;';

        modal.innerHTML = '<div style="background: white; padding: 30px; border-radius: 10px; width: 90%; max-width: 500px;">' +
            '<h3 style="margin-top: 0;">✅ Levantar Suspension</h3>' +
            '<p>Esta seguro de que desea levantar esta suspension?</p>' +
            '<div style="margin-bottom: 20px;"><label style="display: block; margin-bottom: 5px;">Motivo para levantar:</label>' +
                '<textarea id="liftReason" rows="3" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; resize: vertical;" placeholder="Ingrese el motivo para levantar la suspension..."></textarea></div>' +
            '<div style="display: flex; gap: 10px; justify-content: flex-end;">' +
                '<button onclick="SuspensionsModule.closeModal()" style="padding: 10px 20px; border: 1px solid #ddd; background: white; border-radius: 5px; cursor: pointer;">Cancelar</button>' +
                '<button onclick="SuspensionsModule.liftSuspension(' + suspensionId + ')" style="padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer;">Levantar Suspension</button>' +
            '</div></div>';

        document.body.appendChild(modal);
    },

    liftSuspension: async function(suspensionId) {
        var liftReason = document.getElementById('liftReason').value;
        if (!liftReason) {
            alert('Por favor ingrese el motivo');
            return;
        }

        var self = this;
        try {
            var response = await fetch(window.location.origin + '/api/suspensions/lift', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    suspensionId: suspensionId,
                    liftedBy: 'admin',
                    liftedReason: liftReason
                })
            });

            var result = await response.json();
            if (result.success) {
                self.showNotification('Suspension levantada exitosamente', 'success');
                self.closeModal();
                self.loadStatistics();
                self.loadSuspensions(self.currentView);
            } else {
                alert('Error: ' + result.error);
            }
        } catch (error) {
            console.error('Error levantando suspension:', error);
            alert('Error al levantar la suspension');
        }
    },

    viewDetails: function(suspensionId) {
        var suspension = null;
        for (var i = 0; i < this.suspensions.length; i++) {
            if (this.suspensions[i].id === suspensionId) {
                suspension = this.suspensions[i];
                break;
            }
        }
        if (!suspension) return;

        var modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;';

        var expiresInfo = suspension.expires_at ? '<p><strong>Expira:</strong> ' + new Date(suspension.expires_at).toLocaleString('es-DO') + '</p>' : '';
        var durationInfo = suspension.type === 'temporal' ? '<p><strong>Duracion:</strong> ' + suspension.duration_hours + ' horas</p>' : '';
        var liftedInfo = '';
        if (suspension.lifted_at) {
            liftedInfo = '<div style="background: #d4edda; padding: 10px; border-radius: 5px; margin-top: 15px;">' +
                '<p><strong>Levantada por:</strong> ' + suspension.lifted_by + '</p>' +
                '<p><strong>Fecha:</strong> ' + new Date(suspension.lifted_at).toLocaleString('es-DO') + '</p>' +
                '<p><strong>Motivo:</strong> ' + suspension.lifted_reason + '</p></div>';
        }

        modal.innerHTML = '<div style="background: white; padding: 30px; border-radius: 10px; width: 90%; max-width: 600px; max-height: 80vh; overflow-y: auto;">' +
            '<h3 style="margin-top: 0;">📋 Detalles de Suspension</h3>' +
            '<div style="display: grid; gap: 10px;">' +
                '<p><strong>Conductor:</strong> ' + suspension.driver_name + '</p>' +
                '<p><strong>Email:</strong> ' + (suspension.driver_email || 'N/A') + '</p>' +
                '<p><strong>Placa:</strong> ' + (suspension.vehicle_plate || 'N/A') + '</p>' +
                '<p><strong>Tipo:</strong> ' + (suspension.type === 'temporal' ? 'Temporal' : 'Permanente') + '</p>' +
                '<p><strong>Estado:</strong> ' + suspension.status + '</p>' +
                '<p><strong>Razon:</strong> ' + suspension.reason + '</p>' +
                '<p><strong>Creada por:</strong> ' + suspension.created_by + '</p>' +
                '<p><strong>Fecha:</strong> ' + new Date(suspension.suspended_at).toLocaleString('es-DO') + '</p>' +
                durationInfo + expiresInfo + liftedInfo +
            '</div>' +
            '<div style="margin-top: 20px; text-align: right;">' +
                '<button onclick="SuspensionsModule.closeModal()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">Cerrar</button>' +
            '</div></div>';

        document.body.appendChild(modal);
    },

    closeModal: function() {
        var modal = document.querySelector('.modal-overlay');
        if (modal) { modal.remove(); }
    },

    showNotification: function(message, type) {
        if (typeof showNotification === 'function') {
            showNotification(message, type);
        } else {
            alert(message);
        }
    },

    setupEventListeners: function() {
        var self = this;
        setInterval(function() {
            fetch(window.location.origin + '/api/suspensions/check-expired', { method: 'POST' })
                .then(function(response) { return response.json(); })
                .then(function(result) {
                    if (result.success && result.message && result.message.includes('suspensiones expiradas')) {
                        self.loadStatistics();
                        if (self.currentView === 'active') {
                            self.loadSuspensions('active');
                        }
                    }
                })
                .catch(function(error) { console.error('Error verificando expiradas:', error); });
        }, 300000);
    }
};

window.SuspensionsModule = SuspensionsModule;