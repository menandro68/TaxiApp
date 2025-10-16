import AsyncStorage from '@react-native-async-storage/async-storage';
import EncryptionService from './EncryptionService';

/**
 * Almacenamiento Seguro para TaxiApp
 * Wrapper de AsyncStorage con encriptación automática
 */
class SecureStorage {
  
  /**
   * Guarda datos encriptados
   */
  async setSecureItem(key, value) {
    try {
      const encrypted = EncryptionService.encrypt(value);
      await AsyncStorage.setItem(key, encrypted);
      console.log(`✅ Dato guardado de forma segura: ${key}`);
      return true;
    } catch (error) {
      console.error('Error guardando dato seguro:', error);
      return false;
    }
  }

  /**
   * Obtiene y desencripta datos
   */
  async getSecureItem(key) {
    try {
      const encrypted = await AsyncStorage.getItem(key);
      if (!encrypted) return null;
      
      const decrypted = EncryptionService.decrypt(encrypted);
      console.log(`🔓 Dato obtenido de forma segura: ${key}`);
      return decrypted;
    } catch (error) {
      console.error('Error obteniendo dato seguro:', error);
      return null;
    }
  }

  /**
   * Elimina datos seguros
   */
  async removeSecureItem(key) {
    try {
      await AsyncStorage.removeItem(key);
      console.log(`🗑️ Dato seguro eliminado: ${key}`);
      return true;
    } catch (error) {
      console.error('Error eliminando dato seguro:', error);
      return false;
    }
  }

  /**
   * Guarda credenciales de usuario
   */
  async saveCredentials(email, password) {
    const hashedPassword = EncryptionService.hashPassword(password);
    const credentials = {
      email: email,
      password: hashedPassword,
      timestamp: new Date().toISOString()
    };
    return await this.setSecureItem('user_credentials', credentials);
  }

  /**
   * Guarda token de autenticación
   */
  async saveAuthToken(token) {
    return await this.setSecureItem('auth_token', token);
  }

  /**
   * Obtiene token de autenticación
   */
  async getAuthToken() {
    return await this.getSecureItem('auth_token');
  }

  /**
   * Guarda perfil de usuario encriptado
   */
  async saveUserProfile(profile) {
    return await this.setSecureItem('user_profile', profile);
  }

  /**
   * Obtiene perfil de usuario desencriptado
   */
  async getUserProfile() {
    return await this.getSecureItem('user_profile');
  }

  /**
   * Guarda ubicación encriptada
   */
  async saveLocation(location) {
    return await this.setSecureItem('user_location', location);
  }

  /**
   * Obtiene ubicación desencriptada
   */
  async getLocation() {
    return await this.getSecureItem('user_location');
  }

  /**
   * Limpia todos los datos seguros
   */
  async clearAll() {
    try {
      const keys = [
        'user_credentials',
        'auth_token',
        'user_profile',
        'user_location'
      ];
      
      for (const key of keys) {
        await this.removeSecureItem(key);
      }
      
      console.log('🧹 Todos los datos seguros eliminados');
      return true;
    } catch (error) {
      console.error('Error limpiando datos seguros:', error);
      return false;
    }
  }

  /**
   * Limpia perfil de usuario
   */
  async clearUserProfile() {
    return await this.removeSecureItem('user_profile');
  }

  /**
   * Limpia token de autenticación
   */
  async clearAuth() {
    return await this.removeSecureItem('auth_token');
  }
}

export default new SecureStorage();
