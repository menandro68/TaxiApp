import { ValidationUtils } from '../src/utils/ValidationUtils';

describe('ValidationUtils', () => {
  describe('isValidEmail', () => {
    it('should accept valid emails', () => {
      expect(ValidationUtils.isValidEmail('test@example.com')).toBe(true);
      expect(ValidationUtils.isValidEmail('user.name@domain.co')).toBe(true);
      expect(ValidationUtils.isValidEmail('user+tag@example.org')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(ValidationUtils.isValidEmail('notanemail')).toBe(false);
      expect(ValidationUtils.isValidEmail('@example.com')).toBe(false);
      expect(ValidationUtils.isValidEmail('user@')).toBe(false);
      expect(ValidationUtils.isValidEmail('')).toBe(false);
    });
  });

  describe('isValidPhone', () => {
    it('should accept valid Dominican phone numbers', () => {
      expect(ValidationUtils.isValidPhone('8095551234')).toBe(true);
      expect(ValidationUtils.isValidPhone('809-555-1234')).toBe(true);
      expect(ValidationUtils.isValidPhone('829 555 1234')).toBe(true);
      expect(ValidationUtils.isValidPhone('8495551234')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(ValidationUtils.isValidPhone('1234567890')).toBe(false);
      expect(ValidationUtils.isValidPhone('800555')).toBe(false);
      expect(ValidationUtils.isValidPhone('')).toBe(false);
      expect(ValidationUtils.isValidPhone('not a phone')).toBe(false);
    });
  });

  describe('isValidPassword', () => {
    it('should accept valid passwords', () => {
      expect(ValidationUtils.isValidPassword('123456').isValid).toBe(true);
      expect(ValidationUtils.isValidPassword('password123').isValid).toBe(true);
      expect(ValidationUtils.isValidPassword('MySecureP@ss').isValid).toBe(true);
    });

    it('should reject short passwords', () => {
      expect(ValidationUtils.isValidPassword('12345').isValid).toBe(false);
      expect(ValidationUtils.isValidPassword('abc').isValid).toBe(false);
      expect(ValidationUtils.isValidPassword('').isValid).toBe(false);
    });
  });

  describe('isValidName', () => {
    it('should accept valid names', () => {
      expect(ValidationUtils.isValidName('Juan')).toBe(true);
      expect(ValidationUtils.isValidName('María García')).toBe(true);
      expect(ValidationUtils.isValidName('Jean-Pierre')).toBe(true);
      expect(ValidationUtils.isValidName('Jo')).toBe(true); // Acepta 2 letras
    });

    it('should reject invalid names', () => {
      expect(ValidationUtils.isValidName('J')).toBe(false); // Solo 1 letra
      expect(ValidationUtils.isValidName('')).toBe(false);
      expect(ValidationUtils.isValidName('123')).toBe(false);
      expect(ValidationUtils.isValidName('   ')).toBe(false);
    });
  });
});