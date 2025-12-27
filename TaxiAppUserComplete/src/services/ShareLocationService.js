import { Linking, Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = 'https://web-production-99844.up.railway.app';

class ShareLocationService {
  constructor() {
    this.isSharing = false;
    this.shareId = null;
    this.updateInterval = null;
    this.sharedLocations = [];
  }

  // Generar ID único para el enlace de compartir
  generateShareId() {
    return `TAXI-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Iniciar compartir ubicación
  async startSharing(tripData, userLocation) {
    try {
      if (this.isSharing) {
        console.log('Ya se está compartiendo ubicación');
        return this.shareId;
      }

      this.shareId = this.generateShareId();
      this.isSharing = true;

      // Datos iniciales del viaje
      const shareData = {
        shareId: this.shareId,
        tripId: tripData.id || `trip_${Date.now()}`,
        startTime: new Date().toISOString(),
        pickup: tripData.pickup || 'Origen',
        destination: tripData.destination || 'Destino',
        driverName: tripData.driverName || 'Conductor',
        vehiclePlate: tripData.vehiclePlate || 'N/A',
        estimatedArrival: tripData.estimatedArrival || null,
        locations: [{
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          timestamp: new Date().toISOString()
        }],
        status: 'active'
      };

      // Guardar en AsyncStorage
      await AsyncStorage.setItem(`share_${this.shareId}`, JSON.stringify(shareData));
      
      console.log('✅ Compartir ubicación iniciado:', this.shareId);
      
      // Enviar datos iniciales al backend
      try {
        await fetch(`${BACKEND_URL}/api/tracking/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shareId: this.shareId,
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            tripData: {
              destination: shareData.destination,
              driverName: shareData.driverName,
              vehiclePlate: shareData.vehiclePlate
            }
          })
        });
        console.log('📡 Tracking enviado al backend');
      } catch (err) {
        console.error('Error enviando al backend:', err);
      }
      
      // Iniciar actualización periódica de ubicación
      this.updateInterval = setInterval(async () => {
        try {
          console.log('🔄 Interval ejecutándose...');
          // Obtener ubicación actual desde AsyncStorage
          const currentLocation = await AsyncStorage.getItem('user_location');
          console.log('📦 user_location:', currentLocation ? 'encontrado' : 'NO encontrado');
          if (currentLocation) {
            const location = JSON.parse(currentLocation);
            console.log('📍 Enviando ubicación:', location.latitude, location.longitude);
            
            // Enviar directamente al backend
            try {
              const response = await fetch(`${BACKEND_URL}/api/tracking/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  shareId: this.shareId,
                  latitude: location.latitude,
                  longitude: location.longitude
                })
              });
              console.log('📡 Tracking enviado, status:', response.status);
            } catch (fetchErr) {
              console.error('❌ Error fetch:', fetchErr.message);
            }
          }
        } catch (error) {
          console.error('❌ Error en actualización periódica:', error);
        }
      }, 5000); // Actualizar cada 5 segundos
      
      return this.shareId;
    } catch (error) {
      console.error('Error iniciando compartir:', error);
      return null;
    }
  }

  // Actualizar ubicación
  async updateLocation(latitude, longitude) {
    try {
      if (!this.isSharing || !this.shareId) return;

      const shareData = await AsyncStorage.getItem(`share_${this.shareId}`);
      if (shareData) {
        const data = JSON.parse(shareData);
        data.locations.push({
          latitude,
          longitude,
          timestamp: new Date().toISOString()
        });

        // Mantener solo las últimas 50 ubicaciones
        if (data.locations.length > 50) {
          data.locations = data.locations.slice(-50);
        }

        await AsyncStorage.setItem(`share_${this.shareId}`, JSON.stringify(data));
        
        // Enviar al backend
        try {
          await fetch(`${BACKEND_URL}/api/tracking/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              shareId: this.shareId,
              latitude,
              longitude
            })
          });
        } catch (err) {
          console.error('Error enviando ubicación al backend:', err);
        }
        
        console.log('📍 Ubicación actualizada');
      }
    } catch (error) {
      console.error('Error actualizando ubicación:', error);
    }
  }

  // Detener compartir
  async stopSharing() {
    try {
      if (!this.isSharing || !this.shareId) return;

      const shareData = await AsyncStorage.getItem(`share_${this.shareId}`);
      if (shareData) {
        const data = JSON.parse(shareData);
        data.status = 'completed';
        data.endTime = new Date().toISOString();
        await AsyncStorage.setItem(`share_${this.shareId}`, JSON.stringify(data));
      }

      this.isSharing = false;
      this.shareId = null;

      // Detener el interval de actualización
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
      }

      console.log('🛑 Compartir ubicación detenido');
    } catch (error) {
      console.error('Error deteniendo compartir:', error);
    }
  }

  // Crear mensaje para WhatsApp
  createWhatsAppMessage(shareId, driverName, vehiclePlate, destination, latitude, longitude) {
    const trackingUrl = `${BACKEND_URL}/track/${shareId}`;
    const message = `🚖 *Estoy en camino*\n\n` +
      `📍 Destino: ${destination}\n` +
      `🚗 Conductor: ${driverName}\n` +
      `🔢 Placa: ${vehiclePlate}\n\n` +
      `🔴 *Sigue mi viaje EN VIVO:*\n` +
      `${trackingUrl}\n\n` +
      `_Enviado desde Squid App_`;
    
    return encodeURIComponent(message);
  }

  // Compartir por WhatsApp
  async shareViaWhatsApp(phoneNumber = '') {
    try {
      if (!this.shareId) {
        console.error('No hay viaje activo para compartir');
        return false;
      }

      const shareData = await AsyncStorage.getItem(`share_${this.shareId}`);
      if (!shareData) return false;

      const data = JSON.parse(shareData);
      const lastLocation = data.locations[data.locations.length - 1];
      const message = this.createWhatsAppMessage(
        this.shareId,
        data.driverName,
        data.vehiclePlate,
        data.destination,
        lastLocation.latitude,
        lastLocation.longitude
      );

      let url = `whatsapp://send?text=${message}`;
      if (phoneNumber) {
        // Formatear número para WhatsApp (código país + número)
        const formattedNumber = phoneNumber.replace(/\D/g, '');
        url = `whatsapp://send?phone=${formattedNumber}&text=${message}`;
      }

      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        return true;
      } else {
        // Si WhatsApp no está instalado, usar Share nativo
        return await this.shareGeneric();
      }
    } catch (error) {
      console.error('Error compartiendo por WhatsApp:', error);
      return false;
    }
  }

  // Compartir genérico (SMS, email, etc.)
  async shareGeneric() {
    try {
      if (!this.shareId) return false;

      const shareData = await AsyncStorage.getItem(`share_${this.shareId}`);
      if (!shareData) return false;

      const data = JSON.parse(shareData);
      
      const result = await Share.share({
        message: `🚖 Estoy en camino a ${data.destination}\n` +
                `Conductor: ${data.driverName}\n` +
                `Placa: ${data.vehiclePlate}\n\n` +
                `🔴 Sigue mi viaje EN VIVO: ${BACKEND_URL}/track/${this.shareId}`,
        title: 'Compartir mi viaje'
      });

      return result.action === Share.sharedAction;
    } catch (error) {
      console.error('Error compartiendo:', error);
      return false;
    }
  }

  // Compartir por SMS
  async shareViaSMS(phoneNumber) {
    try {
      if (!this.shareId) return false;

      const shareData = await AsyncStorage.getItem(`share_${this.shareId}`);
      if (!shareData) return false;

      const data = JSON.parse(shareData);
      const message = `Estoy en camino a ${data.destination}. ` +
                     `Sigue mi viaje EN VIVO: ${BACKEND_URL}/track/${this.shareId}`;

      const url = `sms:${phoneNumber}?body=${encodeURIComponent(message)}`;
      
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error compartiendo por SMS:', error);
      return false;
    }
  }

  // Obtener contactos de emergencia
  async getEmergencyContacts() {
    try {
      const contacts = await AsyncStorage.getItem('emergencyContacts');
      return contacts ? JSON.parse(contacts) : [];
    } catch (error) {
      console.error('Error obteniendo contactos:', error);
      return [];
    }
  }

  // Guardar contacto de emergencia
  async saveEmergencyContact(contact) {
    try {
      const contacts = await this.getEmergencyContacts();
      contacts.push({
        id: Date.now().toString(),
        name: contact.name,
        phone: contact.phone,
        relationship: contact.relationship || 'Contacto'
      });

      // Máximo 5 contactos
      if (contacts.length > 5) {
        contacts.shift();
      }

      await AsyncStorage.setItem('emergencyContacts', JSON.stringify(contacts));
      return true;
    } catch (error) {
      console.error('Error guardando contacto:', error);
      return false;
    }
  }

  // Compartir con todos los contactos de emergencia
  async shareWithEmergencyContacts() {
    try {
      const contacts = await this.getEmergencyContacts();
      if (contacts.length === 0) {
        console.log('No hay contactos de emergencia');
        return false;
      }

      for (const contact of contacts) {
        await this.shareViaWhatsApp(contact.phone);
        // Pequeña pausa entre envíos
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      return true;
    } catch (error) {
      console.error('Error compartiendo con contactos:', error);
      return false;
    }
  }

  // Obtener estado actual del compartir
  getSharingStatus() {
    return {
      isSharing: this.isSharing,
      shareId: this.shareId
    };
  }
}

export default new ShareLocationService();