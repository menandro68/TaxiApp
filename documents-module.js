// MÓDULO DE GESTIÓN DE DOCUMENTOS - COMPLETAMENTE INDEPENDIENTE
// Este módulo NO modifica ninguna funcionalidad existente del panel

const DocumentsModule = {
    // URL del backend
    API_URL: 'http://localhost:3000/api',
    
    // Estado del módulo
    currentFilter: 'all',
    documents: [],
    
    // Inicializar el módulo (se llamará solo cuando se necesite)
    init() {
        console.log('📄 Módulo de documentos inicializado');
    },
    
    // Crear el HTML de la sección de documentos
    getDocumentsHTML() {
        return `
            <div class="documents-section" style="padding: 20px;">
                <div class="documents-header" style="margin-bottom: 30px;">
                    <h2 style="color: #333; font-size: 28px; margin-bottom: 10px;">
                        📋 Verificación de Documentos
                    </h2>
                    <p style="color: #666;">Revisa y aprueba los documentos de los conductores</p>
                </div>
                
                <!-- Estadísticas -->
                <div class="documents-stats" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px; color: white;">
                        <div style="font-size: 32px; font-weight: bold;" id="total-docs">0</div>
                        <div style="font-size: 14px; opacity: 0.9;">Total Documentos</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 20px; border-radius: 10px; color: white;">
                        <div style="font-size: 32px; font-weight: bold;" id="pending-docs">0</div>
                        <div style="font-size: 14px; opacity: 0.9;">Pendientes</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 20px; border-radius: 10px; color: white;">
                        <div style="font-size: 32px; font-weight: bold;" id="approved-docs">0</div>
                        <div style="font-size: 14px; opacity: 0.9;">Aprobados</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); padding: 20px; border-radius: 10px; color: white;">
                        <div style="font-size: 32px; font-weight: bold;" id="rejected-docs">0</div>
                        <div style="font-size: 14px; opacity: 0.9;">Rechazados</div>
                    </div>
                </div>
                
                <!-- Filtros -->
                <div style="margin-bottom: 20px;">
                    <button onclick="DocumentsModule.filterDocuments('all')" class="filter-btn" style="padding: 10px 20px; margin-right: 10px; border: none; border-radius: 5px; cursor: pointer; background: #6c757d; color: white;">
                        Todos
                    </button>
                    <button onclick="DocumentsModule.filterDocuments('pending')" class="filter-btn" style="padding: 10px 20px; margin-right: 10px; border: none; border-radius: 5px; cursor: pointer; background: #ffc107; color: black;">
                        Pendientes
                    </button>
                    <button onclick="DocumentsModule.filterDocuments('approved')" class="filter-btn" style="padding: 10px 20px; margin-right: 10px; border: none; border-radius: 5px; cursor: pointer; background: #28a745; color: white;">
                        Aprobados
                    </button>
                    <button onclick="DocumentsModule.filterDocuments('rejected')" class="filter-btn" style="padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; background: #dc3545; color: white;">
                        Rechazados
                    </button>
                </div>
                
                <!-- Lista de documentos -->
                <div id="documents-list" style="background: white; border-radius: 10px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <div style="text-align: center; padding: 40px; color: #999;">
                        Cargando documentos...
                    </div>
                </div>
            </div>
        `;
    },
    
    // Cargar documentos desde el servidor
    async loadDocuments() {
        try {
            const response = await fetch(`${this.API_URL}/documents/pending`);
            const data = await response.json();
            
            if (data.success) {
                this.documents = data.documents;
                this.updateDocumentsList();
                await this.loadStats();
            }
        } catch (error) {
            console.error('Error cargando documentos:', error);
            this.showError('Error al cargar documentos');
        }
    },
    
    // Cargar estadísticas
    async loadStats() {
        try {
            const response = await fetch(`${this.API_URL}/documents/stats`);
            const data = await response.json();
            
            if (data.success) {
                document.getElementById('total-docs').textContent = data.stats.total;
                document.getElementById('pending-docs').textContent = data.stats.pending;
                document.getElementById('approved-docs').textContent = data.stats.approved;
                document.getElementById('rejected-docs').textContent = data.stats.rejected;
            }
        } catch (error) {
            console.error('Error cargando estadísticas:', error);
        }
    },
    
    // Actualizar lista de documentos
    updateDocumentsList() {
        const listContainer = document.getElementById('documents-list');
        
        if (!this.documents || this.documents.length === 0) {
            listContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #999;">
                    No hay documentos pendientes de revisión
                </div>
            `;
            return;
        }
        
        let html = '<div style="overflow-x: auto;">';
        html += '<table style="width: 100%; border-collapse: collapse;">';
        html += `
            <thead>
                <tr style="border-bottom: 2px solid #dee2e6;">
                    <th style="padding: 12px; text-align: left;">Conductor</th>
                    <th style="padding: 12px; text-align: left;">Tipo Documento</th>
                    <th style="padding: 12px; text-align: left;">Fecha Subida</th>
                    <th style="padding: 12px; text-align: left;">Estado</th>
                    <th style="padding: 12px; text-align: left;">Acciones</th>
                </tr>
            </thead>
            <tbody>
        `;
        
        this.documents.forEach(doc => {
            const statusBadge = this.getStatusBadge(doc.status);
            const uploadDate = new Date(doc.uploaded_at).toLocaleDateString();
            
            html += `
                <tr style="border-bottom: 1px solid #dee2e6;">
                    <td style="padding: 12px;">
                        <strong>${doc.driver_name || 'Conductor ' + doc.driver_id}</strong><br>
                        <small style="color: #666;">${doc.driver_email || ''}</small>
                    </td>
                    <td style="padding: 12px;">${this.getDocumentTypeName(doc.document_type)}</td>
                    <td style="padding: 12px;">${uploadDate}</td>
                    <td style="padding: 12px;">${statusBadge}</td>
                    <td style="padding: 12px;">
                        <button onclick="DocumentsModule.viewDocument(${doc.id})" 
                                style="padding: 5px 10px; margin-right: 5px; border: none; border-radius: 3px; background: #007bff; color: white; cursor: pointer;">
                            Ver
                        </button>
                        ${doc.status === 'pending' ? `
                            <button onclick="DocumentsModule.approveDocument(${doc.id})" 
                                    style="padding: 5px 10px; margin-right: 5px; border: none; border-radius: 3px; background: #28a745; color: white; cursor: pointer;">
                                Aprobar
                            </button>
                            <button onclick="DocumentsModule.rejectDocument(${doc.id})" 
                                    style="padding: 5px 10px; border: none; border-radius: 3px; background: #dc3545; color: white; cursor: pointer;">
                                Rechazar
                            </button>
                        ` : ''}
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table></div>';
        listContainer.innerHTML = html;
    },
    
    // Obtener badge de estado
    getStatusBadge(status) {
        const badges = {
            pending: '<span style="padding: 4px 8px; border-radius: 4px; background: #ffc107; color: black; font-size: 12px;">Pendiente</span>',
            approved: '<span style="padding: 4px 8px; border-radius: 4px; background: #28a745; color: white; font-size: 12px;">Aprobado</span>',
            rejected: '<span style="padding: 4px 8px; border-radius: 4px; background: #dc3545; color: white; font-size: 12px;">Rechazado</span>'
        };
        return badges[status] || badges.pending;
    },
    
    // Obtener nombre del tipo de documento
    getDocumentTypeName(type) {
        const types = {
            'license': '📄 Licencia de Conducir',
            'insurance': '📋 Seguro del Vehículo',
            'registration': '🚗 Registro Vehicular',
            'id': '🆔 Identificación',
            'criminal_record': '👮 Antecedentes Penales'
        };
        return types[type] || type;
    },
    
    // Ver documento
    viewDocument(id) {
        const doc = this.documents.find(d => d.id === id);
        if (doc && doc.document_url) {
            window.open(`http://localhost:3000${doc.document_url}`, '_blank');
        } else {
            alert('No se puede ver el documento');
        }
    },
    
    // Aprobar documento
    async approveDocument(id) {
        if (!confirm('¿Estás seguro de aprobar este documento?')) return;
        
        try {
            const response = await fetch(`${this.API_URL}/documents/${id}/approve`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reviewed_by: 1 })
            });
            
            const data = await response.json();
            if (data.success) {
                this.showSuccess('Documento aprobado exitosamente');
                await this.loadDocuments();
            }
        } catch (error) {
            console.error('Error:', error);
            this.showError('Error al aprobar el documento');
        }
    },
    
    // Rechazar documento
    async rejectDocument(id) {
        const reason = prompt('Por favor, indica la razón del rechazo:');
        if (!reason) return;
        
        try {
            const response = await fetch(`${this.API_URL}/documents/${id}/reject`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    reviewed_by: 1,
                    rejection_reason: reason 
                })
            });
            
            const data = await response.json();
            if (data.success) {
                this.showSuccess('Documento rechazado');
                await this.loadDocuments();
            }
        } catch (error) {
            console.error('Error:', error);
            this.showError('Error al rechazar el documento');
        }
    },
    
    // Filtrar documentos
    async filterDocuments(status) {
        this.currentFilter = status;
        // Aquí podrías implementar filtrado local o hacer una nueva petición
        await this.loadDocuments();
    },
    
    // Mostrar mensaje de éxito
    showSuccess(message) {
        // Usar el sistema de notificaciones existente si está disponible
        if (window.showNotification) {
            window.showNotification(message, 'success');
        } else {
            alert('✅ ' + message);
        }
    },
    
    // Mostrar mensaje de error
    showError(message) {
        // Usar el sistema de notificaciones existente si está disponible
        if (window.showNotification) {
            window.showNotification(message, 'error');
        } else {
            alert('❌ ' + message);
        }
    }
};

// Hacer el módulo disponible globalmente
window.DocumentsModule = DocumentsModule;