// Módulo de Gestión de Tarifas Dinámicas
const PricingModule = {
    getHTML: function() {
        return `
            <div style="padding: 24px;">
                <!-- Header con Tabs -->
                <div style="background: white; border-radius: 12px; padding: 20px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px;">💰 Gestión de Tarifas Dinámicas</h2>
                    
                    <div id="pricingTabs" style="display: flex; gap: 10px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
                        <button onclick="PricingModule.showTab('base')" class="pricing-tab active" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 8px 8px 0 0; cursor: pointer;">
                            🚗 Tarifas Base
                        </button>
                        <button onclick="PricingModule.showTab('surge')" class="pricing-tab" style="padding: 10px 20px; background: #f3f4f6; color: #6b7280; border: none; border-radius: 8px 8px 0 0; cursor: pointer;">
                            ⚡ Surge Pricing
                        </button>
                        <button onclick="PricingModule.showTab('zones')" class="pricing-tab" style="padding: 10px 20px; background: #f3f4f6; color: #6b7280; border: none; border-radius: 8px 8px 0 0; cursor: pointer;">
                            📍 Zonas Especiales
                        </button>
                        <button onclick="PricingModule.showTab('history')" class="pricing-tab" style="padding: 10px 20px; background: #f3f4f6; color: #6b7280; border: none; border-radius: 8px 8px 0 0; cursor: pointer;">
                            📜 Historial
                        </button>
                    </div>
                </div>

                <!-- Contenido de Tabs -->
                <div id="pricingContent">
                    <!-- Tab Tarifas Base -->
                    <div id="baseTab" class="pricing-tab-content" style="display: block;">
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;" id="vehicleCards">
                            <!-- Se llenará dinámicamente -->
                        </div>
                    </div>

                    <!-- Tab Surge Pricing -->
                    <div id="surgeTab" class="pricing-tab-content" style="display: none;">
                        <div style="background: white; border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                            <h3 style="margin: 0 0 20px 0;">⏰ Multiplicadores por Hora</h3>
                            <div id="timeMultipliers">
                                <!-- Se llenará dinámicamente -->
                            </div>
                        </div>

                        <div style="background: white; border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                            <h3 style="margin: 0 0 20px 0;">📅 Multiplicadores por Día</h3>
                            <div id="dayMultipliers">
                                <!-- Se llenará dinámicamente -->
                            </div>
                        </div>

                        <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                            <h3 style="margin: 0 0 20px 0;">🌦️ Otros Multiplicadores</h3>
                            <div id="otherMultipliers">
                                <!-- Se llenará dinámicamente -->
                            </div>
                        </div>
                    </div>

                    <!-- Tab Zonas Especiales -->
                    <div id="zonesTab" class="pricing-tab-content" style="display: none;">
                        <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                                <h3 style="margin: 0;">📍 Zonas con Recargo</h3>
                                <button onclick="PricingModule.addNewZone()" style="padding: 8px 16px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer;">
                                    ➕ Nueva Zona
                                </button>
                            </div>
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead>
                                    <tr style="background: #f9fafb;">
                                        <th style="padding: 12px; text-align: left;">Zona</th>
                                        <th style="padding: 12px; text-align: left;">Tipo</th>
                                        <th style="padding: 12px; text-align: left;">Recargo</th>
                                        <th style="padding: 12px; text-align: left;">Multiplicador</th>
                                        <th style="padding: 12px; text-align: left;">Estado</th>
                                        <th style="padding: 12px; text-align: left;">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody id="zonesTable">
                                    <!-- Se llenará dinámicamente -->
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Tab Historial -->
                    <div id="historyTab" class="pricing-tab-content" style="display: none;">
                        <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                            <h3 style="margin: 0 0 20px 0;">📜 Historial de Cambios</h3>
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead>
                                    <tr style="background: #f9fafb;">
                                        <th style="padding: 12px; text-align: left;">Fecha</th>
                                        <th style="padding: 12px; text-align: left;">Tabla</th>
                                        <th style="padding: 12px; text-align: left;">Campo</th>
                                        <th style="padding: 12px; text-align: left;">Valor Anterior</th>
                                        <th style="padding: 12px; text-align: left;">Valor Nuevo</th>
                                        <th style="padding: 12px; text-align: left;">Usuario</th>
                                    </tr>
                                </thead>
                                <tbody id="historyTable">
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
        this.loadPricingConfig();
        this.loadSurgeMultipliers();
        this.loadSpecialZones();
    },

    showTab: function(tab) {
        // Ocultar todos los tabs
        document.querySelectorAll('.pricing-tab-content').forEach(t => t.style.display = 'none');
        document.querySelectorAll('.pricing-tab').forEach(b => {
            b.style.background = '#f3f4f6';
            b.style.color = '#6b7280';
        });
        
        // Mostrar tab seleccionado
        document.getElementById(tab + 'Tab').style.display = 'block';
        event.target.style.background = '#3b82f6';
        event.target.style.color = 'white';
        
        // Cargar datos según el tab
        if (tab === 'history') {
            this.loadHistory();
        }
    },

    loadPricingConfig: async function() {
        try {
            const response = await fetch('http://localhost:3000/api/pricing/config');
            const data = await response.json();
            
            const container = document.getElementById('vehicleCards');
            container.innerHTML = data.map(config => `
                <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <h3 style="margin: 0 0 15px 0; color: #1f2937; text-transform: capitalize;">
                        ${this.getVehicleIcon(config.vehicle_type)} ${config.vehicle_type}
                    </h3>
                    <div style="space-y: 10px;">
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; font-size: 0.875rem; color: #6b7280; margin-bottom: 4px;">Tarifa Base</label>
                            <input type="number" id="base_${config.vehicle_type}" value="${config.base_fare}" 
                                style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px;">
                        </div>
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; font-size: 0.875rem; color: #6b7280; margin-bottom: 4px;">Por Kilómetro</label>
                            <input type="number" id="km_${config.vehicle_type}" value="${config.per_km}" 
                                style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px;">
                        </div>
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; font-size: 0.875rem; color: #6b7280; margin-bottom: 4px;">Por Minuto</label>
                            <input type="number" id="min_${config.vehicle_type}" value="${config.per_minute}" 
                                style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px;">
                        </div>
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; font-size: 0.875rem; color: #6b7280; margin-bottom: 4px;">Tarifa Mínima</label>
                            <input type="number" id="minimum_${config.vehicle_type}" value="${config.minimum_fare}" 
                                style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px;">
                        </div>
                        <button onclick="PricingModule.updatePricing('${config.vehicle_type}')" 
                            style="width: 100%; padding: 10px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
                            Actualizar
                        </button>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error cargando configuración:', error);
        }
    },

    loadSurgeMultipliers: async function() {
        try {
            const response = await fetch('http://localhost:3000/api/pricing/surge');
            const data = await response.json();
            
            const timeMultipliers = data.filter(m => m.type === 'time');
            const dayMultipliers = data.filter(m => m.type === 'day');
            const otherMultipliers = data.filter(m => m.type !== 'time' && m.type !== 'day');
            
            // Renderizar multiplicadores por hora
            document.getElementById('timeMultipliers').innerHTML = timeMultipliers.map(m => this.renderMultiplierRow(m)).join('');
            document.getElementById('dayMultipliers').innerHTML = dayMultipliers.map(m => this.renderMultiplierRow(m)).join('');
            document.getElementById('otherMultipliers').innerHTML = otherMultipliers.map(m => this.renderMultiplierRow(m)).join('');
        } catch (error) {
            console.error('Error cargando multiplicadores:', error);
        }
    },

    renderMultiplierRow: function(multiplier) {
        return `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; border-bottom: 1px solid #e5e7eb;">
                <div>
                    <strong>${multiplier.name}</strong>
                    <span style="color: #6b7280; font-size: 0.875rem; margin-left: 10px;">
                        ${multiplier.condition_value || ''}
                    </span>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <input type="number" step="0.1" value="${multiplier.multiplier}" id="mult_${multiplier.id}"
                        style="width: 80px; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px;">
                    <span>x</span>
                    <button onclick="PricingModule.updateMultiplier(${multiplier.id})"
                        style="padding: 6px 12px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Guardar
                    </button>
                </div>
            </div>
        `;
    },

    loadSpecialZones: async function() {
        try {
            const response = await fetch('http://localhost:3000/api/pricing/zones');
            const data = await response.json();
            
            const tbody = document.getElementById('zonesTable');
            tbody.innerHTML = data.map(zone => `
                <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 12px;">${zone.zone_name}</td>
                    <td style="padding: 12px;">${zone.zone_type}</td>
                    <td style="padding: 12px;">RD$${zone.surcharge}</td>
                    <td style="padding: 12px;">${zone.multiplier}x</td>
                    <td style="padding: 12px;">
                        <span style="padding: 4px 12px; background: ${zone.active ? '#dcfce7' : '#fee2e2'}; 
                               color: ${zone.active ? '#166534' : '#991b1b'}; border-radius: 12px; font-size: 0.75rem;">
                            ${zone.active ? 'Activa' : 'Inactiva'}
                        </span>
                    </td>
                    <td style="padding: 12px;">
                        <button onclick="PricingModule.toggleZone(${zone.id}, ${!zone.active})"
                            style="padding: 4px 8px; background: ${zone.active ? '#fee2e2' : '#dcfce7'}; 
                                   color: ${zone.active ? '#991b1b' : '#166534'}; border: none; border-radius: 4px; cursor: pointer;">
                            ${zone.active ? 'Desactivar' : 'Activar'}
                        </button>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error cargando zonas:', error);
        }
    },

    loadHistory: async function() {
        try {
            const response = await fetch('http://localhost:3000/api/pricing/history');
            const data = await response.json();
            
            const tbody = document.getElementById('historyTable');
            tbody.innerHTML = data.map(record => `
                <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 12px; font-size: 0.875rem;">${new Date(record.change_date).toLocaleString()}</td>
                    <td style="padding: 12px;">${record.table_name}</td>
                    <td style="padding: 12px;">${record.field_changed}</td>
                    <td style="padding: 12px;">${record.old_value}</td>
                    <td style="padding: 12px; font-weight: 600;">${record.new_value}</td>
                    <td style="padding: 12px;">Admin #${record.changed_by || 1}</td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error cargando historial:', error);
        }
    },

    getVehicleIcon: function(type) {
        const icons = {
            'economy': '🚗',
            'comfort': '🚙',
            'premium': '🚘',
            'xl': '🚐'
        };
        return icons[type] || '🚗';
    },

    updatePricing: async function(vehicleType) {
        const data = {
            base_fare: document.getElementById(`base_${vehicleType}`).value,
            per_km: document.getElementById(`km_${vehicleType}`).value,
            per_minute: document.getElementById(`min_${vehicleType}`).value,
            minimum_fare: document.getElementById(`minimum_${vehicleType}`).value,
            booking_fee: 20
        };

        try {
            const response = await fetch(`http://localhost:3000/api/pricing/config/${vehicleType}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                this.showNotification('Tarifa actualizada correctamente', 'success');
            }
        } catch (error) {
            this.showNotification('Error al actualizar tarifa', 'error');
        }
    },

    updateMultiplier: async function(id) {
        const multiplier = document.getElementById(`mult_${id}`).value;
        
        try {
            const response = await fetch(`http://localhost:3000/api/pricing/surge/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ multiplier, active: true })
            });

            if (response.ok) {
                this.showNotification('Multiplicador actualizado', 'success');
            }
        } catch (error) {
            this.showNotification('Error al actualizar multiplicador', 'error');
        }
    },

    toggleZone: async function(id, active) {
        try {
            const response = await fetch(`http://localhost:3000/api/pricing/zones/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ active })
            });

            if (response.ok) {
                this.showNotification(active ? 'Zona activada' : 'Zona desactivada', 'success');
                this.loadSpecialZones();
            }
        } catch (error) {
            this.showNotification('Error al actualizar zona', 'error');
        }
    },

    addNewZone: function() {
        // Aquí puedes agregar un modal para crear nueva zona
        alert('Funcionalidad para agregar nueva zona - Por implementar');
    },

    showNotification: function(message, type) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 16px 24px;
            background: ${type === 'success' ? '#10b981' : '#ef4444'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            z-index: 9999;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
};

// Hacer disponible globalmente
window.PricingModule = PricingModule;