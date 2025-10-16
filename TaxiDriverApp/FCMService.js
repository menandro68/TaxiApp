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
    
    if (data && data.type === 'trip_request') {
      // Es una solicitud de viaje
      console.log('🚗 Nueva solicitud de viaje recibida');
      this.handleTripRequest(data);
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
    
    if (data && data.type === 'trip_request') {
      console.log('🚗 Usuario tocó notificación de viaje');
      this.handleTripRequest(data);
    }
  }

  // Manejar solicitud de viaje
  handleTripRequest(data) {
    try {
      // Parsear datos del viaje
      const tripData = {
        id: data.trip_id,
        user: data.passenger_name,
        pickup: data.pickup_address,
        destination: data.destination_address,
        estimatedPrice: parseInt(data.estimated_price),
        estimatedTime: data.estimated_time
      };

      console.log('🚗 Procesando solicitud de viaje:', tripData);
      
      // Aquí puedes integrar con tu sistema existente
      // Por ejemplo, llamar a una función global que maneje la solicitud
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

      const response = await fetch('http://192.168.137.1:3000/api/drivers/fcm-token', {
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
      pickup: 'Sambil Santo Domingo',
      destination: 'Zona Colonial',
      estimatedPrice: 180,
      estimatedTime: '12 min'
    };

    console.log('🎭 Simulando solicitud de viaje:', mockTripData);
    this.handleTripRequest(mockTripData);
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
