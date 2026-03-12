// =============================================
// MÓDULO DE OBJETOS PERDIDOS - Admin Panel
// =============================================
const LostItemsModule = {
    currentFilter: 'all',
    items: [],

    getHTML() {
        return `
        <div style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0;">🔍 Objetos Perdidos</h2>
                <button onclick="LostItemsModule.loadItems()" style="background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer;">🔄 Actualizar</button>
            </div>

            <!-- Filtros -->
            <div style="display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap; align-items: center;">
                <span style="font-size:14px; color:#64748b;">Fecha Inicial</span>
                <input type="date" id="lostDateFrom" style="padding: 8px 12px; border-radius: 8px; border: 1px solid #ddd; font-size:14px;">
                <span style="font-size:14px; color:#64748b;">Fecha Final</span>
                <input type="date" id="lostDateTo" style="padding: 8px 12px; border-radius: 8px; border: 1px solid #ddd; font-size:14px;">
                <button onclick="LostItemsModule.loadItems()" style="background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer;">🔍 Buscar</button>
                <button onclick="LostItemsModule.clearDates()" style="background: #f1f5f9; color: #64748b; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer;">✖ Limpiar</button>
            </div>
            <div style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
                <button onclick="LostItemsModule.filterItems('all')" id="filter-all" style="padding: 8px 16px; border-radius: 20px; border: none; background: #3b82f6; color: white; cursor: pointer;">Todos</button>
                <button onclick="LostItemsModule.filterItems('pending')" id="filter-pending" style="padding: 8px 16px; border-radius: 20px; border: 2px solid #ff9800; background: white; color: #ff9800; cursor: pointer;">⏳ Pendientes</button>
                <button onclick="LostItemsModule.filterItems('in_progress')" id="filter-in_progress" style="padding: 8px 16px; border-radius: 20px; border: 2px solid #3b82f6; background: white; color: #3b82f6; cursor: pointer;">🔄 En Proceso</button>
                <button onclick="LostItemsModule.filterItems('resolved')" id="filter-resolved" style="padding: 8px 16px; border-radius: 20px; border: 2px solid #10b981; background: white; color: #10b981; cursor: pointer;">✅ Resueltos</button>
            </div>

            <!-- Tabla -->
            <div style="background: white; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f8fafc;">
                            <th style="padding: 15px; text-align: left; font-size: 13px; color: #64748b;">ID</th>
                            <th style="padding: 15px; text-align: left; font-size: 13px; color: #64748b;">USUARIO</th>
                            <th style="padding: 15px; text-align: left; font-size: 13px; color: #64748b;">OBJETO</th>
                            <th style="padding: 15px; text-align: left; font-size: 13px; color: #64748b;">CONDUCTOR</th>
                            <th style="padding: 15px; text-align: left; font-size: 13px; color: #64748b;">CONTACTO</th>
                            <th style="padding: 15px; text-align: left; font-size: 13px; color: #64748b;">FECHA</th>
                            <th style="padding: 15px; text-align: left; font-size: 13px; color: #64748b;">ESTADO</th>
                            <th style="padding: 15px; text-align: left; font-size: 13px; color: #64748b;">ACCIÓN</th>
                        </tr>
                    </thead>
                    <tbody id="lostItemsTableBody">
                        <tr><td colspan="8" style="text-align: center; padding: 40px; color: #94a3b8;">Cargando...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Modal de detalles -->
        <div id="lostItemModal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:9999; justify-content:center; align-items:center;">
            <div style="background:white; border-radius:16px; padding:30px; width:90%; max-width:500px; max-height:80vh; overflow-y:auto;">
                <h3 style="margin-bottom: 20px;">🔍 Detalles del Reporte</h3>
                <div id="lostItemModalContent"></div>
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <select id="lostItemStatus" style="flex:1; padding: 10px; border-radius: 8px; border: 1px solid #ddd;">
                        <option value="pending">⏳ Pendiente</option>
                        <option value="in_progress">🔄 En Proceso</option>
                        <option value="resolved">✅ Resuelto</option>
                    </select>
                    <button onclick="LostItemsModule.updateStatus()" style="background: #10b981; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer;">Guardar</button>
                    <button onclick="LostItemsModule.closeModal()" style="background: #f1f5f9; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer;">Cerrar</button>
                </div>
                <div style="margin-top: 15px;">
                    <label style="font-size: 13px; color: #64748b;">Notas del administrador:</label>
                    <textarea id="lostItemNotes" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ddd; margin-top:5px; height:80px; resize:none;"></textarea>
                </div>
            </div>
        </div>
        `;
    },

    init() {
        this.loadItems();
    },

    async loadItems() {
        try {
            const dateFrom = document.getElementById('lostDateFrom')?.value || '';
            const dateTo = document.getElementById('lostDateTo')?.value || '';
            let params = [];
            if (this.currentFilter !== 'all') params.push(`status=${this.currentFilter}`);
            if (dateFrom) params.push(`date_from=${dateFrom}`);
            if (dateTo) params.push(`date_to=${dateTo}`);
            const url = `https://web-production-99844.up.railway.app/api/lost-items${params.length ? '?' + params.join('&') : ''}`;

            const response = await fetch(url);
            const data = await response.json();

            if (data.success) {
                this.items = data.data;
                this.renderTable(data.data);
                document.getElementById('lostItemsBadge').textContent = 
                    data.data.filter(i => i.status === 'pending').length;
            }
        } catch (error) {
            document.getElementById('lostItemsTableBody').innerHTML = 
                '<tr><td colspan="8" style="text-align:center; padding:40px; color:#ef4444;">Error cargando datos</td></tr>';
        }
    },

    renderTable(items) {
        const tbody = document.getElementById('lostItemsTableBody');
        if (!items.length) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:40px; color:#94a3b8;">No hay reportes</td></tr>';
            return;
        }

        tbody.innerHTML = items.map(item => `
            <tr style="border-top: 1px solid #f1f5f9; hover: background:#f8fafc;">
                <td style="padding: 12px 15px; font-size: 13px; color: #64748b;">#${item.id}</td>
                <td style="padding: 12px 15px; font-size: 14px;">${item.user_name || 'N/A'}</td>
                <td style="padding: 12px 15px; font-size: 14px;">
                    <strong>${this.getCategoryName(item.item_category)}</strong><br>
                    <span style="font-size:12px; color:#64748b;">${item.item_description?.substring(0,40)}...</span>
                </td>
                <td style="padding: 12px 15px; font-size: 14px;">${item.driver_name || 'N/A'}<br>
                    <span style="font-size:12px; color:#64748b;">${item.vehicle_plate || ''}</span>
                </td>
                <td style="padding: 12px 15px; font-size: 14px;">${item.contact_phone || 'N/A'}</td>
                <td style="padding: 12px 15px; font-size: 13px; color:#64748b;">${new Date(item.created_at).toLocaleDateString('es-DO')}</td>
                <td style="padding: 12px 15px;">${this.getStatusBadge(item.status)}</td>
                <td style="padding: 12px 15px;">
                    <button onclick="LostItemsModule.openModal(${item.id})" style="background:#3b82f6; color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-size:12px;">Ver</button>
                </td>
            </tr>
        `).join('');
    },

    filterItems(filter) {
        this.currentFilter = filter;
        document.querySelectorAll('[id^="filter-"]').forEach(btn => {
            btn.style.background = 'white';
            btn.style.color = btn.style.borderColor || '#64748b';
        });
        document.getElementById(`filter-${filter}`).style.background = '#3b82f6';
        document.getElementById(`filter-${filter}`).style.color = 'white';
        this.loadItems();
    },

    clearDates() {
        document.getElementById('lostDateFrom').value = '';
        document.getElementById('lostDateTo').value = '';
        this.loadItems();
    },

    openModal(id) {
        const item = this.items.find(i => i.id === id);
        if (!item) return;

        this.currentItemId = id;
        document.getElementById('lostItemStatus').value = item.status;
        document.getElementById('lostItemNotes').value = item.admin_notes || '';
        document.getElementById('lostItemModalContent').innerHTML = `
            <div style="display: grid; gap: 12px;">
                <div><strong>Usuario:</strong> ${item.user_name || 'N/A'} | ${item.user_phone || ''}</div>
                <div><strong>Categoría:</strong> ${this.getCategoryName(item.item_category)}</div>
                <div><strong>Descripción:</strong> ${item.item_description}</div>
                <div><strong>Detalles:</strong> ${item.additional_details || 'N/A'}</div>
                <div><strong>Conductor:</strong> ${item.driver_name || 'N/A'}</div>
                <div><strong>Placa:</strong> ${item.vehicle_plate || 'N/A'}</div>
                <div><strong>Teléfono contacto:</strong> ${item.contact_phone || 'N/A'}</div>
                <div><strong>Fecha:</strong> ${new Date(item.created_at).toLocaleString('es-DO')}</div>
            </div>
        `;
        const modal = document.getElementById('lostItemModal');
        modal.style.display = 'flex';
    },

    closeModal() {
        document.getElementById('lostItemModal').style.display = 'none';
    },

    async updateStatus() {
        try {
            const status = document.getElementById('lostItemStatus').value;
            const admin_notes = document.getElementById('lostItemNotes').value;

            const response = await fetch(`https://web-production-99844.up.railway.app/api/lost-items/${this.currentItemId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, admin_notes })
            });

            const data = await response.json();
            if (data.success) {
                this.closeModal();
                this.loadItems();
                alert('✅ Estado actualizado correctamente');
            }
        } catch (error) {
            alert('❌ Error actualizando estado');
        }
    },

    getCategoryName(cat) {
        const cats = {
            phone: '📱 Teléfono', wallet: '👛 Billetera', keys: '🔑 Llaves',
            bag: '👜 Bolso', documents: '📄 Documentos', electronics: '💻 Electrónicos',
            clothing: '👕 Ropa', jewelry: '💍 Joyas', glasses: '👓 Gafas', other: '❓ Otro'
        };
        return cats[cat] || cat || 'N/A';
    },

    getStatusBadge(status) {
        const badges = {
            pending: '<span style="background:#fff3e0; color:#ff9800; padding:4px 10px; border-radius:12px; font-size:12px;">⏳ Pendiente</span>',
            in_progress: '<span style="background:#e3f2fd; color:#3b82f6; padding:4px 10px; border-radius:12px; font-size:12px;">🔄 En Proceso</span>',
            resolved: '<span style="background:#e8f5e9; color:#10b981; padding:4px 10px; border-radius:12px; font-size:12px;">✅ Resuelto</span>'
        };
        return badges[status] || status;
    }
};