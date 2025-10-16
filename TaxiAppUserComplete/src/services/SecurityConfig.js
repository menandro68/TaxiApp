// SecurityConfig.js
const SecurityConfig = {
  ENCRYPTION_KEY: 'TaxiApp2024SecureKey!@#',
  PASSWORD_SALT: 'TaxiApp2024Salt$%^',
  apiBaseUrl: 'https://api.taxiapp.com',
  timeout: 30000,
  SECURITY_LEVELS: {
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3
  },
  getSecurityLevel: (dataType) => {
    // Define los niveles según el tipo de dato
    const levels = {
      'password': 3,
      'card': 3,
      'token': 3,
      'email': 2,
      'phone': 2,
      'name': 1
    };
    return levels[dataType] || 1;
  }
};

export default SecurityConfig;