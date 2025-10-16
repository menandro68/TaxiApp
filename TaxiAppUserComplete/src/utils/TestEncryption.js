import EncryptionService from '../services/EncryptionService';
import SecureStorage from '../services/SecureStorage';

/**
 * Pruebas para verificar que la encriptación funciona correctamente
 */
const TestEncryption = {
  
  // Prueba de encriptación básica
  async testBasicEncryption() {
    console.log('\n📝 === PRUEBA DE ENCRIPTACIÓN BÁSICA ===');
    
    const testData = 'Mi contraseña secreta 123';
    const encrypted = EncryptionService.encrypt(testData);
    const decrypted = EncryptionService.decrypt(encrypted);
    
    console.log('Original:', testData);
    console.log('Encriptado:', encrypted);
    console.log('Desencriptado:', decrypted);
    console.log('✅ Prueba:', testData === decrypted ? 'PASADA' : 'FALLIDA');
    
    return testData === decrypted;
  },
  
  // Prueba de hash de contraseña
  async testPasswordHashing() {
    console.log('\n🔐 === PRUEBA DE HASH DE CONTRASEÑA ===');
    
    const password = 'MiPassword123';
    const hash = EncryptionService.hashPassword(password);
    const verified = EncryptionService.verifyPassword(password, hash);
    
    console.log('Contraseña:', password);
    console.log('Hash:', hash);
    console.log('Verificación:', verified ? 'CORRECTA' : 'INCORRECTA');
    console.log('✅ Prueba:', verified ? 'PASADA' : 'FALLIDA');
    
    return verified;
  },
  
  // Prueba de encriptación de tarjeta
  async testCardEncryption() {
    console.log('\n💳 === PRUEBA DE ENCRIPTACIÓN DE TARJETA ===');
    
    const cardNumber = '4532015112830366';
    const result = EncryptionService.encryptCardData(cardNumber);
    
    console.log('Número original:', cardNumber);
    console.log('Número enmascarado:', result.masked);
    console.log('Encriptado:', result.encrypted);
    
    const decrypted = EncryptionService.decrypt(result.encrypted);
    console.log('Desencriptado:', decrypted);
    console.log('✅ Prueba:', cardNumber === decrypted ? 'PASADA' : 'FALLIDA');
    
    return cardNumber === decrypted;
  },
  
  // Prueba de almacenamiento seguro
  async testSecureStorage() {
    console.log('\n💾 === PRUEBA DE ALMACENAMIENTO SEGURO ===');
    
    const testProfile = {
      name: 'Juan Pérez',
      email: 'juan@taxiapp.com',
      phone: '809-555-1234',
      creditCard: '4532015112830366'
    };
    
    // Guardar
    await SecureStorage.saveUserProfile(testProfile);
    console.log('Perfil guardado de forma segura');
    
    // Recuperar
    const retrieved = await SecureStorage.getUserProfile();
    console.log('Perfil recuperado:', retrieved);
    
    const match = JSON.stringify(testProfile) === JSON.stringify(retrieved);
    console.log('✅ Prueba:', match ? 'PASADA' : 'FALLIDA');
    
    return match;
  },
  
  // Ejecutar todas las pruebas
  async runAllTests() {
    console.log('🚀 INICIANDO PRUEBAS DE ENCRIPTACIÓN PARA TAXIAPP\n');
    
    const results = {
      basicEncryption: await this.testBasicEncryption(),
      passwordHashing: await this.testPasswordHashing(),
      cardEncryption: await this.testCardEncryption(),
      secureStorage: await this.testSecureStorage()
    };
    
    console.log('\n📊 === RESUMEN DE PRUEBAS ===');
    console.log('Encriptación básica:', results.basicEncryption ? '✅' : '❌');
    console.log('Hash de contraseña:', results.passwordHashing ? '✅' : '❌');
    console.log('Encriptación de tarjeta:', results.cardEncryption ? '✅' : '❌');
    console.log('Almacenamiento seguro:', results.secureStorage ? '✅' : '❌');
    
    const allPassed = Object.values(results).every(r => r === true);
    console.log('\n🏆 RESULTADO FINAL:', allPassed ? 
      '✅ TODAS LAS PRUEBAS PASADAS - ENCRIPTACIÓN FUNCIONANDO CORRECTAMENTE' : 
      '❌ ALGUNAS PRUEBAS FALLARON - REVISAR IMPLEMENTACIÓN'
    );
    
    return allPassed;
  }
};

export default TestEncryption;
