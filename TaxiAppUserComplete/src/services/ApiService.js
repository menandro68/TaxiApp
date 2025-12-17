/**
 * ApiService Profesional para TaxiApp
 * Maneja todas las comunicaciones con el backend de manera robusta
 * Incluye retry logic, manejo de errores, timeouts y más
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';
import { getBackendUrl } from '../config/config.js';

   class ApiService {
  constructor() {
   const backendUrl = getBackendUrl();
   console.log('🔴 [ApiService] Backend URL:', backendUrl);
    this.BASE_URL = backendUrl;
   console.log('🔴 [ApiService] BASE_URL:', this.BASE_URL);
    this.remoteConfig = null;
    this.loadRemoteConfig();
    this.token = null;
    this.refreshToken = null;
    this.isRefreshing = false;
    this.REQUEST_TIMEOUT = 10000; // 10 segundos
    
    // Configuración de retry
    this.MAX_RETRIES = 3;
    this.RETRY_DELAY_BASE = 1000; // 1 segundo base
    
    // Inicializar token al crear la instancia
    this.initializeTokens();
    
    // Configuración por defecto (fallback)
    this.DEFAULT_CONFIG = {
      api_url: 'https://web-production-99844.up.railway.app/api',
      socket_url: 'wss://web-production-99844.up.railway.app',
      version: '1.0.0',
      features: {
        push_notifications: true,
        real_time_tracking: true,
        surge_pricing: true
      }
    };
  }

  // ========================================
  // GESTIÓN DE TOKENS Y AUTENTICACIÓN
  // ========================================

  async initializeTokens() {
    try {
      this.token = await AsyncStorage.getItem('auth_token');
      this.refreshToken = await AsyncStorage.getItem('refresh_token');
    } catch (error) {
      console.log('Error cargando tokens:', error);
    }
  }

  async saveTokens(token, refreshToken) {
    try {
      this.token = token;
      this.refreshToken = refreshToken;
      await AsyncStorage.setItem('auth_token', token);
      if (refreshToken) {
        await AsyncStorage.setItem('refresh_token', refreshToken);
      }
    } catch (error) {
      console.error('Error guardando tokens:', error);
    }
  }

  async clearTokens() {
    try {
      this.token = null;
      this.refreshToken = null;
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('refresh_token');
      await AsyncStorage.removeItem('user_data');
    } catch (error) {
      console.error('Error limpiando tokens:', error);
    }
  }

  // ========================================
  // CORE REQUEST METHODS CON RETRY LOGIC
  // ========================================

  async makeRequest(endpoint, method = 'GET', data = null, includeAuth = true, timeout = this.REQUEST_TIMEOUT) {
    const url = `${this.BASE_URL}${endpoint}`;
    
    const config = {
      method,
      headers: this.getHeaders(includeAuth)
    };

    if (data && method !== 'GET') {
      config.body = JSON.stringify(data);
    }

    console.log('🔍 [FETCH] Conectando a:', url);
    console.log('🔍 [FETCH] Config:', config);
    
    try {
      const response = await fetch(url, config);
      
      const responseData = await response.json();

      if (!response.ok) {
        if (response.status === 401 && includeAuth && this.refreshToken && !this.isRefreshing) {
          const newToken = await this.refreshAccessToken();
          if (newToken) {
            config.headers.Authorization = `Bearer ${newToken}`;
            const retryResponse = await fetch(url, config);
            if (retryResponse.ok) {
              return await retryResponse.json();
            }
          }
        }
        
        throw new Error(responseData?.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return responseData;
    } catch (error) {
      console.error('🔴 [FETCH ERROR]', error.message);
      throw error;
    }
  }

  async makeRequestWithRetry(endpoint, method = 'GET', data = null, includeAuth = true, retries = this.MAX_RETRIES) {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        // Verificar conexión de red antes del request
        const netInfo = await NetInfo.fetch();
        if (!netInfo.isConnected) {
          throw new Error('Sin conexión a internet');
        }

        console.log(`[ApiService] Intento ${attempt + 1}/${retries}: ${method} ${endpoint}`);
        
        const result = await this.makeRequest(endpoint, method, data, includeAuth);
        
        console.log(`[ApiService] ✅ Éxito en intento ${attempt + 1}`);
        return result;
        
      } catch (error) {
        console.log(`[ApiService] ❌ Error en intento ${attempt + 1}:`, error.message);
        
        // Si es el último intento, lanzar el error
      if (attempt === retries - 1) {
       const errorMsg = error?.message || JSON.stringify(error);
      console.error('🔴 ERROR FINAL:', errorMsg);  // ← REEMPLAZA CON ESTO
       throw error;
       }
        // Calcular delay exponencial: 1s, 2s, 4s, 8s...
        const delay = this.RETRY_DELAY_BASE * Math.pow(2, attempt);
        console.log(`[ApiService] ⏳ Reintentando en ${delay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  getHeaders(includeAuth = true) {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (includeAuth && this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  // ========================================
  // REFRESH TOKEN LOGIC
  // ========================================

  async refreshAccessToken() {
    if (this.isRefreshing) {
      return null;
    }

    this.isRefreshing = true;
    
    try {
      const response = await this.makeRequest('/auth/refresh', 'POST', {
        refreshToken: this.refreshToken
      }, false);

      if (response.success) {
        await this.saveTokens(response.token, response.refreshToken);
        return response.token;
      }
    } catch (error) {
      console.error('Error renovando token:', error);
      await this.clearTokens();
    } finally {
      this.isRefreshing = false;
    }

    return null;
  }

  // ========================================
  // MÉTODOS DE AUTENTICACIÓN
  // ========================================

  async login(email, password) {
    try {
      const response = await this.makeRequestWithRetry('/users/login', 'POST', {
        email,
        password
      }, false);

      if (response.success) {
        await this.saveTokens(response.token, response.refreshToken);
        await AsyncStorage.setItem('user_data', JSON.stringify(response.user));
        return response;
      }

      throw new Error(response.message || 'Error en el login');
    } catch (error) {
      console.error('Error en login:', error);
      throw error;
    }
  }

  async register(userData) {
    try {
      console.log('📤 [REGISTRO] Enviando datos:', userData);
      
      const response = await this.makeRequestWithRetry('/users/register', 'POST', userData, false);
      
      console.log('📥 [REGISTRO] Respuesta del backend:', response);
      console.log('📥 [REGISTRO] response.success =', response?.success);

      if (response.success) {
        console.log('✅ [REGISTRO] Registro exitoso');
        await this.saveTokens(response.token, response.refreshToken);
        await AsyncStorage.setItem('user_data', JSON.stringify(response.user));
        return response;
      }

      const errorMessage = response.message || 'Error en el registro';
      console.error('❌ [REGISTRO] Error:', errorMessage);
      throw new Error(errorMessage);
    } catch (error) {
      console.error('❌ [REGISTRO] Error capturado:', error.message);
      console.error('❌ [REGISTRO] Stack:', error.stack);
      alert('🔴 ERROR DE REGISTRO:\n' + error.message);
      throw error;
    }
  }

  async logout() {
    try {
      if (this.token) {
        await this.makeRequestWithRetry('/auth/logout', 'POST', {}, true);
      }
    } catch (error) {
      console.log('Error en logout remoto:', error);
    } finally {
      await this.clearTokens();
    }
  }

  async verifyToken() {
    try {
      const response = await this.makeRequestWithRetry('/auth/verify', 'GET', null, true);
      return response;
    } catch (error) {
      console.error('Token inválido:', error);
      await this.clearTokens();
      throw error;
    }
  }

  // ========================================
  // MÉTODOS DE VIAJES
  // ========================================

  async createTrip(tripData) {
    try {
      return await this.makeRequestWithRetry('/trips', 'POST', tripData, true);
    } catch (error) {
      console.error('Error creando viaje:', error);
      throw error;
    }
  }

  async getTripStatus(tripId) {
    try {
      return await this.makeRequestWithRetry(`/trips/${tripId}`, 'GET', null, true);
    } catch (error) {
      console.error('Error obteniendo estado del viaje:', error);
      throw error;
    }
  }

  async cancelTrip(tripId, reason) {
    try {
      return await this.makeRequestWithRetry(`/trips/${tripId}/cancel`, 'PUT', { reason }, true);
    } catch (error) {
      console.error('Error cancelando viaje:', error);
      throw error;
    }
  }

  async getUserTrips(page = 1, limit = 20) {
    try {
      return await this.makeRequestWithRetry(`/trips/user?page=${page}&limit=${limit}`, 'GET', null, true);
    } catch (error) {
      console.error('Error obteniendo viajes del usuario:', error);
      throw error;
    }
  }

  // ========================================
  // MÉTODOS DE CONDUCTORES
  // ========================================

  async searchDrivers(location, vehicleType = 'standard') {
    try {
      return await this.makeRequestWithRetry('/drivers/search', 'POST', {
        latitude: location.latitude,
        longitude: location.longitude,
        vehicleType
      }, true);
    } catch (error) {
      console.error('Error buscando conductores:', error);
      throw error;
    }
  }

  async getDriverInfo(driverId) {
    try {
      return await this.makeRequestWithRetry(`/drivers/${driverId}`, 'GET', null, true);
    } catch (error) {
      console.error('Error obteniendo info del conductor:', error);
      throw error;
    }
  }

  // ========================================
  // MÉTODOS DE UBICACIÓN Y RUTAS
  // ========================================

  async updateUserLocation(location) {
    try {
      return await this.makeRequestWithRetry('/users/location', 'PUT', {
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: new Date().toISOString()
      }, true);
    } catch (error) {
      console.error('Error actualizando ubicación:', error);
      throw error;
    }
  }

  async getRouteEstimate(pickup, destination, vehicleType = 'standard') {
    try {
      return await this.makeRequestWithRetry('/pricing/calculate', 'POST', {
        origin: pickup,
        destination,
        vehicle_type: vehicleType
      }, true);
    } catch (error) {
      console.error('Error obteniendo estimación de ruta:', error);
      throw error;
    }
  }

  async calculateRoute(origin, destination, vehicleType = 'economy') {
    try {
      return await this.makeRequestWithRetry('/pricing/calculate', 'POST', {
        origin,
        destination,
        vehicle_type: vehicleType
      }, true);
    } catch (error) {
      console.error('Error calculando ruta:', error);
      throw error;
    }
  }

  async estimatePrice(origin, destination, vehicleType = 'economy') {
    try {
      return await this.makeRequestWithRetry('/pricing/calculate', 'POST', {
        origin,
        destination,
        vehicle_type: vehicleType
      }, true);
    } catch (error) {
      console.error('Error estimando precio:', error);
      throw error;
    }
  }

  async geocodeAddress(address) {
    try {
      return await this.makeRequestWithRetry('/geocoding/address', 'POST', {
        address
      }, true);
    } catch (error) {
      console.error('Error en geocoding:', error);
      throw error;
    }
  }

  async reverseGeocode(latitude, longitude) {
    try {
      return await this.makeRequestWithRetry('/geocoding/reverse', 'POST', {
        latitude,
        longitude
      }, true);
    } catch (error) {
      console.error('Error en reverse geocoding:', error);
      throw error;
    }
  }

  // ========================================
  // MÉTODOS DE PAGOS
  // ========================================

  async getPaymentMethods() {
    try {
      return await this.makeRequestWithRetry('/payments/methods', 'GET', null, true);
    } catch (error) {
      console.error('Error obteniendo métodos de pago:', error);
      throw error;
    }
  }

  async addPaymentMethod(paymentData) {
    try {
      return await this.makeRequestWithRetry('/payments/methods', 'POST', paymentData, true);
    } catch (error) {
      console.error('Error agregando método de pago:', error);
      throw error;
    }
  }

  async processPayment(tripId, paymentMethodId, amount) {
    try {
      return await this.makeRequestWithRetry('/payments/process', 'POST', {
        tripId,
        paymentMethodId,
        amount
      }, true);
    } catch (error) {
      console.error('Error procesando pago:', error);
      throw error;
    }
  }

  // ========================================
  // MÉTODOS DE PERFIL Y USUARIO
  // ========================================

  async getUserProfile() {
    try {
      return await this.makeRequestWithRetry('/users/profile', 'GET', null, true);
    } catch (error) {
      console.error('Error obteniendo perfil:', error);
      throw error;
    }
  }

  async updateUserProfile(profileData) {
    try {
      return await this.makeRequestWithRetry('/users/profile', 'PUT', profileData, true);
    } catch (error) {
      console.error('Error actualizando perfil:', error);
      throw error;
    }
  }

  async uploadProfilePhoto(imageUri) {
    try {
      const formData = new FormData();
      formData.append('photo', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'profile.jpg',
      });

      const response = await fetch(`${this.BASE_URL}/users/photo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      return await response.json();
    } catch (error) {
      console.error('Error subiendo foto:', error);
      throw error;
    }
  }

  // ========================================
  // MÉTODOS DE CALIFICACIONES
  // ========================================

  async rateTrip(tripId, rating, comment = '') {
    try {
      return await this.makeRequestWithRetry(`/trips/${tripId}/rate`, 'POST', {
        rating,
        comment
      }, true);
    } catch (error) {
      console.error('Error calificando viaje:', error);
      throw error;
    }
  }

  // ========================================
  // MÉTODOS DE NOTIFICACIONES
  // ========================================

  async registerPushToken(token) {
    try {
      return await this.makeRequestWithRetry('/notifications/register', 'POST', {
        pushToken: token,
        platform: Platform.OS
      }, true);
    } catch (error) {
      console.error('Error registrando token de push:', error);
      throw error;
    }
  }

  async getNotifications(page = 1, limit = 20) {
    try {
      return await this.makeRequestWithRetry(`/notifications?page=${page}&limit=${limit}`, 'GET', null, true);
    } catch (error) {
      console.error('Error obteniendo notificaciones:', error);
      throw error;
    }
  }

  // ========================================
  // MÉTODOS DE SOPORTE
  // ========================================

  async submitSupportTicket(subject, message, tripId = null) {
    try {
      return await this.makeRequestWithRetry('/support/tickets', 'POST', {
        subject,
        message,
        tripId
      }, true);
    } catch (error) {
      console.error('Error enviando ticket de soporte:', error);
      throw error;
    }
  }

  // ========================================
  // HEALTH CHECK Y UTILITARIOS
  // ========================================

  async healthCheck() {
    try {
      const response = await this.makeRequest('/health', 'GET', null, false, 5000);
      return response;
    } catch (error) {
      console.error('Health check failed:', error);
      return { status: 'error', message: error.message };
    }
  }

  async getAppConfig() {
    try {
      return await this.makeRequestWithRetry('/config/app', 'GET', null, false);
    } catch (error) {
      console.error('Error obteniendo configuración:', error);
      throw error;
    }
  }

  // ========================================
  // BATCH OPERATIONS
  // ========================================

  async batchRequest(requests) {
    try {
      return await this.makeRequestWithRetry('/batch', 'POST', { requests }, true);
    } catch (error) {
      console.error('Error en batch request:', error);
      throw error;
    }
  }

  // ========================================
  // CONFIGURACIÓN REMOTA
  // ========================================

  async loadRemoteConfig() {
    const MAX_RETRIES = 3;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`📡 Cargando configuración remota (intento ${attempt}/${MAX_RETRIES})...`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch('https://web-production-99844.up.railway.app/api/config', {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          this.remoteConfig = await response.json();
          await AsyncStorage.setItem('remote_config_cache', JSON.stringify(this.remoteConfig));
          console.log('✅ Configuración remota cargada:', this.remoteConfig);
          return;
        }
      } catch (error) {
        console.log(`⚠️ Intento ${attempt} falló:`, error.message);
        
        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
        }
      }
    }
    
    // Intentar cargar desde cache
    try {
      const cached = await AsyncStorage.getItem('remote_config_cache');
      if (cached) {
        this.remoteConfig = JSON.parse(cached);
        console.log('📦 Usando configuración desde cache');
        return;
      }
    } catch (cacheError) {
      console.log('⚠️ Error leyendo cache:', cacheError);
    }
    
    // Último recurso: fallback
    this.remoteConfig = this.DEFAULT_CONFIG;
    console.log('🔧 Usando configuración por defecto (fallback)');
  }
}

// Exportar instancia singleton
export default new ApiService();