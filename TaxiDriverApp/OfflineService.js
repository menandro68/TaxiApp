import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

class OfflineService {
  constructor() {
    this.isOnline = true;
    this.pendingActions = [];
    this.listeners = [];
    
    // Inicializar monitor de conexión
    this.initNetworkMonitor();
  }

  // Verificar que la conexion realmente responde (no solo que existe red)
  async verifyRealConnection() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);
      await fetch('https://www.google.com', { method: 'HEAD', signal: controller.signal });
      clearTimeout(timeoutId);
      return true;
    } catch (error) {
      console.log('Conexion insuficiente: no respondio en 7 segundos');
      return false;
    }
  }

  // Monitorear estado de conexión
  initNetworkMonitor() {
    NetInfo.addEventListener(async state => {
      const wasOffline = !this.isOnline;
      const hasNetwork = state.isConnected && state.isInternetReachable;
      this.isOnline = hasNetwork ? await this.verifyRealConnection() : false;
      
      console.log('📡 Estado de conexión:', this.isOnline ? 'ONLINE' : 'OFFLINE');
      
      // Si volvemos online, sincronizar
      if (wasOffline && this.isOnline) {
        console.log('✅ Conexión restaurada - iniciando sincronización');
        this.syncPendingActions();
      }
      
      // Notificar a los listeners
      this.notifyListeners(this.isOnline);
    });
  }

  // Agregar listener para cambios de conexión
  addConnectionListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  // Notificar listeners
  notifyListeners(isOnline) {
    this.listeners.forEach(listener => listener(isOnline));
  }

  // Verificar estado actual
  async checkConnection() {
    const state = await NetInfo.fetch();
    this.isOnline = state.isConnected && state.isInternetReachable;
    return this.isOnline;
  }

  // Guardar acción para ejecutar cuando vuelva online
  async saveOfflineAction(action) {
    try {
      const actions = await this.getPendingActions();
      actions.push({
        id: Date.now().toString(),
        type: action.type,
        data: action.data,
        timestamp: new Date().toISOString()
      });
      
      await AsyncStorage.setItem('pendingOfflineActions', JSON.stringify(actions));
      console.log('💾 Acción guardada offline:', action.type);
      
      return true;
    } catch (error) {
      console.error('❌ Error guardando acción offline:', error);
      return false;
    }
  }

  // Obtener acciones pendientes
  async getPendingActions() {
    try {
      const actions = await AsyncStorage.getItem('pendingOfflineActions');
      return actions ? JSON.parse(actions) : [];
    } catch (error) {
      console.error('❌ Error obteniendo acciones pendientes:', error);
      return [];
    }
  }

  // Sincronizar acciones pendientes
  async syncPendingActions() {
    const actions = await this.getPendingActions();
    
    if (actions.length === 0) {
      console.log('✅ No hay acciones pendientes para sincronizar');
      return;
    }
    
    console.log(`🔄 Sincronizando ${actions.length} acciones pendientes...`);
    
    for (const action of actions) {
      try {
        // Aquí procesarías cada acción según su tipo
        await this.processOfflineAction(action);
        
        // Remover acción procesada
        await this.removeAction(action.id);
      } catch (error) {
        console.error('❌ Error procesando acción:', action.type, error);
      }
    }
  }

  // Procesar una acción offline
  async processOfflineAction(action) {
    console.log('⚙️ Procesando acción:', action.type);
    
    // Aquí agregarás la lógica específica para cada tipo de acción
    switch (action.type) {
      case 'ACCEPT_TRIP':
        // Lógica para aceptar viaje
        break;
      case 'COMPLETE_TRIP':
        // Lógica para completar viaje
        break;
      case 'UPDATE_LOCATION':
        // Lógica para actualizar ubicación
        break;
      default:
        console.log('Tipo de acción no reconocido:', action.type);
    }
  }

  // Remover acción procesada
  async removeAction(actionId) {
    const actions = await this.getPendingActions();
    const filtered = actions.filter(a => a.id !== actionId);
    await AsyncStorage.setItem('pendingOfflineActions', JSON.stringify(filtered));
  }

  // Limpiar todas las acciones pendientes
  async clearPendingActions() {
    await AsyncStorage.removeItem('pendingOfflineActions');
    console.log('🗑️ Acciones pendientes limpiadas');
  }
}

export default new OfflineService();