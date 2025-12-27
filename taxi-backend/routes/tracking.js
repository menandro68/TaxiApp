const express = require('express');
const router = express.Router();

// Almacenamiento en memoria para ubicaciones de tracking
const trackingData = new Map();

// POST /api/tracking/update - La app envía ubicaciones
router.post('/update', (req, res) => {
  try {
    const { shareId, latitude, longitude, tripData } = req.body;
    
    if (!shareId || !latitude || !longitude) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    const now = new Date().toISOString();
    
    // Obtener o crear registro
    let tracking = trackingData.get(shareId);
    
    if (!tracking) {
      tracking = {
        shareId,
        tripData: tripData || {},
        locations: [],
        createdAt: now,
        status: 'active'
      };
    }

    // Agregar nueva ubicación
    tracking.locations.push({
      latitude,
      longitude,
      timestamp: now
    });

    // Mantener solo las últimas 100 ubicaciones
    if (tracking.locations.length > 100) {
      tracking.locations = tracking.locations.slice(-100);
    }

    tracking.lastUpdate = now;
    trackingData.set(shareId, tracking);

    console.log(`📍 Tracking actualizado: ${shareId} - ${latitude}, ${longitude}`);
    
    res.json({ success: true, message: 'Ubicación actualizada' });
  } catch (error) {
    console.error('Error actualizando tracking:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/tracking/:shareId - Obtener ubicación actual
router.get('/:shareId', (req, res) => {
  try {
    const { shareId } = req.params;
    const tracking = trackingData.get(shareId);

    if (!tracking) {
      return res.status(404).json({ error: 'Tracking no encontrado' });
    }

    const lastLocation = tracking.locations[tracking.locations.length - 1];

    res.json({
      success: true,
      shareId: tracking.shareId,
      tripData: tracking.tripData,
      currentLocation: lastLocation,
      lastUpdate: tracking.lastUpdate,
      status: tracking.status
    });
  } catch (error) {
    console.error('Error obteniendo tracking:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/tracking/stop - Detener tracking
router.post('/stop', (req, res) => {
  try {
    const { shareId } = req.body;
    const tracking = trackingData.get(shareId);

    if (tracking) {
      tracking.status = 'completed';
      tracking.endTime = new Date().toISOString();
      trackingData.set(shareId, tracking);
    }

    res.json({ success: true, message: 'Tracking detenido' });
  } catch (error) {
    console.error('Error deteniendo tracking:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Limpiar trackings antiguos (más de 24 horas)
setInterval(() => {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 horas

  for (const [shareId, tracking] of trackingData.entries()) {
    const createdAt = new Date(tracking.createdAt).getTime();
    if (now - createdAt > maxAge) {
      trackingData.delete(shareId);
      console.log(`🗑️ Tracking eliminado por antigüedad: ${shareId}`);
    }
  }
}, 60 * 60 * 1000); // Ejecutar cada hora

module.exports = router;