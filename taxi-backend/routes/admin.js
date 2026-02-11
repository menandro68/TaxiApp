const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const bcrypt = require('bcryptjs');

// ========================================
// LOGIN DEL ADMIN
// ========================================
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    }

    const admin = await db.getOne(
      'SELECT * FROM admins WHERE username = $1',
      [username]
    );

    if (!admin) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const passwordMatch = await bcrypt.compare(password, admin.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: admin.id, username: admin.username, role: admin.role },
      process.env.JWT_SECRET || 'taxiapp_secret_key',
      { expiresIn: '24h' }
    );

    return res.json({
      success: true,
      message: 'Login exitoso',
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        role: admin.role,
        permissions: admin.permissions || '[]'
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const usersCount = await db.getOne('SELECT COUNT(*) as count FROM users');
    const driversCount = await db.getOne('SELECT COUNT(*) as count FROM drivers');
    const tripsCount = await db.getOne('SELECT COUNT(*) as count FROM trips');

    return res.json({
      success: true,
      stats: {
        totalUsers: parseInt(usersCount.count),
        totalDrivers: parseInt(driversCount.count),
        totalTrips: parseInt(tripsCount.count)
      }
    });
  } catch (error) {
    console.error('Error obteniendo stats:', error);
    return res.status(500).json({ error: 'Error obteniendo estadísticas' });
  }
});

router.get('/users', async (req, res) => {
  try {
    const admins = await db.getAll('SELECT id, username, email, role, permissions, created_at FROM admins');
    return res.json({ success: true, data: admins });
  } catch (error) {
    console.error('Error listando admins:', error);
    return res.status(500).json({ error: 'Error listando admins' });
  }
});

router.post('/users', async (req, res) => {
  try {
    const { username, email, password, role, permissions } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

   const result = await db.query(
      `INSERT INTO admins (username, email, password, role, permissions, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING id, username, email, role, permissions`,
      [username, email, hashedPassword, role || 'admin', permissions || '[]']
    );

    return res.status(201).json({
      success: true,
      message: 'Admin creado exitosamente',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creando admin:', error);
    if (error.message.includes('unique')) {
      return res.status(409).json({ error: 'El usuario o email ya existe' });
    }
    return res.status(500).json({ error: 'Error creando admin' });
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, role } = req.body;

    const result = await db.run(
      `UPDATE admins SET username = $1, email = $2, role = $3, updated_at = NOW() WHERE id = $4 RETURNING id, username, email, role`,
      [username, email, role, id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Admin no encontrado' });
    }

    return res.json({
      success: true,
      message: 'Admin actualizado',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error actualizando admin:', error);
    return res.status(500).json({ error: 'Error actualizando admin' });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.run(
      'DELETE FROM admins WHERE id = $1',
      [id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Admin no encontrado' });
    }

    return res.json({
      success: true,
      message: 'Admin eliminado'
    });
  } catch (error) {
    console.error('Error eliminando admin:', error);
    return res.status(500).json({ error: 'Error eliminando admin' });
  }
});

module.exports = router;