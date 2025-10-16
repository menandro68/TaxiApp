import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

class SmartSyncService {
  constructor() {
    this.syncQueue = [];
    this.isSyncing = false;
    this.lastSyncTime = null;
    this.syncPriorities = {
      CRITICAL: 1,    // Viajes activos, emergencias
      HIGH: 2,        // Aceptación/rechazo de viajes
      NORMAL: 3,      // Actualizaciones de ubicación
      LOW: 4          // Estadísticas, histórico
    };
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
    
    console.log(`📦 Item agregado a cola de sincronización - Prioridad: ${priority}`);
    
    // Si no está sincronizando, iniciar
    if (!this.isSyncing) {
      this.processSyncQueue();
    }
  }

  // Procesar cola de sincronización
  async processSyncQueue() {
    if (this.isSyncing || this.syncQueue.length === 0) return;
    
    this.isSyncing = true;
    
    while (this.syncQueue.length > 0) {
      const item = this.syncQueue[0];
      
      try {
        const isOnline = await this.checkConnection();
        
        if (!isOnline) {
          console.log('📡 Sin conexión - pausando sincronización');
          break;
        }
        
        await this.syncItem(item);
        this.syncQueue.shift(); // Remover item procesado
        
      } catch (error) {
        console.error('❌ Error sincronizando:', error);
        item.attempts++;
        
        if (item.attempts >= item.maxAttempts) {
          console.log('⚠️ Máximo de intentos alcanzado, removiendo item');
          this.syncQueue.shift();
        } else {
          // Mover al final de la cola con su prioridad
          this.syncQueue.shift();
          this.syncQueue.push(item);
          this.syncQueue.sort((a, b) => a.priority - b.priority);
        }
        
        // Esperar antes de reintentar (backoff exponencial)
        await this.wait(Math.pow(2, item.attempts) * 1000);
      }
    }
    
    this.isSyncing = false;
  }

  // Sincronizar un item específico
  async syncItem(item) {
    console.log(`🔄 Sincronizando item con prioridad ${item.priority}`);
    
    // Aquí iría la lógica real de sincronización con el servidor
    // Por ahora simulamos con un delay
    await this.wait(500);
    
    console.log(`✅ Item sincronizado exitosamente`);
  }

  // Verificar conexión
  async checkConnection() {
    const state = await NetInfo.fetch();
    return state.isConnected && state.isInternetReachable;
  }

  // Helper para esperar
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Obtener cambios desde última sincronización
  async getChangedData() {
    const lastSync = await AsyncStorage.getItem('lastSyncTime');
    const currentData = await AsyncStorage.getItem('driverData');
    
    if (!lastSync) {
      // Primera sincronización, enviar todo
      return JSON.parse(currentData || '{}');
    }
    
    // Aquí implementarías la lógica para detectar solo cambios
    // Por ahora retornamos todo
    return JSON.parse(currentData || '{}');
  }

  // Guardar timestamp de última sincronización
  async updateLastSyncTime() {
    this.lastSyncTime = new Date().toISOString();
    await AsyncStorage.setItem('lastSyncTime', this.lastSyncTime);
  }

  // Limpiar cola de sincronización
  clearSyncQueue() {
    this.syncQueue = [];
    console.log('🗑️ Cola de sincronización limpiada');
  }
}

export default new SmartSyncService();