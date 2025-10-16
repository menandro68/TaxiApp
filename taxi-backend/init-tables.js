const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./database.db");

const tables = [
  `CREATE TABLE IF NOT EXISTS drivers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT NOT NULL,
    password TEXT,
    license_number TEXT,
    vehicle_make TEXT,
    vehicle_model TEXT,
    vehicle_year INTEGER,
    vehicle_plate TEXT,
    vehicle_color TEXT,
    rating REAL DEFAULT 5.0,
    total_trips INTEGER DEFAULT 0,
    status TEXT DEFAULT "pending",
    is_online INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT NOT NULL,
    password TEXT,
    rating REAL DEFAULT 5.0,
    total_trips INTEGER DEFAULT 0,
    status TEXT DEFAULT "active",
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS trips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    driver_id INTEGER,
    pickup_location TEXT,
    dropoff_location TEXT,
    status TEXT DEFAULT "pending",
    fare REAL,
    distance REAL,
    duration INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    assigned_at DATETIME,
    completed_at DATETIME
  )`,
  `CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT "admin",
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`
];

tables.forEach((sql, i) => {
  db.run(sql, (err) => {
    if (err) console.log("Error tabla", i, err.message);
    else console.log("Tabla", i, "creada");
    if (i === tables.length - 1) { db.close(); process.exit(); }
  });
});
