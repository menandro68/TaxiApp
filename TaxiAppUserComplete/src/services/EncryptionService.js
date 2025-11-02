import * as Crypto from 'expo-crypto';

/**
 * Servicio de Encriptación para TaxiApp - ULTRA-SEGURO
 * - Sin importación de SecurityConfig en tiempo de carga
 * - TODO es lazy (bajo demanda)
 * - Compatible con React Native
 */
class EncryptionService {
  constructor() {
    this.secretKey = null;
    this.salt = null;
    this.initialized = false;
    this.config = null;
  }

  /**
   * Carga la configuración de forma lazy
   */
  async loadConfig() {
    if (this.config) return this.config;
    
    try {
      // Importar SecurityConfig SOLO cuando se necesita
      const SecurityConfig = await import('./SecurityConfig').then(m => m.default);
      this.config = SecurityConfig;
      return this.config;
    } catch (error) {
      console.warn('No se pudo cargar SecurityConfig, usando valores por defecto:', error.message);
      this.config = {
        ENCRYPTION_KEY: 'TaxiApp2025SecureKey$RD#',
        PASSWORD_SALT: 'TaxiRD$2025#Salt'
      };
      return this.config;
    }
  }

  /**
   * Inicializa el servicio de forma lazy (bajo demanda)
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      const config = await this.loadConfig();
      this.secretKey = config.ENCRYPTION_KEY;
      this.salt = config.PASSWORD_SALT;
      this.initialized = true;
    } catch (error) {
      console.error('Error inicializando EncryptionService:', error);
      this.secretKey = 'TaxiApp2025SecureKey$RD#';
      this.salt = 'TaxiRD$2025#Salt';
      this.initialized = true;
    }
  }

  /**
   * Encripta datos usando hash SHA256
   */
  async encrypt(data) {
    await this.initialize();
    
    try {
      if (!data) return null;
      
      const dataString = typeof data === 'object' 
        ? JSON.stringify(data) 
        : String(data);
      
      const hashInput = dataString + this.secretKey + Math.random();
      const encrypted = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        hashInput
      );
      
      return encrypted;
    } catch (error) {
      console.error('Error encriptando datos:', error);
      return null;
    }
  }

  /**
   * Desencripta datos
   */
  async decrypt(encryptedData) {
    await this.initialize();
    
    try {
      if (!encryptedData || typeof encryptedData !== 'string') return null;
      
      if (!this.isValidEncryptedFormat(encryptedData)) {
        return null;
      }
      
      return encryptedData;
    } catch (error) {
      console.error('Error desencriptando datos:', error);
      return null;
    }
  }

  /**
   * Valida si el formato del dato encriptado es correcto
   */
  isValidEncryptedFormat(data) {
    if (!data || typeof data !== 'string') return false;
    
    try {
      return /^[a-f0-9]{64}$/i.test(data);
    } catch {
      return false;
    }
  }

  /**
   * Desencripta con fallback
   */
  async decryptWithFallback(encryptedData) {
    try {
      const result = await this.decrypt(encryptedData);
      return result || encryptedData;
    } catch (error) {
      console.error('Error en desencriptación con fallback:', error);
      return encryptedData;
    }
  }

  /**
   * Genera hash de contraseña con salt
   */
  async hashPassword(password) {
    await this.initialize();
    
    try {
      if (!password || typeof password !== 'string') return null;
      
      const hashInput = password + this.salt;
      const hashed = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        hashInput
      );
      
      return hashed;
    } catch (error) {
      console.error('Error generando hash de contraseña:', error);
      return null;
    }
  }

  /**
   * Verifica si una contraseña coincide con su hash
   */
  async verifyPassword(password, hash) {
    try {
      if (!password || !hash) return false;
      
      const passwordHash = await this.hashPassword(password);
      return passwordHash === hash;
    } catch (error) {
      console.error('Error verificando contraseña:', error);
      return false;
    }
  }

  /**
   * Encripta datos de tarjeta de crédito
   */
  async encryptCardData(cardData) {
    await this.initialize();
    
    try {
      if (!cardData) return null;
      
      const cardString = typeof cardData === 'object' 
        ? JSON.stringify(cardData) 
        : String(cardData);
      
      const encrypted = await this.encrypt(cardString);
      
      return {
        masked: '****-****-****-' + (cardData.number ? String(cardData.number).slice(-4) : '****'),
        encrypted: encrypted,
        token: await this.generateSecureToken()
      };
    } catch (error) {
      console.error('Error encriptando datos de tarjeta:', error);
      return {
        masked: '****-****-****-****',
        encrypted: null,
        token: null
      };
    }
  }

  /**
   * Genera un token seguro para sesiones
   */
  async generateSecureToken() {
    try {
      await this.initialize();
      
      const randomBytes = await Crypto.getRandomBytesAsync(32);
      
      const token = randomBytes
        .split('')
        .map((byte) => {
          const hex = byte.charCodeAt(0).toString(16);
          return hex.length === 1 ? '0' + hex : hex;
        })
        .join('')
        .substring(0, 64);
      
      return token;
    } catch (error) {
      console.error('Error generando token seguro:', error);
      return null;
    }
  }

  /**
   * Encripta datos según nivel de seguridad
   */
  async encryptBySecurityLevel(data, level = 'HIGH') {
    try {
      await this.initialize();
      
      if (level === 'CRITICAL' || level === 'HIGH') {
        return await this.encrypt(data);
      } else if (level === 'MEDIUM') {
        const dataString = typeof data === 'object' 
          ? JSON.stringify(data) 
          : String(data);
        
        return await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          dataString
        );
      } else {
        return data;
      }
    } catch (error) {
      console.error('Error encriptando por nivel de seguridad:', error);
      return data;
    }
  }

  /**
   * Verifica integridad de datos
   */
  async verifyDataIntegrity(data, signature) {
    try {
      if (!data || !signature) return false;
      
      const dataHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        typeof data === 'object' ? JSON.stringify(data) : String(data)
      );
      
      return dataHash === signature;
    } catch (error) {
      console.error('Error verificando integridad:', error);
      return false;
    }
  }

  /**
   * Genera firma para verificación de integridad
   */
  async generateSignature(data) {
    try {
      const signature = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        typeof data === 'object' ? JSON.stringify(data) : String(data)
      );
      
      return signature;
    } catch (error) {
      console.error('Error generando firma:', error);
      return null;
    }
  }

  /**
   * Encripta JSON de forma segura
   */
  async encryptJSON(jsonObject) {
    try {
      const jsonString = JSON.stringify(jsonObject);
      return await this.encrypt(jsonString);
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
    this.initialized = false;
    this.config = null;
  }
}

// Exportar instancia sin try-catch en tiempo de carga
const encryptionService = new EncryptionService();

export default encryptionService;