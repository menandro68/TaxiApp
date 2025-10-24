// Importar dependencias
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
require('dotenv').config();

// Importar base de datos
const db = require('./config/database');

// Crear aplicación Express
const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, '../')));

// ==========================================
// IMPORTAR RUTAS
// ==========================================
const driverRoutes = require('./routes/drivers');
const userRoutes = require('./routes/users');
const tripRoutes = require('./routes/trips');
const adminRoutes = require('./routes/admin');
const documentRoutes = require('./routes/documents');
const supportRoutes = require('./routes/support');
const financeRoutes = require('./routes/finances');
const reportRoutes = require('./routes/reports');
const pricingRoutes = require('./routes/pricing');
const suspensionsRouter = require('./routes/suspensions');
const zonesRouter = require('./routes/zones-management');
const dynamicPricingRouter = require('./routes/dynamic-pricing');
const surgeRouter = require('./routes/surge-engine');

// ==========================================
// REGISTRAR RUTAS
// ==========================================
app.use('/api/drivers', driverRoutes);
app.use('/api/users', userRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/finances', financeRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/suspensions', suspensionsRouter);
app.use('/api/zones', zonesRouter);
app.use('/api/dynamic-pricing', dynamicPricingRouter);
app.use('/api/surge', surgeRouter);

// ==========================================
// PÁGINA PRINCIPAL
// ==========================================
app.get('/', (req, res) => {
  const fs = require('fs');
  const appPath = path.join(__dirname, '../App.html');
  
  fs.readFile(appPath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error cargando App.html:', err);
      return res.status(500).send('Error cargando la aplicación');
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(data);
  });
});

// ==========================================
// HEALTH CHECK
// ==========================================
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ==========================================
// MANEJO DE ERRORES 404
// ==========================================
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Ruta no encontrada',
    path: req.path,
    method: req.method
  });
});

// ==========================================
// MANEJO DE ERRORES GLOBAL
// ==========================================
app.use((err, req, res, next) => {
  console.error('Error global:', err);
  res.status(500).json({ 
    error: 'Error interno del servidor',
    message: err.message 
  });
});

// ==========================================
// CREAR ADMIN INICIAL SI NO EXISTE
// ==========================================
async function createInitialAdmin() {
  try {
    const bcrypt = require('bcryptjs');
    const result = await db.query('SELECT COUNT(*) as count FROM admins');
    const adminCount = parseInt(result.rows[0]?.count || 0);
    
    if (adminCount === 0) {
      const hashedPassword = await bcrypt.hash('132312', 10);
      await db.query(
        `INSERT INTO admins (username, email, password, role, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        ['menandro68', 'menandro68@example.com', hashedPassword, 'admin']
      );
      console.log('✅ Admin inicial creado: menandro68 / 132312');
    }
  } catch (error) {
    console.error('⚠️ Error creando admin inicial:', error.message);
  }
}

// ==========================================
// INICIAR SERVIDOR
// ==========================================
const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', async () => {
  console.log(`✅ Servidor corriendo en puerto ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`📦 Entorno: ${process.env.NODE_ENV || 'development'}`);
  
  // Crear admin inicial si no existe
  await createInitialAdmin();
});

module.exports = { app, server, io };