const express = require('express');
const router = express.Router();
const db = require('../config/database');

// OBTENER ESTADÍSTICAS DEL DASHBOARD
router.get('/stats', (req, res) => {
  const stats = {};
  
  // Total de usuarios
  db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
    stats.totalUsers = row ? row.count : 0;
    
    // Total de conductores
    db.get('SELECT COUNT(*) as count FROM drivers', (err, row) => {
      stats.totalDrivers = row ? row.count : 0;
      
      // Conductores activos
      db.get('SELECT COUNT(*) as count FROM drivers WHERE status = "active"', (err, row) => {
        stats.activeDrivers = row ? row.count : 0;
        
        // Total de viajes
        db.get('SELECT COUNT(*) as count FROM trips', (err, row) => {
          stats.totalTrips = row ? row.count : 0;
          
          // Viajes completados hoy
          db.get(`SELECT COUNT(*) as count FROM trips 
                  WHERE status = 'completed' 
                  AND date(created_at) = date('now')`, (err, row) => {
            stats.tripsToday = row ? row.count : 0;
            
            // Ingresos totales
            db.get('SELECT SUM(price) as total FROM trips WHERE status = "completed"', (err, row) => {
              stats.totalRevenue = row && row.total ? row.total : 0;
              
              res.json(stats);
            });
          });
        });
      });
    });
  });
});

// OBTENER TODOS LOS CONDUCTORES
router.get('/drivers', (req, res) => {
  const query = `SELECT id, name, email, phone, license, vehicle_plate, 
                 vehicle_model, vehicle_color, status, rating, total_trips, created_at 
                 FROM drivers ORDER BY created_at DESC`;
  
  db.all(query, [], (err, drivers) => {
    if (err) {
      return res.status(500).json({ error: 'Error al obtener conductores' });
    }
    res.json(drivers);
  });
});

// APROBAR/RECHAZAR CONDUCTOR
router.put('/drivers/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  const validStatuses = ['active', 'inactive', 'suspended', 'pending'];
  
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }
  
  db.run('UPDATE drivers SET status = ? WHERE id = ?', [status, id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Error al actualizar estado' });
    }
    res.json({ success: true, message: `Estado actualizado a: ${status}` });
  });
});

// OBTENER TODOS LOS VIAJES
router.get('/trips', (req, res) => {
  const query = `SELECT t.*, 
                 u.name as user_name, u.email as user_email,
                 d.name as driver_name, d.vehicle_model
                 FROM trips t
                 LEFT JOIN users u ON t.user_id = u.id
                 LEFT JOIN drivers d ON t.driver_id = d.id
                 ORDER BY t.created_at DESC`;
  
  db.all(query, [], (err, trips) => {
    if (err) {
      return res.status(500).json({ error: 'Error al obtener viajes' });
    }
    res.json(trips);
  });
});

// OBTENER VIAJES EN TIEMPO REAL
router.get('/trips/live', (req, res) => {
  const query = `SELECT t.*, 
                 u.name as user_name, u.phone as user_phone,
                 d.name as driver_name, d.phone as driver_phone, d.vehicle_model
                 FROM trips t
                 LEFT JOIN users u ON t.user_id = u.id
                 LEFT JOIN drivers d ON t.driver_id = d.id
                 WHERE t.status IN ('pending', 'assigned', 'accepted', 'arrived', 'started')
                 ORDER BY t.created_at DESC`;
  
  db.all(query, [], (err, trips) => {
    if (err) {
      return res.status(500).json({ error: 'Error al obtener viajes activos' });
    }
    res.json(trips);
  });
});

// Login de administrador
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    }
    
    db.get('SELECT * FROM admins WHERE username = ? OR email = ?', 
        [username, username], 
        async (err, admin) => {
            if (err) {
                return res.status(500).json({ error: 'Error del servidor' });
            }
            
            if (!admin) {
                return res.status(401).json({ error: 'Credenciales inválidas' });
            }
            
            // Verificar contraseña
            const bcrypt = require('bcrypt');
            const validPassword = await bcrypt.compare(password, admin.password);
            
            if (!validPassword) {
                return res.status(401).json({ error: 'Credenciales inválidas' });
            }
            
            // Login exitoso
            res.json({
                success: true,
                admin: {
                    id: admin.id,
                    username: admin.username,
                    email: admin.email,
                    role: admin.role
                },
                token: 'admin-token-' + Date.now()
            });
        }
    );
});

// ==========================================
// CRUD DE CONDUCTORES
// ==========================================

// AGREGAR CONDUCTOR
router.post('/drivers', (req, res) => {
    const { name, email, phone, password, license, vehicle_plate, vehicle_model, vehicle_color } = req.body;
    
    const bcrypt = require('bcrypt');
    const hashedPassword = bcrypt.hashSync(password || 'password123', 10);
    
    const query = `INSERT INTO drivers (name, email, phone, password, license, vehicle_plate, vehicle_model, vehicle_color, status, rating)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 5.0)`;
    
    db.run(query, [name, email, phone, hashedPassword, license, vehicle_plate, vehicle_model, vehicle_color], function(err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json({ success: true, id: this.lastID });
    });
});

// EDITAR CONDUCTOR
router.put('/drivers/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    values.push(id);
    
    db.run(`UPDATE drivers SET ${fields} WHERE id = ?`, values, function(err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json({ success: true, changes: this.changes });
    });
});

// ELIMINAR CONDUCTOR
router.delete('/drivers/:id', (req, res) => {
    const { id } = req.params;
    
    db.run('DELETE FROM drivers WHERE id = ?', [id], function(err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json({ success: true, deleted: this.changes });
    });
});

// ==========================================
// CRUD DE USUARIOS
// ==========================================

// AGREGAR USUARIO
router.post('/users', (req, res) => {
    const { name, email, phone, password } = req.body;
    
    const bcrypt = require('bcrypt');
    const hashedPassword = bcrypt.hashSync(password || 'password123', 10);
    
    db.run(`INSERT INTO users (name, email, phone, password) VALUES (?, ?, ?, ?)`,
        [name, email, phone, hashedPassword], function(err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json({ success: true, id: this.lastID });
    });
});

// ELIMINAR USUARIO
router.delete('/users/:id', (req, res) => {
    const { id } = req.params;
    
    db.run('DELETE FROM users WHERE id = ?', [id], function(err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json({ success: true, deleted: this.changes });
    });
});

module.exports = router;