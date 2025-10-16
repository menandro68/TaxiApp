// UserAPI.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import SharedStorage from './SharedStorage';

// Configuración base de la API
const API_CONFIG = {
  // Cambia esta URL por la de tu backend real
  BASE_URL: 'http://10.247.53.207:3000/api', // Para desarrollo local
  // BASE_URL: 'https://tu-servidor.com/api', // Para producción
  TIMEOUT: 10000, // 10 segundos
};

// Clase para manejar todas las operaciones de API del usuario
class UserAPI {
  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.timeout = API_CONFIG.TIMEOUT;
  }

  // Obtener token de autenticación almacenado
  async getAuthToken() {
    try {
      const token = await AsyncStorage.getItem('authToken');
      return token;
    } catch (error) {
      console.error('Error obteniendo token:', error);
      return null;
    }
  }

  // Headers comunes para todas las peticiones
  async getHeaders() {
    const token = await this.getAuthToken();
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  // Manejo de timeouts
  fetchWithTimeout(url, options = {}) {
    return Promise.race([
      fetch(url, options),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout de red')), this.timeout)
      )
    ]);
  }

  // 1. OBTENER PERFIL DEL USUARIO
  async getUserProfile(userId) {
    try {
      // Primero intentar obtener datos guardados del SharedStorage
      const savedProfile = await SharedStorage.getUserProfile();
      
      if (savedProfile && savedProfile.email) {
        console.log('✅ Perfil cargado desde SharedStorage:', savedProfile);
        return {
          success: true,
          data: {
            id: savedProfile.id || userId,
            name: savedProfile.name || 'Usuario TaxiApp',
            email: savedProfile.email,
            phone: savedProfile.phone || '',
            photo: savedProfile.photo || null,
            rating: savedProfile.rating || 5.0,
            totalTrips: savedProfile.totalTrips || 0,
            memberSince: savedProfile.createdAt || '2024-01-15',
            favoriteAddresses: savedProfile.favoriteAddresses || []
          },
          fromCache: true
        };
      }

      // Si no hay datos en SharedStorage, usar datos por defecto
      const defaultProfile = {
        id: userId,
        name: 'Usuario TaxiApp',
        email: 'usuario@taxiapp.com',
        phone: '809-123-4567',
        photo: null,
        rating: 4.8,
        totalTrips: 127,
        memberSince: '2024-01-15',
        favoriteAddresses: []
      };

      return {
        success: true,
        data: defaultProfile,
        fromCache: true
      };

    } catch (error) {
      console.error('Error obteniendo perfil:', error);
      
      // Datos mínimos de emergencia
      return {
        success: true,
        data: {
          id: userId,
          name: 'Usuario',
          email: 'usuario@taxiapp.com',
          phone: '809-123-4567',
          photo: null,
          rating: 4.8,
          totalTrips: 0,
          memberSince: new Date().toISOString(),
          favoriteAddresses: []
        },
        fromCache: true
      };
    }
  }

  // 2. ACTUALIZAR PERFIL DEL USUARIO
  async updateUserProfile(userId, profileData) {
    try {
      // Guardar inmediatamente en SharedStorage y AsyncStorage
      await SharedStorage.saveUserProfile(profileData);
      await AsyncStorage.setItem('userProfile', JSON.stringify(profileData));
      
      console.log('✅ Perfil actualizado localmente:', profileData);
      
      return {
        success: true,
        data: profileData,
        message: 'Perfil actualizado correctamente'
      };

    } catch (error) {
      console.error('Error actualizando perfil:', error);
      
      // Intentar guardar al menos en AsyncStorage
      try {
        await AsyncStorage.setItem('userProfile', JSON.stringify(profileData));
        return {
          success: true,
          data: profileData,
          message: 'Cambios guardados localmente'
        };
      } catch (saveError) {
        return {
          success: false,
          error: saveError.message,
          message: 'Error al actualizar el perfil'
        };
      }
    }
  }

  // 3. SUBIR FOTO DE PERFIL
  async uploadProfilePhoto(userId, photoUri) {
    try {
      const headers = await this.getAuthToken();
      
      const formData = new FormData();
      formData.append('photo', {
        uri: photoUri,
        type: 'image/jpeg',
        name: `profile_${userId}.jpg`
      });

      const response = await this.fetchWithTimeout(
        `${this.baseURL}/users/${userId}/photo`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${headers}`,
            'Content-Type': 'multipart/form-data',
          },
          body: formData
        }
      );

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        data: data,
        message: 'Foto actualizada exitosamente'
      };

    } catch (error) {
      console.error('Error subiendo foto:', error);
      return {
        success: false,
        error: error.message,
        message: 'Error al subir la foto'
      };
    }
  }

  // 4. SINCRONIZAR CAMBIOS PENDIENTES
  async syncPendingUpdates() {
    try {
      const pendingUpdates = await AsyncStorage.getItem('pendingProfileUpdates');
      
      if (!pendingUpdates) {
        return { success: true, message: 'No hay actualizaciones pendientes' };
      }

      const updates = JSON.parse(pendingUpdates);
      const results = [];

      for (const update of updates) {
        const result = await this.updateUserProfile(update.userId, update.data);
        results.push(result);
        
        if (result.success) {
          // Remover de pendientes si fue exitoso
          await this.removePendingUpdate(update.id);
        }
      }

      return {
        success: true,
        results: results,
        message: `${results.filter(r => r.success).length} actualizaciones sincronizadas`
      };

    } catch (error) {
      console.error('Error sincronizando:', error);
      return {
        success: false,
        error: error.message,
        message: 'Error al sincronizar cambios'
      };
    }
  }

  // 5. GUARDAR ACTUALIZACIÓN OFFLINE
  async saveOfflineUpdate(userId, profileData) {
    try {
      const pendingUpdates = await AsyncStorage.getItem('pendingProfileUpdates');
      const updates = pendingUpdates ? JSON.parse(pendingUpdates) : [];
      
      updates.push({
        id: Date.now().toString(),
        userId: userId,
        data: profileData,
        timestamp: new Date().toISOString()
      });

      await AsyncStorage.setItem('pendingProfileUpdates', JSON.stringify(updates));
      
    } catch (error) {
      console.error('Error guardando actualización offline:', error);
    }
  }

  // 6. REMOVER ACTUALIZACIÓN PENDIENTE
  async removePendingUpdate(updateId) {
    try {
      const pendingUpdates = await AsyncStorage.getItem('pendingProfileUpdates');
      if (!pendingUpdates) return;
      
      const updates = JSON.parse(pendingUpdates);
      const filtered = updates.filter(u => u.id !== updateId);
      
      await AsyncStorage.setItem('pendingProfileUpdates', JSON.stringify(filtered));
      
    } catch (error) {
      console.error('Error removiendo actualización pendiente:', error);
    }
  }

  // 7. VERIFICAR CONEXIÓN
  async checkConnection() {
    try {
      const response = await this.fetchWithTimeout(
        `${this.baseURL}/health`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // 8. ELIMINAR CUENTA DE USUARIO
  async deleteUserAccount(userId) {
    try {
      const headers = await this.getHeaders();
      
      const response = await this.fetchWithTimeout(
        `${this.baseURL}/users/${userId}`,
        {
          method: 'DELETE',
          headers: headers,
        }
      );

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      // Limpiar datos locales
      await AsyncStorage.multiRemove([
        'userProfile',
        'authToken',
        'pendingProfileUpdates'
      ]);
      
      return {
        success: true,
        message: 'Cuenta eliminada exitosamente'
      };

    } catch (error) {
      console.error('Error eliminando cuenta:', error);
      return {
        success: false,
        error: error.message,
        message: 'Error al eliminar la cuenta'
      };
    }
  }
}

// Exportar instancia única
export default new UserAPI();