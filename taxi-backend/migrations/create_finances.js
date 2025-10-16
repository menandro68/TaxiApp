const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Conectar a la base de datos
const db = new sqlite3.Database(path.join(__dirname, '../taxiapp.db'));

db.serialize(() => {
  // Tabla de configuración de comisiones
  db.run(`
    CREATE TABLE IF NOT EXISTS commission_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      commission_percentage DECIMAL(5,2) DEFAULT 10.00,
      active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('Error:', err);
    else {
      console.log('✅ Tabla commission_config creada');
      // Insertar configuración inicial del 10%
      db.run(`INSERT OR IGNORE INTO commission_config (id, commission_percentage) VALUES (1, 10.00)`);
    }
  });

  // Tabla de transacciones financieras
  db.run(`
    CREATE TABLE IF NOT EXISTS financial_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER,
      driver_id INTEGER,
      trip_amount DECIMAL(10,2),
      commission_percentage DECIMAL(5,2),
      commission_amount DECIMAL(10,2),
      driver_earnings DECIMAL(10,2),
      status VARCHAR(20) DEFAULT 'pending',
      payment_date DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (trip_id) REFERENCES trips(id),
      FOREIGN KEY (driver_id) REFERENCES drivers(id)
    )
  `, (err) => {
    if (err) console.error('Error:', err);
    else console.log('✅ Tabla financial_transactions creada');
  });

  // Tabla de balance de conductores
  db.run(`
    CREATE TABLE IF NOT EXISTS driver_balances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      driver_id INTEGER UNIQUE,
      total_earnings DECIMAL(10,2) DEFAULT 0,
      total_commission_paid DECIMAL(10,2) DEFAULT 0,
      pending_payment DECIMAL(10,2) DEFAULT 0,
      available_balance DECIMAL(10,2) DEFAULT 0,
      last_payment_date DATETIME,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (driver_id) REFERENCES drivers(id)
    )
  `, (err) => {
    if (err) console.error('Error:', err);
    else console.log('✅ Tabla driver_balances creada');
  });

  // Tabla de solicitudes de retiro
  db.run(`
    CREATE TABLE IF NOT EXISTS withdrawal_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      driver_id INTEGER,
      amount DECIMAL(10,2),
      bank_account VARCHAR(100),
      status VARCHAR(20) DEFAULT 'pending',
      processed_date DATETIME,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (driver_id) REFERENCES drivers(id)
    )
  `, (err) => {
    if (err) console.error('Error:', err);
    else console.log('✅ Tabla withdrawal_requests creada');
    db.close();
  });
});