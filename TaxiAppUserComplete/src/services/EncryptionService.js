import CryptoJS from 'crypto-js';
import SecurityConfig from './SecurityConfig';

/**
 * Servicio de Encriptación para TaxiApp
 * Maneja toda la encriptación/desencriptación de datos sensibles
 */
class EncryptionService {
  constructor() {
    // Usar clave desde configuración centralizada
    this.secretKey = SecurityConfig.ENCRYPTION_KEY;
    this.salt = SecurityConfig.PASSWORD_SALT;
  }

  /**
   * Encripta cualquier dato sensible
   */
  encrypt(data) {
    try {
      if (!data) return null;
      
      const dataString = typeof data === 'object' 
        ? JSON.stringify(data) 
        : String(data);
      
      const encrypted = CryptoJS.AES.encrypt(dataString, this.secretKey).toString();
      console.log('🔐 Dato encriptado correctamente');
      return encrypted;
    } catch (error) {
      console.error('Error encriptando:', error);
      return null;
    }
  }

  /**
   * Desencripta datos con manejo robusto de errores
   */
  decrypt(encryptedData) {
    try {
      // Validación inicial
      if (!encryptedData) {
        console.warn('⚠️ No hay datos para desencriptar');
        return null;
      }
      
      // Validar tipo de dato
      if (typeof encryptedData !== 'string') {
        console.error('❌ Tipo de dato incorrecto para desencriptar:', typeof encryptedData);
        return null;
      }
      
      // Verificar formato de dato encriptado con AES
      // Los datos encriptados con CryptoJS AES tienen un formato específico
      try {
        // Intentar parsear como estructura CryptoJS
        const isEncrypted = this.isValidEncryptedFormat(encryptedData);
        
        if (!isEncrypted) {
          console.warn('⚠️ Formato de encriptación no válido');
          // NO retornar el dato original por seguridad
          return null;
        }
      } catch (e) {
        console.error('❌ Error validando formato:', e.message);
        return null;
      }
      
      // Realizar desencriptación
      let decrypted;
      try {
        decrypted = CryptoJS.AES.decrypt(encryptedData, this.secretKey);
      } catch (cryptoError) {
        console.error('❌ Error en proceso de desencriptación:', cryptoError.message);
        return null;
      }
      
      // Convertir a string UTF-8
      let decryptedString;
      try {
        decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
      } catch (encodingError) {
        console.error('❌ Error decodificando UTF-8:', encodingError.message);
        return null;
      }
      
      // Verificar que la desencriptación produjo contenido válido
      if (!decryptedString || decryptedString.length === 0) {
        console.error('❌ Desencriptación produjo resultado vacío - posible clave incorrecta');
        return null;
      }
      
      // Intentar parsear como JSON si es posible
      try {
        const parsed = JSON.parse(decryptedString);
        console.log('✅ Dato desencriptado correctamente (JSON)');
        return parsed;
      } catch {
        // No es JSON, retornar como string
        console.log('✅ Dato desencriptado correctamente (texto)');
        return decryptedString;
      }
      
    } catch (error) {
      // Error general no capturado
      console.error('❌ Error crítico en desencriptación:', {
        message: error.message,
        stack: error.stack,
        dataType: typeof encryptedData,
        dataLength: encryptedData?.length || 0
      });
      
      // Por seguridad, nunca retornar datos parciales o corruptos
      return null;
    }
  }

  /**
   * Valida si un string tiene formato de dato encriptado válido
   */
  isValidEncryptedFormat(data) {
    if (!data || typeof data !== 'string') {
      return false;
    }
    
    // CryptoJS AES produce salida en formato específico
    // Generalmente Base64 con estructura específica
    try {
      // Verificar que parece Base64
      const base64Regex = /^[A-Za-z0-9+/]+=*$/;
      const cleanData = data.replace(/\s/g, '');
      
      if (!base64Regex.test(cleanData)) {
        return false;
      }
      
      // Verificar longitud mínima (AES produce al menos 24 caracteres)
      if (cleanData.length < 24) {
        return false;
      }
      
      // Intentar decodificar Base64 para verificar validez
      const decoded = atob(cleanData);
      
      // Un dato AES encriptado debe tener cierta estructura
      return decoded.length > 0;
      
    } catch {
      return false;
    }
  }

  /**
   * Método auxiliar para intentar desencriptar con manejo de versiones
   */
  decryptWithFallback(encryptedData) {
    // Primero intentar con la clave actual
    let result = this.decrypt(encryptedData);
    
    if (result !== null) {
      return result;
    }
    
    // Si falla, podría ser un dato con clave antigua
    console.warn('⚠️ Intentando con claves anteriores...');
    
    // Aquí podrías intentar con claves anteriores si tienes un sistema de rotación
    // Por ahora, retornar null
    return null;
  }

  /**
   * Encripta contraseñas con hash adicional y salt
   */
  hashPassword(password) {
    return CryptoJS.SHA256(password + this.salt).toString();
  }

  /**
   * Verifica si una contraseña coincide con su hash
   */
  verifyPassword(password, hash) {
    const passwordHash = this.hashPassword(password);
    return passwordHash === hash;
  }

  /**
   * Encripta datos de tarjetas
   */
  encryptCardData(cardNumber) {
    const masked = '**** **** **** ' + cardNumber.slice(-4);
    const encrypted = this.encrypt(cardNumber);
    return { masked, encrypted };
  }

  /**
   * Genera un token seguro
   */
  generateSecureToken() {
    const random = CryptoJS.lib.WordArray.random(32);
    return CryptoJS.enc.Hex.stringify(random);
  }

  /**
   * Encripta datos según su nivel de seguridad
   */
  encryptBySecurityLevel(data, dataType) {
    const level = SecurityConfig.getSecurityLevel(dataType);
    
    if (level >= SecurityConfig.SECURITY_LEVELS.HIGH) {
      return this.encrypt(data);
    }
    return data; // No encriptar datos de bajo nivel
  }
}

export default new EncryptionService();