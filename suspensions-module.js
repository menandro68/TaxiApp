// Módulo de Gestión de Suspensiones
const SuspensionsModule = {
    currentView: 'active',
    suspensions: [],
    statistics: {},

    // Inicializar el módulo
    init() {
        console.log('🚨 Inicializando módulo de suspensiones');
        this.loadStatistics();
        this.loadSuspensions('active');
        this.setupEventListeners();
    },

    // Cargar estadísticas
    async loadStatistics() {
        try {
            const response = await fetch(${window.location.origin}/api/suspensions/stats');
            const result = await response.json();
            if (result.success) {
                this.statistics = result.data;
                this.updateStatisticsDisplay();
            }
        } catch (error) {
            console.error('Error cargando estadísticas:', error);
        }
    },

    // Actualizar display de estadísticas
    updateStatisticsDisplay() {
        const container = document.getElementById('suspensions');
        if (!container) return;

        const statsHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
                <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ff8787 100%); padding: 20px; border-radius: 12px; color: white;">
                    <h3 style="margin: 0; font-size: 24px;">${this.statistics.active || 0}</h3>
                    <p style="margin: 5px 0 0 0; opacity: 0.9;">Suspensiones Activas</p>
                </div>
                <div style="background: linear-gradient(135deg, #ffd93d 0%, #ffed4e 100%); padding: 20px; border-radius: 12px; color: #333;">
                    <h3 style="margin: 0; font-size: 24px;">${this.statistics.temporal || 0}</h3>
                    <p style="margin: 5px 0 0 0;">Temporales</p>
                </div>
                <div style="background: linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%); padding: 20px; border-radius: 12px; color: white;">
                    <h3 style="margin: 0; font-size: 24px;">${this.statistics.permanent || 0}</h3>
                    <p style="margin: 5px 0 0 0; opacity: 0.9;">Permanentes</p>
                </div>
                <div style="background: linear-gradient(135deg, #00d2d3 0%, #01a3a4 100%); padding: 20px; border-radius: 12px; color: white;">
                    <h3 style="margin: 0; font-size: 24px;">${this.statistics.lifted || 0}</h3>
                    <p style="margin: 5px 0 0 0; opacity: 0.9;">Levantadas</p>
                </div>
            </div>
        `;

        const existingStats = container.querySelector('.suspension-stats');
        if (existingStats) {
            existingStats.innerHTML = statsHTML;
        } else {
            const statsDiv = document.createElement('div');
            statsDiv.className = 'suspension-stats';
            statsDiv.innerHTML = statsHTML;
            container.insertBefore(statsDiv, container.firstChild.nextSibling);
        }
    },

    // Cargar suspensiones
    async loadSuspensions(type = 'active') {
        try {
            const endpoint = type === 'active' ? 'active' : 'history';
            const response = await fetch(`http://localhost:3000/api/suspensions/${endpoint}`);
            const result = await response.json();
            
            if (result.success) {
                this.suspensions = result.data;
                this.renderSuspensions();
            }
        } catch (error) {
            console.error('Error cargando suspensiones:', error);
        }
    },

    // Renderizar interfaz principal
    render() {
        const container = document.getElementById('suspensions');
        if (!container) return;

        container.innerHTML = `
            <div class="suspensions-module">
                <div class="module-header" style="margin-bottom: 20px;">
                    <h2 style="margin: 0;">🚨 Gestión de Suspensiones</h2>
                    <button onclick="SuspensionsModule.showSuspendModal()" 
                            style="padding: 10px 20px; background: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        + Nueva Suspensión
                    </button>
                </div>

                <div class="suspension-stats"></div>

                <div class="tabs" style="display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px;">
                    <button onclick="SuspensionsModule.switchView('active')" 
                            class="tab-btn ${this.currentView === 'active' ? 'active' : ''}"
                            style="padding: 10px 20px; border: none; background: ${this.currentView === 'active' ? '#007bff' : 'transparent'}; 
                                   color: ${this.currentView === 'active' ? 'white' : '#333'}; border-radius: 5px; cursor: pointer;">
                        Suspensiones Activas
                    </button>
                    <button onclick="SuspensionsModule.switchView('history')" 
                            class="tab-btn ${this.currentView === 'history' ? 'active' : ''}"
                            style="padding: 10px 20px; border: none; background: ${this.currentView === 'history' ? '#007bff' : 'transparent'}; 
                                   color: ${this.currentView === 'history' ? 'white' : '#333'}; border-radius: 5px; cursor: pointer;">
                        Historial Completo
                    </button>
                </div>

                <div id="suspensionsList"></div>
            </div>
        `;

        this.loadStatistics();
        this.loadSuspensions(this.currentView);
    },

    // Cambiar vista
    switchView(view) {
        this.currentView = view;
        this.render();
    },

    // Renderizar lista de suspensiones
    renderSuspensions() {
        const container = document.getElementById('suspensionsList');
        if (!container) return;

        if (this.suspensions.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #999;">
                    <p>No hay suspensiones ${this.currentView === 'active' ? 'activas' : 'en el historial'}</p>
                </div>
            `;
            return;
        }

        let html = `
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f8f9fa;">
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Conductor</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Tipo</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Razón</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Duración</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Fecha</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Estado</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        this.suspensions.forEach(suspension => {
            const typeLabel = suspension.type === 'temporal' ? 
                '<span style="background: #ffc107; color: #000; padding: 4px 8px; border-radius: 4px;">Temporal</span>' : 
                '<span style="background: #dc3545; color: white; padding: 4px 8px; border-radius: 4px;">Permanente</span>';

            const statusLabel = this.getStatusLabel(suspension.status);
            const duration = suspension.type === 'temporal' ? `${suspension.duration_hours} horas` : 'Indefinida';
            const suspendedDate = new Date(suspension.suspended_at).toLocaleDateString('es-DO');

            html += `
                <tr style="border-bottom: 1px solid #dee2e6;">
                    <td style="padding: 12px;">
                        <div>
                            <strong>${suspension.driver_name}</strong><br>
                            <small style="color: #666;">${suspension.driver_email || 'N/A'}</small>
                        </div>
                    </td>
                    <td style="padding: 12px;">${typeLabel}</td>
                    <td style="padding: 12px;">${suspension.reason}</td>
                    <td style="padding: 12px;">${duration}</td>
                    <td style="padding: 12px;">${suspendedDate}</td>
                    <td style="padding: 12px;">${statusLabel}</td>
                    <td style="padding: 12px;">
                        ${suspension.status === 'active' ? `
                            <button onclick="SuspensionsModule.showLiftModal(${suspension.id})" 
                                    style="padding: 6px 12px; background: #28a745; color: white; border: none; 
                                           border-radius: 4px; cursor: pointer; font-size: 12px;">
                                Levantar
                            </button>
                        ` : ''}
                        <button onclick="SuspensionsModule.viewDetails(${suspension.id})" 
                                style="padding: 6px 12px; background: #17a2b8; color: white; border: none; 
                                       border-radius: 4px; cursor: pointer; font-size: 12px; margin-left: 5px;">
                            Detalles
                        </button>
                    </td>
                </tr>
            `;
        });

        html += '</tbody></table></div>';
        container.innerHTML = html;
    },

    // Obtener etiqueta de estado
    getStatusLabel(status) {
        const labels = {
            'active': '<span style="background: #dc3545; color: white; padding: 4px 8px; border-radius: 4px;">Activa</span>',
            'lifted': '<span style="background: #28a745; color: white; padding: 4px 8px; border-radius: 4px;">Levantada</span>',
            'expired': '<span style="background: #6c757d; color: white; padding: 4px 8px; border-radius: 4px;">Expirada</span>'
        };
        return labels[status] || labels.active;
    },

    // Mostrar modal para nueva suspensión
    showSuspendModal() {
        // Primero, obtener lista de conductores activos
        fetch(${window.location.origin}/api/drivers?status=active')
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    this.showSuspendModalWithDrivers(result.data);
                }
            })
            .catch(error => {
                console.error('Error obteniendo conductores:', error);
                alert('Error al cargar conductores');
            });
    },

    // Mostrar modal con lista de conductores
    showSuspendModalWithDrivers(drivers) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;';

        const driverOptions = drivers.map(d => 
            `<option value="${d.id}">${d.name} - ${d.vehicle_plate || 'Sin placa'}</option>`
        ).join('');

        modal.innerHTML = `
            <div style="background: white; padding: 30px; border-radius: 10px; width: 90%; max-width: 500px;">
                <h3 style="margin-top: 0;">🚨 Nueva Suspensión</h3>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px;">Conductor:</label>
                    <select id="suspendDriverId" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        <option value="">Seleccione un conductor...</option>
                        ${driverOptions}
                    </select>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px;">Tipo de Suspensión:</label>
                    <select id="suspendType" onchange="SuspensionsModule.toggleDurationField()" 
                            style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        <option value="temporal">Temporal</option>
                        <option value="permanent">Permanente</option>
                    </select>
                </div>

                <div id="durationField" style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px;">Duración (horas):</label>
                    <input type="number" id="suspendDuration" value="24" min="1" 
                           style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>

                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 5px;">Razón:</label>
                    <textarea id="suspendReason" rows="3" 
                              style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; resize: vertical;"
                              placeholder="Ingrese el motivo de la suspensión..."></textarea>
                </div>

                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button onclick="SuspensionsModule.closeModal()" 
                            style="padding: 10px 20px; border: 1px solid #ddd; background: white; border-radius: 5px; cursor: pointer;">
                        Cancelar
                    </button>
                    <button onclick="SuspensionsModule.createSuspension()" 
                            style="padding: 10px 20px; background: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        Aplicar Suspensión
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    },

    // Toggle campo de duración
    toggleDurationField() {
        const type = document.getElementById('suspendType').value;
        const durationField = document.getElementById('durationField');
        durationField.style.display = type === 'temporal' ? 'block' : 'none';
    },

    // Crear suspensión
    async createSuspension() {
        const driverId = document.getElementById('suspendDriverId').value;
        const type = document.getElementById('suspendType').value;
        const reason = document.getElementById('suspendReason').value;
        const durationHours = type === 'temporal' ? parseInt(document.getElementById('suspendDuration').value) : null;

        if (!driverId || !reason) {
            alert('Por favor complete todos los campos requeridos');
            return;
        }

        try {
            const response = await fetch(${window.location.origin}/api/suspensions/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    driverId,
                    type,
                    reason,
                    durationHours,
                    createdBy: 'admin'
                })
            });

            const result = await response.json();
            if (result.success) {
                this.showNotification('Suspensión aplicada exitosamente', 'success');
                this.closeModal();
                this.loadStatistics();
                this.loadSuspensions(this.currentView);
            } else {
                alert('Error: ' + result.error);
            }
        } catch (error) {
            console.error('Error creando suspensión:', error);
            alert('Error al crear la suspensión');
        }
    },

    // Mostrar modal para levantar suspensión
    showLiftModal(suspensionId) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;';

        modal.innerHTML = `
            <div style="background: white; padding: 30px; border-radius: 10px; width: 90%; max-width: 500px;">
                <h3 style="margin-top: 0;">✅ Levantar Suspensión</h3>
                
                <p>¿Está seguro de que desea levantar esta suspensión?</p>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 5px;">Motivo para levantar:</label>
                    <textarea id="liftReason" rows="3" 
                              style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; resize: vertical;"
                              placeholder="Ingrese el motivo para levantar la suspensión..."></textarea>
                </div>

                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button onclick="SuspensionsModule.closeModal()" 
                            style="padding: 10px 20px; border: 1px solid #ddd; background: white; border-radius: 5px; cursor: pointer;">
                        Cancelar
                    </button>
                    <button onclick="SuspensionsModule.liftSuspension(${suspensionId})" 
                            style="padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        Levantar Suspensión
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    },

    // Levantar suspensión
    async liftSuspension(suspensionId) {
        const liftReason = document.getElementById('liftReason').value;
        
        if (!liftReason) {
            alert('Por favor ingrese el motivo');
            return;
        }

        try {
            const response = await fetch(${window.location.origin}/api/suspensions/lift', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    suspensionId,
                    liftedBy: 'admin',
                    liftedReason: liftReason
                })
            });

            const result = await response.json();
            if (result.success) {
                this.showNotification('Suspensión levantada exitosamente', 'success');
                this.closeModal();
                this.loadStatistics();
                this.loadSuspensions(this.currentView);
            } else {
                alert('Error: ' + result.error);
            }
        } catch (error) {
            console.error('Error levantando suspensión:', error);
            alert('Error al levantar la suspensión');
        }
    },

    // Ver detalles
    viewDetails(suspensionId) {
        const suspension = this.suspensions.find(s => s.id === suspensionId);
        if (!suspension) return;

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;';

        const expiresInfo = suspension.expires_at ? 
            `<p><strong>Expira:</strong> ${new Date(suspension.expires_at).toLocaleString('es-DO')}</p>` : '';
        
        const liftedInfo = suspension.lifted_at ? `
            <div style="background: #d4edda; padding: 10px; border-radius: 5px; margin-top: 15px;">
                <p><strong>Levantada por:</strong> ${suspension.lifted_by}</p>
                <p><strong>Fecha:</strong> ${new Date(suspension.lifted_at).toLocaleString('es-DO')}</p>
                <p><strong>Motivo:</strong> ${suspension.lifted_reason}</p>
            </div>
        ` : '';

        modal.innerHTML = `
            <div style="background: white; padding: 30px; border-radius: 10px; width: 90%; max-width: 600px; max-height: 80vh; overflow-y: auto;">
                <h3 style="margin-top: 0;">📋 Detalles de Suspensión</h3>
                
                <div style="display: grid; gap: 10px;">
                    <p><strong>Conductor:</strong> ${suspension.driver_name}</p>
                    <p><strong>Email:</strong> ${suspension.driver_email || 'N/A'}</p>
                    <p><strong>Placa:</strong> ${suspension.vehicle_plate || 'N/A'}</p>
                    <p><strong>Tipo:</strong> ${suspension.type === 'temporal' ? 'Temporal' : 'Permanente'}</p>
                    <p><strong>Estado:</strong> ${suspension.status}</p>
                    <p><strong>Razón:</strong> ${suspension.reason}</p>
                    <p><strong>Creada por:</strong> ${suspension.created_by}</p>
                    <p><strong>Fecha:</strong> ${new Date(suspension.suspended_at).toLocaleString('es-DO')}</p>
                    ${suspension.type === 'temporal' ? `<p><strong>Duración:</strong> ${suspension.duration_hours} horas</p>` : ''}
                    ${expiresInfo}
                    ${liftedInfo}
                </div>

                <div style="margin-top: 20px; text-align: right;">
                    <button onclick="SuspensionsModule.closeModal()" 
                            style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        Cerrar
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    },

    // Cerrar modal
    closeModal() {
        const modal = document.querySelector('.modal-overlay');
        if (modal) {
            modal.remove();
        }
    },

    // Mostrar notificación
    showNotification(message, type = 'info') {
        if (typeof showNotification === 'function') {
            showNotification(message, type);
        } else {
            alert(message);
        }
    },

    // Configurar event listeners
    setupEventListeners() {
        // Verificar suspensiones expiradas cada 5 minutos
        setInterval(() => {
            fetch(${window.location.origin}/api/suspensions/check-expired', {
                method: 'POST'
            }).then(response => response.json())
              .then(result => {
                  if (result.success && result.message.includes('suspensiones expiradas')) {
                      this.loadStatistics();
                      if (this.currentView === 'active') {
                          this.loadSuspensions('active');
                      }
                  }
              })
              .catch(error => console.error('Error verificando expiradas:', error));
        }, 300000); // 5 minutos
    }
};

// Hacer disponible globalmente
window.SuspensionsModule = SuspensionsModule;