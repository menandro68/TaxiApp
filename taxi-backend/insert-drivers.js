const { pool } = require('./config/database');
const bcrypt = require('bcryptjs');

async function insertDrivers() {
  try {
    console.log('📝 Insertando conductores de prueba...');

    const drivers = [
      {
        name: 'Juan Pérez',
        email: 'juan@taxi.com',
        phone: '1234567890',
        password: 'password123',
        license: 'LIC001',
        vehicle_plate: 'AA-123456',
        vehicle_model: 'Toyota Corolla',
        vehicle_color: 'Blanco'
      },
      {
        name: 'María García',
        email: 'maria@taxi.com',
        phone: '0987654321',
        password: 'password123',
        license: 'LIC002',
        vehicle_plate: 'BB-789012',
        vehicle_model: 'Honda Civic',
        vehicle_color: 'Gris'
      },
      {
        name: 'Carlos López',
        email: 'carlos@taxi.com',
        phone: '5555555555',
        password: 'password123',
        license: 'LIC003',
        vehicle_plate: 'CC-345678',
        vehicle_model: 'Hyundai Elantra',
        vehicle_color: 'Negro'
      }
    ];

    for (const driver of drivers) {
      const hashedPassword = await bcrypt.hash(driver.password, 10);
      
      const existResult = await pool.query(
        'SELECT id FROM drivers WHERE email = $1',
        [driver.email]
      );

      if (existResult.rows.length === 0) {
        await pool.query(
          `INSERT INTO drivers (name, email, phone, password, license, vehicle_plate, vehicle_model, vehicle_color, status, rating, total_trips, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
          [driver.name, driver.email, driver.phone, hashedPassword, driver.license, driver.vehicle_plate, driver.vehicle_model, driver.vehicle_color, 'active', 4.8, 100]
        );
        console.log(`✅ ${driver.name} insertado`);
      } else {
        console.log(`⚠️ ${driver.name} ya existe`);
      }
    }

    console.log('✅ Conductores insertados correctamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

insertDrivers();