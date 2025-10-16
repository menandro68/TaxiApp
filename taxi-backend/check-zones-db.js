// check-zones-db.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'taxiapp.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Verificando estructura de base de datos para zonas...\n');

// Verificar si existe la tabla special_zones
db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='special_zones'`, (err, row) => {
    if (err) {
        console.error('❌ Error:', err);
        return;
    }
    
    if (row) {
        console.log('✅ Tabla special_zones existe');
        
        // Mostrar estructura actual
        db.all("PRAGMA table_info(special_zones)", (err, columns) => {
            console.log('\n📊 Estructura actual:');
            columns.forEach(col => {
                console.log(`  - ${col.name}: ${col.type}`);
            });
        });
        
        // Mostrar zonas existentes
        db.all("SELECT * FROM special_zones", (err, zones) => {
            console.log(`\n📍 Zonas actuales: ${zones.length}`);
            zones.forEach(zone => {
                console.log(`  - ${zone.zone_name} (${zone.zone_type})`);
            });
        });
        
    } else {
        console.log('⚠️ Tabla special_zones NO existe. Creando...\n');
        
        // Crear tabla con estructura profesional
        db.run(`
            CREATE TABLE special_zones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                zone_name VARCHAR(100) NOT NULL,
                zone_type VARCHAR(50) NOT NULL,
                coordinates TEXT NOT NULL,
                radius_km REAL DEFAULT 1.0,
                polygon_coords TEXT,
                surcharge REAL DEFAULT 0,
                multiplier REAL DEFAULT 1.0,
                color VARCHAR(7) DEFAULT '#FF6B6B',
                icon VARCHAR(50) DEFAULT 'map-pin',
                description TEXT,
                restrictions TEXT,
                active BOOLEAN DEFAULT 1,
                priority INTEGER DEFAULT 0,
                schedule TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_by INTEGER,
                updated_by INTEGER
            )
        `, (err) => {
            if (err) {
                console.error('❌ Error creando tabla:', err);
            } else {
                console.log('✅ Tabla special_zones creada exitosamente');
                
                // Insertar zonas iniciales de Santo Domingo
                const initialZones = [
                    {
                        name: 'Aeropuerto Las Américas',
                        type: 'airport',
                        lat: 18.4297,
                        lng: -69.6689,
                        radius: 3.0,
                        surcharge: 200,
                        multiplier: 1.0,
                        color: '#4A90E2',
                        icon: 'plane',
                        description: 'Zona aeroportuaria con recargo fijo'
                    },
                    {
                        name: 'Zona Colonial',
                        type: 'tourist',
                        lat: 18.4761,
                        lng: -69.8827,
                        radius: 1.5,
                        surcharge: 50,
                        multiplier: 1.2,
                        color: '#F5A623',
                        icon: 'camera',
                        description: 'Área turística histórica'
                    },
                    {
                        name: 'Piantini',
                        type: 'premium',
                        lat: 18.4670,
                        lng: -69.9410,
                        radius: 2.0,
                        surcharge: 75,
                        multiplier: 1.3,
                        color: '#7ED321',
                        icon: 'star',
                        description: 'Zona comercial premium'
                    },
                    {
                        name: 'Los Tres Brazos',
                        type: 'restricted',
                        lat: 18.5074,
                        lng: -69.8542,
                        radius: 1.8,
                        surcharge: 100,
                        multiplier: 1.5,
                        color: '#D0021B',
                        icon: 'alert-triangle',
                        description: 'Zona con restricciones nocturnas',
                        restrictions: 'Servicio limitado después de 10 PM'
                    },
                    {
                        name: 'Bella Vista Mall',
                        type: 'commercial',
                        lat: 18.4577,
                        lng: -69.9464,
                        radius: 0.8,
                        surcharge: 30,
                        multiplier: 1.1,
                        color: '#9013FE',
                        icon: 'shopping-bag',
                        description: 'Centro comercial - alta demanda'
                    }
                ];
                
                initialZones.forEach(zone => {
                    db.run(`
                        INSERT INTO special_zones 
                        (zone_name, zone_type, coordinates, radius_km, surcharge, multiplier, color, icon, description, restrictions)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        zone.name,
                        zone.type,
                        JSON.stringify({lat: zone.lat, lng: zone.lng}),
                        zone.radius,
                        zone.surcharge,
                        zone.multiplier,
                        zone.color,
                        zone.icon,
                        zone.description,
                        zone.restrictions || null
                    ], (err) => {
                        if (err) {
                            console.error(`❌ Error insertando ${zone.name}:`, err);
                        } else {
                            console.log(`✅ Zona insertada: ${zone.name}`);
                        }
                    });
                });
            }
        });
    }
});

setTimeout(() => {
    db.close();
    console.log('\n✅ Verificación completada');
}, 3000);