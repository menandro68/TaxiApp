import { Platform, Alert, Linking } from 'react-native';
import { PERMISSIONS, RESULTS, check, request, openSettings } from 'react-native-permissions';
import Geolocation from '@react-native-community/geolocation';

class PermissionService {
  // Definir los permisos según la plataforma
  static getLocationPermission() {
    return Platform.select({
      android: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
      ios: PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
    });
  }

  // Verificar el estado actual del permiso
  static async checkLocationPermission() {
    try {
      const permission = this.getLocationPermission();
      const result = await check(permission);
      
      console.log('📍 Estado del permiso de ubicación:', result);
      
      return {
        granted: result === RESULTS.GRANTED,
        status: result,
        canAsk: result === RESULTS.DENIED
      };
    } catch (error) {
      console.error('❌ Error verificando permisos:', error);
      return {
        granted: false,
        status: RESULTS.UNAVAILABLE,
        canAsk: false
      };
    }
  }

  // Solicitar permiso de ubicación
  static async requestLocationPermission() {
    try {
      const permission = this.getLocationPermission();
      const checkResult = await this.checkLocationPermission();
      
      // Si ya está concedido, retornar éxito
      if (checkResult.granted) {
        console.log('✅ Permisos ya concedidos');
        return { success: true, status: 'granted' };
      }

      // Si está bloqueado permanentemente
      if (checkResult.status === RESULTS.BLOCKED) {
        return this.handleBlockedPermission();
      }

      // Solicitar el permiso
      const result = await request(permission);
      
      switch (result) {
        case RESULTS.GRANTED:
          console.log('✅ Permisos concedidos');
          return { success: true, status: 'granted' };
          
        case RESULTS.DENIED:
          console.log('⚠️ Permisos denegados');
          return { success: false, status: 'denied' };
          
        case RESULTS.BLOCKED:
          return this.handleBlockedPermission();
          
        default:
          return { success: false, status: 'unavailable' };
      }
    } catch (error) {
      console.error('❌ Error solicitando permisos:', error);
      return { success: false, status: 'error', error };
    }
  }

  // Manejar permisos bloqueados
  static handleBlockedPermission() {
    Alert.alert(
      '📍 Permisos de Ubicación Necesarios',
      'Para usar TaxiApp necesitamos acceso a tu ubicación. Por favor, habilita los permisos en la configuración de tu dispositivo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Abrir Configuración', 
          onPress: () => openSettings()
        }
      ]
    );
    return { success: false, status: 'blocked' };
  }

  // Inicializar permisos al abrir la app
  static async initializeLocationPermissions() {
    try {
      console.log('🚀 Inicializando permisos de ubicación...');
      
      // Verificar estado actual
      const checkResult = await this.checkLocationPermission();
      
      // Si no están concedidos, solicitarlos
      if (!checkResult.granted) {
        const requestResult = await this.requestLocationPermission();
        return requestResult.success;
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error inicializando permisos:', error);
      return false;
    }
  }

  // Obtener ubicación actual con manejo de permisos
  static async getCurrentLocationWithPermission() {
    try {
      // Primero verificar/solicitar permisos
      const hasPermission = await this.initializeLocationPermissions();
      
      if (!hasPermission) {
        return {
          success: false,
          error: 'No se concedieron los permisos de ubicación'
        };
      }

      // Si tenemos permisos, obtener ubicación
      return new Promise((resolve) => {
        Geolocation.getCurrentPosition(
          (position) => {
            resolve({
              success: true,
              location: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy
              }
            });
          },
          (error) => {
            console.error('❌ Error obteniendo ubicación:', error);
            resolve({
              success: false,
              error: error.message
            });
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 10000
          }
        );
      });
    } catch (error) {
      console.error('❌ Error en getCurrentLocationWithPermission:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default PermissionService;