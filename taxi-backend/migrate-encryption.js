const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./taxiapp.db');
const encryption = require('./encryption');

console.log('🔐 Iniciando migración de encriptación...\n');

// Agregar columnas encriptadas si no existen
db.serialize(() => {
  // Tabla users - agregar columnas encriptadas
  db.run(`ALTER TABLE users ADD COLUMN phone_encrypted TEXT`, (err) => {
    if (!err) console.log('✅ Columna phone_encrypted agregada a users');
  });
  
  db.run(`ALTER TABLE users ADD COLUMN address_encrypted TEXT`, (err) => {
    if (!err) console.log('✅ Columna address_encrypted agregada a users');
  });

  // Tabla drivers - agregar columnas encriptadas  
  db.run(`ALTER TABLE drivers ADD COLUMN phone_encrypted TEXT`, (err) => {
    if (!err) console.log('✅ Columna phone_encrypted agregada a drivers');
  });
  
  db.run(`ALTER TABLE drivers ADD COLUMN license_encrypted TEXT`, (err) => {
    if (!err) console.log('✅ Columna license_encrypted agregada a drivers');
  });

  // Tabla trips - agregar columnas encriptadas
  db.run(`ALTER TABLE trips ADD COLUMN pickup_encrypted TEXT`, (err) => {
    if (!err) console.log('✅ Columna pickup_encrypted agregada a trips');
  });
  
  db.run(`ALTER TABLE trips ADD COLUMN destination_encrypted TEXT`, (err) => {
    if (!err) console.log('✅ Columna destination_encrypted agregada a trips');
  });

  // Crear tabla para datos de pago encriptados
  db.run(`
    CREATE TABLE IF NOT EXISTS payment_methods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      card_masked TEXT,
      card_encrypted TEXT,
      type TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `, (err) => {
    if (!err) console.log('✅ Tabla payment_methods creada');
  });

  // Crear tabla para logs encriptados
  db.run(`
    CREATE TABLE IF NOT EXISTS encrypted_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT,
      user_id INTEGER,
      data_encrypted TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (!err) console.log('✅ Tabla encrypted_logs creada');
  });

  console.log('\n✅ Migración completada');
  console.log('📝 Las columnas encriptadas están listas para usar');
  db.close();
});