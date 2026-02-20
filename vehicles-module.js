// ========================================
// MÓDULO DE GESTIÓN DE VEHÍCULOS
// ========================================

const VehiclesModule = {
    vehicles: [],
    drivers: [],
    filters: {
        status: 'all',
        type: 'all',
        search: ''
    },

    getHTML() {
        return `
        <div class="vehicles-container" style="padding: 20px;">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; flex-wrap: wrap; gap: 15px;">
                <div>
                    <h2 style="margin: 0; color: #1e293b; font-size: 24px;">🚗 Gestión de Vehículos</h2>
                    <p style="margin: 5px 0 0; color: #64748b;">Administra la flota de vehículos</p>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button onclick="VehiclesModule.exportVehicles()" 
                        style="padding: 10px 20px; background: #10b981; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500;">
                        📥 Exportar
                    </button>
                    <button onclick="VehiclesModule.showAddModal()" 
                        style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500;">
                        + Agregar Vehículo
                    </button>
                </div>
            </div>

            <!-- KPIs -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; margin-bottom: 25px;">
                <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); border-radius: 12px; padding: 20px; color: white;">
                    <div style="font-size: 13px; opacity: 0.9;">Total Vehículos</div>
                    <div id="kpiTotalVehicles" style="font-size: 28px; font-weight: bold; margin-top: 5px;">0</div>
                </div>
                <div style="background: linear-gradient(135deg, #10b981, #059669); border-radius: 12px; padding: 20px; color: white;">
                    <div style="font-size: 13px; opacity: 0.9;">Activos</div>
                    <div id="kpiActiveVehicles" style="font-size: 28px; font-weight: bold; margin-top: 5px;">0</div>
                </div>
                <div style="background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 12px; padding: 20px; color: white;">
                    <div style="font-size: 13px; opacity: 0.9;">En Mantenimiento</div>
                    <div id="kpiMaintenanceVehicles" style="font-size: 28px; font-weight: bold; margin-top: 5px;">0</div>
                </div>
                <div style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); border-radius: 12px; padding: 20px; color: white;">
                    <div style="font-size: 13px; opacity: 0.9;">Sin Asignar</div>
                    <div id="kpiUnassignedVehicles" style="font-size: 28px; font-weight: bold; margin-top: 5px;">0</div>
                </div>
            </div>

            <!-- Filtros -->
            <div style="background: white; border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                <div style="display: flex; gap: 15px; flex-wrap: wrap; align-items: center;">
                    <div style="flex: 1; min-width: 200px;">
                        <input type="text" id="vehicleSearch" placeholder="🔍 Buscar por placa, marca, modelo..." 
                            onkeyup="VehiclesModule.applyFilters()"
                            style="width: 100%; padding: 10px 15px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px;">
                    </div>
                    <select id="vehicleStatusFilter" onchange="VehiclesModule.applyFilters()"
                        style="padding: 10px 15px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; cursor: pointer;">
                        <option value="all">Todos los estados</option>
                        <option value="active">Activos</option>
                        <option value="maintenance">En Mantenimiento</option>
                        <option value="inactive">Inactivos</option>
                    </select>
                    <select id="vehicleTypeFilter" onchange="VehiclesModule.applyFilters()"
                        style="padding: 10px 15px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; cursor: pointer;">
                        <option value="all">Todos los tipos</option>
                        <option value="sedan">Sedán</option>
                        <option value="suv">SUV</option>
                        <option value="van">Van</option>
                        <option value="luxury">Lujo</option>
                    </select>
                </div>
            </div>

            <!-- Tabla de Vehículos -->
            <div style="background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); overflow: hidden;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f8fafc;">
                            <th style="padding: 15px; text-align: left; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0;">Vehículo</th>
                            <th style="padding: 15px; text-align: left; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0;">Placa</th>
                            <th style="padding: 15px; text-align: left; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0;">Conductor</th>
                            <th style="padding: 15px; text-align: left; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0;">Tipo</th>
                            <th style="padding: 15px; text-align: center; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0;">Estado</th>
                            <th style="padding: 15px; text-align: center; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0;">Documentos</th>
                            <th style="padding: 15px; text-align: center; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="vehiclesTableBody">
                        <tr>
                            <td colspan="7" style="padding: 40px; text-align: center; color: #64748b;">
                                <div class="spinner" style="margin: 0 auto 10px;"></div>
                                Cargando vehículos...
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Modal Agregar/Editar Vehículo -->
        <div id="vehicleModal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; align-items: center; justify-content: center;">
            <div style="background: white; border-radius: 16px; width: 90%; max-width: 600px; max-height: 90vh; overflow-y: auto;">
                <div style="padding: 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                    <h3 id="vehicleModalTitle" style="margin: 0; color: #1e293b;">Agregar Vehículo</h3>
                    <button onclick="VehiclesModule.closeModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #64748b;">&times;</button>
                </div>
                <div style="padding: 20px;">
                    <input type="hidden" id="vehicleId">
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div>
                            <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #475569;">Marca *</label>
                            <input type="text" id="vehicleBrand" placeholder="Ej: Toyota" 
                                style="width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #475569;">Modelo *</label>
                            <input type="text" id="vehicleModel" placeholder="Ej: Corolla" 
                                style="width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px;">
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
                        <div>
                            <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #475569;">Año *</label>
                            <input type="number" id="vehicleYear" placeholder="Ej: 2022" min="2000" max="2030"
                                style="width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #475569;">Placa *</label>
                            <input type="text" id="vehiclePlate" placeholder="Ej: A123456" 
                                style="width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; text-transform: uppercase;">
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
                        <div>
                            <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #475569;">Color</label>
                            <input type="text" id="vehicleColor" placeholder="Ej: Blanco" 
                                style="width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #475569;">Tipo *</label>
                            <select id="vehicleType" style="width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px;">
                                <option value="sedan">Sedán</option>
                                <option value="suv">SUV</option>
                                <option value="van">Van</option>
                                <option value="luxury">Lujo</option>
                            </select>
                        </div>
                    </div>

                    <div style="margin-top: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #475569;">Conductor Asignado</label>
                        <select id="vehicleDriver" style="width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px;">
                            <option value="">Sin asignar</option>
                        </select>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
                        <div>
                            <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #475569;">Estado</label>
                            <select id="vehicleStatus" style="width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px;">
                                <option value="active">Activo</option>
                                <option value="maintenance">En Mantenimiento</option>
                                <option value="inactive">Inactivo</option>
                            </select>
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #475569;">Capacidad (pasajeros)</label>
                            <input type="number" id="vehicleCapacity" value="4" min="1" max="15"
                                style="width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px;">
                        </div>
                    </div>

                    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                        <h4 style="margin: 0 0 15px; color: #1e293b;">📄 Documentos del Vehículo</h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #475569;">Vence Seguro</label>
                                <input type="date" id="vehicleInsuranceExpiry" 
                                    style="width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px;">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #475569;">Vence Inspección</label>
                                <input type="date" id="vehicleInspectionExpiry" 
                                    style="width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px;">
                            </div>
                        </div>
                    </div>

                    <div style="margin-top: 25px; display: flex; gap: 10px; justify-content: flex-end;">
                        <button onclick="VehiclesModule.closeModal()" 
                            style="padding: 12px 25px; background: #f1f5f9; color: #475569; border: none; border-radius: 8px; cursor: pointer; font-weight: 500;">
                            Cancelar
                        </button>
                        <button onclick="VehiclesModule.saveVehicle()" 
                            style="padding: 12px 25px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500;">
                            💾 Guardar
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal Detalles del Vehículo -->
        <div id="vehicleDetailsModal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; align-items: center; justify-content: center;">
            <div style="background: white; border-radius: 16px; width: 90%; max-width: 700px; max-height: 90vh; overflow-y: auto;">
                <div style="padding: 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0; color: #1e293b;">📋 Detalles del Vehículo</h3>
                    <button onclick="VehiclesModule.closeDetailsModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #64748b;">&times;</button>
                </div>
                <div id="vehicleDetailsContent" style="padding: 20px;">
                </div>
            </div>
        </div>
        `;
    },

    async init() {
        console.log('🚗 Inicializando módulo de Vehículos...');
        await this.loadData();
        console.log('✅ Módulo de Vehículos iniciado correctamente');
    },

    async loadData() {
        try {
            const [vehiclesRes, driversRes] = await Promise.all([
                fetch(`${window.location.origin}/api/vehicles`).catch(() => null),
                fetch(`${window.location.origin}/api/drivers`).catch(() => null)
            ]);

            this.vehicles = vehiclesRes?.ok ? await vehiclesRes.json() : [];
            this.drivers = driversRes?.ok ? await driversRes.json() : [];

            if (!Array.isArray(this.vehicles) || this.vehicles.length === 0) {
                this.loadMockData();
            }

            this.updateKPIs();
            this.renderTable();
            this.populateDriverSelect();
        } catch (error) {
            console.error('Error cargando vehículos:', error);
            this.loadMockData();
        }
    },

    loadMockData() {
        this.vehicles = [
            { id: 1, brand: 'Toyota', model: 'Corolla', year: 2022, plate: 'A123456', color: 'Blanco', type: 'sedan', status: 'active', driver_id: 1, driver_name: 'Carlos Rodríguez', capacity: 4, insurance_expiry: '2025-06-15', inspection_expiry: '2025-03-20' },
            { id: 2, brand: 'Honda', model: 'CR-V', year: 2021, plate: 'B789012', color: 'Negro', type: 'suv', status: 'active', driver_id: 2, driver_name: 'María García', capacity: 5, insurance_expiry: '2025-08-10', inspection_expiry: '2025-05-15' },
            { id: 3, brand: 'Hyundai', model: 'Tucson', year: 2023, plate: 'C345678', color: 'Gris', type: 'suv', status: 'maintenance', driver_id: null, driver_name: null, capacity: 5, insurance_expiry: '2025-12-01', inspection_expiry: '2025-09-30' },
            { id: 4, brand: 'Toyota', model: 'Hiace', year: 2020, plate: 'D901234', color: 'Blanco', type: 'van', status: 'active', driver_id: 3, driver_name: 'Juan Pérez', capacity: 12, insurance_expiry: '2025-04-20', inspection_expiry: '2025-02-28' },
            { id: 5, brand: 'Mercedes', model: 'Clase E', year: 2023, plate: 'E567890', color: 'Negro', type: 'luxury', status: 'inactive', driver_id: null, driver_name: null, capacity: 4, insurance_expiry: '2025-11-15', inspection_expiry: '2025-07-10' },
        ];

        this.drivers = [
            { id: 1, name: 'Carlos Rodríguez', status: 'active' },
            { id: 2, name: 'María García', status: 'active' },
            { id: 3, name: 'Juan Pérez', status: 'active' },
            { id: 4, name: 'Ana Martínez', status: 'active' },
            { id: 5, name: 'Pedro López', status: 'inactive' },
        ];

        this.updateKPIs();
        this.renderTable();
        this.populateDriverSelect();
    },

    updateKPIs() {
        const total = this.vehicles.length;
        const active = this.vehicles.filter(v => v.status === 'active').length;
        const maintenance = this.vehicles.filter(v => v.status === 'maintenance').length;
        const unassigned = this.vehicles.filter(v => !v.driver_id).length;

        document.getElementById('kpiTotalVehicles').textContent = total;
        document.getElementById('kpiActiveVehicles').textContent = active;
        document.getElementById('kpiMaintenanceVehicles').textContent = maintenance;
        document.getElementById('kpiUnassignedVehicles').textContent = unassigned;
    },

    renderTable() {
        const tbody = document.getElementById('vehiclesTableBody');
        if (!tbody) return;

        let filtered = [...this.vehicles];

        // Aplicar filtros
        const search = document.getElementById('vehicleSearch')?.value?.toLowerCase() || '';
        const statusFilter = document.getElementById('vehicleStatusFilter')?.value || 'all';
        const typeFilter = document.getElementById('vehicleTypeFilter')?.value || 'all';

        if (search) {
            filtered = filtered.filter(v => 
                v.plate?.toLowerCase().includes(search) ||
                v.brand?.toLowerCase().includes(search) ||
                v.model?.toLowerCase().includes(search) ||
                v.driver_name?.toLowerCase().includes(search)
            );
        }

        if (statusFilter !== 'all') {
            filtered = filtered.filter(v => v.status === statusFilter);
        }

        if (typeFilter !== 'all') {
            filtered = filtered.filter(v => v.type === typeFilter);
        }

        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="padding: 40px; text-align: center; color: #64748b;">
                        No se encontraron vehículos
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filtered.map(v => `
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 15px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 45px; height: 45px; background: ${this.getTypeColor(v.type)}; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px;">
                            ${this.getTypeIcon(v.type)}
                        </div>
                        <div>
                            <div style="font-weight: 600; color: #1e293b;">${v.brand} ${v.model}</div>
                            <div style="font-size: 12px; color: #64748b;">${v.year} • ${v.color || 'N/A'}</div>
                        </div>
                    </div>
                </td>
                <td style="padding: 15px; font-weight: 600; color: #1e293b;">${v.plate}</td>
                <td style="padding: 15px;">
                    ${v.driver_name ? `
                        <div style="font-weight: 500; color: #1e293b;">${v.driver_name}</div>
                    ` : `
                        <span style="color: #94a3b8; font-style: italic;">Sin asignar</span>
                    `}
                </td>
                <td style="padding: 15px;">
                    <span style="background: ${this.getTypeColor(v.type)}20; color: ${this.getTypeColor(v.type)}; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 500;">
                        ${this.getTypeName(v.type)}
                    </span>
                </td>
                <td style="padding: 15px; text-align: center;">
                    <span style="background: ${this.getStatusColor(v.status)}; color: white; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 500;">
                        ${this.getStatusName(v.status)}
                    </span>
                </td>
                <td style="padding: 15px; text-align: center;">
                    ${this.getDocumentStatus(v)}
                </td>
                <td style="padding: 15px; text-align: center;">
                    <div style="display: flex; gap: 8px; justify-content: center;">
                        <button onclick="VehiclesModule.viewDetails(${v.id})" title="Ver detalles"
                            style="width: 35px; height: 35px; border: none; border-radius: 8px; background: #e0f2fe; color: #0284c7; cursor: pointer; font-size: 16px;">
                            👁️
                        </button>
                        <button onclick="VehiclesModule.editVehicle(${v.id})" title="Editar"
                            style="width: 35px; height: 35px; border: none; border-radius: 8px; background: #fef3c7; color: #d97706; cursor: pointer; font-size: 16px;">
                            ✏️
                        </button>
                        <button onclick="VehiclesModule.deleteVehicle(${v.id})" title="Eliminar"
                            style="width: 35px; height: 35px; border: none; border-radius: 8px; background: #fee2e2; color: #dc2626; cursor: pointer; font-size: 16px;">
                            🗑️
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    },

    getTypeIcon(type) {
        const icons = { sedan: '🚗', suv: '🚙', van: '🚐', luxury: '🏎️' };
        return icons[type] || '🚗';
    },

    getTypeName(type) {
        const names = { sedan: 'Sedán', suv: 'SUV', van: 'Van', luxury: 'Lujo' };
        return names[type] || type;
    },

    getTypeColor(type) {
        const colors = { sedan: '#3b82f6', suv: '#10b981', van: '#f59e0b', luxury: '#8b5cf6' };
        return colors[type] || '#64748b';
    },

    getStatusColor(status) {
        const colors = { active: '#10b981', maintenance: '#f59e0b', inactive: '#ef4444' };
        return colors[status] || '#64748b';
    },

    getStatusName(status) {
        const names = { active: 'Activo', maintenance: 'Mantenimiento', inactive: 'Inactivo' };
        return names[status] || status;
    },

    getDocumentStatus(vehicle) {
        const today = new Date();
        const insurance = vehicle.insurance_expiry ? new Date(vehicle.insurance_expiry) : null;
        const inspection = vehicle.inspection_expiry ? new Date(vehicle.inspection_expiry) : null;

        const insuranceOk = insurance && insurance > today;
        const inspectionOk = inspection && inspection > today;

        if (insuranceOk && inspectionOk) {
            return '<span style="color: #10b981; font-size: 18px;" title="Documentos al día">✅</span>';
        } else if (!insuranceOk && !inspectionOk) {
            return '<span style="color: #ef4444; font-size: 18px;" title="Documentos vencidos">❌</span>';
        } else {
            return '<span style="color: #f59e0b; font-size: 18px;" title="Algunos documentos por vencer">⚠️</span>';
        }
    },

    populateDriverSelect() {
        const select = document.getElementById('vehicleDriver');
        if (!select) return;

        const availableDrivers = this.drivers.filter(d => d.status === 'active');
        select.innerHTML = '<option value="">Sin asignar</option>' +
            availableDrivers.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
    },

    applyFilters() {
        this.renderTable();
    },

    showAddModal() {
        document.getElementById('vehicleModalTitle').textContent = 'Agregar Vehículo';
        document.getElementById('vehicleId').value = '';
        document.getElementById('vehicleBrand').value = '';
        document.getElementById('vehicleModel').value = '';
        document.getElementById('vehicleYear').value = new Date().getFullYear();
        document.getElementById('vehiclePlate').value = '';
        document.getElementById('vehicleColor').value = '';
        document.getElementById('vehicleType').value = 'sedan';
        document.getElementById('vehicleDriver').value = '';
        document.getElementById('vehicleStatus').value = 'active';
        document.getElementById('vehicleCapacity').value = '4';
        document.getElementById('vehicleInsuranceExpiry').value = '';
        document.getElementById('vehicleInspectionExpiry').value = '';
        
        document.getElementById('vehicleModal').style.display = 'flex';
    },

    editVehicle(id) {
        const vehicle = this.vehicles.find(v => v.id === id);
        if (!vehicle) return;

        document.getElementById('vehicleModalTitle').textContent = 'Editar Vehículo';
        document.getElementById('vehicleId').value = vehicle.id;
        document.getElementById('vehicleBrand').value = vehicle.brand || '';
        document.getElementById('vehicleModel').value = vehicle.model || '';
        document.getElementById('vehicleYear').value = vehicle.year || '';
        document.getElementById('vehiclePlate').value = vehicle.plate || '';
        document.getElementById('vehicleColor').value = vehicle.color || '';
        document.getElementById('vehicleType').value = vehicle.type || 'sedan';
        document.getElementById('vehicleDriver').value = vehicle.driver_id || '';
        document.getElementById('vehicleStatus').value = vehicle.status || 'active';
        document.getElementById('vehicleCapacity').value = vehicle.capacity || '4';
        document.getElementById('vehicleInsuranceExpiry').value = vehicle.insurance_expiry || '';
        document.getElementById('vehicleInspectionExpiry').value = vehicle.inspection_expiry || '';

        document.getElementById('vehicleModal').style.display = 'flex';
    },

    closeModal() {
        document.getElementById('vehicleModal').style.display = 'none';
    },

    async saveVehicle() {
        const id = document.getElementById('vehicleId').value;
        const brand = document.getElementById('vehicleBrand').value.trim();
        const model = document.getElementById('vehicleModel').value.trim();
        const year = document.getElementById('vehicleYear').value;
        const plate = document.getElementById('vehiclePlate').value.trim().toUpperCase();
        const color = document.getElementById('vehicleColor').value.trim();
        const type = document.getElementById('vehicleType').value;
        const driverId = document.getElementById('vehicleDriver').value;
        const status = document.getElementById('vehicleStatus').value;
        const capacity = document.getElementById('vehicleCapacity').value;
        const insuranceExpiry = document.getElementById('vehicleInsuranceExpiry').value;
        const inspectionExpiry = document.getElementById('vehicleInspectionExpiry').value;

        if (!brand || !model || !year || !plate) {
            alert('Por favor complete los campos obligatorios: Marca, Modelo, Año y Placa');
            return;
        }

        const vehicleData = {
            brand, model, year: parseInt(year), plate, color, type,
            driver_id: driverId || null,
            driver_name: driverId ? this.drivers.find(d => d.id == driverId)?.name : null,
            status, capacity: parseInt(capacity),
            insurance_expiry: insuranceExpiry || null,
            inspection_expiry: inspectionExpiry || null
        };

        try {
            if (id) {
                // Editar
                const index = this.vehicles.findIndex(v => v.id == id);
                if (index !== -1) {
                    this.vehicles[index] = { ...this.vehicles[index], ...vehicleData };
                }
                alert('✅ Vehículo actualizado correctamente');
            } else {
                // Agregar
                vehicleData.id = Date.now();
                this.vehicles.push(vehicleData);
                alert('✅ Vehículo agregado correctamente');
            }

            this.closeModal();
            this.updateKPIs();
            this.renderTable();
        } catch (error) {
            console.error('Error guardando vehículo:', error);
            alert('Error al guardar el vehículo');
        }
    },

    viewDetails(id) {
        const vehicle = this.vehicles.find(v => v.id === id);
        if (!vehicle) return;

        const today = new Date();
        const insuranceDate = vehicle.insurance_expiry ? new Date(vehicle.insurance_expiry) : null;
        const inspectionDate = vehicle.inspection_expiry ? new Date(vehicle.inspection_expiry) : null;

        document.getElementById('vehicleDetailsContent').innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div>
                    <h4 style="color: #64748b; font-size: 12px; margin-bottom: 5px;">VEHÍCULO</h4>
                    <p style="font-size: 20px; font-weight: 600; color: #1e293b; margin: 0;">${vehicle.brand} ${vehicle.model} ${vehicle.year}</p>
                </div>
                <div>
                    <h4 style="color: #64748b; font-size: 12px; margin-bottom: 5px;">PLACA</h4>
                    <p style="font-size: 20px; font-weight: 600; color: #1e293b; margin: 0;">${vehicle.plate}</p>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-top: 20px; padding: 20px; background: #f8fafc; border-radius: 12px;">
                <div style="text-align: center;">
                    <div style="font-size: 28px;">${this.getTypeIcon(vehicle.type)}</div>
                    <div style="font-size: 12px; color: #64748b;">Tipo</div>
                    <div style="font-weight: 600;">${this.getTypeName(vehicle.type)}</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 28px;">🎨</div>
                    <div style="font-size: 12px; color: #64748b;">Color</div>
                    <div style="font-weight: 600;">${vehicle.color || 'N/A'}</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 28px;">👥</div>
                    <div style="font-size: 12px; color: #64748b;">Capacidad</div>
                    <div style="font-weight: 600;">${vehicle.capacity} pasajeros</div>
                </div>
            </div>

            <div style="margin-top: 20px;">
                <h4 style="color: #1e293b; margin-bottom: 15px;">👤 Conductor Asignado</h4>
                <div style="padding: 15px; background: #f8fafc; border-radius: 8px;">
                    ${vehicle.driver_name ? `
                        <div style="font-weight: 600; color: #1e293b;">${vehicle.driver_name}</div>
                    ` : `
                        <span style="color: #94a3b8; font-style: italic;">Sin conductor asignado</span>
                    `}
                </div>
            </div>

            <div style="margin-top: 20px;">
                <h4 style="color: #1e293b; margin-bottom: 15px;">📄 Documentos</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div style="padding: 15px; background: ${insuranceDate && insuranceDate > today ? '#ecfdf5' : '#fef2f2'}; border-radius: 8px; border-left: 4px solid ${insuranceDate && insuranceDate > today ? '#10b981' : '#ef4444'};">
                        <div style="font-size: 12px; color: #64748b;">Seguro</div>
                        <div style="font-weight: 600; color: ${insuranceDate && insuranceDate > today ? '#10b981' : '#ef4444'};">
                            ${vehicle.insurance_expiry ? new Date(vehicle.insurance_expiry).toLocaleDateString('es-ES') : 'No registrado'}
                        </div>
                        <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
                            ${insuranceDate ? (insuranceDate > today ? '✅ Vigente' : '❌ Vencido') : '⚠️ Sin fecha'}
                        </div>
                    </div>
                    <div style="padding: 15px; background: ${inspectionDate && inspectionDate > today ? '#ecfdf5' : '#fef2f2'}; border-radius: 8px; border-left: 4px solid ${inspectionDate && inspectionDate > today ? '#10b981' : '#ef4444'};">
                        <div style="font-size: 12px; color: #64748b;">Inspección Técnica</div>
                        <div style="font-weight: 600; color: ${inspectionDate && inspectionDate > today ? '#10b981' : '#ef4444'};">
                            ${vehicle.inspection_expiry ? new Date(vehicle.inspection_expiry).toLocaleDateString('es-ES') : 'No registrado'}
                        </div>
                        <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
                            ${inspectionDate ? (inspectionDate > today ? '✅ Vigente' : '❌ Vencido') : '⚠️ Sin fecha'}
                        </div>
                    </div>
                </div>
            </div>

            <div style="margin-top: 25px; display: flex; gap: 10px; justify-content: flex-end;">
                <button onclick="VehiclesModule.editVehicle(${vehicle.id}); VehiclesModule.closeDetailsModal();" 
                    style="padding: 10px 20px; background: #f59e0b; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500;">
                    ✏️ Editar
                </button>
                <button onclick="VehiclesModule.closeDetailsModal()" 
                    style="padding: 10px 20px; background: #64748b; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500;">
                    Cerrar
                </button>
            </div>
        `;

        document.getElementById('vehicleDetailsModal').style.display = 'flex';
    },

    closeDetailsModal() {
        document.getElementById('vehicleDetailsModal').style.display = 'none';
    },

    deleteVehicle(id) {
        const vehicle = this.vehicles.find(v => v.id === id);
        if (!vehicle) return;

        if (!confirm(`¿Estás seguro de eliminar el vehículo ${vehicle.brand} ${vehicle.model} (${vehicle.plate})?`)) {
            return;
        }

        this.vehicles = this.vehicles.filter(v => v.id !== id);
        this.updateKPIs();
        this.renderTable();
        alert('✅ Vehículo eliminado correctamente');
    },

    exportVehicles() {
        if (!this.vehicles || this.vehicles.length === 0) {
            alert('No hay vehículos para exportar');
            return;
        }

        const now = new Date();
        const fechaReporte = now.toLocaleDateString('es-DO', { day:'2-digit', month:'2-digit', year:'numeric' });
        const horaReporte = now.toLocaleTimeString('es-DO', { hour:'2-digit', minute:'2-digit' });

        const rows = this.vehicles.map(v => `
            <tr>
                <td>${v.brand || ''} ${v.model || ''}</td>
                <td>${v.year || ''}</td>
                <td>${v.plate || 'N/A'}</td>
                <td>${v.driver_name || 'Sin asignar'}</td>
                <td>${this.getTypeName(v.type)}</td>
                <td>${this.getStatusName(v.status)}</td>
            </tr>
        `).join('');

        const win = window.open('', '', 'width=900,height=700');
        win.document.write(`<!DOCTYPE html><html><head><title>Reporte de Vehículos - TaxiApp Rondon</title>
        <style>
            body { font-family: 'Segoe UI', sans-serif; padding: 30px; color: #1e293b; }
            h1 { font-size: 22px; color: #3b82f6; margin-bottom: 5px; }
            .info { font-size: 13px; color: #64748b; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { background: #f1f5f9; padding: 10px; text-align: left; font-size: 12px; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; }
            td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
            .footer { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 10px; }
            @media print { .no-print { display: none; } }
        </style></head><body>
        <h1>🚙 Reporte de Vehículos</h1>
        <div class="info">
            <strong>TaxiApp Rondon</strong> | Fecha: ${fechaReporte} ${horaReporte} | Total: ${this.vehicles.length} vehículos
        </div>
        <table>
            <thead><tr><th>Vehículo</th><th>Año</th><th>Placa</th><th>Conductor</th><th>Tipo</th><th>Estado</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>
        <div class="footer">Generado por TaxiApp Rondon - ${fechaReporte} ${horaReporte}</div>
        </body></html>`);
        win.document.close();
        win.print();
    }
};

window.VehiclesModule = VehiclesModule;