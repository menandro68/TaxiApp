const express = require('express');
const router = express.Router();
const FinanceModel = require('../models/finances');

// Obtener configuración de comisión actual
router.get('/commission-config', async (req, res) => {
  try {
    const config = await FinanceModel.getCommissionConfig();
    res.json({
      success: true,
      config
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Actualizar porcentaje de comisión
router.put('/commission-config', async (req, res) => {
  try {
    const { percentage } = req.body;
    
    if (!percentage || percentage < 0 || percentage > 100) {
      return res.status(400).json({ 
        success: false, 
        error: 'Porcentaje inválido (debe ser entre 0 y 100)' 
      });
    }
    
    await FinanceModel.updateCommissionPercentage(percentage);
    res.json({
      success: true,
      message: `Comisión actualizada a ${percentage}%`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener resumen financiero
router.get('/summary', async (req, res) => {
  try {
    const summary = await FinanceModel.getFinancialSummary();
    res.json({
      success: true,
      summary
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener todas las transacciones
router.get('/transactions', async (req, res) => {
  try {
    const transactions = await FinanceModel.getTransactions(req.query);
    res.json({
      success: true,
      count: transactions.length,
      transactions
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener balances de todos los conductores
router.get('/balances', async (req, res) => {
  try {
    const balances = await FinanceModel.getAllBalances();
    res.json({
      success: true,
      count: balances.length,
      balances
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener balance de un conductor específico
router.get('/balance/:driverId', async (req, res) => {
  try {
    const balance = await FinanceModel.getDriverBalance(req.params.driverId);
    
    if (!balance) {
      return res.status(404).json({ 
        success: false, 
        error: 'Conductor no encontrado' 
      });
    }
    
    res.json({
      success: true,
      balance
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Procesar pago de comisión de un conductor
router.post('/process-payment', async (req, res) => {
  try {
    const { driverId, amount } = req.body;
    
    if (!driverId || !amount || amount <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Datos inválidos' 
      });
    }
    
    const result = await FinanceModel.processCommissionPayment(driverId, amount);
    res.json({
      success: true,
      message: `Pago de $${amount} procesado exitosamente`,
      result
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Simular transacción de viaje completado (para pruebas)
router.post('/simulate-trip', async (req, res) => {
  try {
    const tripAmount = Math.floor(Math.random() * 2000) + 500; // Entre 500 y 2500
    const driverId = req.body.driverId || 1;
    const tripId = req.body.tripId || Math.floor(Math.random() * 10000);
    
    const result = await FinanceModel.recordTransaction(tripId, driverId, tripAmount);
    
    res.json({
      success: true,
      message: 'Transacción simulada creada',
      transaction: {
        ...result,
        tripAmount: `$${tripAmount}`,
        commissionAmount: `$${result.commissionAmount}`,
        driverEarnings: `$${result.driverEarnings}`,
        commissionPercentage: `${result.commissionPercentage}%`
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Hook para cuando se complete un viaje real
router.post('/trip-completed', async (req, res) => {
  try {
    const { tripId, driverId, amount } = req.body;
    
    if (!tripId || !driverId || !amount) {
      return res.status(400).json({ 
        success: false, 
        error: 'Faltan datos requeridos' 
      });
    }
    
    const result = await FinanceModel.recordTransaction(tripId, driverId, amount);
    
    res.json({
      success: true,
      message: 'Transacción registrada',
      result
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;