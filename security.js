const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// Limitar intentos de login - CRÍTICO
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // máximo 5 intentos
    message: 'Demasiados intentos de login. Intente en 15 minutos.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Limitar llamadas a la API general
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // máximo 100 peticiones
    message: 'Demasiadas peticiones desde esta IP.'
});

// Headers de seguridad
const securityHeaders = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
});

module.exports = {
    loginLimiter,
    apiLimiter,
    securityHeaders
};