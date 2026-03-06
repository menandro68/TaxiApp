/**
 * @format
 */
import { AppRegistry, NativeModules } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee, { AndroidImportance, AndroidVisibility } from '@notifee/react-native';
import App from './App';
import { name as appName } from './app.json';

const { BringToForeground } = NativeModules;

// Crear canal de notificación con máxima prioridad
async function createNotificationChannel() {
  await notifee.createChannel({
    id: 'trip_requests',
    name: 'Solicitudes de Viaje',
    importance: AndroidImportance.HIGH,
    visibility: AndroidVisibility.PUBLIC,
    sound: 'default',
    vibration: true,
    vibrationPattern: [300, 500, 300, 500],
    lights: true,
    lightColor: '#FF0000',
  });
}

// Mostrar notificación que despierta la pantalla
async function showWakeNotification(tripData) {
  try {
    await createNotificationChannel();
    await notifee.displayNotification({
      title: '🚕 ¡Nuevo Viaje Disponible!',
      body: `${tripData.user} - ${tripData.pickup}`,
      android: {
        channelId: 'trip_requests',
        importance: AndroidImportance.HIGH,
        pressAction: { id: 'default' },
        fullScreenAction: { id: 'default' },
        sound: 'default',
        vibrationPattern: [300, 500, 300, 500],
        lights: [true, '#FF0000', 300, 600],
        smallIcon: 'ic_notification',
        autoCancel: true,
        ongoing: false,
      },
    });
    console.log('🔔 Notificación wake mostrada');
  } catch (error) {
    console.log('❌ Error mostrando notificación:', error);
  }
}

// Mostrar notificación de llegada y traer app al frente
async function showArrivedNotification() {
  try {
    await createNotificationChannel();
    await notifee.displayNotification({
      title: '✅ Llegaste',
      body: 'Has llegado al punto de recogida del pasajero',
      android: {
        channelId: 'trip_requests',
        importance: AndroidImportance.HIGH,
        pressAction: { id: 'default' },
        fullScreenAction: { id: 'default' },
        sound: 'default',
        vibrationPattern: [300, 500],
        smallIcon: 'ic_notification',
        autoCancel: true,
        ongoing: false,
      },
    });
    console.log('✅ Notificación llegada mostrada');
    // Traer app al frente
    if (BringToForeground) {
      BringToForeground.bringToForeground();
      console.log('📱 App traída al frente');
    }
  } catch (error) {
    console.log('❌ Error en notificación llegada:', error);
  }
}

// Handler para mensajes en BACKGROUND
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('📨 Mensaje recibido en BACKGROUND:', remoteMessage);
  const { data } = remoteMessage;

  if (data?.type === 'NEW_TRIP_REQUEST') {
    console.log('🚕 Nueva solicitud en background - Guardando datos...');
    const tripData = {
      id: data.tripId,
      user: data.user || 'Usuario',
      phone: data.phone || '',
      pickup: data.pickup || 'Ubicación de recogida',
      destination: data.destination || 'Destino',
      distance: data.distance || '0',
      estimatedPrice: data.estimatedPrice || '0',
      paymentMethod: data.paymentMethod || 'Efectivo',
      vehicleType: data.vehicleType || 'Estándar',
      pickupLat: data.pickupLat || null,
      pickupLng: data.pickupLng || null,
      destinationLat: data.destinationLat || null,
      destinationLng: data.destinationLng || null,
      type: 'NEW_TRIP_REQUEST',
      timestamp: Date.now()
    };
    await AsyncStorage.setItem('pending_trip_request', JSON.stringify(tripData));
    console.log('✅ Datos del viaje guardados:', tripData.pickup);
    await showWakeNotification(tripData);
  }

  if (data?.type === 'DRIVER_ARRIVED_CONFIRMATION') {
    console.log('✅ BACKGROUND: Conductor llegó al pickup - trayendo app al frente');
    await AsyncStorage.setItem('driver_arrived_pending', JSON.stringify({
      tripId: data.tripId,
      timestamp: Date.now()
    }));
    await showArrivedNotification();
  }
});

// Handler para cuando se presiona la notificación
notifee.onBackgroundEvent(async ({ type, detail }) => {
  console.log('📱 Notifee background event:', type, detail);
});

AppRegistry.registerComponent(appName, () => App);