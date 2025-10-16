// Módulo de Reasignación Automática de Viajes
const TripReassignmentModule = {
    
    // Estado del módulo
    activeReassignments: new Map(), // Viajes en proceso de reasignación
    reassignmentAttempts: new Map(), // Intentos de reasignación por viaje
    maxAttempts: 3, // Máximo de intentos de reasignación
    
    // Inicializar módulo
    init: function() {
        console.log('🔄 Módulo de Reasignación Automática iniciado');
        this.setupWebSocketListeners();
        this.injectStyles();
    },

    // Configurar listeners de WebSocket
    setupWebSocketListeners: function() {
        // Simular WebSocket - en producción usar socket real
        window.addEventListener('trip-cancelled-by-driver', (event) => {
            this.handleDriverCancellation(event.detail);
        });
    },

    // Manejar cancelación por conductor
    handleDriverCancellation: async function(cancellationData) {
        const { tripId, driverId, driverName, userId, userName, pickupLocation, destination } = cancellationData;
        
        console.log(`⚠️ Conductor ${driverName} canceló el viaje ${tripId}`);
        
        // Registrar el intento de reasignación
        const attempts = this.reassignmentAttempts.get(tripId) || 0;
        this.reassignmentAttempts.set(tripId, attempts + 1);
        
        // Verificar si excedimos los intentos máximos
        if (attempts >= this.maxAttempts) {
            this.handleReassignmentFailure(tripId, userId, userName);
            return;
        }
        
        // Notificar al usuario inmediatamente
        this.notifyUserOfCancellation(userId, userName, driverName);
        
        // Mostrar estado de búsqueda en el panel
        this.showReassignmentStatus(tripId, 'searching');
        
        // Buscar nuevo conductor
        await this.findNewDriver(tripId, userId, pickupLocation, destination);
    },

    // Notificar al usuario de la cancelación
    notifyUserOfCancellation: function(userId, userName, driverName) {
        // Crear notificación visual en el panel
        const notification = `
            <div class="reassignment-notification warning">
                <div class="notification-icon">⚠️</div>
                <div class="notification-content">
                    <strong>Conductor Canceló</strong>
                    <p>${driverName} canceló el viaje de ${userName}</p>
                    <p>Buscando nuevo conductor automáticamente...</p>
                </div>
                <div class="notification-time">${new Date().toLocaleTimeString()}</div>
            </div>
        `;
        
        this.displayNotification(notification);
        
        // En producción: enviar push notification al usuario
        this.sendPushNotification(userId, {
            title: "El conductor canceló tu viaje",
            body: "Estamos buscando otro conductor automáticamente",
            type: "driver_cancelled"
        });
    },

    // Buscar nuevo conductor
    findNewDriver: async function(tripId, userId, pickupLocation, destination) {
        this.activeReassignments.set(tripId, {
            status: 'searching',
            startTime: Date.now(),
            attempts: this.reassignmentAttempts.get(tripId)
        });
        
        try {
            // Simular búsqueda de conductores disponibles
            const availableDrivers = await this.getAvailableDrivers(pickupLocation);
            
            if (availableDrivers.length > 0) {
                // Asignar el primer conductor disponible
                const newDriver = availableDrivers[0];
                await this.assignNewDriver(tripId, userId, newDriver);
            } else {
                // No hay conductores disponibles
                setTimeout(() => {
                    this.handleDriverCancellation({
                        tripId, userId, 
                        pickupLocation, destination
                    });
                }, 5000); // Reintentar en 5 segundos
            }
        } catch (error) {
            console.error('Error buscando nuevo conductor:', error);
            this.handleReassignmentError(tripId, userId, error);
        }
    },

    // Obtener conductores disponibles
    getAvailableDrivers: async function(pickupLocation) {
        // En producción: llamar a la API real
        // const response = await fetch(`/api/drivers/available?location=${pickupLocation}`);
        
        // Simulación de conductores disponibles
        return new Promise((resolve) => {
            setTimeout(() => {
                const mockDrivers = [
                    { id: 101, name: "Carlos Pérez", rating: 4.8, eta: "3 min", vehicle: "Toyota Corolla" },
                    { id: 102, name: "María González", rating: 4.9, eta: "5 min", vehicle: "Honda Civic" },
                    { id: 103, name: "José Rodríguez", rating: 4.7, eta: "7 min", vehicle: "Nissan Sentra" }
                ];
                
                // 70% de probabilidad de encontrar conductor
                if (Math.random() > 0.3) {
                    resolve(mockDrivers);
                } else {
                    resolve([]);
                }
            }, 2000);
        });
    },

    // Asignar nuevo conductor
    assignNewDriver: async function(tripId, userId, newDriver) {
        try {
            // En producción: llamar a la API real
            // await fetch(`/api/trips/${tripId}/assign-driver`, { ... });
            
            // Actualizar estado
            this.activeReassignments.set(tripId, {
                status: 'assigned',
                driver: newDriver,
                assignedTime: Date.now()
            });
            
            // Notificar éxito
            this.notifyUserOfNewDriver(userId, newDriver);
            this.showReassignmentStatus(tripId, 'success', newDriver);
            
            // Limpiar después de 5 segundos
            setTimeout(() => {
                this.activeReassignments.delete(tripId);
                this.reassignmentAttempts.delete(tripId);
            }, 5000);
            
        } catch (error) {
            console.error('Error asignando nuevo conductor:', error);
            this.handleReassignmentError(tripId, userId, error);
        }
    },

    // Notificar al usuario del nuevo conductor
    notifyUserOfNewDriver: function(userId, driver) {
        const notification = `
            <div class="reassignment-notification success">
                <div class="notification-icon">✅</div>
                <div class="notification-content">
                    <strong>¡Nuevo Conductor Asignado!</strong>
                    <p>${driver.name} (⭐ ${driver.rating})</p>
                    <p>${driver.vehicle} - ETA: ${driver.eta}</p>
                </div>
                <div class="notification-time">${new Date().toLocaleTimeString()}</div>
            </div>
        `;
        
        this.displayNotification(notification);
        
        // Enviar push notification
        this.sendPushNotification(userId, {
            title: "¡Nuevo conductor asignado!",
            body: `${driver.name} llegará en ${driver.eta}`,
            type: "new_driver_assigned",
            driverInfo: driver
        });
    },

    // Manejar fallo en la reasignación
    handleReassignmentFailure: function(tripId, userId, userName) {
        const notification = `
            <div class="reassignment-notification error">
                <div class="notification-icon">❌</div>
                <div class="notification-content">
                    <strong>No se pudo reasignar</strong>
                    <p>No hay conductores disponibles para ${userName}</p>
                    <p>El viaje ha sido cancelado</p>
                </div>
                <div class="notification-time">${new Date().toLocaleTimeString()}</div>
            </div>
        `;
        
        this.displayNotification(notification);
        
        // Notificar al usuario
        this.sendPushNotification(userId, {
            title: "No hay conductores disponibles",
            body: "Tu viaje ha sido cancelado. Por favor intenta nuevamente.",
            type: "trip_cancelled_no_drivers"
        });
        
        // Limpiar estado
        this.activeReassignments.delete(tripId);
        this.reassignmentAttempts.delete(tripId);
    },

    // Mostrar estado de reasignación en el panel
    showReassignmentStatus: function(tripId, status, driver = null) {
        const statusContainer = document.getElementById(`trip-status-${tripId}`);
        if (!statusContainer) return;
        
        let statusHtml = '';
        switch(status) {
            case 'searching':
                statusHtml = '<span class="status-searching">🔄 Buscando conductor...</span>';
                break;
            case 'success':
                statusHtml = `<span class="status-success">✅ Reasignado a ${driver.name}</span>`;
                break;
            case 'failed':
                statusHtml = '<span class="status-failed">❌ Reasignación fallida</span>';
                break;
        }
        
        statusContainer.innerHTML = statusHtml;
    },

    // Mostrar notificación en el panel
    displayNotification: function(notificationHtml) {
        // Crear contenedor si no existe
        let container = document.getElementById('reassignment-notifications');
        if (!container) {
            container = document.createElement('div');
            container.id = 'reassignment-notifications';
            document.body.appendChild(container);
        }
        
        // Agregar notificación
        const notifElement = document.createElement('div');
        notifElement.innerHTML = notificationHtml;
        container.appendChild(notifElement);
        
        // Auto-remover después de 10 segundos
        setTimeout(() => {
            notifElement.style.opacity = '0';
            setTimeout(() => notifElement.remove(), 500);
        }, 10000);
    },

    // Enviar push notification (simulado)
    sendPushNotification: function(userId, data) {
        console.log(`📱 Push notification para usuario ${userId}:`, data);
        
        // En producción: usar servicio real de push notifications
        // fetch('/api/notifications/push', {
        //     method: 'POST',
        //     body: JSON.stringify({ userId, ...data })
        // });
    },

    // Panel de monitoreo de reasignaciones
    getMonitoringPanel: function() {
        const activeReassignments = Array.from(this.activeReassignments.entries());
        
        return `
            <div class="reassignment-monitor">
                <h3>🔄 Reasignaciones Activas</h3>
                ${activeReassignments.length === 0 ? 
                    '<p>No hay reasignaciones en proceso</p>' :
                    activeReassignments.map(([tripId, data]) => `
                        <div class="reassignment-item">
                            <span>Viaje #${tripId}</span>
                            <span>Estado: ${data.status}</span>
                            <span>Intentos: ${data.attempts || 1}</span>
                        </div>
                    `).join('')
                }
            </div>
        `;
    },

    // Estilos CSS
    styles: `
        <style>
        #reassignment-notifications {
            position: fixed;
            top: 80px;
            right: 20px;
            width: 350px;
            z-index: 10000;
        }

        .reassignment-notification {
            background: white;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            align-items: flex-start;
            gap: 12px;
            animation: slideIn 0.3s ease;
            transition: opacity 0.5s;
        }

        @keyframes slideIn {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }

        .reassignment-notification.warning {
            border-left: 4px solid #f59e0b;
        }

        .reassignment-notification.success {
            border-left: 4px solid #22c55e;
        }

        .reassignment-notification.error {
            border-left: 4px solid #ef4444;
        }

        .notification-icon {
            font-size: 24px;
            flex-shrink: 0;
        }

        .notification-content {
            flex: 1;
        }

        .notification-content strong {
            display: block;
            margin-bottom: 4px;
            color: #1f2937;
        }

        .notification-content p {
            margin: 2px 0;
            color: #6b7280;
            font-size: 14px;
        }

        .notification-time {
            font-size: 12px;
            color: #9ca3af;
        }

        .status-searching {
            color: #f59e0b;
            font-weight: 600;
        }

        .status-success {
            color: #22c55e;
            font-weight: 600;
        }

        .status-failed {
            color: #ef4444;
            font-weight: 600;
        }

        .reassignment-monitor {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }

        .reassignment-item {
            display: flex;
            justify-content: space-between;
            padding: 10px;
            border-bottom: 1px solid #e5e7eb;
        }
        </style>
    `,

    // Inyectar estilos
    injectStyles: function() {
        if (!document.getElementById('reassignment-styles')) {
            const styleElement = document.createElement('div');
            styleElement.id = 'reassignment-styles';
            styleElement.innerHTML = this.styles;
            document.head.appendChild(styleElement);
        }
    }
};

// Exportar módulo
window.TripReassignmentModule = TripReassignmentModule;