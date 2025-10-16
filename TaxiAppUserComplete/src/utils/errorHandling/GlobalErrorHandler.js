import ErrorLogger from './ErrorLogger';

/**
 * Manejador Global de Errores para TaxiApp
 * Versión simplificada sin ErrorUtils
 */
class GlobalErrorHandler {
  constructor() {
    this.isSetup = false;
  }

  /**
   * Configura el manejador global de errores
   */
  setup() {
    if (this.isSetup) return;

    // Configurar manejador de errores para promesas rechazadas
    if (!__DEV__) {
      global.Promise = require('promise');
      require('promise/setimmediate/rejection-tracking').enable({
        allRejections: true,
        onUnhandled: (id, error) => {
          this.handleRejection(id, error);
        },
      });
    }

    this.isSetup = true;
    console.log('✅ Manejador global de errores configurado');
  }

  /**
   * Maneja errores de JavaScript
   */
  handleError(error, isFatal = false) {
    // Registrar el error
    ErrorLogger.logError(error, {
      fatal: isFatal,
      type: 'JS_EXCEPTION',
      timestamp: new Date().toISOString()
    });

    // En desarrollo, mostrar más detalles
    if (__DEV__) {
      console.error('💥 Error Capturado:', {
        message: error.message,
        stack: error.stack,
        isFatal
      });
    }
  }

  /**
   * Maneja promesas rechazadas no capturadas
   */
  handleRejection(id, error) {
    // Registrar el rechazo
    ErrorLogger.logWarning('Promesa rechazada no manejada', {
      id,
      error: error ? error.toString() : 'Unknown',
      type: 'UNHANDLED_REJECTION'
    });

    if (__DEV__) {
      console.warn('⚠️ Promesa Rechazada:', {
        id,
        error
      });
    }
  }

  /**
   * Registra error manualmente
   */
  reportError(error, context = {}) {
    try {
      ErrorLogger.logError(error, context);
    } catch (e) {
      console.error('Error al registrar:', e);
    }
  }

  /**
   * Registra advertencia manualmente
   */
  reportWarning(message, context = {}) {
    try {
      ErrorLogger.logWarning(message, context);
    } catch (e) {
      console.warn('Error al registrar warning:', e);
    }
  }
}

export default new GlobalErrorHandler();