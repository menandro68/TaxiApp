// pagination-module.js
if (typeof window.API_URL === 'undefined') { window.API_URL = `${window.location.origin}/api`; }
// M�DULO DE PAGINACI�N - NO AFECTA EL C�DIGO EXISTENTE
const PaginationModule = {
    // Estado de paginaci�n por pantalla
    state: {
        drivers: { page: 1, limit: 10, total: 0, pages: 0 },
        users: { page: 1, limit: 10, total: 0, pages: 0 },
        trips: { page: 1, limit: 20, total: 0, pages: 0 }
    },

    // Crear controles de paginaci�n
    createControls: function(screenName, data) {
        const state = this.state[screenName];
        if (!state || state.total === 0) return '';

        const startRecord = ((state.page - 1) * state.limit) + 1;
        const endRecord = Math.min(state.page * state.limit, state.total);
        
        let html = '<div class="pagination-controls" style="display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-top: 1px solid #e5e7eb; background: white;">';
        html += '<div style="color: #6b7280; font-size: 0.875rem;">Mostrando ' + startRecord + ' - ' + endRecord + ' de ' + state.total + ' registros</div>';
        html += '<div style="display: flex; gap: 8px;">';
        
        // Botones de navegaci�n
        const isFirstPage = state.page === 1;
        const isLastPage = state.page === state.pages;
        
        html += '<button onclick="PaginationModule.goToPage(\'' + screenName + '\', 1)" ' + (isFirstPage ? 'disabled' : '') + ' style="padding: 6px 12px; border: 1px solid #d1d5db; border-radius: 6px; background: white; cursor: pointer;">Primera</button>';
        html += '<button onclick="PaginationModule.goToPage(\'' + screenName + '\', ' + (state.page - 1) + ')" ' + (isFirstPage ? 'disabled' : '') + ' style="padding: 6px 12px; border: 1px solid #d1d5db; border-radius: 6px; background: white; cursor: pointer;">Anterior</button>';
        html += '<span style="padding: 6px 12px;">P�gina ' + state.page + ' de ' + state.pages + '</span>';
        html += '<button onclick="PaginationModule.goToPage(\'' + screenName + '\', ' + (state.page + 1) + ')" ' + (isLastPage ? 'disabled' : '') + ' style="padding: 6px 12px; border: 1px solid #d1d5db; border-radius: 6px; background: white; cursor: pointer;">Siguiente</button>';
        html += '<button onclick="PaginationModule.goToPage(\'' + screenName + '\', ' + state.pages + ')" ' + (isLastPage ? 'disabled' : '') + ' style="padding: 6px 12px; border: 1px solid #d1d5db; border-radius: 6px; background: white; cursor: pointer;">�ltima</button>';
        
        // Selector de l�mite
        html += '<select onchange="PaginationModule.changeLimit(\'' + screenName + '\', this.value)" style="padding: 6px; border: 1px solid #d1d5db; border-radius: 6px; margin-left: 16px;">';
        html += '<option value="10">10 por p�gina</option>';
        html += '<option value="25">25 por p�gina</option>';
        html += '<option value="50">50 por p�gina</option>';
        html += '<option value="100">100 por p�gina</option>';
        html += '</select>';
        
        html += '</div></div>';
        return html;
    },

    // Cambiar p�gina
    goToPage: async function(screenName, page) {
        if (page < 1 || page > this.state[screenName].pages) return;
        
        this.state[screenName].page = page;
        
        // Recargar datos con nueva p�gina
        if (screenName === 'drivers') {
            await loadDriversWithPagination();
        } else if (screenName === 'users') {
            await loadUsersWithPagination();
        } else if (screenName === 'trips') {
            await loadTripsWithPagination();
        }
    },

    // Cambiar l�mite de registros
    changeLimit: async function(screenName, limit) {
        this.state[screenName].limit = parseInt(limit);
        this.state[screenName].page = 1; // Resetear a primera p�gina
        
        // Recargar con nuevo l�mite
        if (screenName === 'drivers') {
            await loadDriversWithPagination();
        } else if (screenName === 'users') {
            await loadUsersWithPagination();
        } else if (screenName === 'trips') {
            await loadTripsWithPagination();
        }
    },

    // Actualizar estado de paginaci�n
    updateState: function(screenName, total) {
        const state = this.state[screenName];
        state.total = total;
        state.pages = Math.ceil(total / state.limit);
    }
};

// NUEVAS FUNCIONES QUE COEXISTEN CON LAS ORIGINALES
async function loadDriversWithPagination() {
    try {
        // Primero, obtener el total de conductores
        const response = await fetch(`${API_URL}/drivers`);
        const result = await response.json();
        
        if (result && result.drivers) {
            const allDrivers = result.drivers;
            const state = PaginationModule.state.drivers;
            
            // Actualizar estado con el total
            PaginationModule.updateState('drivers', allDrivers.length);
            
            // Paginar manualmente los resultados
            const start = (state.page - 1) * state.limit;
            const end = start + state.limit;
            const paginatedDrivers = allDrivers.slice(start, end);
            
            // Usar la funci�n renderDrivers existente
            renderDrivers(paginatedDrivers);
            
            // Actualizar badge con el total
            updateDriversBadge(allDrivers.length);
            
            // Agregar controles de paginaci�n
            const tableContainer = document.querySelector('#drivers .data-table-container');
            if (tableContainer) {
                const existingControls = tableContainer.querySelector('.pagination-controls');
                if (existingControls) existingControls.remove();
                
                tableContainer.insertAdjacentHTML('beforeend', PaginationModule.createControls('drivers'));
            }
        }
    } catch (error) {
        console.error('Error cargando conductores con paginaci�n:', error);
        // Fallback a la funci�n original
        console.log('Usando funci�n loadDrivers original por error');
        loadDrivers();
        return;
    }
}

async function loadUsersWithPagination() {
    try {
        const response = await fetch(`${API_URL}/users`);
        const result = await response.json();
        
        if (result && result.users) {
            const allUsers = result.users;
            const state = PaginationModule.state.users;
            
            // Actualizar estado con el total
            PaginationModule.updateState('users', allUsers.length);
            
            // Paginar manualmente
            const start = (state.page - 1) * state.limit;
            const end = start + state.limit;
            const paginatedUsers = allUsers.slice(start, end);
            
            // Renderizar
            renderUsers(paginatedUsers);
            
            // Agregar controles
            const tableContainer = document.querySelector('#users .data-table-container');
            if (tableContainer) {
                const existingControls = tableContainer.querySelector('.pagination-controls');
                if (existingControls) existingControls.remove();
                
                tableContainer.insertAdjacentHTML('beforeend', PaginationModule.createControls('users'));
            }
        }
    } catch (error) {
        console.error('Error cargando usuarios con paginaci�n:', error);
        if (typeof loadUsers !== 'undefined') {
            loadUsers();
        }
    }
}

async function loadTripsWithPagination() {
    try {
        const response = await fetch(`${API_URL}/trips`);
        const result = await response.json();
        
        if (result && result.trips) {
            const allTrips = result.trips;
            const state = PaginationModule.state.trips;
            
            // Actualizar estado con el total
            PaginationModule.updateState('trips', allTrips.length);
            
            // Paginar manualmente
            const start = (state.page - 1) * state.limit;
            const end = start + state.limit;
            const paginatedTrips = allTrips.slice(start, end);
            
            // Renderizar
            renderTrips(paginatedTrips);
            
            // Agregar controles
            const tableContainer = document.querySelector('#trips .data-table-container');
            if (tableContainer) {
                const existingControls = tableContainer.querySelector('.pagination-controls');
                if (existingControls) existingControls.remove();
                
                tableContainer.insertAdjacentHTML('beforeend', PaginationModule.createControls('trips'));
            }
        }
    } catch (error) {
        console.error('Error cargando viajes con paginaci�n:', error);
        if (typeof loadTrips !== 'undefined') {
            loadTrips();
        }
    }
}

// Log para verificar que el m�dulo carga
console.log('M�dulo de paginaci�n cargado correctamente');
