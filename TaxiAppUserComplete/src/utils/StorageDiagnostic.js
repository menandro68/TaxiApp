import AsyncStorage from '@react-native-async-storage/async-storage';
import SecureStorage from '../services/SecureStorage';
import EncryptionService from '../services/EncryptionService';

const StorageDiagnostic = {
  /**
   * Lista todas las claves almacenadas
   */
  async listAllKeys() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      console.log('📋 Claves encontradas:', keys);
      console.log('📊 Total de claves:', keys.length);
      return keys;
    } catch (error) {
      console.error('❌ Error listando claves:', error);
      return [];
    }
  },

  /**
   * Muestra el contenido raw de una clave
   */
  async inspectKey(key) {
    try {
      const rawValue = await AsyncStorage.getItem(key);
      console.log(`🔍 Inspeccionando clave: ${key}`);
      console.log('📦 Valor raw:', rawValue ? rawValue.substring(0, 50) + '...' : 'null');
      console.log('📏 Longitud:', rawValue ? rawValue.length : 0);
      
      // Intentar determinar si está encriptado
      if (rawValue) {
        const base64Regex = /^[A-Za-z0-9+/]+=*$/;
        const looksEncrypted = base64Regex.test(rawValue.replace(/\s/g, ''));
        console.log('🔐 Parece encriptado:', looksEncrypted);
      }
      
      return rawValue;
    } catch (error) {
      console.error(`❌ Error inspeccionando ${key}:`, error);
      return null;
    }
  },

  /**
   * Limpia TODAS las claves del storage
   */
  async clearAllStorage() {
    try {
      console.log('⚠️ Limpiando TODO el AsyncStorage...');
      await AsyncStorage.clear();
      console.log('✅ AsyncStorage completamente limpio');
      return true;
    } catch (error) {
      console.error('❌ Error limpiando storage:', error);
      return false;
    }
  },

  /**
   * Limpia solo las claves relacionadas con autenticación
   */
  async clearAuthData() {
    try {
      console.log('🧹 Limpiando datos de autenticación...');
      const authKeys = [
        'user_credentials',
        'auth_token',
        'user_profile',
        'user_location',
        'userToken',
        'userData'
      ];
      
      for (const key of authKeys) {
        await AsyncStorage.removeItem(key);
        console.log(`  ✓ Eliminado: ${key}`);
      }
      
      console.log('✅ Datos de autenticación limpiados');
      return true;
    } catch (error) {
      console.error('❌ Error limpiando auth:', error);
      return false;
    }
  },

  /**
   * Diagnóstico completo
   */
  async runDiagnostic() {
    console.log('🏥 === INICIANDO DIAGNÓSTICO DE STORAGE ===');
    
    // 1. Listar todas las claves
    const keys = await this.listAllKeys();
    
    // 2. Inspeccionar claves problemáticas
    const problematicKeys = ['auth_token', 'user_profile', 'user_credentials'];
    for (const key of problematicKeys) {
      if (keys.includes(key)) {
        await this.inspectKey(key);
      }
    }
    
    // 3. Probar encriptación
    console.log('\n🧪 === PROBANDO ENCRIPTACIÓN ===');
    const testData = 'test123';
    const encrypted = EncryptionService.encrypt(testData);
    const decrypted = EncryptionService.decrypt(encrypted);
    console.log('✅ Test de encriptación:', testData === decrypted ? 'PASÓ' : 'FALLÓ');
    
    console.log('\n🏥 === DIAGNÓSTICO COMPLETADO ===');
  },

  /**
   * Resetea la app limpiando todo y preparándola para uso fresco
   */
  async resetApp() {
    console.log('🔄 === RESETEANDO APP ===');
    await this.clearAllStorage();
    console.log('✅ App reseteada - lista para usar');
    return true;
  }
};

// Hacer disponible globalmente para debugging
global.StorageDiagnostic = StorageDiagnostic;

export default StorageDiagnostic;