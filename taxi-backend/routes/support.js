const express = require('express');
const router = express.Router();
const SupportModel = require('../models/support');

// Obtener todos los tickets
router.get('/tickets', async (req, res) => {
  try {
    const tickets = await SupportModel.getAllTickets();
    res.json({
      success: true,
      count: tickets.length,
      tickets
    });
  } catch (error) {
    console.error('Error obteniendo tickets:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al obtener tickets' 
    });
  }
});

// Obtener estadísticas
router.get('/stats', async (req, res) => {
  try {
    const stats = await SupportModel.getStats();
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Error al obtener estadísticas' 
    });
  }
});

// Obtener mensajes de un ticket
router.get('/tickets/:ticketId/messages', async (req, res) => {
  try {
    const messages = await SupportModel.getTicketMessages(req.params.ticketId);
    
    // Marcar mensajes como leídos
    await SupportModel.markMessagesAsRead(req.params.ticketId);
    
    res.json({
      success: true,
      count: messages.length,
      messages
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Error al obtener mensajes' 
    });
  }
});

// Crear nuevo ticket
router.post('/tickets', async (req, res) => {
  try {
    const { userId, userType, subject, category, message } = req.body;
    
    if (!userId || !userType || !subject || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Faltan campos requeridos' 
      });
    }
    
    const result = await SupportModel.createTicket(userId, userType, subject, category, message);
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Error al crear ticket' 
    });
  }
});

// Enviar mensaje como admin
router.post('/tickets/:ticketId/reply', async (req, res) => {
  try {
    const { message, adminId } = req.body;
    
    if (!message) {
      return res.status(400).json({ 
        success: false, 
        error: 'El mensaje no puede estar vacío' 
      });
    }
    
    const result = await SupportModel.sendAdminMessage(
      req.params.ticketId, 
      message, 
      adminId || 1
    );
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Error al enviar mensaje' 
    });
  }
});

// Actualizar estado del ticket
router.put('/tickets/:ticketId/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['open', 'closed', 'pending', 'resolved'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Estado inválido' 
      });
    }
    
    await SupportModel.updateTicketStatus(req.params.ticketId, status);
    res.json({
      success: true,
      message: 'Estado actualizado'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Error al actualizar estado' 
    });
  }
});

// Crear ticket de prueba
router.post('/test-ticket', async (req, res) => {
  try {
    const testData = {
      userId: 1,
      userType: Math.random() > 0.5 ? 'driver' : 'user',
      subject: 'Problema con el viaje #' + Math.floor(Math.random() * 1000),
      category: ['pago', 'viaje', 'app', 'otro'][Math.floor(Math.random() * 4)],
      message: 'Tengo un problema con mi último viaje. No puedo ver el recibo y el cobro fue incorrecto.'
    };
    
    const result = await SupportModel.createTicket(
      testData.userId,
      testData.userType,
      testData.subject,
      testData.category,
      testData.message
    );
    
    res.json({
      success: true,
      message: 'Ticket de prueba creado',
      ...result,
      testData
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;