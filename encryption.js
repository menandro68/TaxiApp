const crypto = require('crypto');
require('dotenv').config();

// Generar clave si no existe
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const IV_LENGTH = 16;

class EncryptionService {
  // Encriptar datos
  encrypt(text) {
    if (!text) return null;
    
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(ENCRYPTION_KEY, 'hex'),
      iv
    );
    
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  // Desencriptar datos
  decrypt(text) {
    if (!text) return null;
    
    try {
      const textParts = text.split(':');
      const iv = Buffer.from(textParts.shift(), 'hex');
      const encryptedText = Buffer.from(textParts.join(':'), 'hex');
      
      const decipher = crypto.createDecipheriv(
        'aes-256-cbc',
        Buffer.from(ENCRYPTION_KEY, 'hex'),
        iv
      );
      
      let decrypted = decipher.update(encryptedText);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      return decrypted.toString();
    } catch (error) {
      console.error('Error desencriptando:', error);
      return null;
    }
  }

  // Encriptar número de tarjeta
  encryptCard(cardNumber) {
    const masked = '**** **** **** ' + cardNumber.slice(-4);
    const encrypted = this.encrypt(cardNumber);
    return { masked, encrypted };
  }
}

module.exports = new EncryptionService();

// Mostrar clave para .env si es nueva
if (!process.env.ENCRYPTION_KEY) {
  console.log('\n⚠️  IMPORTANTE: Agrega esta línea a tu archivo .env:');
  console.log(`ENCRYPTION_KEY=${ENCRYPTION_KEY}\n`);
}