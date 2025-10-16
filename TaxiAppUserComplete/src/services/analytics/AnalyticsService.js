import analytics from '@react-native-firebase/analytics';

/**
 * Servicio de Analytics para TaxiApp
 * Rastrea eventos y comportamiento de usuarios
 */
class AnalyticsService {
  constructor() {
    this.isEnabled = true;
    this.userId = null;
  }

  /**
   * Inicializa el servicio de analytics
   */
  async initialize() {
    try {
      // Habilitar colección de analytics
      await analytics().setAnalyticsCollectionEnabled(true);
      console.log('📊 Analytics inicializado correctamente');
      return true;
    } catch (error) {
      console.error('Error inicializando analytics:', error);
      this.isEnabled = false;
      return false;
    }
  }

  /**
   * Establece el ID del usuario para tracking
   */
  async setUserId(userId) {
    try {
      this.userId = userId;
      await analytics().setUserId(userId);
      console.log('👤 Usuario establecido en analytics:', userId);
    } catch (error) {
      console.error('Error estableciendo userId:', error);
    }
  }

  /**
   * Establece propiedades del usuario
   */
  async setUserProperties(properties) {
    try {
      for (const [key, value] of Object.entries(properties)) {
        await analytics().setUserProperty(key, value);
      }
    } catch (error) {
      console.error('Error estableciendo propiedades de usuario:', error);
    }
  }

  /**
   * Registra evento de login
   */
  async logLogin(method) {
    try {
      await analytics().logLogin({ method });
      console.log('📊 Login registrado:', method);
    } catch (error) {
      console.error('Error registrando login:', error);
    }
  }

  /**
   * Registra evento de registro
   */
  async logSignUp(method) {
    try {
      await analytics().logSignUp({ method });
      console.log('📊 Registro de usuario registrado:', method);
    } catch (error) {
      console.error('Error registrando signup:', error);
    }
  }

  /**
   * Registra búsqueda de destino
   */
  async logSearchDestination(destination) {
    try {
      await analytics().logEvent('search_destination', {
        search_term: destination,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error registrando búsqueda:', error);
    }
  }

  /**
   * Registra solicitud de viaje
   */
  async logRideRequest(params) {
    try {
      await analytics().logEvent('ride_request', {
        origin_lat: params.origin?.latitude,
        origin_lng: params.origin?.longitude,
        destination_lat: params.destination?.latitude,
        destination_lng: params.destination?.longitude,
        vehicle_type: params.vehicleType || 'standard',
        estimated_price: params.estimatedPrice,
        timestamp: new Date().toISOString()
      });
      console.log('📊 Solicitud de viaje registrada');
    } catch (error) {
      console.error('Error registrando solicitud de viaje:', error);
    }
  }

  /**
   * Registra conductor asignado
   */
  async logDriverAssigned(driverId, eta) {
    try {
      await analytics().logEvent('driver_assigned', {
        driver_id: driverId,
        eta_minutes: eta,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error registrando conductor asignado:', error);
    }
  }

  /**
   * Registra inicio de viaje
   */
  async logRideStart(rideId) {
    try {
      await analytics().logEvent('ride_start', {
        ride_id: rideId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error registrando inicio de viaje:', error);
    }
  }

  /**
   * Registra fin de viaje
   */
  async logRideComplete(params) {
    try {
      await analytics().logEvent('ride_complete', {
        ride_id: params.rideId,
        duration_minutes: params.duration,
        distance_km: params.distance,
        final_price: params.price,
        payment_method: params.paymentMethod,
        timestamp: new Date().toISOString()
      });
      console.log('📊 Viaje completado registrado');
    } catch (error) {
      console.error('Error registrando viaje completado:', error);
    }
  }

  /**
   * Registra cancelación de viaje
   */
  async logRideCancel(reason, stage) {
    try {
      await analytics().logEvent('ride_cancel', {
        cancel_reason: reason,
        cancel_stage: stage, // 'searching', 'driver_assigned', 'in_ride'
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error registrando cancelación:', error);
    }
  }

  /**
   * Registra calificación
   */
  async logRating(rating, rideId) {
    try {
      await analytics().logEvent('rate_driver', {
        rating: rating,
        ride_id: rideId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error registrando calificación:', error);
    }
  }

  /**
   * Registra evento personalizado
   */
  async logEvent(eventName, params = {}) {
    try {
      if (!this.isEnabled) return;
      
      await analytics().logEvent(eventName, {
        ...params,
        timestamp: new Date().toISOString()
      });
      
      if (__DEV__) {
        console.log(`📊 Evento: ${eventName}`, params);
      }
    } catch (error) {
      console.error(`Error registrando evento ${eventName}:`, error);
    }
  }

  /**
   * Registra pantalla vista
   */
  async logScreenView(screenName, screenClass) {
    try {
      await analytics().logScreenView({
        screen_name: screenName,
        screen_class: screenClass || screenName
      });
    } catch (error) {
      console.error('Error registrando vista de pantalla:', error);
    }
  }
}

export default new AnalyticsService();