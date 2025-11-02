import CryptoJS from 'crypto-js';

/**
 * Servicio de Encriptación para TaxiApp
 * Maneja toda la encriptación/desencriptación de datos sensibles
 * ✅ Claves hardcoded - sin importación de SecurityConfig
 */
class EncryptionService {
  constructor() {
    // Claves hardcoded disponibles inmediatamente
    this.secretKey = 'TaxiApp2025SecureKey$RD#';
    this.salt = 'TaxiRD$2025#Salt';
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
      try {
        const isEncrypted = this.isValidEncryptedFormat(encryptedData);
        
        if (!isEncrypted) {
          console.warn('⚠️ Formato de encriptación no válido');
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
        console.log('✅ Dato desencriptado correctamente (texto)');
        return decryptedString;
      }
      
    } catch (error) {
      console.error('❌ Error crítico en desencriptación:', {
        message: error.message,
        stack: error.stack,
        dataType: typeof encryptedData,
        dataLength: encryptedData?.length || 0
      });
      
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
    
    try {
      const base64Regex = /^[A-Za-z0-9+/]+=*$/;
      const cleanData = data.replace(/\s/g, '');
      
      if (!base64Regex.test(cleanData)) {
        return false;
      }
      
      if (cleanData.length < 24) {
        return false;
      }
      
      const decoded = atob(cleanData);
      return decoded.length > 0;
      
    } catch {
      return false;
    }
  }

  /**
   * Método auxiliar para intentar desencriptar con manejo de versiones
   */
  decryptWithFallback(encryptedData) {
    let result = this.decrypt(encryptedData);
    
    if (result !== null) {
      return result;
    }
    
    console.warn('⚠️ Intentando con claves anteriores...');
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
    // Sin SecurityConfig, encriptar todo de forma segura
    return this.encrypt(data);
  }

  /**
   * Verifica integridad de datos
   */
  verifyDataIntegrity(data, signature) {
    try {
      if (!data || !signature) return false;
      
      const dataHash = CryptoJS.SHA256(
        typeof data === 'object' ? JSON.stringify(data) : String(data)
      ).toString();
      
      return dataHash === signature;
    } catch (error) {
      console.error('Error verificando integridad:', error);
      return false;
    }
  }

  /**
   * Genera firma para verificación de integridad
   */
  generateSignature(data) {
    try {
      const signature = CryptoJS.SHA256(
        typeof data === 'object' ? JSON.stringify(data) : String(data)
      ).toString();
      
      return signature;
    } catch (error) {
      console.error('Error generando firma:', error);
      return null;
    }
  }

  /**
   * Encripta JSON de forma segura
   */
  encryptJSON(jsonObject) {
    try {
      const jsonString = JSON.stringify(jsonObject);
      return this.encrypt(jsonString);
    } catch (error) {
      console.error('Error encriptando JSON:', error);
      return null;
    }
  }

  /**
   * Limpia claves sensibles de memoria
   */
  clearSensitiveData() {
    this.secretKey = null;
    this.salt = null;
  }
}

export default new EncryptionService();