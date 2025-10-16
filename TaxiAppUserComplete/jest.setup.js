// Setup básico para tests de React Native

// Mock de fetch
global.fetch = jest.fn();

// Mock básico de console para reducir ruido en tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};