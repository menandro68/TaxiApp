const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./taxiapp.db');

// Agregar usuarios de prueba
const users = [
    { name: 'María González', email: 'maria@email.com', phone: '809-555-0001' },
    { name: 'Juan Pérez', email: 'juan@email.com', phone: '809-555-0002' },
    { name: 'Carmen Silva', email: 'carmen@email.com', phone: '809-555-0003' }
];

// Agregar conductores de prueba
const drivers = [
    { name: 'Carlos Rodríguez', email: 'carlos@taxi.com', phone: '809-555-1001', licenseNumber: 'DL001', vehiclePlate: 'A123456' },
    { name: 'Ana Martínez', email: 'ana@taxi.com', phone: '809-555-1002', licenseNumber: 'DL002', vehiclePlate: 'B789012' }
];

console.log('Agregando datos de prueba...');

// Insertar usuarios
users.forEach(user => {
    db.run(`INSERT OR IGNORE INTO users (name, email, phone) VALUES (?, ?, ?)`,
        [user.name, user.email, user.phone],
        (err) => {
            if (err) console.error('Error agregando usuario:', err);
            else console.log('Usuario agregado:', user.name);
        }
    );
});

// Insertar conductores
drivers.forEach(driver => {
    db.run(`INSERT OR IGNORE INTO drivers (name, email, phone, licenseNumber, vehiclePlate) VALUES (?, ?, ?, ?, ?)`,
        [driver.name, driver.email, driver.phone, driver.licenseNumber, driver.vehiclePlate],
        (err) => {
            if (err) console.error('Error agregando conductor:', err);
            else console.log('Conductor agregado:', driver.name);
        }
    );
});

setTimeout(() => {
    console.log('\nDatos de prueba agregados. Verificando...');
    
    db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
        console.log('Total usuarios:', row.count);
    });
    
    db.get("SELECT COUNT(*) as count FROM drivers", (err, row) => {
        console.log('Total conductores:', row.count);
    });
    
    db.close();
}, 2000);