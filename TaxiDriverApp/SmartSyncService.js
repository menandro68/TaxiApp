import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const API_URL = 'https://web-production-99844.up.railway.app';

class SmartSyncService {
  constructor() {
    this.syncQueue = [];
    this.isSyncing = false;
    this.lastSyncTime = null;
    this.onTripSynced = null;
    this.onRouteRecalculateNeeded = null;
    this.syncPriorities = {
      CRITICAL: 1,
      HIGH: 2,
      NORMAL: 3,
      LOW: 4
    };
  }

  // Registrar callbacks para notificar a la app
  setCallbacks({ onTripSynced, onRouteRecalculateNeeded }) {
    this.onTripSynced = onTripSynced;
    this.onRouteRecalculateNeeded = onRouteRecalculateNeeded;
  }

  // Guardar viaje activo localmente
  async saveActiveTrip(trip) {
    if (!trip) return;
    try {
      await AsyncStorage.setItem('activeTrip', JSON.stringify({
        ...trip,
        savedAt: new Date().toISOString()
      }));
      console.log('💾 Viaje guardado localmente:', trip.id);
    } catch (error) {
      console.error('❌ Error guardando viaje:', error);
    }
  }

  // Obtener viaje guardado
  async getActiveTrip() {
    try {
      const trip = await AsyncStorage.getItem('activeTrip');
      return trip ? JSON.parse(trip) : null;
    } catch (error) {
      console.error('❌ Error obteniendo viaje:', error);
      return null;
    }
  }

  // Limpiar viaje guardado
  async clearActiveTrip() {
    try {
      await AsyncStorage.removeItem('activeTrip');
      console.log('🗑️ Viaje local eliminado');
    } catch (error) {
      console.error('❌ Error limpiando viaje:', error);
    }
  }

  // Guardar última ubicación conocida
  async saveLastLocation(location) {
    if (!location) return;
    try {
      await AsyncStorage.setItem('lastKnownLocation', JSON.stringify({
        ...location,
        savedAt: new Date().toISOString()
      }));
    } catch (error) {
      console.error('❌ Error guardando ubicación:', error);
    }
  }

  // Obtener última ubicación
  async getLastLocation() {
    try {
      const location = await AsyncStorage.getItem('lastKnownLocation');
      return location ? JSON.parse(location) : null;
    } catch (error) {
      return null;
    }
  }

  // SINCRONIZACIÓN PRINCIPAL AL RECUPERAR CONEXIÓN
  async syncOnReconnect(currentLocation, currentTrip) {
    console.log('🔄 Iniciando sincronización completa...');
    
    const isOnline = await this.checkConnection();
    if (!isOnline) {
      console.log('❌ Sin conexión - sincronización cancelada');
      return { success: false, reason: 'no_connection' };
    }

    const results = {
      tripSynced: false,
      tripStatus: null,
      routeRecalculated: false,
      pendingActionsSynced: false
    };

    try {
      // 1. Sincronizar estado del viaje con el servidor
      if (currentTrip?.id) {
        const tripSync = await this.syncTripWithServer(currentTrip.id);
        results.tripSynced = tripSync.success;
        results.tripStatus = tripSync.status;
        
        if (tripSync.success && this.onTripSynced) {
          this.onTripSynced(tripSync.data);
        }

        // 2. Si el viaje sigue activo, solicitar recálculo de ruta
        if (tripSync.success && tripSync.status === 'in_progress') {
          results.routeRecalculated = true;
          if (this.onRouteRecalculateNeeded && currentLocation) {
            this.onRouteRecalculateNeeded(currentLocation);
          }
        }
      }

      // 3. Procesar acciones pendientes en cola
      await this.processSyncQueue();
      results.pendingActionsSynced = true;

      // 4. Actualizar ubicación en servidor
      if (currentLocation && currentTrip?.id) {
        await this.updateLocationOnServer(currentTrip.id, currentLocation);
      }

      console.log('✅ Sincronización completa:', results);
      return { success: true, results };

    } catch (error) {
      console.error('❌ Error en sincronización:', error);
      return { success: false, error: error.message };
    }
  }

  // Sincronizar viaje con servidor
  async syncTripWithServer(tripId) {
    try {
      console.log('🔍 Verificando estado del viaje en servidor:', tripId);
      
      const response = await fetch(`${API_URL}/api/trips/${tripId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.trip) {
        const trip = data.trip;
        console.log('📡 Estado del viaje en servidor:', trip.status);
        
        // Verificar si el viaje fue cancelado mientras estábamos offline
        if (trip.status === 'cancelled') {
          console.log('⚠️ Viaje fue cancelado mientras estabas offline');
          return { success: true, status: 'cancelled', data: trip };
        }
        
        // Verificar si el viaje sigue activo
        if (['accepted', 'in_progress', 'arrived'].includes(trip.status)) {
          return { success: true, status: 'in_progress', data: trip };
        }
        
        // Viaje completado
        if (trip.status === 'completed') {
          return { success: true, status: 'completed', data: trip };
        }

        return { success: true, status: trip.status, data: trip };
      }

      return { success: false, reason: 'invalid_response' };

    } catch (error) {
      console.error('❌ Error sincronizando viaje:', error);
      return { success: false, error: error.message };
    }
  }

  // Actualizar ubicación en servidor
  async updateLocationOnServer(tripId, location) {
    try {
      await fetch(`${API_URL}/api/trips/${tripId}/location`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude,
          heading: location.heading || 0,
          speed: location.speed || 0,
          timestamp: new Date().toISOString()
        })
      });
      console.log('📍 Ubicación actualizada en servidor');
    } catch (error) {
      console.error('❌ Error actualizando ubicación:', error);
    }
  }

  // Agregar item a la cola con prioridad
  addToSyncQueue(data, priority = this.syncPriorities.NORMAL) {
    const syncItem = {
      id: Date.now().toString(),
      data,
      priority,
      timestamp: new Date().toISOString(),
      attempts: 0,
      maxAttempts: 3
    };

    this.syncQueue.push(syncItem);
    this.syncQueue.sort((a, b) => a.priority - b.priority);
    this.saveSyncQueue();

    console.log(`📦 Item agregado a cola - Prioridad: ${priority}`);

    if (!this.isSyncing) {
      this.processSyncQueue();
    }
  }

  // Guardar cola en AsyncStorage
  async saveSyncQueue() {
    try {
      await AsyncStorage.setItem('syncQueue', JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('❌ Error guardando cola:', error);
    }
  }

  // Cargar cola desde AsyncStorage
  async loadSyncQueue() {
    try {
      const queue = await AsyncStorage.getItem('syncQueue');
      this.syncQueue = queue ? JSON.parse(queue) : [];
    } catch (error) {
      this.syncQueue = [];
    }
  }

  // Procesar cola de sincronización
  async processSyncQueue() {
    if (this.isSyncing || this.syncQueue.length === 0) return;

    await this.loadSyncQueue();
    this.isSyncing = true;

    console.log(`🔄 Procesando ${this.syncQueue.length} items en cola...`);

    while (this.syncQueue.length > 0) {
      const item = this.syncQueue[0];

      try {
        const isOnline = await this.checkConnection();
        if (!isOnline) {
          console.log('📡 Sin conexión - pausando sincronización');
          break;
        }

        await this.syncItem(item);
        this.syncQueue.shift();
        await this.saveSyncQueue();

      } catch (error) {
        console.error('❌ Error sincronizando:', error);
        item.attempts++;

        if (item.attempts >= item.maxAttempts) {
          console.log('⚠️ Máximo de intentos alcanzado, removiendo item');
          this.syncQueue.shift();
        } else {
          this.syncQueue.shift();
          this.syncQueue.push(item);
          this.syncQueue.sort((a, b) => a.priority - b.priority);
        }
        await this.saveSyncQueue();
        await this.wait(Math.pow(2, item.attempts) * 1000);
      }
    }

    this.isSyncing = false;
  }

  // Sincronizar un item específico
  async syncItem(item) {
    const { type, payload } = item.data;
    console.log(`🔄 Sincronizando: ${type}`);

    switch (type) {
      case 'UPDATE_TRIP_STATUS':
        await fetch(`${API_URL}/api/trips/status/${payload.tripId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: payload.status })
        });
        break;

      case 'UPDATE_LOCATION':
        await this.updateLocationOnServer(payload.tripId, payload.location);
        break;

      case 'COMPLETE_TRIP':
        await fetch(`${API_URL}/api/trips/status/${payload.tripId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'completed' })
        });
        break;

      default:
        console.log('Tipo no reconocido:', type);
    }

    console.log(`✅ ${type} sincronizado`);
  }

  // Verificar conexión
  async checkConnection() {
    try {
      const state = await NetInfo.fetch();
      return state.isConnected && state.isInternetReachable;
    } catch {
      return false;
    }
  }

  // Helper para esperar
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Limpiar cola
  clearSyncQueue() {
    this.syncQueue = [];
    AsyncStorage.removeItem('syncQueue');
    console.log('🗑️ Cola de sincronización limpiada');
  }
}

export default new SmartSyncService();