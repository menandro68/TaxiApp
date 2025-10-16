import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';

class PushNotificationService {
  constructor() {
    this.configure();
  }

  async configure() {
    // Solicitar permisos para notificaciones
    await this.requestUserPermission();
    
    // Obtener token FCM
    this.getToken();
    
    // Configurar listeners
    this.configureForegroundListener();
    this.configureBackgroundListener();
  }

  async requestUserPermission() {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('✅ Notificaciones autorizadas');
    } else {
      console.log('❌ Notificaciones denegadas');
    }
    return enabled;
  }

  async getToken() {
    try {
      const token = await messaging().getToken();
      console.log('📱 FCM Token Usuario:', token);
      
      // Guardar token en AsyncStorage
      await AsyncStorage.setItem('fcm_token', token);
      
      // Aquí enviarías el token al servidor
      // await this.sendTokenToServer(token);
      
      return token;
    } catch (error) {
      console.error('❌ Error obteniendo FCM token:', error);
    }
  }

  configureForegroundListener() {
    // Listener para notificaciones cuando app está abierta
    messaging().onMessage(async remoteMessage => {
      console.log('📨 Notificación recibida (foreground):', remoteMessage);
      
      // Mostrar notificación al usuario
      if (remoteMessage.data?.type === 'trip_assigned') {
        this.handleTripAssigned(remoteMessage.data);
      }
    });
  }

  configureBackgroundListener() {
    // Listener para cuando app está en background
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      console.log('📨 Notificación recibida (background):', remoteMessage);
    });
  }

  handleTripAssigned(data) {
    // Manejar cuando se asigna un conductor
    console.log('🚗 Conductor asignado:', data);
    
    // Actualizar estado global o mostrar modal
    if (global.handleDriverAssigned) {
      global.handleDriverAssigned(data);
    }
  }

  async sendTokenToServer(token) {
    try {
      // Aquí harías el POST al backend
      console.log('📤 Enviando token al servidor:', token);
      
      // const response = await fetch('YOUR_SERVER/api/fcm-token', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ token, userType: 'user' })
      // });
      
    } catch (error) {
      console.error('❌ Error enviando token:', error);
    }
  }
}

export default new PushNotificationService();