import AsyncStorage from '@react-native-async-storage/async-storage';

class ApiService {
  constructor() {
    this.authToken = null;
    this.initializeToken();
  }

  async initializeToken() {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        this.authToken = token;
        console.log('🔑 Token de autenticación cargado');
      }
    } catch (error) {
      console.error('❌ Error cargando token:', error);
    }
  }

  async saveToken(token) {
    try {
      this.authToken = token;
      await AsyncStorage.setItem('auth_token', token);
      console.log('💾 Token guardado exitosamente');
    } catch (error) {
      console.error('❌ Error guardando token:', error);
    }
  }

  async clearToken() {
    try {
      this.authToken = null;
      await AsyncStorage.removeItem('auth_token');
      console.log('🗑️ Token eliminado');
    } catch (error) {
      console.error('❌ Error eliminando token:', error);
    }
  }

  // ========================================
  // SIMULACIONES PARA TESTING SIN SERVIDOR
  // ========================================
  
  async login(email, password) {
    try {
      console.log('🔑 Simulando login para:', email);
      
      // Simular delay de red
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simular respuesta exitosa
      const response = {
        success: true,
        token: 'test_token_' + Date.now(),
        user: {
          id: 'user_' + Date.now(),
          name: 'Usuario Test',
          email: email,
          phone: '+1-809-555-0123'
        }
      };
      
      if (response.token) {
        await this.saveToken(response.token);
      }
      
      console.log('✅ Login simulado exitoso');
      return response;
      
    } catch (error) {
      console.error('❌ Error en login simulado:', error);
      return {
        success: false,
        message: 'Error de conexión simulado'
      };
    }
  }

  async register(userData) {
    try {
      console.log('📝 Simulando registro para:', userData.email);
      
      // Simular delay de red
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simular respuesta exitosa
      const response = {
        success: true,
        token: 'test_token_' + Date.now(),
        user: {
          id: 'user_' + Date.now(),
          name: userData.name,
          email: userData.email,
          phone: userData.phone
        }
      };
      
      if (response.token) {
        await this.saveToken(response.token);
      }
      
      console.log('✅ Registro simulado exitoso');
      return response;
      
    } catch (error) {
      console.error('❌ Error en registro simulado:', error);
      return {
        success: false,
        message: 'Error de conexión simulado'
      };
    }
  }

  async verifyToken(token) {
    try {
      console.log('🔍 Verificando token simulado:', token);
      
      // Simular delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Simular respuesta exitosa
      return {
        id: 'user_123',
        name: 'Usuario Test',
        email: 'test@test.com'
      };
    } catch (error) {
      console.error('❌ Error verificando token simulado:', error);
      return null;
    }
  }

  async updateUserLocation(location) {
    try {
      console.log('📍 Simulando actualización de ubicación:', location);
      await new Promise(resolve => setTimeout(resolve, 300));
      return { success: true };
    } catch (error) {
      console.error('❌ Error actualizando ubicación simulada:', error);
      throw error;
    }
  }

  async createTripRequest(origin, destination, vehicleType, estimatedPrice) {
    try {
      console.log('🚗 Simulando creación de viaje...');
      await new Promise(resolve => setTimeout(resolve, 800));
      
      return {
        id: 'trip_' + Date.now(),
        origin,
        destination,
        vehicle_type: vehicleType,
        estimated_price: estimatedPrice,
        status: 'requested',
        created_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error creando viaje simulado:', error);
      throw error;
    }
  }

  async searchAvailableDrivers(origin, radius = 5000) {
    try {
      console.log('🔍 Simulando búsqueda de conductores...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simular conductores disponibles
      return [
        {
          id: 'driver_001',
          name: 'Carlos Mendoza',
          rating: 4.7,
          eta: '5 min',
          phone: '+1-809-555-0123',
          vehicle: {
            make: 'Honda',
            model: 'Civic',
            plate: 'XYZ789'
          },
          current_location: {
            latitude: 18.4800,
            longitude: -69.9200,
          }
        }
      ];
    } catch (error) {
      console.error('❌ Error buscando conductores simulados:', error);
      throw error;
    }
  }

  async assignDriver(tripId, driverId) {
    try {
      console.log('👨‍✈️ Simulando asignación de conductor...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        success: true,
        message: 'Conductor asignado exitosamente'
      };
    } catch (error) {
      console.error('❌ Error asignando conductor simulado:', error);
      throw error;
    }
  }

  async estimatePrice(origin, destination, vehicleType = 'economy') {
    try {
      console.log('💰 Simulando estimación de precio...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Calcular precio simulado basado en distancia aproximada
      const basePrice = 50;
      const kmPrice = 25;
      const distance = Math.random() * 15 + 2; // 2-17 km
      const estimated_price = Math.round(basePrice + (distance * kmPrice));
      
      return {
        estimated_price,
        distance_km: distance.toFixed(1),
        base_fare: basePrice,
        distance_fare: Math.round(distance * kmPrice)
      };
    } catch (error) {
      console.error('❌ Error estimando precio simulado:', error);
      throw error;
    }
  }

  async calculateRoute(origin, destination, vehicleType = 'economy') {
    try {
      console.log('🗺️ Simulando cálculo de ruta...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simular datos de ruta
      const distance = Math.random() * 15 + 2;
      const duration = Math.round(distance * 3 + Math.random() * 10);
      const basePrice = 50;
      const kmPrice = 25;
      const final_price = Math.round(basePrice + (distance * kmPrice));
      
      return {
        distance: {
          text: `${distance.toFixed(1)} km`,
          value: Math.round(distance * 1000)
        },
        duration: {
          text: `${duration} min`,
          value: duration * 60
        },
        pricing: {
          final_price,
          base_fare: basePrice,
          distance_fare: Math.round(distance * kmPrice),
          breakdown: {
            base: basePrice,
            distance: Math.round(distance * kmPrice),
            time: 0,
            surge: 0
          }
        }
      };
    } catch (error) {
      console.error('❌ Error calculando ruta simulada:', error);
      throw error;
    }
  }

  // ========================================
  // UTILIDADES
  // ========================================
  
  isAuthenticated() {
    return !!this.authToken;
  }

  async logout() {
    try {
      await this.clearToken();
      console.log('👋 Logout simulado exitoso');
    } catch (error) {
      console.error('❌ Error en logout simulado:', error);
    }
  }
}

// Exportar instancia única (Singleton)
export default new ApiService();