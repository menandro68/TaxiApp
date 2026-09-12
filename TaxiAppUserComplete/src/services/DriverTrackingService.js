import ApiService from './ApiService';

// ============================================
// SERVICIO DE TRACKING DEL CONDUCTOR - UBICACIÓN REAL
// ============================================

// API Key de Google Maps para calcular rutas reales
const GOOGLE_MAPS_APIKEY = 'AIzaSyC6HuO-nRJxdZctdH0o_-nuezUOILq868Q';

class DriverTrackingService {
  
  // Variables estáticas para el tracking
  static trackingInterval = null;
  static isTracking = false;
  static driverId = null;
  static lastLocation = null;
  static movementHistory = [];
  static cachedETA = null;
  static lastETAUpdate = null;
  static lastDriverLocation = null; // Para detectar si el conductor se movió significativamente
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

      this.driverId = driverId;
      this.callbacks = { ...this.callbacks, ...callbacks };
      this.isTracking = true;
      this.lastLocation = null;
      this.cachedETA = null;
      this.lastETAUpdate = null;
      this.lastDriverLocation = null;

      await this.fetchDriverLocation(userLocation);
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
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
    }

    const POLL_INTERVAL = 3000;

    this.trackingInterval = setInterval(async () => {
      if (!this.isTracking) {
        this.stopTracking();
        return;
      }

      await this.fetchDriverLocation(userLocation);

    }, POLL_INTERVAL);
  }

  // ============================================
  // CALCULAR ETA REAL CON GOOGLE DIRECTIONS API
  // ============================================
  
  static async calculateRealETA(driverLat, driverLng, userLat, userLng) {
    try {
      // Verificar si necesitamos actualizar el ETA
          const now = Date.now();
           const TEN_SECONDS = 90000;
      
      // Solo actualizar cada 10 segundos O si el conductor se movió más de 50 metros
      if (this.cachedETA !== null && this.lastETAUpdate) {
        const timeSinceUpdate = now - this.lastETAUpdate;
        
          // Usar el ETA cacheado durante todo el intervalo, sin importar el movimiento.
        // Llamar a Google en cada actualizacion de GPS dispara miles de peticiones por viaje.
        if (timeSinceUpdate < TEN_SECONDS) {
          console.log('Usando ETA cacheado:', this.cachedETA, 'min');
          return this.cachedETA;
        }
      }

            // Si el conductor esta a menos de 1 km, estimar sin llamar a Google.
      // A esa distancia el ETA es de 1 a 3 minutos y no justifica el costo por peticion.
      const distanciaDirecta = this.calculateDistance(driverLat, driverLng, userLat, userLng);
      if (distanciaDirecta < 1) {
        const etaCercano = Math.max(1, Math.ceil(distanciaDirecta * 3));
        this.cachedETA = etaCercano;
        this.lastETAUpdate = now;
        this.lastDriverLocation = { lat: driverLat, lng: driverLng };
        console.log('ETA estimado sin Google (conductor cerca):', etaCercano, 'min');
        return etaCercano;
      }

      console.log('Calculando ETA real con Google...');
      
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${driverLat},${driverLng}&destination=${userLat},${userLng}&mode=driving&key=${GOOGLE_MAPS_APIKEY}`;
      
      const response = await fetch(url);
      const data = await response.json();
      console.log('🗺️ Google response:', JSON.stringify(data).substring(0, 300));
      
      if (data.status === 'OK' && data.routes && data.routes.length > 0) {
        const route = data.routes[0].legs[0];
        const durationSeconds = route.duration.value; // Duración en segundos
        const durationMinutes = Math.ceil(durationSeconds / 60);
        const distanceKm = (route.distance.value / 1000).toFixed(2);
        
        console.log(`✅ ETA REAL: ${durationMinutes} min (${distanceKm} km por ruta)`);
        
        // Guardar en cache
        this.cachedETA = durationMinutes;
        this.lastETAUpdate = now;
        this.lastDriverLocation = { lat: driverLat, lng: driverLng };
        
        return durationMinutes;
      } else {
        console.log('⚠️ No se encontró ruta, usando estimación básica');
        return null;
      }
      
    } catch (error) {
      console.error('❌ Error calculando ETA con Google:', error);
      return null;
    }
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
        longitude: parseFloat(data.longitude),
        speed: parseFloat(data.speed) || 0
      };

      console.log('📍 Ubicación REAL del conductor:', driverLocation);

      let distance = null;
      let estimatedTimeRemaining = null;
      
      if (userLocation?.latitude && userLocation?.longitude) {
        // Calcular distancia directa (para verificar llegada)
        distance = this.calculateDistance(
          driverLocation.latitude,
          driverLocation.longitude,
          userLocation.latitude,
          userLocation.longitude
        );
        
        // Calcular ETA REAL con Google
        const realETA = await this.calculateRealETA(
          driverLocation.latitude,
          driverLocation.longitude,
          userLocation.latitude,
          userLocation.longitude
        );
        
        if (realETA !== null) {
          estimatedTimeRemaining = realETA;
        } else {
          // Fallback: estimación básica si Google falla
          estimatedTimeRemaining = Math.max(1, Math.ceil(distance * 2.5));
        }
        
        console.log(`📏 Distancia: ${distance.toFixed(2)} km, ETA REAL: ${estimatedTimeRemaining} min`);

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

      const driverUpdate = {
        location: driverLocation,
        distance: distance,
        estimatedTimeRemaining: estimatedTimeRemaining,
        isMoving: this.hasLocationChanged(driverLocation),
        timestamp: new Date().toISOString(),
        realLocation: true
      };

      this.lastLocation = driverLocation;

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
    
    const threshold = 0.000005;
    const latDiff = Math.abs(newLocation.latitude - this.lastLocation.latitude);
    const lngDiff = Math.abs(newLocation.longitude - this.lastLocation.longitude);
    const movedByDistance = latDiff > threshold || lngDiff > threshold;
    
    const movedNow = movedByDistance;
    
    this.movementHistory.push(movedNow);
    if (this.movementHistory.length > 5) {
      this.movementHistory.shift();
    }
    
    const trueCount = this.movementHistory.filter(m => m === true).length;
    const hasMoved = trueCount >= 3;
    
    console.log(`🚗 Movimiento: ${hasMoved} (actual: ${movedNow}, historial: ${this.movementHistory.join(',')})`);
    
    return hasMoved;
  }

  // ============================================
  // CALCULAR DISTANCIA (HAVERSINE)
  // ============================================
  
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
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
    this.movementHistory = [];
    this.cachedETA = null;
    this.lastETAUpdate = null;
    this.lastDriverLocation = null;
    
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
      lastLocation: this.lastLocation,
      cachedETA: this.cachedETA
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