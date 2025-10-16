const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function showMenu() {
    console.log('\n📋 VISOR DE LOGS DEL SISTEMA');
    console.log('================================');
    console.log('1. Ver logs de auditoría (login, accesos)');
    console.log('2. Ver logs de errores');
    console.log('3. Ver todos los logs');
    console.log('4. Limpiar logs antiguos');
    console.log('5. Salir');
    console.log('================================');
}

function readLog(filename, lines = 20) {
    const logPath = path.join(__dirname, 'logs', filename);
    
    if (!fs.existsSync(logPath)) {
        console.log(`❌ No se encontró el archivo ${filename}`);
        return;
    }
    
    const data = fs.readFileSync(logPath, 'utf8');
    const logLines = data.split('\n').filter(line => line.trim());
    
    if (logLines.length === 0) {
        console.log(`📭 El archivo ${filename} está vacío`);
        return;
    }
    
    console.log(`\n📄 Últimas ${lines} líneas de ${filename}:`);
    console.log('─'.repeat(60));
    
    const startIndex = Math.max(0, logLines.length - lines);
    logLines.slice(startIndex).forEach(line => {
        // Colorear según el tipo de log
        if (line.includes('[ERROR]')) {
            console.log(`❌ ${line}`);
        } else if (line.includes('[WARN]')) {
            console.log(`⚠️  ${line}`);
        } else if (line.includes('LOGIN_SUCCESS')) {
            console.log(`✅ ${line}`);
        } else if (line.includes('LOGIN_FAILED')) {
            console.log(`🚫 ${line}`);
        } else {
            console.log(`   ${line}`);
        }
    });
    console.log('─'.repeat(60));
}

function clearLogs() {
    const logsDir = path.join(__dirname, 'logs');
    const files = ['app.log', 'audit.log', 'errors.log'];
    
    files.forEach(file => {
        const filePath = path.join(logsDir, file);
        if (fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, '');
            console.log(`✅ Limpiado: ${file}`);
        }
    });
    
    console.log('\n📧 Todos los logs han sido limpiados');
}

function handleChoice(choice) {
    switch(choice) {
        case '1':
            readLog('audit.log', 30);
            setTimeout(promptUser, 1000);
            break;
        case '2':
            readLog('errors.log', 30);
            setTimeout(promptUser, 1000);
            break;
        case '3':
            readLog('app.log', 30);
            setTimeout(promptUser, 1000);
            break;
        case '4':
            rl.question('\n⚠️  ¿Seguro que quieres limpiar todos los logs? (si/no): ', (answer) => {
                if (answer.toLowerCase() === 'si' || answer.toLowerCase() === 's') {
                    clearLogs();
                }
                setTimeout(promptUser, 1000);
            });
            break;
        case '5':
            console.log('\n👋 ¡Hasta luego!');
            rl.close();
            process.exit(0);
            break;
        default:
            console.log('❌ Opción inválida');
            setTimeout(promptUser, 1000);
    }
}

function promptUser() {
    showMenu();
    rl.question('\n¿Qué deseas hacer? (1-5): ', handleChoice);
}

// Iniciar
console.clear();
promptUser();