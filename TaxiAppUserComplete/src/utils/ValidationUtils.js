// ValidationUtils.js
export const ValidationUtils = {
  // Validación de email mejorada
  isValidEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const minLength = 5;
    const maxLength = 100;
    
    if (!email) return false;
    if (email.length < minLength || email.length > maxLength) return false;
    
    // Validación adicional para dominios comunes en RD
    const validDomains = ['gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com'];
    const domain = email.split('@')[1];
    
    return emailRegex.test(email);
  },

  // Validación de teléfono RD mejorada
  isValidPhone: (phone) => {
    // Limpiar espacios y guiones
    const cleanPhone = phone.replace(/[\s-]/g, '');
    
    // Patrones válidos para RD
    const patterns = [
      /^809\d{7}$/,  // 809-XXX-XXXX
      /^829\d{7}$/,  // 829-XXX-XXXX
      /^849\d{7}$/,  // 849-XXX-XXXX
      /^\+1809\d{7}$/,  // +1-809-XXX-XXXX
      /^\+1829\d{7}$/,  // +1-829-XXX-XXXX
      /^\+1849\d{7}$/,  // +1-849-XXX-XXXX
    ];
    
    return patterns.some(pattern => pattern.test(cleanPhone));
  },

  // Formatear teléfono mientras escribe
  formatPhone: (phone) => {
    const cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  },

  // Validación de contraseña con niveles
  isValidPassword: (password) => {
    const minLength = 6;
    const checks = {
      length: password.length >= minLength,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumbers: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };
    
    const strength = Object.values(checks).filter(Boolean).length;
    
    return {
      isValid: checks.length,
      strength: strength <= 2 ? 'weak' : strength <= 3 ? 'medium' : 'strong',
      checks,
      message: checks.length ? '' : `Mínimo ${minLength} caracteres`
    };
  },

  // Validación de nombre
  isValidName: (name) => {
    if (!name || name.length < 2) return false;
    
    // Solo letras, espacios y caracteres latinos
    const nameRegex = /^[a-zA-ZÀ-ÿ\s'-]+$/;
    
    // No más de 3 espacios consecutivos
    if (/\s{3,}/.test(name)) return false;
    
    return nameRegex.test(name);
  },

  // Validación de dirección
  isValidAddress: (address) => {
    if (!address || address.length < 5) return false;
    
    // Debe contener al menos letras y números
    const hasLetters = /[a-zA-Z]/.test(address);
    const minLength = 5;
    const maxLength = 200;
    
    // Palabras prohibidas (spam)
    const blacklist = ['test', 'asdf', 'qwerty', '123'];
    const lowerAddress = address.toLowerCase();
    
    if (blacklist.some(word => lowerAddress.includes(word))) {
      return false;
    }
    
    return hasLetters && 
           address.length >= minLength && 
           address.length <= maxLength;
  },

  // Validación de tarjeta de crédito
  isValidCreditCard: (number) => {
    const cleaned = number.replace(/\s/g, '');
    
    // Algoritmo de Luhn
    let sum = 0;
    let isEven = false;
    
    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned.charAt(i), 10);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return (sum % 10) === 0 && cleaned.length >= 13 && cleaned.length <= 19;
  },

  // Detectar tipo de tarjeta
  getCardType: (number) => {
    const cleaned = number.replace(/\s/g, '');
    
    const patterns = {
      visa: /^4/,
      mastercard: /^5[1-5]/,
      amex: /^3[47]/,
      discover: /^6(?:011|5)/,
    };
    
    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(cleaned)) return type;
    }
    
    return 'unknown';
  },

  // Validación de CVV
  isValidCVV: (cvv, cardType = 'unknown') => {
    const cleaned = cvv.replace(/\D/g, '');
    
    if (cardType === 'amex') {
      return cleaned.length === 4;
    }
    
    return cleaned.length === 3;
  },

  // Validación de precio/monto
  isValidAmount: (amount) => {
    const num = parseFloat(amount);
    
    if (isNaN(num)) return false;
    if (num <= 0) return false;
    if (num > 999999) return false;
    
    // Máximo 2 decimales
    const decimals = amount.toString().split('.')[1];
    if (decimals && decimals.length > 2) return false;
    
    return true;
  },

  // Sanitizar entrada (prevenir XSS)
  sanitizeInput: (input) => {
    if (!input) return '';
    
    return input
      .replace(/[<>]/g, '') // Remover tags HTML
      .replace(/javascript:/gi, '') // Remover javascript:
      .replace(/on\w+=/gi, '') // Remover event handlers
      .trim();
  },

  // Validar coordenadas GPS para RD
  isValidDominicanCoordinates: (lat, lng) => {
    // Límites aproximados de República Dominicana
    const bounds = {
      north: 19.9786,
      south: 17.3611,
      east: -68.3179,
      west: -72.0075
    };
    
    return lat >= bounds.south && 
           lat <= bounds.north && 
           lng >= bounds.west && 
           lng <= bounds.east;
  },
};