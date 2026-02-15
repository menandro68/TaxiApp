import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import SecureStorage from './SecureStorage';

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
      
      // Intentar obtener userId desde SecureStorage y enviar token al servidor
      const userProfile = await SecureStorage.getUserProfile();
      if (userProfile && userProfile.id) {
        console.log('👤 Usuario encontrado:', userProfile.id, userProfile.name);
        await this.sendTokenToServer(token, userProfile.id);
      } else {
        console.log('⚠️ No hay usuario logueado, token no enviado al servidor');
      }
      
      return token;
    } catch (error) {
      console.error('❌ Error obteniendo FCM token:', error);
    }
  }

  configureForegroundListener() {
    // Listener para notificaciones cuando app está abierta
    messaging().onMessage(async remoteMessage => {
      console.log('📨 Notificación recibida (foreground):', JSON.stringify(remoteMessage, null, 2));
      
      const { data, notification } = remoteMessage;
      
      // Manejar según el tipo de notificación
    if (data?.type === 'DRIVER_ASSIGNED') {
        console.log('🚗 Procesando DRIVER_ASSIGNED...');
        if (notification?.title?.includes('en camino') && !notification?.title?.includes('Asignado')) {
            data.driverIsFinishing = 'true';
        }
        this.handleDriverAssigned(data);
      } else if (data?.type === 'trip_assigned') {
        // Compatibilidad con formato antiguo
        console.log('🚗 Procesando trip_assigned (legacy)...');
        this.handleDriverAssigned(data);
   } else if (data?.type === 'DRIVER_ARRIVED') {
        // No mostrar Alert - el usuario ya ve el conductor en el mapa
        console.log('📍 Conductor llegó al punto de recogida');
      } else if (data?.type === 'DRIVER_CANCELLED_REASSIGNING') {
        console.log('🔄 Conductor canceló, buscando nuevo...');
        this.isReassignment = true;
        if (global.handleDriverCancelledReassigning) {
          global.handleDriverCancelledReassigning(data);
        }
      } else {
        // Mostrar notificación genérica
        if (notification?.title) {
          Alert.alert(notification.title, notification.body || '');
        }
      }
    });
  }

  configureBackgroundListener() {
    // Listener para cuando app está en background
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      console.log('📨 Notificación recibida (background):', JSON.stringify(remoteMessage, null, 2));
      
      const { data } = remoteMessage;
      
      if (data?.type === 'DRIVER_ASSIGNED') {
        // Guardar datos para procesarlos cuando la app vuelva al foreground
        await AsyncStorage.setItem('pending_driver_assignment', JSON.stringify(data));
        console.log('💾 Datos de conductor guardados para procesar después');
      }
    });
  }

  handleDriverAssigned(data) {
    console.log('🚗 Conductor asignado - Data recibida:', data);
    
    // Mapear campos del backend al formato esperado por la app
    const driverData = {
      driverId: data.driverId || data.driver_id || 'unknown',
      driverName: data.driverName || data.driver_name || 'Conductor',
      driverPhone: data.driverPhone || data.driver_phone || '',
      driverCar: data.vehicleModel ? `${data.vehicleModel} - ${data.vehiclePlate}` : 'Vehículo',
      vehicleModel: data.vehicleModel || data.vehicle_model || '',
      vehiclePlate: data.vehiclePlate || data.vehicle_plate || '',
      driverRating: data.driverRating || data.driver_rating || '4.5',
      tripId: data.tripId || data.trip_id || '',
      eta: data.eta || '5 min',
      driverLat: data.driverLat || data.driver_lat || null,
      driverLng: data.driverLng || data.driver_lng || null,
      driverIsFinishing: data.driverIsFinishing || 'false',
    };
    
    console.log('🚗 Datos del conductor formateados:', driverData);
    
    // Llamar al handler global si existe
    if (global.handleDriverAssigned) {
      console.log('✅ Llamando global.handleDriverAssigned...');
      global.handleDriverAssigned(driverData);
    } else {
      console.warn('⚠️ global.handleDriverAssigned no está definido');
      // Mostrar alerta como fallback
      Alert.alert(
        '🚗 Conductor Asignado',
        `${driverData.driverName} viene en camino\n${driverData.driverCar}`,
        [{ text: 'OK' }]
      );
    }
  }

  // Verificar si hay asignación pendiente (para cuando la app vuelve del background)
  async checkPendingAssignment() {
    try {
      const pendingData = await AsyncStorage.getItem('pending_driver_assignment');
      if (pendingData) {
        console.log('📋 Procesando asignación pendiente...');
        const data = JSON.parse(pendingData);
        this.handleDriverAssigned(data);
        await AsyncStorage.removeItem('pending_driver_assignment');
      }
    } catch (error) {
      console.error('❌ Error verificando asignación pendiente:', error);
    }
  }

  async sendTokenToServer(token, userId) {
    try {
      console.log('📤 Enviando token al servidor para usuario:', userId);
      
      const response = await fetch('https://web-production-99844.up.railway.app/api/users/fcm-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token, 
          userId,
          userType: 'user' 
        })
      });
      
      const result = await response.json();
      console.log('✅ Token registrado en servidor:', result);
      return result;
      
    } catch (error) {
      console.error('❌ Error enviando token:', error);
    }
  }
}

export default new PushNotificationService();