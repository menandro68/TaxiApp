const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const db = new sqlite3.Database('./taxiapp.db');

console.log('\n📋 CREAR NUEVO ADMINISTRADOR');
console.log('================================\n');

// Mostrar roles disponibles
console.log('ROLES DISPONIBLES:');
console.log('1. super_admin - Control total');
console.log('2. admin - Gestión completa de usuarios y conductores');
console.log('3. supervisor - Ver y editar usuarios/conductores');
console.log('4. operador - Solo ver información');
console.log('5. viewer - Solo dashboard y reportes\n');

const questions = [
    { key: 'username', question: 'Usuario: ' },
    { key: 'email', question: 'Email: ' },
    { key: 'password', question: 'Contraseña: ' },
    { key: 'role', question: 'Rol (super_admin/admin/supervisor/operador/viewer): ' }
];

let adminData = {};
let currentQuestion = 0;

function askQuestion() {
    if (currentQuestion < questions.length) {
        rl.question(questions[currentQuestion].question, (answer) => {
            adminData[questions[currentQuestion].key] = answer;
            currentQuestion++;
            askQuestion();
        });
    } else {
        createAdmin();
    }
}

async function createAdmin() {
    // Obtener permisos del rol
    db.get('SELECT permissions FROM roles WHERE name = ?', [adminData.role], async (err, role) => {
        if (err || !role) {
            console.log('❌ Rol no válido');
            rl.close();
            db.close();
            return;
        }
        
        // Encriptar contraseña
        const hashedPassword = await bcrypt.hash(adminData.password, 10);
        
        // Insertar admin
        db.run(`
            INSERT INTO admins (username, email, password, role, permissions)
            VALUES (?, ?, ?, ?, ?)
        `, [
            adminData.username,
            adminData.email,
            hashedPassword,
            adminData.role,
            role.permissions
        ], (err) => {
            if (err) {
                console.log('❌ Error creando administrador:', err.message);
            } else {
                console.log('\n✅ Administrador creado exitosamente!');
                console.log('   Usuario:', adminData.username);
                console.log('   Email:', adminData.email);
                console.log('   Rol:', adminData.role);
            }
            
            rl.close();
            db.close();
        });
    });
}

// Iniciar
askQuestion();