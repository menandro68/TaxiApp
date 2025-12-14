import ApiService from './ApiService';

// ============================================
// SERVICIO DE TRACKING DEL CONDUCTOR - UBICACIÓN REAL
// ============================================

class DriverTrackingService {
  
  // Variables estáticas para el tracking
  static trackingInterval = null;
  static isTracking = false;
  static driverId = null;
  static lastLocation = null;
  static callbacks = {
    onLocationUpdate: null,
    onArrival: null,
    onRouteProgress: null
  };

  // ============================================
  // INICIAR TRACKING CON UBICACIÓN REAL
  // ============================================
  
  static async startTracking(driverId, userLocation, callbacks = {}) {
    try {
      console.log('🚗 Iniciando tracking REAL del conductor:', driverId);

      // Guardar datos
      this.driverId = driverId;
      this.callbacks = { ...this.callbacks, ...callbacks };
      this.isTracking = true;
      this.lastLocation = null;

      // Obtener ubicación inicial
      await this.fetchDriverLocation();

      // Iniciar polling cada 3 segundos
      this.startLocationPolling(userLocation);

      return {
        success: true,
        message: 'Tracking real iniciado'
      };

    } catch (error) {
      console.error('❌ Error iniciando tracking real:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ============================================
  // POLLING DE UBICACIÓN REAL
  // ============================================
  
  static startLocationPolling(userLocation) {
    // Limpiar interval anterior si existe
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
    }

    const POLL_INTERVAL = 3000; // 3 segundos

    this.trackingInterval = setInterval(async () => {
      if (!this.isTracking) {
        this.stopTracking();
        return;
      }

      await this.fetchDriverLocation(userLocation);

    }, POLL_INTERVAL);
  }

  // ============================================
  // OBTENER UBICACIÓN DEL CONDUCTOR DESDE BACKEND
  // ============================================
  
  static async fetchDriverLocation(userLocation = null) {
    try {
      if (!this.driverId) {
        console.log('⚠️ No hay driverId configurado');
        return null;
      }

      const response = await fetch(
        `https://web-production-99844.up.railway.app/api/drivers/${this.driverId}/location`
      );
      
      const data = await response.json();

      if (!data.success || !data.latitude || !data.longitude) {
        console.log('⚠️ Ubicación del conductor no disponible');
        return null;
      }

      const driverLocation = {
        latitude: parseFloat(data.latitude),
        longitude: parseFloat(data.longitude)
      };

      console.log('📍 Ubicación REAL del conductor:', driverLocation);

      // Calcular distancia al usuario si tenemos su ubicación
      let distance = null;
      let estimatedTimeRemaining = null;
      
      if (userLocation?.latitude && userLocation?.longitude) {
        distance = this.calculateDistance(
          driverLocation.latitude,
          driverLocation.longitude,
          userLocation.latitude,
          userLocation.longitude
        );
        
        // Estimar tiempo: ~2 min por km en ciudad
        estimatedTimeRemaining = Math.max(1, Math.ceil(distance * 2));
        
        console.log(`📏 Distancia al usuario: ${distance.toFixed(2)} km, ETA: ${estimatedTimeRemaining} min`);

        // Verificar si llegó (menos de 50 metros)
        if (distance < 0.05) {
          console.log('🎯 ¡Conductor ha llegado!');
          
          if (this.callbacks.onArrival) {
            this.callbacks.onArrival({
              finalLocation: driverLocation,
              timestamp: new Date().toISOString()
            });
          }
          
          this.stopTracking();
          return driverLocation;
        }
      }

      // Crear objeto de actualización
      const driverUpdate = {
        location: driverLocation,
        distance: distance,
        estimatedTimeRemaining: estimatedTimeRemaining,
        isMoving: this.hasLocationChanged(driverLocation),
        timestamp: new Date().toISOString(),
        realLocation: true
      };

      // Guardar última ubicación
      this.lastLocation = driverLocation;

      // Ejecutar callback de actualización
      if (this.callbacks.onLocationUpdate) {
        this.callbacks.onLocationUpdate(driverUpdate);
      }

      return driverLocation;

    } catch (error) {
      console.error('❌ Error obteniendo ubicación del conductor:', error);
      return null;
    }
  }

  // ============================================
  // VERIFICAR SI LA UBICACIÓN CAMBIÓ
  // ============================================
  
  static hasLocationChanged(newLocation) {
    if (!this.lastLocation) return true;
    
    const threshold = 0.0001; // ~11 metros
    const latDiff = Math.abs(newLocation.latitude - this.lastLocation.latitude);
    const lngDiff = Math.abs(newLocation.longitude - this.lastLocation.longitude);
    
    return latDiff > threshold || lngDiff > threshold;
  }

  // ============================================
  // CALCULAR DISTANCIA (HAVERSINE)
  // ============================================
  
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  static toRad(deg) {
    return deg * (Math.PI / 180);
  }

  // ============================================
  // DETENER TRACKING
  // ============================================
  
  static stopTracking() {
    console.log('🛑 Deteniendo tracking del conductor');
    
    this.isTracking = false;
    this.driverId = null;
    this.lastLocation = null;
    
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }
  }

  // ============================================
  // OBTENER ESTADO ACTUAL
  // ============================================
  
  static getCurrentState() {
    return {
      isTracking: this.isTracking,
      driverId: this.driverId,
      lastLocation: this.lastLocation
    };
  }

  // ============================================
  // COMPATIBILIDAD CON CÓDIGO EXISTENTE
  // ============================================
  
  static pauseTracking() {
    console.log('⏸️ Pausando tracking');
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }
  }

  static resumeTracking(userLocation) {
    console.log('▶️ Reanudando tracking');
    if (this.isTracking && this.driverId) {
      this.startLocationPolling(userLocation);
    }
  }
}

export default DriverTrackingService;