/**
 * Servicio de Logging de Errores para TaxiApp
 * Maneja el registro y reporte de errores en la aplicación
 */
class ErrorLogger {
  constructor() {
    this.isDev = __DEV__;
    this.errorQueue = [];
    this.maxQueueSize = 50;
  }

  /**
   * Registra un error con contexto
   */
  logError(error, context = {}) {
    const errorInfo = {
      message: error.message || 'Error desconocido',
      stack: error.stack,
      timestamp: new Date().toISOString(),
      context: {
        ...context,
        component: context.component || 'Unknown',
        action: context.action || 'Unknown',
        userId: context.userId || null,
      }
    };

    // En desarrollo, mostrar en consola
    if (this.isDev) {
      console.error('🔴 Error capturado:', errorInfo);
    }

    // Agregar a la cola
    this.addToQueue(errorInfo);

    // En producción, enviaría a servicio externo
    if (!this.isDev) {
      this.sendToServer(errorInfo);
    }
  }

  /**
   * Registra una advertencia
   */
  logWarning(message, context = {}) {
    const warningInfo = {
      message,
      timestamp: new Date().toISOString(),
      context,
      level: 'warning'
    };

    if (this.isDev) {
      console.warn('⚠️ Advertencia:', warningInfo);
    }
  }

  /**
   * Agrega error a la cola
   */
  addToQueue(errorInfo) {
    this.errorQueue.push(errorInfo);
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift();
    }
  }

  /**
   * Envía errores al servidor (placeholder)
   */
  async sendToServer(errorInfo) {
    try {
      // Aquí iría la llamada a tu API o servicio de logging
      // Por ejemplo: Sentry, LogRocket, o tu propio backend
      console.log('Enviando error al servidor...', errorInfo);
    } catch (err) {
      console.error('Error enviando log al servidor:', err);
    }
  }

  /**
   * Obtiene los últimos errores
   */
  getRecentErrors() {
    return this.errorQueue.slice(-10);
  }

  /**
   * Limpia la cola de errores
   */
  clearErrors() {
    this.errorQueue = [];
  }
}

export default new ErrorLogger();