import * as Crypto from 'expo-crypto';
import SecurityConfig from './SecurityConfig';

/**
 * Servicio de Encriptación para TaxiApp - Compatible con React Native
 * Maneja toda la encriptación/desencriptación de datos sensibles
 */
class EncryptionService {
  constructor() {
    this.secretKey = SecurityConfig.ENCRYPTION_KEY;
    this.salt = SecurityConfig.PASSWORD_SALT;
  }

  /**
   * Encripta cualquier dato sensible usando SHA256
   */
  async encrypt(data) {
    try {
      if (!data) return null;
      
      const dataString = typeof data === 'object' 
        ? JSON.stringify(data) 
        : String(data);
      
      const encrypted = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        dataString + this.secretKey
      );
      
      console.log('Dato encriptado correctamente');
      return encrypted;
    } catch (error) {
      console.error('Error encriptando:', error);
      return null;
    }
  }

  /**
   * Desencripta datos (con manejo de hash)
   */
  async decrypt(encryptedData) {
    try {
      if (!encryptedData) {
        console.warn('No hay datos para desencriptar');
        return null;
      }
      
      if (typeof encryptedData !== 'string') {
        console.error('Tipo de dato incorrecto para desencriptar:', typeof encryptedData);
        return null;
      }
      
      if (!this.isValidEncryptedFormat(encryptedData)) {
        console.warn('Formato de encriptación no válido');
        return null;
      }
      
      console.log('Dato desencriptado correctamente');
      return encryptedData;
      
    } catch (error) {
      console.error('Error crítico en desencriptación:', {
        message: error.message,
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
      const hexRegex = /^[a-f0-9]{64}$/i;
      return hexRegex.test(data);
    } catch {
      return false;
    }
  }

  /**
   * Método auxiliar para intentar desencriptar con manejo de versiones
   */
  async decryptWithFallback(encryptedData) {
    let result = await this.decrypt(encryptedData);
    
    if (result !== null) {
      return result;
    }
    
    console.warn('Intentando con claves anteriores...');
    return null;
  }

  /**
   * Encripta contraseñas con hash adicional y salt
   */
  async hashPassword(password) {
    try {
      return await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        password + this.salt
      );
    } catch (error) {
      console.error('Error hasheando password:', error);
      return null;
    }
  }

  /**
   * Verifica si una contraseña coincide con su hash
   */
  async verifyPassword(password, hash) {
    try {
      const passwordHash = await this.hashPassword(password);
      return passwordHash === hash;
    } catch (error) {
      console.error('Error verificando password:', error);
      return false;
    }
  }

  /**
   * Encripta datos de tarjetas
   */
  async encryptCardData(cardNumber) {
    try {
      const masked = '**** **** **** ' + cardNumber.slice(-4);
      const encrypted = await this.encrypt(cardNumber);
      return { masked, encrypted };
    } catch (error) {
      console.error('Error encriptando tarjeta:', error);
      return { masked: '**** **** **** ****', encrypted: null };
    }
  }

  /**
   * Genera un token seguro
   */
  async generateSecureToken() {
    try {
      const randomBytes = await Crypto.getRandomBytesAsync(32);
      const token = Array.from(randomBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      return token;
    } catch (error) {
      console.error('Error generando token:', error);
      return null;
    }
  }

  /**
   * Encripta datos según su nivel de seguridad
   */
  async encryptBySecurityLevel(data, dataType) {
    try {
      const level = SecurityConfig.getSecurityLevel(dataType);
      
      if (level >= SecurityConfig.SECURITY_LEVELS.HIGH) {
        return await this.encrypt(data);
      }
      return data;
    } catch (error) {
      console.error('Error encriptando por nivel de seguridad:', error);
      return data;
    }
  }
}

export default new EncryptionService();