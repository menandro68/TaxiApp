// dynamic-pricing-module.js - Sistema de Control de Tarifas Dinámicas
(function() {
    'use strict';
    
    window.DynamicPricing = {
        config: null,
        currentTab: 'timeSlots',
        updateInterval: null,
        chart: null,
        
        init: function() {
            this.loadConfig();
            this.startRealtimeUpdates();
            this.initChart();
            this.bindEvents();
        },
        
        bindEvents: function() {
            // Cerrar modal al hacer clic fuera
            window.onclick = (event) => {
                const modal = document.getElementById('eventModal');
                if (event.target == modal) {
                    this.closeEventModal();
                }
            };
        },
        
        loadConfig: async function() {
            try {
                const response = await fetch(${window.location.origin}/api/dynamic-pricing/config');
                this.config = await response.json();
                
                this.renderTimeSlots();
                this.renderDays();
                this.renderDemandLevels();
                this.renderEvents();
                this.updateCurrentMultiplier();
                this.loadStats();
                
            } catch (error) {
                console.error('Error cargando configuración:', error);
                this.showNotification('Error al cargar configuración', 'error');
            }
        },
        
        startRealtimeUpdates: function() {
            // Actualizar cada 30 segundos
            this.updateInterval = setInterval(() => {
                this.updateCurrentMultiplier();
                this.updateChart();
            }, 30000);
            
            // Actualizar reloj cada segundo
            setInterval(() => {
                this.updateClock();
            }, 1000);
            
            this.updateClock();
        },
        
        updateClock: function() {
            const now = new Date();
            const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
            
            document.getElementById('currentTime').textContent = 
                now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            document.getElementById('currentDay').textContent = days[now.getDay()];
        },
        
        updateCurrentMultiplier: async function() {
            try {
                const response = await fetch(${window.location.origin}/api/dynamic-pricing/current-multiplier');
                const data = await response.json();
                
                document.getElementById('currentMultiplier').textContent = data.total.toFixed(1) + 'x';
                
                if (data.details.timeSlot) {
                    document.getElementById('timeSlotName').textContent = data.details.timeSlot;
                }
                if (data.details.day) {
                    document.getElementById('dayMultiplier').textContent = data.day.toFixed(1) + 'x';
                }
                
                // Simular nivel de demanda (esto vendría del backend en producción)
                const demandLevels = ['Baja', 'Normal', 'Alta', 'Muy Alta'];
                const randomDemand = demandLevels[Math.floor(Math.random() * demandLevels.length)];
                document.getElementById('demandLevel').textContent = randomDemand;
                
            } catch (error) {
                console.error('Error actualizando multiplicador:', error);
            }
        },
        
        renderTimeSlots: function() {
            const container = document.getElementById('timeSlotsGrid');
            if (!this.config.timeSlots) return;
            
            container.innerHTML = this.config.timeSlots.map(slot => `
                <div class="time-slot-card">
                    <div class="time-slot-header">
                        <div>
                            <div class="time-slot-name">${slot.slot_name}</div>
                            <div class="time-slot-hours">${slot.start_time} - ${slot.end_time}</div>
                        </div>
                        <label class="switch">
                            <input type="checkbox" 
                                   ${slot.active ? 'checked' : ''} 
                                   onchange="DynamicPricing.toggleTimeSlot(${slot.id}, this.checked)">
                            <span class="slider"></span>
                        </label>
                    </div>
                    <div class="multiplier-control">
                        <input type="range" 
                               class="multiplier-slider" 
                               min="0.5" 
                               max="3" 
                               step="0.1" 
                               value="${slot.multiplier}"
                               oninput="DynamicPricing.updateTimeSlotMultiplier(${slot.id}, this.value, this.nextElementSibling)"
                               onchange="DynamicPricing.saveTimeSlotMultiplier(${slot.id}, this.value)">
                        <span class="multiplier-display-value">${slot.multiplier}x</span>
                    </div>
                </div>
            `).join('');
        },
        
        renderDays: function() {
            const container = document.getElementById('daysGrid');
            if (!this.config.dayMultipliers) return;
            
            container.innerHTML = this.config.dayMultipliers.map(day => `
                <div class="day-card">
                    <div class="day-name">${day.day_name}</div>
                    <div class="day-multiplier">${day.multiplier}x</div>
                    <div class="multiplier-control">
                        <input type="range" 
                               class="multiplier-slider" 
                               min="0.5" 
                               max="2" 
                               step="0.1" 
                               value="${day.multiplier}"
                               oninput="DynamicPricing.updateDayMultiplier(${day.day_of_week}, this.value, this.parentElement.previousElementSibling)"
                               onchange="DynamicPricing.saveDayMultiplier(${day.day_of_week}, this.value)">
                    </div>
                </div>
            `).join('');
        },
        
        renderDemandLevels: function() {
            const container = document.getElementById('demandLevels');
            if (!this.config.demandLevels) return;
            
            const icons = {
                low: '📉',
                normal: '📊',
                high: '📈',
                very_high: '🚀',
                extreme: '🔥'
            };
            
            container.innerHTML = this.config.demandLevels.map(level => `
                <div class="demand-level-card">
                    <div class="demand-icon demand-${level.level}">${icons[level.level] || '📊'}</div>
                    <div class="demand-info">
                        <div class="demand-name">${level.level_name}</div>
                        <div class="demand-threshold">Activación: ${level.threshold}+ viajes activos</div>
                    </div>
                    <div class="multiplier-control" style="width: 200px;">
                        <input type="range" 
                               class="multiplier-slider" 
                               min="0.5" 
                               max="3" 
                               step="0.1" 
                               value="${level.multiplier}"
                               oninput="DynamicPricing.updateDemandMultiplier('${level.level}', this.value, this.nextElementSibling)"
                               onchange="DynamicPricing.saveDemandMultiplier('${level.level}', this.value)">
                        <span class="multiplier-display-value">${level.multiplier}x</span>
                    </div>
                </div>
            `).join('');
        },
        
        renderEvents: function() {
            const container = document.getElementById('eventsList');
            if (!this.config.specialEvents || this.config.specialEvents.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #7f8c8d;">
                        <i class="fas fa-calendar-times" style="font-size: 48px; margin-bottom: 20px;"></i>
                        <p>No hay eventos especiales programados</p>
                    </div>
                `;
                return;
            }
            
            container.innerHTML = this.config.specialEvents.map(event => `
                <div class="event-card">
                    <div class="event-info">
                        <div class="event-name">${event.event_name}</div>
                        <div class="event-dates">
                            ${new Date(event.start_date).toLocaleDateString()} - 
                            ${new Date(event.end_date).toLocaleDateString()}
                        </div>
                    </div>
                    <div class="event-multiplier">${event.multiplier}x</div>
                    <button class="btn btn-danger btn-sm" onclick="DynamicPricing.deleteEvent(${event.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `).join('');
        },
        
        updateTimeSlotMultiplier: function(id, value, display) {
            display.textContent = parseFloat(value).toFixed(1) + 'x';
        },
        
        saveTimeSlotMultiplier: async function(id, value) {
            try {
                const response = await fetch(`http://localhost:3000/api/dynamic-pricing/time-slot/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        multiplier: parseFloat(value), 
                        active: true 
                    })
                });
                
                if (response.ok) {
                    this.showNotification('Multiplicador actualizado', 'success');
                    this.updateCurrentMultiplier();
                }
            } catch (error) {
                console.error('Error:', error);
                this.showNotification('Error al actualizar', 'error');
            }
        },
        
        toggleTimeSlot: async function(id, active) {
            try {
                const slot = this.config.timeSlots.find(s => s.id === id);
                const response = await fetch(`http://localhost:3000/api/dynamic-pricing/time-slot/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        multiplier: slot.multiplier,
                        active: active 
                    })
                });
                
                if (response.ok) {
                    this.showNotification(
                        active ? 'Franja horaria activada' : 'Franja horaria desactivada',
                        'success'
                    );
                }
            } catch (error) {
                console.error('Error:', error);
                this.showNotification('Error al cambiar estado', 'error');
            }
        },
        
        updateDayMultiplier: function(day, value, display) {
            display.textContent = parseFloat(value).toFixed(1) + 'x';
        },
        
        saveDayMultiplier: async function(day, value) {
            try {
                const response = await fetch(`http://localhost:3000/api/dynamic-pricing/day/${day}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        multiplier: parseFloat(value), 
                        active: true 
                    })
                });
                
                if (response.ok) {
                    this.showNotification('Multiplicador del día actualizado', 'success');
                    this.updateCurrentMultiplier();
                }
            } catch (error) {
                console.error('Error:', error);
                this.showNotification('Error al actualizar', 'error');
            }
        },
        
        updateDemandMultiplier: function(level, value, display) {
            display.textContent = parseFloat(value).toFixed(1) + 'x';
        },
        
        saveDemandMultiplier: async function(level, value) {
            try {
                const demand = this.config.demandLevels.find(d => d.level === level);
                const response = await fetch(`http://localhost:3000/api/dynamic-pricing/demand/${level}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        multiplier: parseFloat(value),
                        threshold: demand.threshold,
                        active: true 
                    })
                });
                
                if (response.ok) {
                    this.showNotification('Multiplicador de demanda actualizado', 'success');
                }
            } catch (error) {
                console.error('Error:', error);
                this.showNotification('Error al actualizar', 'error');
            }
        },
        
        switchTab: function(tabName) {
            // Ocultar todos los tabs
            document.querySelectorAll('.tab-panel').forEach(panel => {
                panel.classList.remove('active');
            });
            
            // Desactivar todos los botones
            document.querySelectorAll('.tab-button').forEach(button => {
                button.classList.remove('active');
            });
            
            // Activar el tab seleccionado
            document.getElementById(tabName).classList.add('active');
            event.target.classList.add('active');
            
            this.currentTab = tabName;
        },
        
        openEventModal: function() {
            document.getElementById('eventModal').style.display = 'block';
            
            // Establecer fechas por defecto
            const now = new Date();
            const later = new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 horas después
            
            document.getElementById('eventStart').value = now.toISOString().slice(0, 16);
            document.getElementById('eventEnd').value = later.toISOString().slice(0, 16);
        },
        
        closeEventModal: function() {
            document.getElementById('eventModal').style.display = 'none';
            document.getElementById('eventName').value = '';
            document.getElementById('eventMultiplier').value = '1.5';
            document.getElementById('eventDescription').value = '';
        },
        
        saveEvent: async function() {
            const eventData = {
                event_name: document.getElementById('eventName').value,
                start_date: document.getElementById('eventStart').value,
                end_date: document.getElementById('eventEnd').value,
                multiplier: parseFloat(document.getElementById('eventMultiplier').value),
                description: document.getElementById('eventDescription').value
            };
            
            if (!eventData.event_name) {
                this.showNotification('Por favor ingresa un nombre para el evento', 'error');
                return;
            }
            
            try {
                const response = await fetch(${window.location.origin}/api/dynamic-pricing/event', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(eventData)
                });
                
                if (response.ok) {
                    this.showNotification('Evento creado exitosamente', 'success');
                    this.closeEventModal();
                    this.loadConfig(); // Recargar configuración
                }
            } catch (error) {
                console.error('Error:', error);
                this.showNotification('Error al crear evento', 'error');
            }
        },
        
        deleteEvent: async function(eventId) {
            if (!confirm('¿Estás seguro de eliminar este evento?')) return;
            
            try {
                const response = await fetch(`http://localhost:3000/api/dynamic-pricing/event/${eventId}`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    this.showNotification('Evento eliminado', 'success');
                    this.loadConfig();
                }
            } catch (error) {
                console.error('Error:', error);
                this.showNotification('Error al eliminar evento', 'error');
            }
        },
        
        loadStats: async function() {
            try {
                const response = await fetch(${window.location.origin}/api/dynamic-pricing/stats');
                const stats = await response.json();
                
                // Actualizar estadísticas en la UI
                document.getElementById('todayTrips').textContent = stats.today.trips || 0;
                document.getElementById('avgMultiplier').textContent = 
                    (stats.week.avg_multiplier || 1).toFixed(1) + 'x';
                document.getElementById('surgeRevenue').textContent = 
                    '$' + (stats.today.avg_surge_amount || 0).toFixed(0);
                document.getElementById('maxMultiplier').textContent = 
                    (stats.today.max_multiplier || 1).toFixed(1) + 'x';
                    
            } catch (error) {
                console.error('Error cargando estadísticas:', error);
            }
        },
        
        initChart: function() {
            const ctx = document.getElementById('multiplierChart').getContext('2d');
            
            // Generar datos de ejemplo para las últimas 24 horas
            const labels = [];
            const data = [];
            const now = new Date();
            
            for (let i = 23; i >= 0; i--) {
                const hour = new Date(now - i * 60 * 60 * 1000);
                labels.push(hour.getHours() + ':00');
                
                // Simular multiplicadores basados en la hora
                let multiplier = 1.0;
                const h = hour.getHours();
                if (h >= 6 && h <= 9) multiplier = 1.3;
                else if (h >= 17 && h <= 20) multiplier = 1.4;
                else if (h >= 22 || h <= 5) multiplier = 1.5;
                
                // Agregar variación aleatoria
                multiplier += (Math.random() - 0.5) * 0.2;
                data.push(Math.max(0.8, Math.min(2.0, multiplier)));
            }
            
            this.chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Multiplicador',
                        data: data,
                        borderColor: 'rgb(74, 144, 226)',
                        backgroundColor: 'rgba(74, 144, 226, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: false,
                            min: 0.5,
                            max: 2.5,
                            ticks: {
                                callback: function(value) {
                                    return value.toFixed(1) + 'x';
                                }
                            }
                        }
                    }
                }
            });
        },
        
        updateChart: function() {
            if (!this.chart) return;
            
            // Actualizar con nuevos datos (en producción vendría del backend)
            const newData = this.chart.data.datasets[0].data;
            newData.shift();
            newData.push(Math.random() * 0.5 + 1.0);
            
            this.chart.update();
        },
        
        showNotification: function(message, type = 'info') {
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.innerHTML = `
                <i class="fas fa-${type === 'success' ? 'check' : 'exclamation'}-circle"></i>
                ${message}
            `;
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.classList.add('show');
            }, 10);
            
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }
    };
    
    // Inicializar cuando el DOM esté listo
    document.addEventListener('DOMContentLoaded', function() {
        DynamicPricing.init();
    });
})();