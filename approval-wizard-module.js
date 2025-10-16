// approval-wizard-module.js - Pipeline de Aprobación Estructurado

const ApprovalWizard = {
    currentDriverId: null,
    currentStep: 1,
    totalSteps: 5,
    driverData: null,
    checklistStatus: {
        basicInfo: false,
        documents: false,
        vehicle: false,
        background: false,
        final: false
    },

    init() {
        console.log('🧙 Approval Wizard Module initialized');
    },

    // Abrir el wizard para un conductor específico
    async openWizard(driverId) {
        this.currentDriverId = driverId;
        this.currentStep = 1;
        
        // Obtener datos del conductor
        try {
            const response = await fetch(`${API_URL}/api/drivers/${driverId}`, {
                headers: {
                    'Authorization': localStorage.getItem('adminToken'),
                    'x-admin-id': localStorage.getItem('adminId')
                }
            });
            
            if (!response.ok) throw new Error('Error obteniendo datos del conductor');
            
            this.driverData = await response.json();
            this.showWizardModal();
            this.loadStep(1);
        } catch (error) {
            console.error('Error:', error);
            NotificationService.error('Error al cargar datos del conductor');
        }
    },

    // Mostrar el modal del wizard
    showWizardModal() {
        // Eliminar modal existente si hay uno
        const existingModal = document.getElementById('approvalWizardModal');
        if (existingModal) existingModal.remove();

        const modalHTML = `
            <div id="approvalWizardModal" class="modal" style="display: block; z-index: 10000;">
                <div class="modal-dialog" style="max-width: 900px; margin-top: 20px;">
                    <div class="modal-content">
                        <div class="modal-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                            <h5 class="modal-title">
                                <i class="fas fa-user-check"></i> Pipeline de Aprobación - ${this.driverData.name}
                            </h5>
                            <button type="button" class="close" onclick="ApprovalWizard.closeWizard()" style="color: white;">
                                <span>&times;</span>
                            </button>
                        </div>
                        
                        <!-- Progress Bar -->
                        <div class="wizard-progress" style="padding: 20px; background: #f8f9fa;">
                            <div class="progress" style="height: 30px;">
                                <div id="wizardProgressBar" class="progress-bar" role="progressbar" 
                                     style="width: 20%; background: linear-gradient(90deg, #667eea, #764ba2);">
                                    Paso 1 de 5
                                </div>
                            </div>
                            
                            <!-- Steps Indicators -->
                            <div class="steps-container" style="display: flex; justify-content: space-between; margin-top: 20px;">
                                ${this.generateStepIndicators()}
                            </div>
                        </div>
                        
                        <!-- Content Area -->
                        <div class="modal-body" id="wizardContent" style="min-height: 400px; padding: 30px;">
                            <!-- El contenido del paso se carga aquí -->
                        </div>
                        
                        <!-- Footer with Navigation -->
                        <div class="modal-footer" style="justify-content: space-between;">
                            <button class="btn btn-secondary" id="wizardPrevBtn" onclick="ApprovalWizard.previousStep()">
                                ← Anterior
                            </button>
                            
                            <div class="wizard-status">
                                <span id="wizardStatus" class="badge badge-info">En Proceso</span>
                            </div>
                            
                            <button class="btn btn-primary" id="wizardNextBtn" onclick="ApprovalWizard.nextStep()">
                                Siguiente →
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    },

    // Generar indicadores de pasos
    generateStepIndicators() {
        const steps = [
            { icon: '👤', title: 'Info Básica' },
            { icon: '📄', title: 'Documentos' },
            { icon: '🚗', title: 'Vehículo' },
            { icon: '🔍', title: 'Verificación' },
            { icon: '✅', title: 'Aprobación' }
        ];

        return steps.map((step, index) => {
            const stepNum = index + 1;
            const isActive = stepNum === this.currentStep;
            const isCompleted = stepNum < this.currentStep;
            
            return `
                <div class="step-indicator ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}"
                     style="text-align: center; flex: 1;">
                    <div class="step-circle" style="
                        width: 50px; 
                        height: 50px; 
                        border-radius: 50%; 
                        background: ${isCompleted ? '#28a745' : (isActive ? '#667eea' : '#e9ecef')};
                        color: ${isActive || isCompleted ? 'white' : '#6c757d'};
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin: 0 auto 10px;
                        font-size: 20px;
                        border: 3px solid ${isActive ? '#764ba2' : 'transparent'};
                    ">
                        ${step.icon}
                    </div>
                    <small style="color: ${isActive ? '#667eea' : '#6c757d'}; font-weight: ${isActive ? 'bold' : 'normal'}">
                        ${step.title}
                    </small>
                </div>
            `;
        }).join('');
    },

    // Cargar contenido del paso
    loadStep(stepNumber) {
        const content = document.getElementById('wizardContent');
        const progressBar = document.getElementById('wizardProgressBar');
        const prevBtn = document.getElementById('wizardPrevBtn');
        const nextBtn = document.getElementById('wizardNextBtn');
        
        // Actualizar barra de progreso
        const progress = (stepNumber / this.totalSteps) * 100;
        progressBar.style.width = `${progress}%`;
        progressBar.textContent = `Paso ${stepNumber} de ${this.totalSteps}`;
        
        // Actualizar botones
        prevBtn.disabled = stepNumber === 1;
        prevBtn.style.display = stepNumber === 1 ? 'none' : 'block';
        
        if (stepNumber === this.totalSteps) {
            nextBtn.innerHTML = '✅ Aprobar Conductor';
            nextBtn.className = 'btn btn-success';
        } else {
            nextBtn.innerHTML = 'Siguiente →';
            nextBtn.className = 'btn btn-primary';
        }
        
        // Cargar contenido según el paso
        switch(stepNumber) {
            case 1:
                this.loadBasicInfoStep();
                break;
            case 2:
                this.loadDocumentsStep();
                break;
            case 3:
                this.loadVehicleStep();
                break;
            case 4:
                this.loadBackgroundStep();
                break;
            case 5:
                this.loadFinalStep();
                break;
        }
        
        // Actualizar indicadores
        this.updateStepIndicators();
    },

    // PASO 1: Información Básica
    loadBasicInfoStep() {
        const content = `
            <h4>📋 Paso 1: Verificación de Información Básica</h4>
            <hr>
            
            <div class="row">
                <div class="col-md-6">
                    <div class="info-card" style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                        <h5>Datos Personales</h5>
                        <table class="table table-borderless">
                            <tr><td><strong>Nombre:</strong></td><td>${this.driverData.name || 'No especificado'}</td></tr>
                            <tr><td><strong>Email:</strong></td><td>${this.driverData.email || 'No especificado'}</td></tr>
                            <tr><td><strong>Teléfono:</strong></td><td>${this.driverData.phone || 'No especificado'}</td></tr>
                            <tr><td><strong>Fecha Registro:</strong></td><td>${new Date(this.driverData.created_at).toLocaleDateString()}</td></tr>
                        </table>
                    </div>
                </div>
                
                <div class="col-md-6">
                    <div class="checklist-card" style="background: #fff; border: 2px solid #e9ecef; padding: 20px; border-radius: 8px;">
                        <h5>✔️ Checklist de Verificación</h5>
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" id="checkName" onchange="ApprovalWizard.updateChecklist('name')">
                            <label class="form-check-label" for="checkName">
                                Nombre completo verificado
                            </label>
                        </div>
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" id="checkEmail" onchange="ApprovalWizard.updateChecklist('email')">
                            <label class="form-check-label" for="checkEmail">
                                Email válido y verificado
                            </label>
                        </div>
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" id="checkPhone" onchange="ApprovalWizard.updateChecklist('phone')">
                            <label class="form-check-label" for="checkPhone">
                                Teléfono válido y activo
                            </label>
                        </div>
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" id="checkAge" onchange="ApprovalWizard.updateChecklist('age')">
                            <label class="form-check-label" for="checkAge">
                                Mayor de 18 años
                            </label>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="alert alert-info" style="margin-top: 20px;">
                <i class="fas fa-info-circle"></i> Verifica que todos los datos personales sean correctos antes de continuar.
            </div>
        `;
        
        document.getElementById('wizardContent').innerHTML = content;
    },

    // PASO 2: Documentos
    async loadDocumentsStep() {
        // Obtener documentos del conductor
        let documents = [];
        try {
            const response = await fetch(`${API_URL}/api/documents/driver/${this.currentDriverId}`, {
                headers: {
                    'Authorization': localStorage.getItem('adminToken'),
                    'x-admin-id': localStorage.getItem('adminId')
                }
            });
            
            if (response.ok) {
                documents = await response.json();
            }
        } catch (error) {
            console.error('Error cargando documentos:', error);
        }

        const content = `
            <h4>📄 Paso 2: Verificación de Documentos</h4>
            <hr>
            
            <div class="documents-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
                ${this.generateDocumentCards(documents)}
            </div>
            
            <div class="alert alert-warning" style="margin-top: 20px;">
                <i class="fas fa-exclamation-triangle"></i> Todos los documentos deben estar aprobados para continuar.
            </div>
        `;
        
        document.getElementById('wizardContent').innerHTML = content;
    },

    // Generar tarjetas de documentos
    generateDocumentCards(documents) {
        const requiredDocs = [
            { type: 'license', name: 'Licencia de Conducir', icon: '🚗' },
            { type: 'id_card', name: 'Cédula de Identidad', icon: '🆔' },
            { type: 'criminal_record', name: 'Antecedentes Penales', icon: '📋' },
            { type: 'vehicle_registration', name: 'Matrícula del Vehículo', icon: '📑' }
        ];

        return requiredDocs.map(reqDoc => {
            const doc = documents.find(d => d.document_type === reqDoc.type);
            const status = doc ? doc.status : 'missing';
            const statusColor = {
                'approved': '#28a745',
                'pending': '#ffc107',
                'rejected': '#dc3545',
                'missing': '#6c757d'
            }[status];

            return `
                <div class="document-card" style="
                    border: 2px solid ${statusColor};
                    border-radius: 8px;
                    padding: 15px;
                    background: white;
                ">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div>
                            <span style="font-size: 24px;">${reqDoc.icon}</span>
                            <strong style="margin-left: 10px;">${reqDoc.name}</strong>
                        </div>
                        <span class="badge" style="background: ${statusColor}; color: white; padding: 5px 10px;">
                            ${status === 'missing' ? 'No subido' : status.toUpperCase()}
                        </span>
                    </div>
                    ${doc ? `
                        <div style="margin-top: 10px; font-size: 12px; color: #6c757d;">
                            Subido: ${new Date(doc.upload_date).toLocaleDateString()}
                            ${doc.status === 'approved' ? `<br>Aprobado por: ${doc.reviewed_by}` : ''}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    },

    // PASO 3: Vehículo
    loadVehicleStep() {
        const content = `
            <h4>🚗 Paso 3: Verificación del Vehículo</h4>
            <hr>
            
            <div class="vehicle-info" style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
                <h5>Información del Vehículo</h5>
                <div class="row">
                    <div class="col-md-6">
                        <table class="table table-borderless">
                            <tr><td><strong>Marca:</strong></td><td>${this.driverData.vehicle_brand || 'No especificado'}</td></tr>
                            <tr><td><strong>Modelo:</strong></td><td>${this.driverData.vehicle_model || 'No especificado'}</td></tr>
                            <tr><td><strong>Año:</strong></td><td>${this.driverData.vehicle_year || 'No especificado'}</td></tr>
                            <tr><td><strong>Color:</strong></td><td>${this.driverData.vehicle_color || 'No especificado'}</td></tr>
                        </table>
                    </div>
                    <div class="col-md-6">
                        <table class="table table-borderless">
                            <tr><td><strong>Placa:</strong></td><td>${this.driverData.vehicle_plate || 'No especificado'}</td></tr>
                            <tr><td><strong>Tipo:</strong></td><td>${this.driverData.vehicle_type || 'Sedan'}</td></tr>
                            <tr><td><strong>Capacidad:</strong></td><td>${this.driverData.vehicle_capacity || '4'} pasajeros</td></tr>
                            <tr><td><strong>Estado:</strong></td><td><span class="badge badge-success">Activo</span></td></tr>
                        </table>
                    </div>
                </div>
            </div>
            
            <div class="vehicle-checklist" style="margin-top: 20px;">
                <h5>✔️ Verificación del Vehículo</h5>
                <div class="row">
                    <div class="col-md-6">
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" id="checkVehicleAge">
                            <label class="form-check-label" for="checkVehicleAge">
                                Vehículo menor a 10 años
                            </label>
                        </div>
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" id="checkVehicleCondition">
                            <label class="form-check-label" for="checkVehicleCondition">
                                Buenas condiciones mecánicas
                            </label>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" id="checkVehicleInsurance">
                            <label class="form-check-label" for="checkVehicleInsurance">
                                Seguro vigente
                            </label>
                        </div>
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" id="checkVehicleClean">
                            <label class="form-check-label" for="checkVehicleClean">
                                Limpieza e higiene adecuada
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('wizardContent').innerHTML = content;
    },

    // PASO 4: Verificación de Antecedentes
    loadBackgroundStep() {
        const content = `
            <h4>🔍 Paso 4: Verificación de Antecedentes</h4>
            <hr>
            
            <div class="background-checks">
                <div class="check-item" style="background: white; border-left: 4px solid #28a745; padding: 15px; margin-bottom: 15px;">
                    <h6>✅ Antecedentes Penales</h6>
                    <p class="text-muted mb-0">Sin antecedentes penales registrados</p>
                </div>
                
                <div class="check-item" style="background: white; border-left: 4px solid #28a745; padding: 15px; margin-bottom: 15px;">
                    <h6>✅ Multas de Tránsito</h6>
                    <p class="text-muted mb-0">Sin multas pendientes</p>
                </div>
                
                <div class="check-item" style="background: white; border-left: 4px solid #ffc107; padding: 15px; margin-bottom: 15px;">
                    <h6>⚠️ Historial de Manejo</h6>
                    <p class="text-muted mb-0">2 multas menores en los últimos 3 años (pagadas)</p>
                </div>
                
                <div class="check-item" style="background: white; border-left: 4px solid #28a745; padding: 15px; margin-bottom: 15px;">
                    <h6>✅ Referencias Personales</h6>
                    <p class="text-muted mb-0">3 referencias verificadas positivamente</p>
                </div>
            </div>
            
            <div class="form-group" style="margin-top: 20px;">
                <label><strong>Notas adicionales de verificación:</strong></label>
                <textarea class="form-control" id="backgroundNotes" rows="3" 
                    placeholder="Agregar cualquier observación relevante..."></textarea>
            </div>
        `;
        
        document.getElementById('wizardContent').innerHTML = content;
    },

    // PASO 5: Aprobación Final
    loadFinalStep() {
        const content = `
            <h4>✅ Paso 5: Aprobación Final</h4>
            <hr>
            
            <div class="final-summary" style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
                <h5>Resumen de Verificación</h5>
                
                <table class="table">
                    <tr>
                        <td>👤 Información Básica</td>
                        <td class="text-right"><span class="badge badge-success">Verificado</span></td>
                    </tr>
                    <tr>
                        <td>📄 Documentos</td>
                        <td class="text-right"><span class="badge badge-success">Completos</span></td>
                    </tr>
                    <tr>
                        <td>🚗 Vehículo</td>
                        <td class="text-right"><span class="badge badge-success">Aprobado</span></td>
                    </tr>
                    <tr>
                        <td>🔍 Antecedentes</td>
                        <td class="text-right"><span class="badge badge-success">Limpios</span></td>
                    </tr>
                </table>
            </div>
            
            <div class="approval-decision" style="margin-top: 20px; text-align: center; padding: 20px;">
                <h5>Decisión Final</h5>
                <p>El conductor <strong>${this.driverData.name}</strong> ha completado satisfactoriamente todos los requisitos.</p>
                
                <div class="btn-group" role="group" style="margin-top: 20px;">
                    <button class="btn btn-success btn-lg" onclick="ApprovalWizard.approveDriver()">
                        ✅ Aprobar Conductor
                    </button>
                    <button class="btn btn-warning btn-lg" onclick="ApprovalWizard.requestMoreInfo()">
                        📝 Solicitar Más Información
                    </button>
                    <button class="btn btn-danger btn-lg" onclick="ApprovalWizard.rejectDriver()">
                        ❌ Rechazar
                    </button>
                </div>
            </div>
            
            <div class="alert alert-info" style="margin-top: 20px;">
                <i class="fas fa-info-circle"></i> Una vez aprobado, el conductor recibirá una notificación y podrá comenzar a recibir viajes.
            </div>
        `;
        
        document.getElementById('wizardContent').innerHTML = content;
        
        // Ocultar el botón "Siguiente" en el paso final
        document.getElementById('wizardNextBtn').style.display = 'none';
    },

    // Actualizar indicadores de pasos
    updateStepIndicators() {
        const modal = document.querySelector('.steps-container');
        if (modal) {
            modal.innerHTML = this.generateStepIndicators();
        }
    },

    // Navegar al siguiente paso
    nextStep() {
        if (this.currentStep < this.totalSteps) {
            this.currentStep++;
            this.loadStep(this.currentStep);
        }
    },

    // Navegar al paso anterior
    previousStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.loadStep(this.currentStep);
        }
    },

    // Aprobar conductor
    async approveDriver() {
        try {
            const response = await fetch(`${API_URL}/api/admin/drivers/${this.currentDriverId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': localStorage.getItem('adminToken'),
                    'x-admin-id': localStorage.getItem('adminId')
                },
                body: JSON.stringify({ status: 'active' })
            });

            if (response.ok) {
                NotificationService.success(`✅ Conductor ${this.driverData.name} aprobado exitosamente`);
                this.closeWizard();
                // Recargar la lista de conductores si existe
                if (typeof loadDrivers === 'function') {
                    loadDrivers();
                }
            } else {
                throw new Error('Error al aprobar conductor');
            }
        } catch (error) {
            console.error('Error:', error);
            NotificationService.error('Error al aprobar el conductor');
        }
    },

    // Rechazar conductor
    async rejectDriver() {
        const reason = prompt('Por favor, ingrese el motivo del rechazo:');
        if (!reason) return;

        try {
            const response = await fetch(`${API_URL}/api/admin/drivers/${this.currentDriverId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': localStorage.getItem('adminToken'),
                    'x-admin-id': localStorage.getItem('adminId')
                },
                body: JSON.stringify({ 
                    status: 'suspended',
                    rejection_reason: reason 
                })
            });

            if (response.ok) {
                NotificationService.error(`❌ Conductor ${this.driverData.name} rechazado`);
                this.closeWizard();
                if (typeof loadDrivers === 'function') {
                    loadDrivers();
                }
            } else {
                throw new Error('Error al rechazar conductor');
            }
        } catch (error) {
            console.error('Error:', error);
            NotificationService.error('Error al rechazar el conductor');
        }
    },

    // Solicitar más información
    requestMoreInfo() {
        alert('Funcionalidad para solicitar más información al conductor (próximamente)');
    },

    // Actualizar checklist
    updateChecklist(item) {
        // Aquí puedes guardar el estado del checklist si lo necesitas
        console.log(`Checklist item ${item} actualizado`);
    },

    // Cerrar wizard
    closeWizard() {
        const modal = document.getElementById('approvalWizardModal');
        if (modal) {
            modal.remove();
        }
        this.currentDriverId = null;
        this.currentStep = 1;
    }
};

// Inicializar cuando el documento esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ApprovalWizard.init());
} else {
    ApprovalWizard.init();
}

// Exportar para uso global
window.ApprovalWizard = ApprovalWizard;