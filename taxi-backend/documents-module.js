// documents-module.js - Módulo de Verificación de Documentos
(function() {
    'use strict';

    window.DocumentsModule = {
        currentFilter: 'all',
        documents: [],
        API_URL: window.location.origin + '/api',

        init() {
            console.log('📄 Módulo de documentos inicializado');
        },

        getDocumentsHTML() {
            return `
            <div style="padding: 20px;">
                <div style="margin-bottom: 24px;">
                    <h2 style="font-size: 24px; color: #1e293b; margin-bottom: 6px;">📋 Verificación de Documentos</h2>
                    <p style="color: #64748b;">Revisa y aprueba los documentos de los conductores</p>
                </div>

                <!-- Estadísticas -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; margin-bottom: 24px;">
                    <div style="background: linear-gradient(135deg, #667eea, #764ba2); padding: 20px; border-radius: 12px; color: white; text-align: center;">
                        <div style="font-size: 28px; font-weight: bold;" id="doc-total">0</div>
                        <div style="font-size: 13px; opacity: 0.9;">Total Documentos</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #f093fb, #f5576c); padding: 20px; border-radius: 12px; color: white; text-align: center;">
                        <div style="font-size: 28px; font-weight: bold;" id="doc-pending">0</div>
                        <div style="font-size: 13px; opacity: 0.9;">Pendientes</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #4facfe, #00f2fe); padding: 20px; border-radius: 12px; color: white; text-align: center;">
                        <div style="font-size: 28px; font-weight: bold;" id="doc-approved">0</div>
                        <div style="font-size: 13px; opacity: 0.9;">Aprobados</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #43e97b, #38f9d7); padding: 20px; border-radius: 12px; color: white; text-align: center;">
                        <div style="font-size: 28px; font-weight: bold;" id="doc-rejected">0</div>
                        <div style="font-size: 13px; opacity: 0.9;">Rechazados</div>
                    </div>
                </div>

                <!-- Filtros fecha -->
                <div style="display:flex; gap:10px; margin-bottom:16px; flex-wrap:wrap; align-items:center;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <label style="color:#64748b; font-size:14px;">Fecha Inicial</label>
                        <input type="date" id="doc-date-from" style="padding:7px 12px; border:1px solid #e2e8f0; border-radius:8px; font-size:14px; color:#1e293b;" />
                    </div>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <label style="color:#64748b; font-size:14px;">Fecha Final</label>
                        <input type="date" id="doc-date-to" style="padding:7px 12px; border:1px solid #e2e8f0; border-radius:8px; font-size:14px; color:#1e293b;" />
                    </div>
                    <button onclick="DocumentsModule.searchByDate()" style="padding:7px 20px; background:#3b82f6; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:600; font-size:14px;">🔍 Buscar</button>
                    <button onclick="DocumentsModule.exportDocs()" style="padding:7px 20px; background:#6c757d; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:600; font-size:14px;">📊 Exportar</button>
                   <button onclick="DocumentsModule.clearDateFilter()" style="display:none; padding:7px 16px; background:#f1f5f9; color:#64748b; border:none; border-radius:8px; cursor:pointer; font-size:14px;">✕ Limpiar</button>
                </div>

                <!-- Filtros estado -->
                <div style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
                    <button onclick="DocumentsModule.filterDocs('all')" id="filter-all"
                        style="padding: 8px 18px; border-radius: 20px; border: none; background: #3b82f6; color: white; cursor: pointer; font-weight: 600;">
                        Todos
                    </button>
                    <button onclick="DocumentsModule.filterDocs('pending')" id="filter-pending"
                        style="padding: 8px 18px; border-radius: 20px; border: 2px solid #ffc107; background: transparent; color: #ffc107; cursor: pointer; font-weight: 600;">
                        Pendientes
                    </button>
                    <button onclick="DocumentsModule.filterDocs('approved')" id="filter-approved"
                        style="padding: 8px 18px; border-radius: 20px; border: 2px solid #22c55e; background: transparent; color: #22c55e; cursor: pointer; font-weight: 600;">
                        Aprobados
                    </button>
                    <button onclick="DocumentsModule.filterDocs('rejected')" id="filter-rejected"
                        style="padding: 8px 18px; border-radius: 20px; border: 2px solid #ef4444; background: transparent; color: #ef4444; cursor: pointer; font-weight: 600;">
                        Rechazados
                    </button>
                </div>

                <!-- Lista de documentos -->
                <div id="docs-list" style="display: flex; flex-direction: column; gap: 12px;">
                    <div style="text-align: center; padding: 40px; color: #94a3b8;">
                        <div style="font-size: 40px; margin-bottom: 12px;">📄</div>
                        Cargando documentos...
                    </div>
                </div>
            </div>

            <!-- Modal ver imagen -->
            <div id="doc-image-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.85); z-index:9999; align-items:center; justify-content:center; flex-direction:column; gap:16px;">
                <img id="doc-image-preview" src="" style="max-width:90vw; max-height:75vh; border-radius:12px; object-fit:contain;" />
                <div style="display:flex; gap:12px;">
                    <button onclick="DocumentsModule.approveFromModal()" id="modal-approve-btn"
                        style="padding:10px 24px; background:#22c55e; color:white; border:none; border-radius:8px; font-size:16px; font-weight:bold; cursor:pointer;">
                        ✅ Aprobar
                    </button>
                    <button onclick="DocumentsModule.rejectFromModal()" id="modal-reject-btn"
                        style="padding:10px 24px; background:#ef4444; color:white; border:none; border-radius:8px; font-size:16px; font-weight:bold; cursor:pointer;">
                        ❌ Rechazar
                    </button>
                    <button onclick="DocumentsModule.closeModal()"
                        style="padding:10px 24px; background:#64748b; color:white; border:none; border-radius:8px; font-size:16px; cursor:pointer;">
                        Cerrar
                    </button>
                </div>
            </div>
            `;
        },

        async loadDocuments() {
            try {
                const res = await fetch(`${this.API_URL}/documents/all`);
                const data = await res.json();
                if (data.success) {
                    this.documents = data.documents;
                    this.renderStats();
                    this.renderDocs(this.documents);
                }
            } catch (e) {
                document.getElementById('docs-list').innerHTML = `
                    <div style="text-align:center; padding:40px; color:#ef4444;">
                        Error cargando documentos: ${e.message}
                    </div>`;
            }
        },

        renderStats() {
            const total = this.documents.length;
            const pending = this.documents.filter(d => d.status === 'pending').length;
            const approved = this.documents.filter(d => d.status === 'approved').length;
            const rejected = this.documents.filter(d => d.status === 'rejected').length;
            document.getElementById('doc-total').textContent = total;
            document.getElementById('doc-pending').textContent = pending;
            document.getElementById('doc-approved').textContent = approved;
            document.getElementById('doc-rejected').textContent = rejected;
            const badge = document.getElementById('documentsBadge');
            if (badge) badge.textContent = pending;
        },

        renderDocs(docs) {
            const container = document.getElementById('docs-list');
            if (!docs.length) {
                container.innerHTML = `
                    <div style="text-align:center; padding:40px; color:#94a3b8;">
                        <div style="font-size:40px; margin-bottom:12px;">📭</div>
                        No hay documentos en esta categoría
                    </div>`;
                return;
            }

            const typeNames = {
                cedula: '🪪 Cédula',
                licencia: '🚗 Licencia',
                matricula: '📋 Matrícula',
                foto_vehiculo: '📸 Foto Vehículo',
                seguro: '🛡️ Seguro',
                foto_perfil: '🤳 Foto Perfil'
            };
            const statusColors = { pending: '#ffc107', approved: '#22c55e', rejected: '#ef4444' };
            const statusLabels = { pending: 'Pendiente', approved: 'Aprobado', rejected: 'Rechazado' };

            const byDriver = {};
            docs.forEach(doc => {
                const key = doc.driver_id;
                if (!byDriver[key]) byDriver[key] = { name: doc.driver_name || 'Conductor #' + doc.driver_id, phone: doc.driver_phone || '-', docs: [] };
                byDriver[key].docs.push(doc);
            });

            container.innerHTML = Object.entries(byDriver).map(([driverId, driver]) => {
                const pending = driver.docs.filter(d => d.status === 'pending').length;
                const approved = driver.docs.filter(d => d.status === 'approved').length;
                const total = driver.docs.length;
                return `
                <div style="background:white; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.08); overflow:hidden; margin-bottom:4px;">
                    <div onclick="DocumentsModule.toggleDriver('driver-${driverId}')"
                        style="padding:16px 20px; cursor:pointer; display:flex; align-items:center; justify-content:space-between; user-select:none;">
                        <div style="display:flex; align-items:center; gap:12px;">
                            <div style="width:42px; height:42px; background:#3b82f6; border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; font-weight:bold; font-size:18px;">
                                ${driver.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div style="font-weight:700; font-size:16px; color:#1e293b;">${driver.name}</div>
                                <div style="color:#94a3b8; font-size:13px;">📞 ${driver.phone}</div>
                            </div>
                        </div>
                        <div style="display:flex; align-items:center; gap:10px;">
                            ${pending > 0 ? `<span style="background:#ffc10720; color:#ffc107; padding:3px 10px; border-radius:20px; font-size:12px; font-weight:600;">${pending} pendiente${pending>1?'s':''}</span>` : ''}
                            <span style="background:#f1f5f9; color:#64748b; padding:3px 10px; border-radius:20px; font-size:12px;">${approved}/${total} aprobados</span>
                            <span style="color:#94a3b8; font-size:18px;">▼</span>
                        </div>
                    </div>
                    <div id="driver-${driverId}" style="display:none; border-top:1px solid #f1f5f9; padding:12px 16px; flex-direction:column; gap:10px;">
                        ${driver.docs.map(doc => `
                        <div style="background:#f8fafc; border-radius:10px; padding:14px; display:flex; align-items:center; gap:14px; flex-wrap:wrap;">
                            ${doc.document_url && doc.document_url.startsWith('data:image') ?
                                `<div onclick="DocumentsModule.viewImage('${doc.id}')" style="width:60px; height:60px; background:#e2e8f0; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:24px; flex-shrink:0; cursor:pointer;" title="Click para ver">🖼️</div>`
                                : `<div style="width:60px; height:60px; background:#e2e8f0; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:24px; flex-shrink:0;">📄</div>`
                            }
                            <div style="flex:1; min-width:140px;">
                                <div style="font-weight:700; color:#1e293b;">${typeNames[doc.document_type] || doc.document_type}</div>
                                <div style="color:#94a3b8; font-size:12px;">${new Date(doc.uploaded_at).toLocaleDateString('es-DO')}</div>
                            </div>
                            <span style="background:${statusColors[doc.status]}20; color:${statusColors[doc.status]}; padding:3px 10px; border-radius:20px; font-size:12px; font-weight:600;">
                                ${statusLabels[doc.status]}
                            </span>
                            <div style="display:flex; gap:6px; flex-shrink:0;">
                                ${doc.document_url && doc.document_url.startsWith('data:image') ?
                                    `<button onclick="DocumentsModule.viewImage('${doc.id}')" style="padding:5px 12px; background:#3b82f6; color:white; border:none; border-radius:6px; cursor:pointer; font-size:12px;">👁 Ver</button>` : ''
                                }
                                ${doc.status === 'pending' ? `
                                <button onclick="DocumentsModule.approve(${doc.id})" style="padding:5px 12px; background:#22c55e; color:white; border:none; border-radius:6px; cursor:pointer; font-size:12px;">✅ Aprobar</button>
                                <button onclick="DocumentsModule.reject(${doc.id})" style="padding:5px 12px; background:#ef4444; color:white; border:none; border-radius:6px; cursor:pointer; font-size:12px;">❌ Rechazar</button>` : ''}
                            </div>
                        </div>`).join('')}
                    </div>
                </div>`;
            }).join('');

            if (Object.keys(byDriver).length === 1) {
                const id = 'driver-' + Object.keys(byDriver)[0];
                const el = document.getElementById(id);
                if (el) el.style.display = 'flex';
            }
        },

        exportDocs() {
            const docs = this.documents;
            if (!docs.length) { alert('No hay documentos para exportar'); return; }

            const now = new Date();
            const fechaReporte = now.toLocaleDateString('es-DO', { day:'2-digit', month:'2-digit', year:'numeric' });
            const horaReporte = now.toLocaleTimeString('es-DO', { hour:'2-digit', minute:'2-digit' });

            const typeNames = { cedula:'Cédula', licencia:'Licencia', matricula:'Matrícula', foto_vehiculo:'Foto Vehículo', seguro:'Seguro', foto_perfil:'Foto Perfil' };
            const statusLabels = { pending:'Pendiente', approved:'Aprobado', rejected:'Rechazado' };

            const byDriver = {};
            docs.forEach(d => {
                const key = d.driver_id;
                if (!byDriver[key]) byDriver[key] = { name: d.driver_name || 'Conductor #' + d.driver_id, phone: d.driver_phone || '-', docs: [] };
                byDriver[key].docs.push(d);
            });
            const rows = Object.values(byDriver).map(driver => `
                <tr>
                    <td style="font-weight:700;">${driver.name}</td>
                    <td>${driver.phone}</td>
                    <td>${driver.docs.map(d => typeNames[d.document_type] || d.document_type).join(', ')}</td>
                    <td>${driver.docs.map(d => statusLabels[d.status] || d.status).join(', ')}</td>
                    <td>${new Date(driver.docs[0].uploaded_at).toLocaleDateString('es-DO')}</td>
                </tr>`).join('');

            const win = window.open('', '', 'width=900,height=700');
            win.document.write(`<!DOCTYPE html><html><head><title>Reporte de Documentos - TaxiApp Rondon</title>
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
            <h1>📋 Reporte de Documentos</h1>
            <div class="info"><strong>TaxiApp Rondon</strong> | Fecha: ${fechaReporte} ${horaReporte} | Total: ${docs.length} documentos</div>
            <table>
                <thead><tr><th>Conductor</th><th>Teléfono</th><th>Documentos</th><th>Estado</th><th>Fecha</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
            <div class="footer">Generado por TaxiApp Rondon - ${fechaReporte} ${horaReporte}</div>
            </body></html>`);
            win.document.close();
            win.print();
        },

        toggleDriver(id) {
            const el = document.getElementById(id);
            if (!el) return;
            el.style.display = el.style.display === 'none' ? 'flex' : 'none';
        },

        searchByDate() {
            const from = document.getElementById('doc-date-from').value;
            const to = document.getElementById('doc-date-to').value;
            let filtered = this.currentFilter === 'all' ? this.documents : this.documents.filter(d => d.status === this.currentFilter);
            if (from) filtered = filtered.filter(d => new Date(d.uploaded_at) >= new Date(from));
            if (to) filtered = filtered.filter(d => new Date(d.uploaded_at) <= new Date(to + 'T23:59:59'));
            this.renderDocs(filtered);
        },

        clearDateFilter() {
            document.getElementById('doc-date-from').value = '';
            document.getElementById('doc-date-to').value = '';
            this.filterDocs(this.currentFilter);
        },

        filterDocs(filter) {
            this.currentFilter = filter;
            ['all','pending','approved','rejected'].forEach(f => {
                const btn = document.getElementById(`filter-${f}`);
                if (!btn) return;
                if (f === filter) {
                    btn.style.background = '#3b82f6';
                    btn.style.color = 'white';
                    btn.style.border = 'none';
                } else {
                    btn.style.background = 'transparent';
                    btn.style.color = f === 'pending' ? '#ffc107' : f === 'approved' ? '#22c55e' : f === 'rejected' ? '#ef4444' : '#3b82f6';
                    btn.style.border = `2px solid ${f === 'pending' ? '#ffc107' : f === 'approved' ? '#22c55e' : f === 'rejected' ? '#ef4444' : '#3b82f6'}`;
                }
            });
            const filtered = filter === 'all' ? this.documents : this.documents.filter(d => d.status === filter);
            this.renderDocs(filtered);
        },

        viewImage(docId) {
            const doc = this.documents.find(d => String(d.id) === String(docId));
            if (!doc) return;
            this._currentDocId = doc.id;
            document.getElementById('doc-image-preview').src = doc.document_url;
            const modal = document.getElementById('doc-image-modal');
            modal.style.display = 'flex';
            document.getElementById('modal-approve-btn').style.display = doc.status === 'pending' ? 'block' : 'none';
            document.getElementById('modal-reject-btn').style.display = doc.status === 'pending' ? 'block' : 'none';
        },

        closeModal() {
            document.getElementById('doc-image-modal').style.display = 'none';
        },

        approveFromModal() {
            this.approve(this._currentDocId);
            this.closeModal();
        },

        rejectFromModal() {
            this.reject(this._currentDocId);
            this.closeModal();
        },

        async approve(docId) {
            if (!confirm('¿Aprobar este documento?')) return;
            try {
                const res = await fetch(`${this.API_URL}/documents/${docId}/approve`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reviewed_by: 1 })
                });
                const data = await res.json();
                if (data.success) {
                    if (data.all_approved && data.driver_phone) {
                        const phone = data.driver_phone.replace(/\D/g, '');
                        const fullPhone = phone.startsWith('1') ? phone : '1' + phone;
                        const msg = encodeURIComponent(`Hola ${data.driver_name}, tus documentos han sido aprobados ✅. Ya puedes completar tu registro en Squid: https://web-production-99844.up.railway.app/descargar`);
                        if (confirm(`✅ Todos los documentos de ${data.driver_name} aprobados.\n¿Enviar WhatsApp al conductor?`)) {
                            window.open(`https://wa.me/${fullPhone}?text=${msg}`, '_blank');
                        }
                    } else {
                        alert('✅ Documento aprobado');
                    }
                    this.loadDocuments();
                } else {
                    alert('Error: ' + data.error);
                }
            } catch (e) {
                alert('Error: ' + e.message);
            }
        },

        async reject(docId) {
            const reason = prompt('Razón de rechazo:');
            if (!reason) return;
            try {
                const res = await fetch(`${this.API_URL}/documents/${docId}/reject`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reviewed_by: 1, rejection_reason: reason })
                });
                const data = await res.json();
                if (data.success) {
                    alert('❌ Documento rechazado');
                    this.loadDocuments();
                } else {
                    alert('Error: ' + data.error);
                }
            } catch (e) {
                alert('Error: ' + e.message);
            }
        }
    };
})();