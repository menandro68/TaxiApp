const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Conectar a la base de datos
const db = new sqlite3.Database(path.join(__dirname, '../taxiapp.db'));

// Crear tabla de mensajes de soporte
db.serialize(() => {
  // Tabla principal de tickets
  db.run(`
    CREATE TABLE IF NOT EXISTS support_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      user_type VARCHAR(20) CHECK(user_type IN ('user', 'driver')),
      subject VARCHAR(255),
      category VARCHAR(50),
      status VARCHAR(20) DEFAULT 'open',
      priority VARCHAR(20) DEFAULT 'normal',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      closed_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) console.error('Error creando tabla support_tickets:', err);
    else console.log('✅ Tabla support_tickets creada');
  });

  // Tabla de mensajes
  db.run(`
    CREATE TABLE IF NOT EXISTS support_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL,
      sender_id INTEGER,
      sender_type VARCHAR(20) CHECK(sender_type IN ('user', 'driver', 'admin')),
      message TEXT NOT NULL,
      attachment_url TEXT,
      is_read BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ticket_id) REFERENCES support_tickets(id)
    )
  `, (err) => {
    if (err) console.error('Error creando tabla support_messages:', err);
    else console.log('✅ Tabla support_messages creada');
    db.close();
  });
});