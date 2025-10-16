const Database = require('better-sqlite3');
const db = new Database('taxiapp.db');

// Verificar si la tabla existe
const tableExists = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='driver_documents'
`).get();

if (!tableExists) {
    console.log('✅ Creando tabla driver_documents...');
    db.exec(`
        CREATE TABLE driver_documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            driver_id INTEGER NOT NULL,
            document_type TEXT NOT NULL,
            document_url TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            reviewed_at DATETIME,
            reviewed_by TEXT,
            rejection_reason TEXT,
            FOREIGN KEY (driver_id) REFERENCES drivers (id)
        )
    `);
}

// Obtener IDs de conductores
const drivers = db.prepare('SELECT id, name FROM drivers').all();
console.log(`\n📋 Encontrados ${drivers.length} conductores`);

// Tipos de documentos
const docTypes = ['licencia', 'cedula', 'seguro', 'antecedentes'];
const statuses = ['pending', 'approved', 'rejected'];

// Agregar documentos de prueba
let count = 0;
drivers.forEach(driver => {
    // Cada conductor tiene 2-4 documentos
    const numDocs = Math.floor(Math.random() * 3) + 2;
    
    for (let i = 0; i < numDocs; i++) {
        const docType = docTypes[i];
        const status = i === 0 ? 'pending' : statuses[Math.floor(Math.random() * 3)];
        
        const stmt = db.prepare(`
            INSERT INTO driver_documents 
            (driver_id, document_type, document_url, status, reviewed_at, reviewed_by, rejection_reason)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run(
            driver.id,
            docType,
            `/uploads/${docType}_${driver.id}.jpg`,
            status,
            status !== 'pending' ? new Date().toISOString() : null,
            status !== 'pending' ? 'admin' : null,
            status === 'rejected' ? 'Documento borroso' : null
        );
        count++;
    }
});

console.log(`✅ ${count} documentos de prueba agregados`);

// Mostrar resumen
const summary = db.prepare(`
    SELECT status, COUNT(*) as total 
    FROM driver_documents 
    GROUP BY status
`).all();

console.log('\n📊 Resumen de documentos:');
summary.forEach(s => {
    console.log(`   ${s.status}: ${s.total} documentos`);
});

db.close();
console.log('\n✅ Proceso completado');