/**
 * Configuración de Seguridad para TaxiApp
 * Centraliza todas las configuraciones de seguridad
 */

// En producción, estas claves deben venir de variables de entorno
const SecurityConfig = {
  // Clave de encriptación principal
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || 'TaxiApp2025SecureKey$RD#',
  
  // Salt para hash de contraseñas
  PASSWORD_SALT: process.env.PASSWORD_SALT || 'TaxiRD$2025#Salt',
  
  // Configuración de seguridad
  SECURITY_SETTINGS: {
    // Tiempo de expiración del token (24 horas)
    TOKEN_EXPIRY: 24 * 60 * 60 * 1000,
    
    // Intentos máximos de login
    MAX_LOGIN_ATTEMPTS: 5,
    
    // Tiempo de bloqueo después de intentos fallidos (30 minutos)
    LOCKOUT_TIME: 30 * 60 * 1000,
    
    // Longitud mínima de contraseña
    MIN_PASSWORD_LENGTH: 6,
    
    // Requerir caracteres especiales en contraseña
    REQUIRE_SPECIAL_CHARS: false,
  },
  
  // Datos que deben ser encriptados
  SENSITIVE_FIELDS: [
    'password',
    'email',
    'phone',
    'creditCard',
    'cvv',
    'location',
    'address',
    'token'
  ],
  
  // Niveles de seguridad
  SECURITY_LEVELS: {
    LOW: 1,    // Datos públicos
    MEDIUM: 2, // Datos internos
    HIGH: 3,   // Datos sensibles
    CRITICAL: 4 // Datos críticos (pagos, contraseñas)
  },
  
  // Validar si un campo debe ser encriptado
  shouldEncrypt: (fieldName) => {
    return SecurityConfig.SENSITIVE_FIELDS.includes(fieldName.toLowerCase());
  },
  
  // Obtener nivel de seguridad para un tipo de dato
  getSecurityLevel: (dataType) => {
    const levels = {
      'password': SecurityConfig.SECURITY_LEVELS.CRITICAL,
      'creditCard': SecurityConfig.SECURITY_LEVELS.CRITICAL,
      'email': SecurityConfig.SECURITY_LEVELS.HIGH,
      'phone': SecurityConfig.SECURITY_LEVELS.HIGH,
      'location': SecurityConfig.SECURITY_LEVELS.MEDIUM,
      'name': SecurityConfig.SECURITY_LEVELS.LOW
    };
    return levels[dataType] || SecurityConfig.SECURITY_LEVELS.LOW;
  }
};

export default SecurityConfig;