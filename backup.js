const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

function createBackup() {
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const backupDir = path.join(__dirname, 'backups');
    
    // Crear carpeta si no existe
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir);
    }
    
    const backupPath = path.join(backupDir, `backup_${timestamp}.db`);
    
    // Copiar base de datos
    fs.copyFileSync(
   path.join(__dirname, 'taxiapp.db'),
        backupPath
    );
    
    console.log(`✅ Backup creado: ${backupPath}`);
    
    // Limpiar backups antiguos (mantener solo últimos 7)
    cleanOldBackups();
    
    return backupPath;
}

function cleanOldBackups() {
    const backupDir = path.join(__dirname, 'backups');
    const files = fs.readdirSync(backupDir)
        .filter(f => f.startsWith('backup_'))
        .map(f => ({
            name: f,
            path: path.join(backupDir, f),
            time: fs.statSync(path.join(backupDir, f)).mtime
        }))
        .sort((a, b) => b.time - a.time);
    
    // Eliminar backups antiguos (mantener 7)
    if (files.length > 7) {
        files.slice(7).forEach(file => {
            fs.unlinkSync(file.path);
            console.log(`🗑️ Backup antiguo eliminado: ${file.name}`);
        });
    }
}

// Ejecutar backup manual
if (require.main === module) {
    createBackup();
}

module.exports = { createBackup };