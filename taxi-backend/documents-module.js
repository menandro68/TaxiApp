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

                <!-- Filtros -->
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
            // Actualizar badge del menú
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
                seguro: '🛡️ Seguro'
            };

            const statusColors = {
                pending: '#ffc107',
                approved: '#22c55e',
                rejected: '#ef4444'
            };
            const statusLabels = {
                pending: 'Pendiente',
                approved: 'Aprobado',
                rejected: 'Rechazado'
            };

            container.innerHTML = docs.map(doc => `
                <div style="background:white; border-radius:12px; padding:20px; box-shadow:0 2px 8px rgba(0,0,0,0.08); display:flex; align-items:center; gap:16px; flex-wrap:wrap;">
                    <!-- Miniatura -->
                    <div style="flex-shrink:0;">
                        ${doc.document_url && doc.document_url.startsWith('data:image') ?
                            `<img src="${doc.document_url}" style="width:70px; height:70px; object-fit:cover; border-radius:8px; cursor:pointer;" onclick="DocumentsModule.viewImage('${doc.id}')" />`
                            : `<div style="width:70px; height:70px; background:#f1f5f9; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:28px;">📄</div>`
                        }
                    </div>

                    <!-- Info -->
                    <div style="flex:1; min-width:180px;">
                        <div style="font-weight:700; font-size:16px; color:#1e293b;">${typeNames[doc.document_type] || doc.document_type}</div>
                        <div style="color:#475569; font-size:14px; margin-top:2px;">👤 ${doc.driver_name || 'Conductor #' + doc.driver_id}</div>
                        <div style="color:#94a3b8; font-size:12px; margin-top:2px;">📞 ${doc.driver_phone || '-'} · ${new Date(doc.uploaded_at).toLocaleDateString('es-DO')}</div>
                        ${doc.rejection_reason ? `<div style="color:#ef4444; font-size:12px; margin-top:4px;">Razón: ${doc.rejection_reason}</div>` : ''}
                    </div>

                    <!-- Estado -->
                    <div style="flex-shrink:0;">
                        <span style="background:${statusColors[doc.status]}20; color:${statusColors[doc.status]}; padding:4px 12px; border-radius:20px; font-size:13px; font-weight:600;">
                            ${statusLabels[doc.status]}
                        </span>
                    </div>

                    <!-- Acciones -->
                    <div style="display:flex; gap:8px; flex-shrink:0;">
                        ${doc.document_url && doc.document_url.startsWith('data:image') ?
                            `<button onclick="DocumentsModule.viewImage('${doc.id}')"
                                style="padding:6px 14px; background:#3b82f6; color:white; border:none; border-radius:6px; cursor:pointer; font-size:13px;">
                                👁 Ver
                            </button>` : ''
                        }
                        ${doc.status === 'pending' ? `
                        <button onclick="DocumentsModule.approve(${doc.id})"
                            style="padding:6px 14px; background:#22c55e; color:white; border:none; border-radius:6px; cursor:pointer; font-size:13px;">
                            ✅ Aprobar
                        </button>
                        <button onclick="DocumentsModule.reject(${doc.id})"
                            style="padding:6px 14px; background:#ef4444; color:white; border:none; border-radius:6px; cursor:pointer; font-size:13px;">
                            ❌ Rechazar
                        </button>` : ''}
                    </div>
                </div>
            `).join('');
        },

        filterDocs(filter) {
            this.currentFilter = filter;
            // Actualizar botones
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
            // Mostrar/ocultar botones según estado
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
                    alert('✅ Documento aprobado');
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