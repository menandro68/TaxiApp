const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'database.db'));

db.serialize(() => {
    // Insertar tarifas base por tipo de vehículo
    const pricingConfigs = [
        ['economy', 100, 25, 5, 100, 20],
        ['comfort', 130, 35, 7, 130, 25],
        ['premium', 180, 45, 10, 180, 30],
        ['xl', 200, 50, 12, 200, 35]
    ];

    pricingConfigs.forEach(config => {
        db.run(`
            INSERT OR IGNORE INTO pricing_config (vehicle_type, base_fare, per_km, per_minute, minimum_fare, booking_fee)
            VALUES (?, ?, ?, ?, ?, ?)
        `, config);
    });

    // Insertar multiplicadores de surge pricing
    const surgeMultipliers = [
        ['time', 'Hora Pico Mañana', '06:00-09:00', 1.3, '06:00', '09:00', '1,2,3,4,5'],
        ['time', 'Hora Pico Tarde', '17:00-20:00', 1.4, '17:00', '20:00', '1,2,3,4,5'],
        ['time', 'Madrugada', '22:00-06:00', 1.5, '22:00', '06:00', '0,1,2,3,4,5,6'],
        ['day', 'Viernes', 'friday', 1.2, null, null, '5'],
        ['day', 'Sábado', 'saturday', 1.3, null, null, '6'],
        ['day', 'Domingo', 'sunday', 1.1, null, null, '0'],
        ['weather', 'Lluvia', 'rain', 1.5, null, null, null],
        ['weather', 'Tormenta', 'storm', 2.0, null, null, null],
        ['demand', 'Alta Demanda', 'high', 1.5, null, null, null],
        ['demand', 'Demanda Extrema', 'extreme', 2.0, null, null, null]
    ];

    surgeMultipliers.forEach((surge, index) => {
        db.run(`
            INSERT OR IGNORE INTO surge_multipliers 
            (type, name, condition_value, multiplier, start_time, end_time, days_of_week, priority)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [...surge, index]);
    });

    // Insertar zonas especiales
    const specialZones = [
        ['Aeropuerto Las Américas', 'airport', 200, 1.0, '18.429696,-69.668935', 2],
        ['Zona Colonial', 'tourist', 50, 1.2, '18.472495,-69.882355', 1],
        ['Piantini', 'business', 75, 1.1, '18.470135,-69.940231', 1],
        ['Bávaro', 'tourist', 150, 1.3, '18.650000,-68.450000', 5],
        ['Santiago Centro', 'city', 40, 1.1, '19.450000,-70.700000', 2]
    ];

    specialZones.forEach(zone => {
        db.run(`
            INSERT OR IGNORE INTO special_zones 
            (zone_name, zone_type, surcharge, multiplier, coordinates, radius_km)
            VALUES (?, ?, ?, ?, ?, ?)
        `, zone);
    });

    console.log('✅ Datos iniciales de tarifas insertados');
});

db.close();