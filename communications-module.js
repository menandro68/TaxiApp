// Módulo de Comunicados Masivos para Conductores
const CommunicationsModule = {
    // Inicialización del módulo
    init: function() {
        console.log('Módulo de Comunicados Masivos iniciado');
    },

    // Función para mostrar el panel de comunicados
    showCommunicationsPanel: function() {
        return `
            <div class="communications-panel">
                <h2>📢 Comunicados Masivos a Conductores</h2>
                
                <div class="comm-form-container">
                    <h3>Nuevo Comunicado</h3>
                    
                    <div class="form-group">
                        <label>Tipo de Comunicado:</label>
                        <select id="commType" class="form-control">
                            <option value="general">General</option>
                            <option value="urgente">Urgente</option>
                            <option value="mantenimiento">Mantenimiento</option>
                            <option value="promocion">Promoción</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Asunto:</label>
                        <input type="text" id="commSubject" class="form-control" 
                               placeholder="Asunto del comunicado">
                    </div>
                    
                    <div class="form-group">
                        <label>Mensaje:</label>
                        <textarea id="commMessage" class="form-control" rows="5" 
                                  placeholder="Escribe el mensaje aquí..."></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label>Destinatarios:</label>
                        <select id="commRecipients" class="form-control">
                            <option value="todos">Todos los conductores</option>
                            <option value="activos">Solo conductores activos</option>
                            <option value="inactivos">Solo conductores inactivos</option>
                            <option value="seleccionados">Conductores seleccionados</option>
                        </select>
                    </div>
                    
                    <div class="button-group">
                        <button onclick="CommunicationsModule.previewMessage()" 
                                class="btn btn-secondary">
                            Vista Previa
                        </button>
                        <button onclick="CommunicationsModule.sendMassMessage()" 
                                class="btn btn-primary">
                            Enviar Comunicado
                        </button>
                    </div>
                </div>
                
                <div id="commPreview" class="preview-container" style="display:none;">
                    <!-- Vista previa del mensaje -->
                </div>
                
                <div class="comm-history">
                    <h3>Historial de Comunicados</h3>
                    <div id="commHistoryList">
                        <!-- Lista de comunicados enviados -->
                    </div>
                </div>
            </div>
        `;
    },

    // Vista previa del mensaje
    previewMessage: function() {
        const type = document.getElementById('commType').value;
        const subject = document.getElementById('commSubject').value;
        const message = document.getElementById('commMessage').value;
        const recipients = document.getElementById('commRecipients').value;
        
        if (!subject || !message) {
            alert('Por favor complete el asunto y mensaje');
            return;
        }
        
        const preview = document.getElementById('commPreview');
        preview.innerHTML = `
            <h4>Vista Previa del Comunicado</h4>
            <div class="preview-content">
                <p><strong>Tipo:</strong> ${type}</p>
                <p><strong>Asunto:</strong> ${subject}</p>
                <p><strong>Mensaje:</strong></p>
                <div class="message-preview">${message}</div>
                <p><strong>Destinatarios:</strong> ${recipients}</p>
            </div>
        `;
        preview.style.display = 'block';
    },

    // Enviar mensaje masivo
    sendMassMessage: async function() {
        const type = document.getElementById('commType').value;
        const subject = document.getElementById('commSubject').value;
        const message = document.getElementById('commMessage').value;
        const recipients = document.getElementById('commRecipients').value;
        
        if (!subject || !message) {
            alert('Por favor complete todos los campos requeridos');
            return;
        }
        
        if (!confirm('¿Está seguro de enviar este comunicado?')) {
            return;
        }
        
        try {
            // Aquí se conectará con tu backend
            console.log('Enviando comunicado...', {
                type,
                subject,
                message,
                recipients,
                timestamp: new Date().toISOString()
            });
            
            // Simulación de envío exitoso
            alert('✅ Comunicado enviado exitosamente');
            
            // Limpiar formulario
            document.getElementById('commSubject').value = '';
            document.getElementById('commMessage').value = '';
            document.getElementById('commPreview').style.display = 'none';
            
            // Actualizar historial
            this.loadCommunicationHistory();
            
        } catch (error) {
            console.error('Error al enviar comunicado:', error);
            alert('❌ Error al enviar el comunicado');
        }
    },

    // Cargar historial de comunicados
    loadCommunicationHistory: function() {
        // Aquí se cargarán los comunicados enviados desde el backend
        const historyList = document.getElementById('commHistoryList');
        if (historyList) {
            historyList.innerHTML = `
                <div class="history-item">
                    <span class="history-date">Hoy - 10:30 AM</span>
                    <span class="history-subject">Mantenimiento programado</span>
                    <span class="history-recipients">Todos los conductores</span>
                </div>
            `;
        }
    }
};

// Exportar el módulo para uso global
window.CommunicationsModule = CommunicationsModule;

// Estilos CSS para el módulo de comunicados
CommunicationsModule.styles = `
    <style>
    .communications-panel {
        padding: 20px;
        background: #f8f9fa;
        border-radius: 8px;
    }
    
    .comm-form-container {
        background: white;
        padding: 20px;
        border-radius: 8px;
        margin-bottom: 20px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .form-group {
        margin-bottom: 15px;
    }
    
    .form-group label {
        display: block;
        margin-bottom: 5px;
        font-weight: 600;
        color: #333;
    }
    
    .form-control {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
    }
    
    .form-control:focus {
        outline: none;
        border-color: #4CAF50;
        box-shadow: 0 0 0 2px rgba(76,175,80,0.1);
    }
    
    textarea.form-control {
        resize: vertical;
        min-height: 100px;
    }
    
    .button-group {
        margin-top: 20px;
        display: flex;
        gap: 10px;
    }
    
    .btn {
        padding: 10px 20px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        transition: all 0.3s;
    }
    
    .btn-primary {
        background: #4CAF50;
        color: white;
    }
    
    .btn-primary:hover {
        background: #45a049;
    }
    
    .btn-secondary {
        background: #6c757d;
        color: white;
    }
    
    .btn-secondary:hover {
        background: #5a6268;
    }
    
    .preview-container {
        background: #fff3cd;
        border: 1px solid #ffc107;
        border-radius: 4px;
        padding: 15px;
        margin-top: 20px;
    }
    
    .preview-content {
        margin-top: 10px;
    }
    
    .message-preview {
        background: white;
        padding: 10px;
        border-radius: 4px;
        margin: 10px 0;
        white-space: pre-wrap;
    }
    
    .comm-history {
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .history-item {
        display: flex;
        justify-content: space-between;
        padding: 10px;
        border-bottom: 1px solid #eee;
        font-size: 14px;
    }
    
    .history-item:hover {
        background: #f8f9fa;
    }
    
    .history-date {
        color: #6c757d;
        min-width: 120px;
    }
    
    .history-subject {
        flex: 1;
        font-weight: 600;
        margin: 0 15px;
    }
    
    .history-recipients {
        color: #6c757d;
    }
    </style>
`;

// Función para inyectar estilos
CommunicationsModule.injectStyles = function() {
    if (!document.getElementById('comm-module-styles')) {
        const styleElement = document.createElement('div');
        styleElement.id = 'comm-module-styles';
        styleElement.innerHTML = this.styles;
        document.head.appendChild(styleElement);
    }
};