const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./taxiapp.db');

console.log('Agregando viajes de ejemplo...\n');

const trips = [
    [1, 1, "Centro Comercial Sambil", "Aeropuerto Las Américas", "completed", 450.00],
    [2, 2, "Plaza de la Cultura", "Hospital Plaza de la Salud", "completed", 250.00],
    [3, 1, "Universidad UASD", "Zona Colonial", "completed", 180.00],
    [1, 3, "Supermercado Nacional", "Los Prados", "completed", 120.00],
    [2, 1, "Bella Vista Mall", "Piantini", "completed", 150.00],
    [3, 2, "Megacentro", "Gazcue", "completed", 200.00],
    [1, 4, "Blue Mall", "Naco", "completed", 100.00],
    [2, 3, "Agora Mall", "El Millón", "completed", 130.00],
    [3, 4, "Downtown Center", "Mirador Sur", "completed", 170.00],
    [1, 2, "Ensanche Paraíso", "Churchill", "completed", 90.00]
];

db.serialize(() => {
    const stmt = db.prepare("INSERT INTO trips (user_id, driver_id, pickup_location, destination, status, price) VALUES (?, ?, ?, ?, ?, ?)");
    
    trips.forEach((trip, index) => {
        stmt.run(trip, function(err) {
            if (err) {
                console.error('Error insertando viaje:', err.message);
            } else {
                console.log(`✓ Viaje ${index + 1} agregado: ${trip[2]} → ${trip[3]} (RD$${trip[5]})`);
            }
        });
    });
    
    stmt.finalize();
    
    setTimeout(() => {
        console.log('\n=== RESUMEN FINAL ===\n');
        
        db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
            console.log(`Total Usuarios: ${row.count}`);
        });
        
        db.get("SELECT COUNT(*) as count FROM drivers WHERE status = 'active'", (err, row) => {
            console.log(`Conductores Activos: ${row.count}`);
        });
        
        db.get("SELECT COUNT(*) as count FROM trips", (err, row) => {
            console.log(`Total Viajes: ${row.count}`);
        });
        
        db.get("SELECT SUM(price) as total FROM trips WHERE status = 'completed'", (err, row) => {
            console.log(`Ingresos Totales: RD$${row.total || 0}`);
            
            db.close(() => {
                console.log('\n✅ Viajes agregados exitosamente');
                console.log('📌 Actualiza el panel en el navegador para ver los cambios');
            });
        });
    }, 1000);
});