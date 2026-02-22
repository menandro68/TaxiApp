const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Crear tabla de referidos al iniciar (si no existe)
const initReferralsTable = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS referrals (
        id SERIAL PRIMARY KEY,
        referrer_id INTEGER NOT NULL REFERENCES drivers(id),
        referred_id INTEGER NOT NULL REFERENCES drivers(id),
        referral_code VARCHAR(20) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        referrer_bonus DECIMAL(10,2) DEFAULT 500.00,
        referred_bonus DECIMAL(10,2) DEFAULT 200.00,
        referrer_paid BOOLEAN DEFAULT FALSE,
        referred_paid BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        UNIQUE(referred_id)
      )
    `);
    
    await db.query(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20)`);
    await db.query(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS referred_by INTEGER`);
    
    console.log('✅ Tabla referrals inicializada');
  } catch (error) {
    console.log('⚠️ Error inicializando tabla referrals:', error.message);
  }
};

initReferralsTable();

// Obtener estadísticas de referidos
router.get('/stats/:driverId', async (req, res) => {
  try {
    const { driverId } = req.params;
    
    const result = await db.query(`
      SELECT 
        COUNT(*) as total_referrals,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as active_referrals,
        COALESCE(SUM(CASE WHEN referrer_paid = true THEN referrer_bonus ELSE 0 END), 0) as total_earnings
      FROM referrals 
      WHERE referrer_id = $1
    `, [driverId]);
    
    res.json({
      success: true,
      totalReferrals: parseInt(result.rows[0].total_referrals) || 0,
      activeReferrals: parseInt(result.rows[0].active_referrals) || 0,
      totalEarnings: parseFloat(result.rows[0].total_earnings) || 0
    });
  } catch (error) {
    console.error('Error obteniendo stats de referidos:', error);
    res.json({ success: true, totalReferrals: 0, activeReferrals: 0, totalEarnings: 0 });
  }
});

// Validar código de referido
router.get('/validate/:code', async (req, res) => {
  try {
    const { code } = req.params;
    
    // Extraer ID del código (últimos 3 dígitos)
    const idPart = code.slice(-3);
    const driverId = parseInt(idPart);
    
    const result = await db.query(
      'SELECT id, name FROM drivers WHERE id = $1',
      [driverId]
    );
    
    if (result.rows.length > 0) {
      // Verificar que el código coincida
      const driver = result.rows[0];
      const namePart = (driver.name || 'DRIVER').toUpperCase().replace(/\s+/g, '').substring(0, 6);
      const expectedCode = `${namePart}${String(driver.id).padStart(3, '0')}`;
      
      if (expectedCode === code.toUpperCase()) {
        res.json({ success: true, valid: true, referrerName: driver.name, referrerId: driver.id });
      } else {
        res.json({ success: true, valid: false, message: 'Código inválido' });
      }
    } else {
      res.json({ success: true, valid: false, message: 'Código no encontrado' });
    }
  } catch (error) {
    console.error('Error validando código:', error);
    res.json({ success: false, valid: false, message: 'Error validando código' });
  }
});

// Registrar referido (cuando un conductor se registra con código)
router.post('/register', async (req, res) => {
  try {
    const { referrerId, referredId, referralCode } = req.body;
    
    // Verificar que no se auto-refiera
    if (referrerId === referredId) {
      return res.json({ success: false, message: 'No puedes usar tu propio código' });
    }
    
    // Verificar que el referido no tenga ya un referidor
    const existing = await db.query(
      'SELECT id FROM referrals WHERE referred_id = $1',
      [referredId]
    );
    
    if (existing.rows.length > 0) {
      return res.json({ success: false, message: 'Ya tienes un código de referido aplicado' });
    }
    
    // Crear el registro de referido
    await db.query(`
      INSERT INTO referrals (referrer_id, referred_id, referral_code, status)
      VALUES ($1, $2, $3, 'pending')
    `, [referrerId, referredId, referralCode]);
    
    // Actualizar el conductor referido
    await db.query(
      'UPDATE drivers SET referred_by = $1 WHERE id = $2',
      [referrerId, referredId]
    );
    
    res.json({ success: true, message: 'Código de referido aplicado exitosamente' });
  } catch (error) {
    console.error('Error registrando referido:', error);
    res.json({ success: false, message: 'Error aplicando código' });
  }
});

// Completar referido (cuando el referido completa su primer viaje)
router.post('/complete', async (req, res) => {
  try {
    const { referredId } = req.body;
    
    // Buscar el referido pendiente
    const referral = await db.query(
      `SELECT * FROM referrals WHERE referred_id = $1 AND status = 'pending'`,
      [referredId]
    );
    
    if (referral.rows.length === 0) {
      return res.json({ success: false, message: 'No hay referido pendiente' });
    }
    
    const ref = referral.rows[0];
    
    // Actualizar estado a completado
    await db.query(`
      UPDATE referrals 
      SET status = 'completed', completed_at = CURRENT_TIMESTAMP 
      WHERE id = $1
    `, [ref.id]);
    
    // Agregar bono al referidor (RD$500) en wallet_transactions
    await db.query(`
      INSERT INTO wallet_transactions (driver_id, type, amount, description, created_at)
      VALUES ($1, 'bonus', $2, 'Bono por referido completado', CURRENT_TIMESTAMP)
    `, [ref.referrer_id, ref.referrer_bonus]);
    
    // Agregar bono al referido (RD$200) en wallet_transactions
    await db.query(`
      INSERT INTO wallet_transactions (driver_id, type, amount, description, created_at)
      VALUES ($1, 'bonus', $2, 'Bono de bienvenida por registro con código', CURRENT_TIMESTAMP)
    `, [ref.referred_id, ref.referred_bonus]);
    
    // Marcar como pagados
    await db.query(`
      UPDATE referrals SET referrer_paid = true, referred_paid = true WHERE id = $1
    `, [ref.id]);
    
    console.log(`✅ Referido completado: Referidor ${ref.referrer_id} +$${ref.referrer_bonus}, Referido ${ref.referred_id} +$${ref.referred_bonus}`);
    
    res.json({ 
      success: true, 
      message: 'Bonos aplicados exitosamente',
      referrerBonus: ref.referrer_bonus,
      referredBonus: ref.referred_bonus
    });
  } catch (error) {
    console.error('Error completando referido:', error);
    res.json({ success: false, message: 'Error aplicando bonos' });
  }
});

// Obtener lista de referidos de un conductor
router.get('/list/:driverId', async (req, res) => {
  try {
    const { driverId } = req.params;
    
    const result = await db.query(`
      SELECT r.*, d.name as referred_name, d.phone as referred_phone
      FROM referrals r
      JOIN drivers d ON r.referred_id = d.id
      WHERE r.referrer_id = $1
      ORDER BY r.created_at DESC
    `, [driverId]);
    
    res.json({ success: true, referrals: result.rows });
  } catch (error) {
    console.error('Error obteniendo lista de referidos:', error);
    res.json({ success: true, referrals: [] });
  }
});

module.exports = router;