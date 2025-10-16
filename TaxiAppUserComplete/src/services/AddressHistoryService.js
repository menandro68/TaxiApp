import AsyncStorage from '@react-native-async-storage/async-storage';

class AddressHistoryService {
  constructor() {
    this.STORAGE_KEY = 'address_history';
    this.MAX_HISTORY_ITEMS = 30;
    this.MAX_RECENT_ITEMS = 5;
  }

  // Guardar nueva dirección en el historial
  async addToHistory(destination) {
    try {
      if (!destination || !destination.address) return;

      const history = await this.getHistory();
      
      // Crear entrada del historial
      const historyEntry = {
        id: Date.now().toString(),
        address: destination.address,
        name: destination.name || destination.address,
        coordinates: destination.coordinates || destination.location || null,
        timestamp: new Date().toISOString(),
        count: 1,
        lastUsed: new Date().toISOString(),
        type: destination.type || 'destination'
      };

      // Buscar si ya existe esta dirección
      const existingIndex = history.findIndex(
        item => item.address.toLowerCase() === destination.address.toLowerCase()
      );

      if (existingIndex !== -1) {
        // Si existe, actualizar contador y mover al principio
        history[existingIndex].count += 1;
        history[existingIndex].lastUsed = new Date().toISOString();
        const updatedItem = history.splice(existingIndex, 1)[0];
        history.unshift(updatedItem);
      } else {
        // Si no existe, agregar al principio
        history.unshift(historyEntry);
      }

      // Limitar el tamaño del historial
      if (history.length > this.MAX_HISTORY_ITEMS) {
        history.splice(this.MAX_HISTORY_ITEMS);
      }

      // Guardar en AsyncStorage
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
      
      console.log('✅ Dirección agregada al historial:', destination.address);
      return true;
    } catch (error) {
      console.error('Error agregando al historial:', error);
      return false;
    }
  }

  // Obtener todo el historial
  async getHistory() {
    try {
      const historyJson = await AsyncStorage.getItem(this.STORAGE_KEY);
      return historyJson ? JSON.parse(historyJson) : [];
    } catch (error) {
      console.error('Error obteniendo historial:', error);
      return [];
    }
  }

  // Obtener direcciones recientes (últimas 5)
  async getRecentAddresses() {
    try {
      const history = await this.getHistory();
      return history.slice(0, this.MAX_RECENT_ITEMS);
    } catch (error) {
      console.error('Error obteniendo direcciones recientes:', error);
      return [];
    }
  }

  // Obtener direcciones frecuentes (las más usadas)
  async getFrequentAddresses() {
    try {
      const history = await this.getHistory();
      // Ordenar por contador de uso
      const sorted = [...history].sort((a, b) => b.count - a.count);
      return sorted.slice(0, this.MAX_RECENT_ITEMS);
    } catch (error) {
      console.error('Error obteniendo direcciones frecuentes:', error);
      return [];
    }
  }

  // Buscar en el historial
  async searchHistory(query) {
    try {
      if (!query || query.trim().length < 2) return [];
      
      const history = await this.getHistory();
      const searchTerm = query.toLowerCase();
      
      return history.filter(item => 
        item.address.toLowerCase().includes(searchTerm) ||
        (item.name && item.name.toLowerCase().includes(searchTerm))
      );
    } catch (error) {
      console.error('Error buscando en historial:', error);
      return [];
    }
  }

  // Eliminar una dirección del historial
  async removeFromHistory(id) {
    try {
      const history = await this.getHistory();
      const filtered = history.filter(item => item.id !== id);
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
      console.log('✅ Dirección eliminada del historial');
      return true;
    } catch (error) {
      console.error('Error eliminando del historial:', error);
      return false;
    }
  }

  // Limpiar todo el historial
  async clearHistory() {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      console.log('✅ Historial limpiado');
      return true;
    } catch (error) {
      console.error('Error limpiando historial:', error);
      return false;
    }
  }

  // Obtener estadísticas del historial
  async getStatistics() {
    try {
      const history = await this.getHistory();
      
      if (history.length === 0) {
        return {
          totalTrips: 0,
          uniqueDestinations: 0,
          mostVisited: null,
          lastDestination: null
        };
      }

      // Calcular total de viajes
      const totalTrips = history.reduce((sum, item) => sum + item.count, 0);
      
      // Destino más visitado
      const mostVisited = [...history].sort((a, b) => b.count - a.count)[0];
      
      // Último destino
      const lastDestination = history[0];
      
      return {
        totalTrips,
        uniqueDestinations: history.length,
        mostVisited: {
          address: mostVisited.address,
          count: mostVisited.count
        },
        lastDestination: {
          address: lastDestination.address,
          timestamp: lastDestination.lastUsed
        }
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      return null;
    }
  }

  // Migrar datos antiguos si existen
  async migrateOldData() {
    try {
      // Intentar obtener datos de viajes anteriores
      const tripHistory = await AsyncStorage.getItem('tripHistory');
      if (tripHistory) {
        const trips = JSON.parse(tripHistory);
        for (const trip of trips) {
          if (trip.destination) {
            await this.addToHistory({
              address: trip.destination,
              coordinates: trip.destinationCoords,
              timestamp: trip.timestamp || trip.date
            });
          }
        }
        console.log('✅ Datos migrados exitosamente');
      }
    } catch (error) {
      console.error('Error migrando datos:', error);
    }
  }
}

export default new AddressHistoryService();