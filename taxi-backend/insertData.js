const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./taxiapp.db');

console.log('Limpiando datos anteriores...\n');

// Primero limpiemos las tablas
db.serialize(() => {
    // Limpiar y agregar usuarios
    db.run("DELETE FROM users WHERE email LIKE '%@email.com%'");
    db.run("DELETE FROM drivers WHERE email LIKE '%@taxi.com%'");
    db.run("DELETE FROM trips");
    
    console.log('Insertando nuevos datos...\n');
    
    // Insertar usuarios con todos los campos requeridos
    const stmt1 = db.prepare("INSERT INTO users (name, email, phone, password) VALUES (?, ?, ?, ?)");
    stmt1.run("María González", "maria@email.com", "809-555-0001", "password123");
    stmt1.run("Juan Pérez", "juan@email.com", "809-555-0002", "password123");
    stmt1.run("Carmen Silva", "carmen@email.com", "809-555-0003", "password123");
    stmt1.finalize();
    
    // Insertar conductores con todos los campos
    const stmt2 = db.prepare("INSERT INTO drivers (name, email, phone, password, license, vehicle_plate, vehicle_model, vehicle_color, status, rating) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    stmt2.run("Carlos Rodríguez", "carlos@taxi.com", "809-555-1001", "password123", "LIC001", "A12345", "Toyota Corolla", "Blanco", "active", 4.8);
    stmt2.run("Ana Martínez", "ana@taxi.com", "809-555-1002", "password123", "LIC002", "B67890", "Honda Civic", "Azul", "active", 4.9);
    stmt2.run("Luis García", "luis@taxi.com", "809-555-1003", "password123", "LIC003", "C11111", "Nissan Sentra", "Negro", "active", 4.7);
    stmt2.finalize();
    
    // Insertar viajes
    const stmt3 = db.prepare("INSERT INTO trips (user_id, driver_id, pickup_location, dropoff_location, fare, status) VALUES (?, ?, ?, ?, ?, ?)");
    stmt3.run(1, 1, "Centro Comercial", "Aeropuerto", 450.00, "completed");
    stmt3.run(2, 2, "Plaza Central", "Hospital", 250.00, "completed");
    stmt3.run(3, 1, "Universidad", "Zona Colonial", 180.00, "completed");
    stmt3.run(1, 3, "Supermercado", "Casa", 120.00, "completed");
    stmt3.run(2, 1, "Oficina", "Restaurant", 150.00, "completed");
    stmt3.finalize();
    
    // Verificar resultados
    setTimeout(() => {
        console.log('Verificando datos insertados:\n');
        
        db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
            console.log('✓ Usuarios:', row.count);
        });
        
        db.get("SELECT COUNT(*) as count FROM drivers", (err, row) => {
            console.log('✓ Conductores:', row.count);
        });
        
        db.get("SELECT COUNT(*) as count FROM trips", (err, row) => {
            console.log('✓ Viajes:', row.count);
            
            db.close(() => {
                console.log('\n✅ Datos insertados correctamente');
                console.log('Actualiza el panel en el navegador para ver los cambios');
            });
        });
    }, 1000);
});