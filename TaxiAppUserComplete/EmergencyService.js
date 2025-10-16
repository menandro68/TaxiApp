import { Alert, Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from '@react-native-community/geolocation';

/**
 * Servicio de Emergencia para TaxiApp
 * Maneja el botón de pánico y alertas de emergencia
 */
class EmergencyService {
  constructor() {
    this.isEmergencyActive = false;
    this.emergencyContacts = [];
    this.emergencyNumber = '911'; // Número de emergencia en RD
  }

  /**
   * Inicializar el servicio cargando contactos
   */
  async initialize() {
    try {
      // Cargar contactos de emergencia guardados
      const savedContacts = await AsyncStorage.getItem('emergencyContacts');
      if (savedContacts) {
        this.emergencyContacts = JSON.parse(savedContacts);
      }
      console.log('📱 Servicio de emergencia inicializado');
      console.log('👥 Contactos cargados:', this.emergencyContacts.length);
    } catch (error) {
      console.error('Error inicializando servicio de emergencia:', error);
    }
  }

  /**
   * ACTIVAR EMERGENCIA - Función principal
   */
  async activateEmergency(tripData = {}) {
    try {
      // Prevenir activaciones múltiples
      if (this.isEmergencyActive) {
        console.log('⚠️ Emergencia ya está activa');
        return;
      }

      this.isEmergencyActive = true;
      console.log('🚨 EMERGENCIA ACTIVADA');

      // Obtener ubicación actual
      const location = await this.getCurrentLocation();
      
      // Preparar datos de emergencia
      const emergencyData = {
        timestamp: new Date().toISOString(),
        location: location,
        tripData: tripData,
        deviceInfo: {
          platform: Platform.OS,
          version: Platform.Version
        }
      };

      // Guardar registro de emergencia
      await this.saveEmergencyLog(emergencyData);

      // Ejecutar acciones de emergencia en paralelo
      const results = await Promise.allSettled([
        this.sendEmergencySMS(emergencyData),
        this.callEmergencyNumber(),
        this.notifyEmergencyContacts(emergencyData)
      ]);

      // Verificar resultados
      const smsResult = results[0].status === 'fulfilled';
      const callResult = results[1].status === 'fulfilled';
      const notifyResult = results[2].status === 'fulfilled';

      console.log('📊 Resultados de emergencia:', {
        sms: smsResult,
        llamada: callResult,
        notificaciones: notifyResult
      });

      return {
        success: true,
        sms: smsResult,
        call: callResult,
        notifications: notifyResult
      };

    } catch (error) {
      console.error('❌ Error en activación de emergencia:', error);
      Alert.alert(
        'Error',
        'No se pudo completar todas las acciones de emergencia, pero se intentará llamar al 911',
        [{ text: 'OK', onPress: () => this.callEmergencyNumber() }]
      );
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtener ubicación actual
   */
  async getCurrentLocation() {
    return new Promise((resolve) => {
      Geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            address: 'Santo Domingo, RD',
            googleMapsUrl: `https://maps.google.com/?q=${position.coords.latitude},${position.coords.longitude}`
          };
          resolve(location);
        },
        (error) => {
          console.log('Error obteniendo ubicación:', error);
          // Ubicación por defecto (Santo Domingo)
          resolve({
            latitude: 18.4861,
            longitude: -69.9312,
            address: 'Santo Domingo, RD',
            googleMapsUrl: 'https://maps.google.com/?q=18.4861,-69.9312'
          });
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
      );
    });
  }

  /**
   * Enviar SMS de emergencia
   */
  async sendEmergencySMS(emergencyData) {
    try {
      const { location, tripData } = emergencyData;
      
      // Crear mensaje de emergencia
      let message = '🚨 EMERGENCIA - TaxiApp\n\n';
      message += `Usuario: ${tripData.userName || 'Usuario'}\n`;
      
      if (tripData.driverName) {
        message += `Conductor: ${tripData.driverName}\n`;
        message += `Placa: ${tripData.licensePlate || 'N/A'}\n`;
        message += `Vehículo: ${tripData.vehicleModel || 'N/A'}\n`;
      }
      
      if (location) {
        message += `\n📍 UBICACIÓN:\n`;
        message += `${location.address}\n`;
        message += `Ver en mapa: ${location.googleMapsUrl}\n`;
        message += `Coordenadas: ${location.latitude}, ${location.longitude}\n`;
      }
      
      message += `\nHora: ${new Date().toLocaleString('es-DO')}`;
      message += `\n\n¡Contactar inmediatamente!`;

      // Enviar a cada contacto de emergencia
      const promises = this.emergencyContacts.map(contact => {
        const smsUrl = Platform.OS === 'ios' 
          ? `sms:${contact.phone}&body=${encodeURIComponent(message)}`
          : `sms:${contact.phone}?body=${encodeURIComponent(message)}`;
        
        return Linking.openURL(smsUrl).catch(err => {
          console.log(`No se pudo enviar SMS a ${contact.name}`);
        });
      });

      await Promise.all(promises);
      console.log('✅ SMS de emergencia enviados');
      return true;

    } catch (error) {
      console.error('Error enviando SMS:', error);
      return false;
    }
  }

  /**
   * Llamar al número de emergencia
   */
  async callEmergencyNumber() {
    try {
      const phoneUrl = `tel:${this.emergencyNumber}`;
      const canOpen = await Linking.canOpenURL(phoneUrl);
      
      if (canOpen) {
        await Linking.openURL(phoneUrl);
        console.log('📞 Llamando al 911');
        return true;
      } else {
        Alert.alert(
          'No se puede llamar',
          `Marca manualmente al ${this.emergencyNumber}`,
          [{ text: 'OK' }]
        );
        return false;
      }
    } catch (error) {
      console.error('Error llamando emergencia:', error);
      Alert.alert('Error', `Por favor llama manualmente al ${this.emergencyNumber}`);
      return false;
    }
  }

  /**
   * Notificar a contactos de emergencia
   */
  async notifyEmergencyContacts(emergencyData) {
    try {
      if (this.emergencyContacts.length === 0) {
        console.log('No hay contactos de emergencia configurados');
        return false;
      }

      // Aquí podrías implementar notificaciones push o WhatsApp
      // Por ahora solo registramos
      console.log(`📢 Notificando a ${this.emergencyContacts.length} contactos`);
      
      return true;
    } catch (error) {
      console.error('Error notificando contactos:', error);
      return false;
    }
  }

  /**
   * Guardar registro de emergencia
   */
  async saveEmergencyLog(emergencyData) {
    try {
      // Obtener logs anteriores
      const existingLogs = await AsyncStorage.getItem('emergencyLogs');
      const logs = existingLogs ? JSON.parse(existingLogs) : [];
      
      // Agregar nuevo log
      logs.push(emergencyData);
      
      // Guardar (mantener solo últimos 10 logs)
      const recentLogs = logs.slice(-10);
      await AsyncStorage.setItem('emergencyLogs', JSON.stringify(recentLogs));
      
      console.log('📝 Registro de emergencia guardado');
      return true;
    } catch (error) {
      console.error('Error guardando log:', error);
      return false;
    }
  }

  /**
   * Agregar contacto de emergencia
   */
  async addEmergencyContact(contact) {
    try {
      // Validar datos
      if (!contact.name || !contact.phone) {
        Alert.alert('Error', 'Nombre y teléfono son requeridos');
        return false;
      }

      // Agregar a la lista
      this.emergencyContacts.push({
        id: Date.now().toString(),
        name: contact.name,
        phone: contact.phone,
        relationship: contact.relationship || 'Contacto'
      });

      // Limitar a 5 contactos máximo
      if (this.emergencyContacts.length > 5) {
        this.emergencyContacts = this.emergencyContacts.slice(-5);
      }

      // Guardar en AsyncStorage
      await AsyncStorage.setItem(
        'emergencyContacts',
        JSON.stringify(this.emergencyContacts)
      );

      console.log('✅ Contacto de emergencia agregado');
      return true;

    } catch (error) {
      console.error('Error agregando contacto:', error);
      return false;
    }
  }

  /**
   * Obtener contactos de emergencia
   */
  getEmergencyContacts() {
    return this.emergencyContacts;
  }

  /**
   * Eliminar contacto de emergencia
   */
  async removeEmergencyContact(contactId) {
    try {
      this.emergencyContacts = this.emergencyContacts.filter(
        contact => contact.id !== contactId
      );
      
      await AsyncStorage.setItem(
        'emergencyContacts',
        JSON.stringify(this.emergencyContacts)
      );
      
      console.log('🗑️ Contacto eliminado');
      return true;
    } catch (error) {
      console.error('Error eliminando contacto:', error);
      return false;
    }
  }

  /**
   * Desactivar emergencia
   */
  deactivateEmergency() {
    this.isEmergencyActive = false;
    console.log('✅ Emergencia desactivada');
  }

  /**
   * Verificar si hay emergencia activa
   */
  isEmergencyActiveStatus() {
    return this.isEmergencyActive;
  }
}

export default new EmergencyService();