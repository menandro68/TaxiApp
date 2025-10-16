const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./taxiapp.db');

console.log('=== ESTRUCTURA DE LA BASE DE DATOS ===\n');

// Verificar todas las tablas
db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    console.log('TABLAS EXISTENTES:');
    tables.forEach(table => {
        console.log(`  - ${table.name}`);
    });
    console.log('\n');
    
    // Verificar columnas de cada tabla importante
    const checkTable = (tableName) => {
        db.all(`PRAGMA table_info(${tableName})`, (err, columns) => {
            if (!err && columns) {
                console.log(`COLUMNAS DE ${tableName.toUpperCase()}:`);
                columns.forEach(col => {
                    console.log(`  ${col.name} (${col.type})`);
                });
                console.log('\n');
            }
        });
    };
    
    checkTable('users');
    checkTable('drivers');
    checkTable('trips');
    
    setTimeout(() => {
        // Contar registros actuales
        console.log('=== DATOS ACTUALES ===\n');
        
        db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
            if (!err) console.log(`Usuarios: ${row.count}`);
        });
        
        db.get("SELECT COUNT(*) as count FROM drivers", (err, row) => {
            if (!err) console.log(`Conductores: ${row.count}`);
        });
        
        db.get("SELECT COUNT(*) as count FROM trips", (err, row) => {
            if (!err) console.log(`Viajes: ${row.count}`);
            else console.log('Tabla trips no existe o hay un error');
            
            db.close();
        });
    }, 1000);
});