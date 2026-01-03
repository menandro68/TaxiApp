/**
 * @format
 */
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// El servicio nativo MyFirebaseMessagingService.java 
// maneja los mensajes FCM en background

AppRegistry.registerComponent(appName, () => App);