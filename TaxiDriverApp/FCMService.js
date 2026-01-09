import messaging from '@react-native-firebase/messaging';
import { Alert, PermissionsAndroid, Platform } from 'react-native';

class FCMService {
  constructor() {
    this.token = null;
    this.isInitialized = false;
  }

  // Inicializar FCM
  async initialize() {
    try {
      console.log('🔥 Inicializando Firebase Cloud Messaging...');
      
      // Solicitar permisos
      await this.requestPermissions();
      
      // Obtener token FCM
      await this.getFCMToken();
      
      // Configurar listeners
      this.setupListeners();
      
      this.isInitialized = true;
      console.log('✅ FCM inicializado correctamente');
      
    } catch (error) {
      console.error('❌ Error inicializando FCM:', error);
    }
  }

  // Solicitar permisos de notificación
  async requestPermissions() {
    try {
      if (Platform.OS === 'android') {
        if (Platform.Version >= 33) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );
          console.log('📱 Permisos de notificación:', granted);
        }
      } else {
        const authStatus = await messaging().requestPermission();
        console.log('📱 Estado de autorización:', authStatus);
      }
    } catch (error) {
      console.error('❌ Error solicitando permisos:', error);
    }
  }

  // Obtener token FCM
  async getFCMToken() {
    try {
      this.token = await messaging().getToken();
      console.log('🔑 Token FCM obtenido:', this.token);
      return this.token;
    } catch (error) {
      console.error('❌ Error obteniendo token FCM:', error);
      return null;
    }
  }

  // Configurar listeners de mensajes
  setupListeners() {
    // Mensaje cuando la app está en primer plano
    messaging().onMessage(async remoteMessage => {
      console.log('📨 Mensaje recibido en primer plano:', remoteMessage);
      this.handleForegroundMessage(remoteMessage);
    });

    // Mensaje cuando la app está en segundo plano pero abierta
    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('📨 Notificación abrió la app:', remoteMessage);
      this.handleNotificationTap(remoteMessage);
    });

    // Mensaje cuando la app fue abierta desde estado cerrado
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log('📨 App abierta desde notificación:', remoteMessage);
          this.handleNotificationTap(remoteMessage);
        }
      });

    // Listener para cambios de token
    messaging().onTokenRefresh(token => {
      console.log('🔄 Token FCM actualizado:', token);
      this.token = token;
    });
  }

  // Manejar mensaje en primer plano
  handleForegroundMessage(remoteMessage) {
    const { notification, data } = remoteMessage;
    
    // NUEVO: Manejar solicitud de nuevo servicio
    if (data && data.type === 'NEW_TRIP_REQUEST') {
      console.log('🚕 Nueva solicitud de servicio recibida');
      this.handleNewServiceRequest(data);
    } else if (data && data.type === 'TRIP_ASSIGNED') {
      // Viaje asignado (flujo antiguo)
      console.log('🚗 Viaje asignado recibido');
      this.handleTripAssigned(data);
    } else if (data && data.type === 'trip_request') {
      // Compatibilidad con formato anterior
      console.log('🚗 Nueva solicitud de viaje recibida (formato antiguo)');
      this.handleTripRequest(data);
    } else if (data && data.type === 'trip_cancelled') {
      // Usuario canceló el viaje
      console.log('❌ Viaje cancelado por el usuario');
      this.handleTripCancelled(data);
    } else if (notification) {
      // Mostrar alerta para otras notificaciones
      Alert.alert(
        notification.title || 'Notificación',
        notification.body || 'Nueva notificación recibida'
      );
    }
  }

  // Manejar tap en notificación
  handleNotificationTap(remoteMessage) {
    const { data } = remoteMessage;
    
    if (data && data.type === 'NEW_TRIP_REQUEST') {
      console.log('🚕 Usuario tocó notificación de nuevo servicio');
      this.handleNewServiceRequest(data);
    } else if (data && data.type === 'trip_request') {
      console.log('🚗 Usuario tocó notificación de viaje');
      this.handleTripRequest(data);
    }
  }

  // NUEVO: Manejar solicitud de nuevo servicio (sin asignar)
  handleNewServiceRequest(data) {
    try {
      const tripData = {
        id: data.tripId,
        user: data.user,
        phone: data.phone,
        pickup: data.pickup,
        destination: data.destination,
        distance: data.distance,
        estimatedPrice: parseInt(data.estimatedPrice) || 0,
        paymentMethod: data.paymentMethod || 'Efectivo',
        vehicleType: data.vehicleType || 'Estándar',
        type: 'NEW_TRIP_REQUEST',
        pickupLat: parseFloat(data.pickupLat) || null,
        pickupLng: parseFloat(data.pickupLng) || null,
        destinationLat: parseFloat(data.destinationLat) || null,
        destinationLng: parseFloat(data.destinationLng) || null,
        additionalStops: JSON.parse(data.additionalStops || '[]')
      };

      console.log('🚕 Procesando solicitud de servicio:', tripData);
      
      // Llamar al manejador global en App.js
      if (global.handleNewTripRequest) {
        global.handleNewTripRequest(tripData);
      }
      
    } catch (error) {
      console.error('❌ Error procesando solicitud de servicio:', error);
    }
  }

  // Manejar viaje asignado (notificación informativa)
  handleTripAssigned(data) {
    try {
      const tripData = {
        id: data.tripId,
        user: data.user,
        phone: data.phone,
        pickup: data.pickup,
        destination: data.destination,
        distance: data.distance,
        type: 'TRIP_ASSIGNED'
      };

      console.log('🚗 Viaje asignado:', tripData);
      
      if (global.handleNewTripRequest) {
        global.handleNewTripRequest(tripData);
      }
      
    } catch (error) {
      console.error('❌ Error procesando viaje asignado:', error);
    }
  }

  // Manejar solicitud de viaje (formato antiguo - compatibilidad)
  handleTripRequest(data) {
    try {
      const tripData = {
        id: data.trip_id || data.tripId,
        user: data.passenger_name || data.user,
        pickup: data.pickup_address || data.pickup,
        destination: data.destination_address || data.destination,
        estimatedPrice: parseInt(data.estimated_price || data.estimatedPrice) || 0,
        estimatedTime: data.estimated_time || data.estimatedTime,
        type: 'TRIP_REQUEST'
      };

      console.log('🚗 Procesando solicitud de viaje:', tripData);
      
      if (global.handleNewTripRequest) {
        global.handleNewTripRequest(tripData);
      }
      
    } catch (error) {
      console.error('❌ Error procesando solicitud de viaje:', error);
    }
  }

  // Enviar token al servidor
  async sendTokenToServer(driverId) {
    try {
      if (!this.token) {
        console.log('⚠️ No hay token FCM disponible');
        return;
      }

      console.log('📤 Enviando token al servidor:', {
        driverId,
        fcmToken: this.token
      });

      const response = await fetch('https://web-production-99844.up.railway.app/api/drivers/fcm-token', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          driverId: driverId,
          fcmToken: this.token
        })
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Token FCM registrado en el servidor');
      } else {
        console.error('❌ Error del servidor:', data.error);
      }

    } catch (error) {
      console.error('❌ Error enviando token al servidor:', error);
    }
  }

  // Aceptar viaje
  async acceptTrip(tripId, driverId) {
    try {
      console.log(`✅ Aceptando viaje ${tripId} por conductor ${driverId}`);
      
      const response = await fetch(`https://web-production-99844.up.railway.app/api/trips/accept/${tripId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          driver_id: driverId
        })
      });

      const data = await response.json();
      console.log('📋 Respuesta de aceptación:', data);
      return data;

    } catch (error) {
      console.error('❌ Error aceptando viaje:', error);
      throw error;
    }
  }

  // Rechazar viaje
  async rejectTrip(tripId, driverId) {
    try {
      console.log(`❌ Rechazando viaje ${tripId} por conductor ${driverId}`);
      
      const response = await fetch(`https://web-production-99844.up.railway.app/api/trips/reject/${tripId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          driver_id: driverId
        })
      });

      const data = await response.json();
      console.log('📋 Respuesta de rechazo:', data);
      return data;

    } catch (error) {
      console.error('❌ Error rechazando viaje:', error);
      throw error;
    }
  }

  // Manejar cancelación de viaje por el usuario
  handleTripCancelled(data) {
    console.log('❌ Procesando cancelación de viaje:', data);

    // DETENER SONIDO INMEDIATAMENTE al recibir la cancelación
    if (global.clearCurrentTrip) {
      global.clearCurrentTrip();
    }

    // Mostrar alerta al conductor
    Alert.alert(
      '❌ Viaje Cancelado',
      `El usuario ha cancelado el viaje.\n\nMotivo: ${data.reason || 'No especificado'}`,
      [
        {
          text: 'ENTENDIDO',
          onPress: () => {
            console.log('Conductor confirmó cancelación');
          }
        }
      ],
      { cancelable: false }
    );
  }

  // Simular notificación de prueba
  async testNotification() {
    Alert.alert(
      'Test de Notificación',
      `Token FCM: ${this.token ? 'Disponible' : 'No disponible'}\nFCM: ${this.isInitialized ? 'Inicializado' : 'No inicializado'}`,
      [
        {
          text: 'Simular Viaje',
          onPress: () => this.simulateTripRequest()
        },
        { text: 'OK' }
      ]
    );
  }

  // Simular solicitud de viaje para pruebas
  simulateTripRequest() {
    const mockTripData = {
      id: 'test_' + Date.now(),
      user: 'Usuario de Prueba',
      phone: '+1-809-555-0199',
      pickup: 'Sambil Santo Domingo',
      destination: 'Zona Colonial',
      distance: '5.2',
      estimatedPrice: 180,
      paymentMethod: 'Efectivo',
      vehicleType: 'Estándar',
      type: 'NEW_TRIP_REQUEST'
    };

    console.log('🎭 Simulando solicitud de servicio:', mockTripData);
    
    if (global.handleNewTripRequest) {
      global.handleNewTripRequest(mockTripData);
    }
  }

  // Obtener estado del servicio
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      hasToken: !!this.token,
      token: this.token
    };
  }
}

// Exportar instancia singleton
const fcmService = new FCMService();
export default fcmService;