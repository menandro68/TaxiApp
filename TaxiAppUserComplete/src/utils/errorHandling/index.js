/**
 * Exporta todos los componentes de manejo de errores
 */
import ErrorBoundary from './ErrorBoundary';
import ErrorLogger from './ErrorLogger';
import GlobalErrorHandler from './GlobalErrorHandler';

export {
  ErrorBoundary,
  ErrorLogger,
  GlobalErrorHandler
};

// Función helper para registrar errores fácilmente
export const logError = (error, context) => {
  ErrorLogger.logError(error, context);
};

// Función helper para registrar advertencias
export const logWarning = (message, context) => {
  ErrorLogger.logWarning(message, context);
};