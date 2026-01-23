// ========================================
// RUTAS DE CONFIGURACIÓN DEL SISTEMA
// ========================================
const express = require('express');
const router = express.Router();
const { db } = require('../config/database');

// ========================================
// GET - Obtener todas las configuraciones
// ========================================
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, category, setting_key, setting_value, setting_type, description, is_editable
      FROM system_settings
      ORDER BY category, setting_key
    `);
    
    // Agrupar por categoría
    const settings = {};
    for (const row of result.rows) {
      if (!settings[row.category]) {
        settings[row.category] = [];
      }
      settings[row.category].push({
        id: row.id,
        key: row.setting_key,
        value: row.setting_value,
        type: row.setting_type,
        description: row.description,
        editable: row.is_editable
      });
    }
    
    res.json({
      success: true,
      settings: settings
    });
    
  } catch (error) {
    console.error('Error obteniendo configuraciones:', error);
    res.status(500).json({ success: false, error: 'Error al obtener configuraciones' });
  }
});

// ========================================
// PUT - Actualizar una configuración
// ========================================
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { value } = req.body;
    
    if (value === undefined) {
      return res.status(400).json({ success: false, error: 'Valor requerido' });
    }
    
    const result = await db.query(`
      UPDATE system_settings 
      SET setting_value = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND is_editable = true
      RETURNING *
    `, [value, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Configuración no encontrada o no editable' });
    }
    
    res.json({
      success: true,
      message: 'Configuración actualizada',
      setting: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error actualizando configuración:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar configuración' });
  }
});

// ========================================
// PUT - Actualizar múltiples configuraciones
// ========================================
router.put('/', async (req, res) => {
  try {
    const { settings } = req.body;
    
    if (!settings || !Array.isArray(settings)) {
      return res.status(400).json({ success: false, error: 'Array de settings requerido' });
    }
    
    const updated = [];
    for (const setting of settings) {
      const result = await db.query(`
        UPDATE system_settings 
        SET setting_value = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND is_editable = true
        RETURNING *
      `, [setting.value, setting.id]);
      
      if (result.rows.length > 0) {
        updated.push(result.rows[0]);
      }
    }
    
    res.json({
      success: true,
      message: `${updated.length} configuraciones actualizadas`,
      updated: updated
    });
    
  } catch (error) {
    console.error('Error actualizando configuraciones:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar configuraciones' });
  }
});

module.exports = router;