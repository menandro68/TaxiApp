import { AppRegistry, Platform } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { name as appName } from './app.json';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee from '@notifee/react-native';

// Solicitar permiso iOS — OBLIGATORIO
async function requestIOSPermission() {
  if (Platform.OS === 'ios') {
    await notifee.requestPermission();
  }
}

// Handler background — DEBE estar en index.js raíz
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('📨 Pasajero - Mensaje background:', remoteMessage);
  await requestIOSPermission();
  const { data } = remoteMessage;

  if (data?.type === 'DRIVER_ASSIGNED') {
    await AsyncStorage.setItem('pending_driver_assignment', JSON.stringify(data));
    console.log('💾 Conductor asignado guardado');
  } else if (data?.type === 'NEW_CHAT_MESSAGE') {
    await AsyncStorage.setItem('pending_chat_message', JSON.stringify(data));
    await AsyncStorage.setItem('open_chat_now', 'true');
    console.log('💾 Mensaje chat guardado');
  }
});

// Handler notifee background
notifee.onBackgroundEvent(async ({ type, detail }) => {
  console.log('📱 Notifee background event pasajero:', type, detail);
});

AppRegistry.registerComponent(appName, () => AppNavigator);