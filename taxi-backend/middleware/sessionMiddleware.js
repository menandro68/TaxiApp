const SessionService = require('../services/sessionService');
const jwt = require('jsonwebtoken');

// Middleware para verificar y actualizar actividad de sesión
const checkSessionActivity = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return next(); // Continuar sin token
    }

    // Verificar el token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      req.user = decoded;
      
      // Actualizar última actividad
      await SessionService.updateActivity(token);
      
      // Agregar información de sesión a la request
      req.sessionToken = token;
      
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          error: 'Token expirado', 
          code: 'TOKEN_EXPIRED',
          message: 'Por favor, usa el refresh token para obtener uno nuevo' 
        });
      }
      return res.status(401).json({ error: 'Token inválido' });
    }
    
    next();
  } catch (error) {
    console.error('Error en middleware de sesión:', error);
    next();
  }
};

// Middleware para requerir autenticación
const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Autenticación requerida' });
  }
  next();
};

// Tarea programada para limpiar sesiones inactivas
const startInactivityChecker = () => {
  // Verificar cada 5 minutos
  setInterval(async () => {
    try {
      const expiredCount = await SessionService.checkInactivity(30); // 30 minutos de inactividad
      if (expiredCount > 0) {
        console.log(`🔒 ${expiredCount} sesiones cerradas por inactividad`);
      }
    } catch (error) {
      console.error('Error verificando inactividad:', error);
    }
  }, 5 * 60 * 1000); // Cada 5 minutos
  
  console.log('⏱️ Monitor de inactividad de sesiones iniciado');
};

module.exports = {
  checkSessionActivity,
  requireAuth,
  startInactivityChecker
};