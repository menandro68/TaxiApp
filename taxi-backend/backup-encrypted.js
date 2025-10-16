const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const encryption = require('./encryption');
require('dotenv').config();

class BackupService {
  constructor() {
    this.backupDir = path.join(__dirname, 'backups-encrypted');
    
    // Crear carpeta si no existe
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir);
      console.log('📁 Carpeta backups-encrypted creada');
    }
  }

  // Crear backup encriptado
  createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dbPath = path.join(__dirname, 'taxiapp.db');
    const backupName = `backup_${timestamp}.db.encrypted`;
    const backupPath = path.join(this.backupDir, backupName);

    try {
      // Leer base de datos
      const dbContent = fs.readFileSync(dbPath);
      
      // Encriptar el contenido completo
      const encrypted = this.encryptFile(dbContent);
      
      // Guardar backup encriptado
      fs.writeFileSync(backupPath, encrypted);
      
      console.log(`✅ Backup encriptado creado: ${backupName}`);
      
      // Limpiar backups antiguos (mantener solo últimos 7)
      this.cleanOldBackups();
      
      return backupPath;
    } catch (error) {
      console.error('❌ Error creando backup:', error);
      return null;
    }
  }

  // Encriptar archivo completo
  encryptFile(buffer) {
    const algorithm = 'aes-256-cbc';
    // CORRECCIÓN: Usar la clave del .env o crear una por defecto
    const keyString = process.env.ENCRYPTION_KEY || 'a5f8c2e9b4d7f1a3c6e9b2d5f8a1c4e7b9d2f5a8c1e4b7d0f3a6c9e2d5f8b1c4';
    const key = Buffer.from(keyString, 'hex');
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    
    // Combinar IV con datos encriptados
    return Buffer.concat([iv, encrypted]);
  }

  // Desencriptar backup
  decryptFile(encryptedBuffer) {
    const algorithm = 'aes-256-cbc';
    // CORRECCIÓN: Usar la clave del .env o crear una por defecto
    const keyString = process.env.ENCRYPTION_KEY || 'a5f8c2e9b4d7f1a3c6e9b2d5f8a1c4e7b9d2f5a8c1e4b7d0f3a6c9e2d5f8b1c4';
    const key = Buffer.from(keyString, 'hex');
    
    // Extraer IV (primeros 16 bytes)
    const iv = encryptedBuffer.slice(0, 16);
    const encrypted = encryptedBuffer.slice(16);
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    
    return decrypted;
  }

  // Restaurar backup
  restoreBackup(backupFile) {
    try {
      const backupPath = path.join(this.backupDir, backupFile);
      const encryptedData = fs.readFileSync(backupPath);
      
      // Desencriptar
      const decryptedData = this.decryptFile(encryptedData);
      
      // Crear archivo temporal
      const tempPath = path.join(__dirname, 'temp_restore.db');
      fs.writeFileSync(tempPath, decryptedData);
      
      console.log('✅ Backup desencriptado y listo para restaurar');
      return tempPath;
    } catch (error) {
      console.error('❌ Error restaurando backup:', error);
      return null;
    }
  }

  // Limpiar backups antiguos
  cleanOldBackups() {
    const files = fs.readdirSync(this.backupDir);
    const backups = files.filter(f => f.endsWith('.encrypted'));
    
    if (backups.length > 7) {
      // Ordenar por fecha y eliminar los más antiguos
      backups.sort();
      const toDelete = backups.slice(0, backups.length - 7);
      
      toDelete.forEach(file => {
        fs.unlinkSync(path.join(this.backupDir, file));
        console.log(`🗑️ Backup antiguo eliminado: ${file}`);
      });
    }
  }

  // Programar backup automático
  scheduleBackup(hours = 24) {
    setInterval(() => {
      console.log('⏰ Ejecutando backup automático...');
      this.createBackup();
    }, hours * 60 * 60 * 1000);
    
    console.log(`📅 Backup automático programado cada ${hours} horas`);
  }
}

module.exports = new BackupService();

// Si se ejecuta directamente, crear backup
if (require.main === module) {
  const backup = new BackupService();
  backup.createBackup();
}