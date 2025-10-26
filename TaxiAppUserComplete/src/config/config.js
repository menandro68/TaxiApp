// Configuración de API Keys para TaxiApp Usuario
export const GOOGLE_MAPS_CONFIG = {
  API_KEY: 'AIzaSyC6HuO-nRJxdZctdH0o_-nuezUOILq868Q',
  
  // Configuración específica para Santo Domingo
  DEFAULT_REGION: {
    latitude: 18.4861,
    longitude: -69.9312,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  },
  
  // Lugares importantes de Santo Domingo
  LANDMARKS: {
    SANTO_DOMINGO_ESTE: { latitude: 18.4861, longitude: -69.9312 },
    ZONA_COLONIAL: { latitude: 18.4765, longitude: -69.8933 },
    MEGACENTRO: { latitude: 18.5204, longitude: -69.8584 },
    AEROPUERTO: { latitude: 18.4297, longitude: -69.6689 },
  }
};

// ========================================
// CONFIGURACIÓN DEL BACKEND
// ========================================

export const API_CONFIG = {
  // Entorno actual (cambiar según necesidad)
  ENVIRONMENT: 'production',
  
  // URLs del backend por entorno
  BACKEND_URLS: {
    development: 'http://192.168.1.26:3000',
    staging: 'https://staging-taxiapp.herokuapp.com/api',
    production: 'https://web-production-99844.up.railway.app/api'
  },
  
  // Configuración de timeouts
  REQUEST_TIMEOUT: 10000, // 10 segundos
  
  // Configuración de reintentos
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 segundo
  
  // Configuración de cache
  CACHE_DURATION: 300000, // 5 minutos
};

// ========================================
// CONFIGURACIÓN DE LA APLICACIÓN
// ========================================

export const APP_CONFIG = {
  NAME: 'TaxiApp Usuario',
  VERSION: '1.0.0',
  
  // Configuración de viajes
  TRIP_CONFIG: {
    MAX_SEARCH_RADIUS: 5000, // 5 km
    DRIVER_SEARCH_TIMEOUT: 30000, // 30 segundos
    LOCATION_UPDATE_INTERVAL: 5000, // 5 segundos
  },
  
  // Configuración de precios (pesos dominicanos)
  PRICING_CONFIG: {
    BASE_FARE: 50, // RD$ 50
    PER_KM_RATE: 25, // RD$ 25 por km
    PER_MINUTE_RATE: 3, // RD$ 3 por minuto
    MINIMUM_FARE: 80, // RD$ 80 mínimo
    
    // Multiplicadores por tipo de vehículo
    VEHICLE_MULTIPLIERS: {
      economy: 1.0,
      comfort: 1.3,
      premium: 1.8
    },
    
    // Recargos por tiempo
    TIME_SURCHARGE: {
      peak_hours: 1.2, // 20% más en horas pico
      night_hours: 1.1, // 10% más de noche
      weekend: 1.15    // 15% más los fines de semana
    }
  },
  
  // Configuración de notificaciones
  NOTIFICATION_CONFIG: {
    SOUND_ENABLED: true,
    VIBRATION_ENABLED: true,
    BADGE_ENABLED: true
  }
};

// ========================================
// FUNCIONES DE UTILIDAD
// ========================================

export const getBackendUrl = () => {
  return API_CONFIG.BACKEND_URLS[API_CONFIG.ENVIRONMENT];
};

export const isDevelopment = () => {
  return API_CONFIG.ENVIRONMENT === 'development';
};

export const isProduction = () => {
  return API_CONFIG.ENVIRONMENT === 'production';
};

// Función para obtener configuración completa
export const getAppConfig = () => {
  return {
    ...APP_CONFIG,
    backend_url: getBackendUrl(),
    google_maps: GOOGLE_MAPS_CONFIG,
    is_development: isDevelopment(),
    is_production: isProduction()
  };
};