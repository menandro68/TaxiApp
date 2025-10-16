const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Conectar a la base de datos
const db = new sqlite3.Database(path.join(__dirname, '../taxiapp.db'));

// Crear tabla de documentos
db.run(`
  CREATE TABLE IF NOT EXISTS driver_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    driver_id INTEGER NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    document_url TEXT,
    document_name VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending',
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reviewed_at DATETIME,
    reviewed_by INTEGER,
    rejection_reason TEXT,
    expiry_date DATE,
    FOREIGN KEY (driver_id) REFERENCES drivers(id)
  )
`, (err) => {
  if (err) {
    console.error('❌ Error creando tabla:', err);
  } else {
    console.log('✅ Tabla driver_documents creada exitosamente');
  }
  db.close();
});