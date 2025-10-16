import Config from 'react-native-config';

/**
 * Servicio de Configuración de Ambiente
 * Maneja las variables de entorno para diferentes ambientes
 */
class Environment {
  constructor() {
    this.env = Config.ENV || 'development';
    this.isDevelopment = this.env === 'development';
    this.isStaging = this.env === 'staging';
    this.isProduction = this.env === 'production';
  }

  /**
   * Obtiene la URL base de la API
   */
  getApiUrl() {
    return Config.API_BASE_URL || 'http://localhost:3000/api';
  }

  /**
   * Obtiene la URL del WebSocket
   */
  getSocketUrl() {
    return Config.SOCKET_URL || 'ws://localhost:3000';
  }

  /**
   * Obtiene la API Key de Google Maps
   */
  getGoogleMapsKey() {
    return Config.GOOGLE_MAPS_API_KEY || '';
  }

  /**
   * Obtiene configuración de Firebase
   */
  getFirebaseConfig() {
    return {
      apiKey: Config.FIREBASE_API_KEY || '',
      projectId: Config.FIREBASE_PROJECT_ID || 'taxiapp-development',
    };
  }

  /**
   * Verifica si los logs están habilitados
   */
  isLoggingEnabled() {
    return Config.ENABLE_LOGS === 'true';
  }

  /**
   * Verifica si el modo debug está activo
   */
  isDebugEnabled() {
    return Config.ENABLE_DEBUG === 'true';
  }

  /**
   * Verifica si usar ubicación simulada
   */
  isMockLocationEnabled() {
    return Config.MOCK_LOCATION === 'true';
  }

  /**
   * Verifica si usar llamadas API simuladas
   */
  isMockApiEnabled() {
    return Config.MOCK_API_CALLS === 'true';
  }

  /**
   * Obtiene el timeout de la API
   */
  getApiTimeout() {
    return parseInt(Config.API_TIMEOUT || '30000', 10);
  }

  /**
   * Obtiene el número máximo de reintentos
   */
  getMaxRetryAttempts() {
    return parseInt(Config.MAX_RETRY_ATTEMPTS || '3', 10);
  }

  /**
   * Obtiene la versión de la app
   */
  getAppVersion() {
    return Config.APP_VERSION || '1.0.0';
  }

  /**
   * Obtiene el nombre del ambiente actual
   */
  getEnvironmentName() {
    return this.env;
  }

  /**
   * Log de configuración (solo en desarrollo)
   */
  logConfig() {
    if (this.isDevelopment && this.isLoggingEnabled()) {
      console.log('🔧 Configuración del Ambiente:');
      console.log('├─ Ambiente:', this.env);
      console.log('├─ API URL:', this.getApiUrl());
      console.log('├─ Socket URL:', this.getSocketUrl());
      console.log('├─ Logs:', this.isLoggingEnabled());
      console.log('├─ Debug:', this.isDebugEnabled());
      console.log('├─ Mock Location:', this.isMockLocationEnabled());
      console.log('├─ Mock API:', this.isMockApiEnabled());
      console.log('├─ API Timeout:', this.getApiTimeout());
      console.log('├─ Max Reintentos:', this.getMaxRetryAttempts());
      console.log('└─ Versión:', this.getAppVersion());
    }
  }
}

export default new Environment();