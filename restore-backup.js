const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function listBackups() {
    const backupDir = path.join(__dirname, 'backups');
    
    if (!fs.existsSync(backupDir)) {
        console.log('❌ No hay backups disponibles');
        process.exit(1);
    }
    
    const files = fs.readdirSync(backupDir)
        .filter(f => f.startsWith('backup_'))
        .sort()
        .reverse();
    
    if (files.length === 0) {
        console.log('❌ No hay backups disponibles');
        process.exit(1);
    }
    
    console.log('\n📁 Backups disponibles:');
    files.forEach((file, index) => {
        const stats = fs.statSync(path.join(backupDir, file));
        const size = (stats.size / 1024).toFixed(2);
        console.log(`${index + 1}. ${file} (${size} KB)`);
    });
    
    return files;
}

function restoreBackup(backupFile) {
    const backupPath = path.join(__dirname, 'backups', backupFile);
    const dbPath = path.join(__dirname, 'taxiapp.db');
    
    // Crear backup de seguridad antes de restaurar
    const safetyBackup = path.join(__dirname, 'backups', `safety_${Date.now()}.db`);
    fs.copyFileSync(dbPath, safetyBackup);
    console.log(`✅ Backup de seguridad creado: ${safetyBackup}`);
    
    // Restaurar
    fs.copyFileSync(backupPath, dbPath);
    console.log(`✅ Base de datos restaurada desde: ${backupFile}`);
}

// Interfaz de usuario
console.log('🔄 SISTEMA DE RESTAURACIÓN DE BACKUP');
console.log('=====================================');

const files = listBackups();

rl.question('\n¿Qué backup quieres restaurar? (número): ', (answer) => {
    const index = parseInt(answer) - 1;
    
    if (index >= 0 && index < files.length) {
        const selectedFile = files[index];
        
        rl.question(`\n⚠️  ADVERTENCIA: Esto reemplazará la base de datos actual.\n¿Estás seguro? (si/no): `, (confirm) => {
            if (confirm.toLowerCase() === 'si' || confirm.toLowerCase() === 's') {
                restoreBackup(selectedFile);
            } else {
                console.log('❌ Restauración cancelada');
            }
            rl.close();
        });
    } else {
        console.log('❌ Selección inválida');
        rl.close();
    }
});