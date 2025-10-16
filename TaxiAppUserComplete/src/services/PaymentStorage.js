// PaymentStorage.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const PAYMENT_METHODS_KEY = '@TaxiApp:payment_methods';
const DEFAULT_METHOD_KEY = '@TaxiApp:default_payment_method';

class PaymentStorage {
  // Guardar método de pago
  static async savePaymentMethod(paymentMethod) {
    try {
      const methods = await this.getPaymentMethods();
      
      // Generar ID único si no existe
      if (!paymentMethod.id) {
        paymentMethod.id = `pm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }

      // Agregar timestamp
      paymentMethod.createdAt = paymentMethod.createdAt || new Date().toISOString();
      
      // Si es el primer método, hacerlo predeterminado
      if (methods.length === 0) {
        paymentMethod.isDefault = true;
        await this.setDefaultPaymentMethod(paymentMethod.id);
      }

      // Guardar solo los últimos 4 dígitos de la tarjeta
      if (paymentMethod.type === 'card') {
        paymentMethod.last4 = paymentMethod.cardNumber.slice(-4);
        // Por seguridad, no guardamos el número completo ni el CVV
        delete paymentMethod.cardNumber;
        delete paymentMethod.cvv;
      }

      methods.push(paymentMethod);
      await AsyncStorage.setItem(PAYMENT_METHODS_KEY, JSON.stringify(methods));
      
      console.log('✅ Método de pago guardado:', paymentMethod.id);
      return { success: true, paymentMethod };
      
    } catch (error) {
      console.error('❌ Error guardando método de pago:', error);
      return { success: false, error: error.message };
    }
  }

  // Obtener todos los métodos de pago
  static async getPaymentMethods() {
    try {
      const data = await AsyncStorage.getItem(PAYMENT_METHODS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('❌ Error obteniendo métodos de pago:', error);
      return [];
    }
  }

  // Obtener método de pago por ID
  static async getPaymentMethodById(id) {
    try {
      const methods = await this.getPaymentMethods();
      return methods.find(method => method.id === id);
    } catch (error) {
      console.error('❌ Error obteniendo método de pago:', error);
      return null;
    }
  }

  // Eliminar método de pago
  static async deletePaymentMethod(id) {
    try {
      const methods = await this.getPaymentMethods();
      const filteredMethods = methods.filter(method => method.id !== id);
      
      // Si eliminamos el método predeterminado, asignar otro
      const deletedMethod = methods.find(method => method.id === id);
      if (deletedMethod?.isDefault && filteredMethods.length > 0) {
        filteredMethods[0].isDefault = true;
        await this.setDefaultPaymentMethod(filteredMethods[0].id);
      }

      await AsyncStorage.setItem(PAYMENT_METHODS_KEY, JSON.stringify(filteredMethods));
      
      console.log('✅ Método de pago eliminado:', id);
      return { success: true };
      
    } catch (error) {
      console.error('❌ Error eliminando método de pago:', error);
      return { success: false, error: error.message };
    }
  }

  // Establecer método de pago predeterminado
  static async setDefaultPaymentMethod(id) {
    try {
      const methods = await this.getPaymentMethods();
      
      // Quitar el default actual
      methods.forEach(method => {
        method.isDefault = method.id === id;
      });

      await AsyncStorage.setItem(PAYMENT_METHODS_KEY, JSON.stringify(methods));
      await AsyncStorage.setItem(DEFAULT_METHOD_KEY, id);
      
      console.log('✅ Método predeterminado establecido:', id);
      return { success: true };
      
    } catch (error) {
      console.error('❌ Error estableciendo método predeterminado:', error);
      return { success: false, error: error.message };
    }
  }

  // Obtener método de pago predeterminado
  static async getDefaultPaymentMethod() {
    try {
      const methods = await this.getPaymentMethods();
      return methods.find(method => method.isDefault) || null;
    } catch (error) {
      console.error('❌ Error obteniendo método predeterminado:', error);
      return null;
    }
  }

  // Validar tarjeta de crédito (algoritmo de Luhn)
  static validateCardNumber(cardNumber) {
    const cleaned = cardNumber.replace(/\s/g, '');
    
    if (!/^\d+$/.test(cleaned)) {
      return false;
    }

    let sum = 0;
    let isEven = false;
    
    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned[i], 10);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  }

  // Detectar tipo de tarjeta
  static detectCardType(cardNumber) {
    const cleaned = cardNumber.replace(/\s/g, '');
    
    const patterns = {
      visa: /^4/,
      mastercard: /^5[1-5]/,
      amex: /^3[47]/,
      discover: /^6(?:011|5)/,
    };

    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(cleaned)) {
        return type;
      }
    }
    
    return 'unknown';
  }

  // Formatear número de tarjeta para mostrar
  static formatCardDisplay(last4, cardType = 'unknown') {
    return `•••• •••• •••• ${last4}`;
  }

  // Limpiar todos los métodos de pago
  static async clearAllPaymentMethods() {
    try {
      await AsyncStorage.removeItem(PAYMENT_METHODS_KEY);
      await AsyncStorage.removeItem(DEFAULT_METHOD_KEY);
      console.log('✅ Todos los métodos de pago eliminados');
      return { success: true };
    } catch (error) {
      console.error('❌ Error limpiando métodos de pago:', error);
      return { success: false, error: error.message };
    }
  }
}

export default PaymentStorage;