/**
 * @format
 */
import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import App from './App';
import { name as appName } from './app.json';

// Handler para mensajes en BACKGROUND
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('📨 Mensaje recibido en BACKGROUND:', remoteMessage);
  
  const { data } = remoteMessage;
  
  if (data?.type === 'NEW_TRIP_REQUEST') {
    console.log('🚕 Nueva solicitud en background - Guardando datos...');
    
    // Guardar datos del viaje para cuando la app se abra
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
  }
});

AppRegistry.registerComponent(appName, () => App);