// MÓDULO DE SOPORTE - SISTEMA DE TICKETS
const SupportModule = {
    API_URL: 'http://localhost:3000/api',
    currentTickets: [],
    selectedTicket: null,
    refreshInterval: null,
    
    // Inicializar
    init() {
        console.log('💬 Módulo de soporte inicializado');
        this.loadTickets();
        this.startAutoRefresh();
    },
    
    // HTML principal
    getHTML() {
        return `
            <div class="support-section" style="padding: 20px;">
                <div class="support-header" style="margin-bottom: 20px;">
                    <h2 style="color: #333; font-size: 28px; margin-bottom: 10px;">
                        💬 Centro de Soporte
                    </h2>
                    <p style="color: #666;">Gestión de tickets y mensajes de usuarios/conductores</p>
                </div>
                
                <!-- Estadísticas -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 30px;">
                    <div style="background: #dc3545; padding: 15px; border-radius: 8px; color: white; text-align: center;">
                        <div style="font-size: 24px; font-weight: bold;" id="tickets-open">0</div>
                        <div style="font-size: 12px;">Abiertos</div>
                    </div>
                    <div style="background: #ffc107; padding: 15px; border-radius: 8px; color: white; text-align: center;">
                        <div style="font-size: 24px; font-weight: bold;" id="tickets-unread">0</div>
                        <div style="font-size: 12px;">Sin leer</div>
                    </div>
                    <div style="background: #28a745; padding: 15px; border-radius: 8px; color: white; text-align: center;">
                        <div style="font-size: 24px; font-weight: bold;" id="tickets-closed">0</div>
                        <div style="font-size: 12px;">Resueltos</div>
                    </div>
                    <div style="background: #6c757d; padding: 15px; border-radius: 8px; color: white; text-align: center;">
                        <div style="font-size: 24px; font-weight: bold;" id="tickets-total">0</div>
                        <div style="font-size: 12px;">Total</div>
                    </div>
                </div>
                
                <!-- Contenedor principal -->
                <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 20px;">
                    <!-- Lista de tickets -->
                    <div style="background: white; border-radius: 10px; padding: 15px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-height: 600px; overflow-y: auto;">
                        <h3 style="margin-bottom: 15px;">📋 Tickets</h3>
                        <div id="tickets-list">
                            <div style="text-align: center; padding: 40px; color: #999;">
                                Cargando tickets...
                            </div>
                        </div>
                    </div>
                    
                    <!-- Chat/Mensajes -->
                    <div style="background: white; border-radius: 10px; padding: 15px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <div id="chat-container">
                            <div style="text-align: center; padding: 100px 20px; color: #999;">
                                Selecciona un ticket para ver la conversación
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },
    
    // Cargar tickets
    async loadTickets() {
        try {
            const response = await fetch(`${this.API_URL}/support/tickets`);
            const data = await response.json();
            
            if (data.success) {
                this.currentTickets = data.tickets;
                this.updateTicketsList();
                await this.loadStats();
            }
        } catch (error) {
            console.error('Error cargando tickets:', error);
        }
    },
    
    // Cargar estadísticas
    async loadStats() {
        try {
            const response = await fetch(`${this.API_URL}/support/stats`);
            const data = await response.json();
            
            if (data.success) {
                document.getElementById('tickets-open').textContent = data.stats.open;
                document.getElementById('tickets-unread').textContent = data.stats.unread;
                document.getElementById('tickets-closed').textContent = data.stats.closed;
                document.getElementById('tickets-total').textContent = data.stats.total;
            }
        } catch (error) {
            console.error('Error cargando estadísticas:', error);
        }
    },
    
    // Actualizar lista de tickets
    updateTicketsList() {
        const container = document.getElementById('tickets-list');
        
        if (!this.currentTickets || this.currentTickets.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #999;">
                    No hay tickets en este momento
                </div>
            `;
            return;
        }
        
        let html = '';
        this.currentTickets.forEach(ticket => {
            const unreadBadge = ticket.unread_count > 0 ? 
                `<span style="background: #dc3545; color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px; margin-left: 5px;">${ticket.unread_count}</span>` : '';
            
            const statusColor = ticket.status === 'open' ? '#dc3545' : '#28a745';
            const userTypeIcon = ticket.user_type === 'driver' ? '🚗' : '👤';
            
            html += `
                <div onclick="SupportModule.selectTicket(${ticket.id})" 
                     style="padding: 10px; border: 1px solid #eee; border-radius: 5px; margin-bottom: 10px; cursor: pointer; transition: all 0.2s;"
                     onmouseover="this.style.backgroundColor='#f8f9fa'" 
                     onmouseout="this.style.backgroundColor='white'">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-weight: bold; margin-bottom: 5px;">
                                ${userTypeIcon} ${ticket.user_name || `${ticket.user_type} #${ticket.user_id}`}
                                ${unreadBadge}
                            </div>
                            <div style="font-size: 12px; color: #666; margin-bottom: 3px;">
                                ${ticket.subject}
                            </div>
                            <div style="font-size: 11px; color: #999;">
                                ${new Date(ticket.created_at).toLocaleString()}
                            </div>
                        </div>
                        <div style="width: 10px; height: 10px; background: ${statusColor}; border-radius: 50%;"></div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    },
    
    // Seleccionar ticket
    async selectTicket(ticketId) {
        this.selectedTicket = ticketId;
        const container = document.getElementById('chat-container');
        
        container.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                Cargando mensajes...
            </div>
        `;
        
        try {
            const response = await fetch(`${this.API_URL}/support/tickets/${ticketId}/messages`);
            const data = await response.json();
            
            if (data.success) {
                this.displayChat(ticketId, data.messages);
            }
        } catch (error) {
            console.error('Error cargando mensajes:', error);
        }
    },
    
    // Mostrar chat
    displayChat(ticketId, messages) {
        const ticket = this.currentTickets.find(t => t.id === ticketId);
        const container = document.getElementById('chat-container');
        
        let html = `
            <div style="border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 15px;">
                <h4 style="margin: 0;">${ticket.subject}</h4>
                <small style="color: #666;">
                    ${ticket.user_type === 'driver' ? 'Conductor' : 'Usuario'}: ${ticket.user_name || `#${ticket.user_id}`}
                </small>
                ${ticket.status === 'open' ? 
                    `<button onclick="SupportModule.closeTicket(${ticketId})" 
                            style="float: right; background: #28a745; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">
                        Cerrar Ticket
                    </button>` : 
                    `<span style="float: right; color: #28a745;">✓ Resuelto</span>`
                }
            </div>
            
            <div style="height: 350px; overflow-y: auto; padding: 10px; background: #f8f9fa; border-radius: 5px;" id="messages-container">
        `;
        
        messages.forEach(msg => {
            const isAdmin = msg.sender_type === 'admin';
            const alignment = isAdmin ? 'flex-end' : 'flex-start';
            const bgColor = isAdmin ? '#007bff' : '#e9ecef';
            const textColor = isAdmin ? 'white' : 'black';
            
            html += `
                <div style="display: flex; justify-content: ${alignment}; margin-bottom: 10px;">
                    <div style="max-width: 70%; background: ${bgColor}; color: ${textColor}; padding: 10px; border-radius: 10px;">
                        <div style="font-size: 11px; opacity: 0.8; margin-bottom: 5px;">
                            ${msg.sender_name} - ${new Date(msg.created_at).toLocaleTimeString()}
                        </div>
                        <div>${msg.message}</div>
                    </div>
                </div>
            `;
        });
        
        html += `
            </div>
            
            ${ticket.status === 'open' ? `
                <div style="margin-top: 15px;">
                    <div style="display: flex; gap: 10px;">
                        <input type="text" id="reply-message" placeholder="Escribe tu respuesta..." 
                               style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 5px;"
                               onkeypress="if(event.key === 'Enter') SupportModule.sendReply(${ticketId})">
                        <button onclick="SupportModule.sendReply(${ticketId})" 
                                style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">
                            Enviar
                        </button>
                    </div>
                </div>
            ` : ''}
        `;
        
        container.innerHTML = html;
        
        // Scroll al final
        const msgContainer = document.getElementById('messages-container');
        if (msgContainer) {
            msgContainer.scrollTop = msgContainer.scrollHeight;
        }
    },
    
    // Enviar respuesta
    async sendReply(ticketId) {
        const input = document.getElementById('reply-message');
        const message = input.value.trim();
        
        if (!message) return;
        
        try {
            const response = await fetch(`${this.API_URL}/support/tickets/${ticketId}/reply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message })
            });
            
            if (response.ok) {
                input.value = '';
                await this.selectTicket(ticketId);
                await this.loadStats();
            }
        } catch (error) {
            console.error('Error enviando mensaje:', error);
        }
    },
    
    // Cerrar ticket
    async closeTicket(ticketId) {
        if (!confirm('¿Estás seguro de cerrar este ticket?')) return;
        
        try {
            const response = await fetch(`${this.API_URL}/support/tickets/${ticketId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'closed' })
            });
            
            if (response.ok) {
                await this.loadTickets();
                await this.selectTicket(ticketId);
            }
        } catch (error) {
            console.error('Error cerrando ticket:', error);
        }
    },
    
    // Auto-refresh
    startAutoRefresh() {
        this.refreshInterval = setInterval(() => {
            this.loadTickets();
            if (this.selectedTicket) {
                this.selectTicket(this.selectedTicket);
            }
        }, 10000); // Cada 10 segundos
    },
    
    // Limpiar
    cleanup() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }
};

// Hacer disponible globalmente
window.SupportModule = SupportModule;