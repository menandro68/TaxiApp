import { Alert } from 'react-native';
import Geolocation from '@react-native-community/geolocation';

// Ubicaciones populares de Santo Domingo Este para fallback
const POPULAR_LOCATIONS = [
  {
    id: 'megacentro',
    name: 'Megacentro',
    address: 'Av. San Vicente de PaÃºl, Santo Domingo Este',
    latitude: 18.4861,
    longitude: -69.9312,
    category: 'shopping'
  },
  {
    id: 'sambil',
    name: 'Sambil Santo Domingo',
    address: 'Av. John F. Kennedy, Santo Domingo',
    latitude: 18.4765,
    longitude: -69.8933,
    category: 'shopping'
  },
  {
    id: 'plaza_cultura',
    name: 'Plaza de la Cultura',
    address: 'Ave. MÃ¡ximo GÃ³mez, Santo Domingo',
    latitude: 18.4685,
    longitude: -69.9020,
    category: 'landmark'
  },
  {
    id: 'zona_colonial',
    name: 'Zona Colonial',
    address: 'Ciudad Colonial, Santo Domingo',
    latitude: 18.4734,
    longitude: -69.8848,
    category: 'landmark'
  },
  {
    id: 'aeropuerto',
    name: 'Aeropuerto Las AmÃ©ricas',
    address: 'Autopista Las AmÃ©ricas, Punta Caucedo',
    latitude: 18.4297,
    longitude: -69.6689,
    category: 'transport'
  },
  {
    id: 'blue_mall',
    name: 'Blue Mall',
    address: 'Ave. Winston Churchill, Santo Domingo',
    latitude: 18.4896,
    longitude: -69.9408,
    category: 'shopping'
  },
  {
    id: 'bella_vista_mall',
    name: 'Bella Vista Mall',
    address: 'Ave. Sarasota, Santo Domingo',
    latitude: 18.4543,
    longitude: -69.9454,
    category: 'shopping'
  },
  {
    id: 'hospital_plaza',
    name: 'Hospital Plaza de la Salud',
    address: 'Ave. Ortega y Gasset, Santo Domingo',
    latitude: 18.4678,
    longitude: -69.9345,
    category: 'medical'
  }
];

// UbicaciÃ³n por defecto para Santo Domingo Este
const DEFAULT_LOCATION = {
  latitude: 18.4861,
  longitude: -69.9312,
  address: 'Santo Domingo Este, RepÃºblica Dominicana',
  accuracy: 'fallback'
};

class LocationFallbackService {
  
  // âœ… VERIFICAR SI GPS ESTÃ DISPONIBLE Y HABILITADO
  static async checkGPSAvailability() {
    return new Promise((resolve) => {
      console.log('ðŸ” Verificando disponibilidad del GPS...');
      
      const timeout = setTimeout(() => {
        console.log('â° Timeout verificando GPS - usando fallback');
        resolve({
          available: false,
          reason: 'timeout',
          message: 'GPS no responde'
        });
      }, 5000); // 5 segundos de timeout
      
      Geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeout);
          console.log('âœ… GPS disponible y funcionando');
          resolve({
            available: true,
            location: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy
            }
          });
        },
        (error) => {
          clearTimeout(timeout);
          console.log('âŒ GPS no disponible:', error);
          
          let reason = 'unknown';
          let message = 'Error desconocido';
          
          switch (error.code) {
            case 1: // PERMISSION_DENIED
              reason = 'permission_denied';
              message = 'Permisos de ubicaciÃ³n denegados';
              break;
            case 2: // POSITION_UNAVAILABLE
              reason = 'position_unavailable';
              message = 'UbicaciÃ³n no disponible';
              break;
            case 3: // TIMEOUT
              reason = 'timeout';
              message = 'Tiempo de espera agotado';
              break;
            default:
              reason = 'unknown';
              message = error.message || 'Error desconocido';
          }
          
          resolve({
            available: false,
            reason,
            message,
            error
          });
        },
        {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 60000
        }
      );
    });
  }

  // âœ… OBTENER UBICACIÃ“N CON FALLBACK AUTOMÃTICO
  static async getCurrentLocationWithFallback() {
    try {
      console.log('ðŸ“ Obteniendo ubicaciÃ³n con fallback...');
      
      // Primero intentar GPS real
      const gpsCheck = await this.checkGPSAvailability();
      
      if (gpsCheck.available) {
        console.log('âœ… Usando ubicaciÃ³n GPS real');
        return {
          success: true,
          location: {
            ...gpsCheck.location,
            address: 'UbicaciÃ³n actual (GPS)',
            source: 'gps'
          }
        };
      }
      
      // Si GPS no estÃ¡ disponible, usar fallback
      console.log('âš ï¸ GPS no disponible, usando ubicaciÃ³n por defecto');
      console.log('RazÃ³n:', gpsCheck.reason, '-', gpsCheck.message);
      
      return {
        success: true,
        location: {
          ...DEFAULT_LOCATION,
          source: 'fallback',
          fallbackReason: gpsCheck.reason
        },
        warning: `No se pudo obtener tu ubicaciÃ³n exacta: ${gpsCheck.message}`
      };
      
    } catch (error) {
      console.error('âŒ Error en getCurrentLocationWithFallback:', error);
      
      return {
        success: true, // Siempre devolver success con fallback
        location: {
          ...DEFAULT_LOCATION,
          source: 'fallback',
          fallbackReason: 'error'
        },
        warning: 'Error obteniendo ubicaciÃ³n, usando ubicaciÃ³n por defecto'
      };
    }
  }

  // âœ… OBTENER LISTA DE UBICACIONES POPULARES
  static getPopularLocations() {
    return POPULAR_LOCATIONS.map(location => ({
      ...location,
      source: 'popular'
    }));
  }

  // âœ… FILTRAR UBICACIONES POR CATEGORÃA
  static getLocationsByCategory(category) {
    return POPULAR_LOCATIONS.filter(location => 
      location.category === category
    );
  }

  // âœ… BUSCAR UBICACIÃ“N POR NOMBRE
  static searchLocationByName(query) {
    const searchTerm = query.toLowerCase().trim();
    
    return POPULAR_LOCATIONS.filter(location =>
      location.name.toLowerCase().includes(searchTerm) ||
      location.address.toLowerCase().includes(searchTerm)
    );
  }

  // âœ… MOSTRAR OPCIONES DE FALLBACK AL USUARIO
  static showLocationFallbackOptions(onLocationSelected) {
    Alert.alert(
      'ðŸ“ Seleccionar ubicaciÃ³n',
      'No se pudo obtener tu ubicaciÃ³n exacta. Â¿QuÃ© te gustarÃ­a hacer?',
      [
        {
          text: 'Usar ubicaciÃ³n por defecto',
          onPress: () => {
            console.log('ðŸ‘¤ Usuario seleccionÃ³ ubicaciÃ³n por defecto');
            onLocationSelected({
              ...DEFAULT_LOCATION,
              source: 'user_selected_default'
            });
          }
        },
        {
          text: 'Elegir en el mapa',
          onPress: () => {
            console.log('ðŸ—ºï¸ Usuario quiere elegir en el mapa');
            onLocationSelected({
              action: 'choose_on_map'
            });
          }
        },
        {
          text: 'Ubicaciones populares',
          onPress: () => {
            console.log('ðŸ¢ Usuario quiere ver ubicaciones populares');
            onLocationSelected({
              action: 'show_popular_locations'
            });
          }
        },
        {
          text: 'Reintentar GPS',
          onPress: () => {
            console.log('ðŸ”„ Usuario quiere reintentar GPS');
            onLocationSelected({
              action: 'retry_gps'
            });
          }
        }
      ],
      { cancelable: false }
    );
  }

  // âœ… VALIDAR COORDENADAS
  static validateCoordinates(latitude, longitude) {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    const isValidLat = lat >= -90 && lat <= 90;
    const isValidLng = lng >= -180 && lng <= 180;
    
    // Verificar que estÃ© en RepÃºblica Dominicana (aproximadamente)
    const isInDR = lat >= 17.5 && lat <= 20.0 && lng >= -72.0 && lng <= -68.0;
    
    return {
      valid: isValidLat && isValidLng,
      inDominicanRepublic: isInDR,
      coordinates: { latitude: lat, longitude: lng }
    };
  }

  // âœ… FORMATEAR DIRECCIÃ“N PARA MOSTRAR
  static formatAddressForDisplay(location) {
    if (!location) return 'UbicaciÃ³n no disponible';
    
    if (location.address) {
      return location.address;
    }
    
    if (location.latitude && location.longitude) {
      return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
    }
    
    return 'UbicaciÃ³n desconocida';
  }

  // âœ… CALCULAR DISTANCIA ENTRE DOS PUNTOS (Haversine)
  static calculateDistance(point1, point2) {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.deg2rad(point2.latitude - point1.latitude);
    const dLon = this.deg2rad(point2.longitude - point1.longitude);
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(point1.latitude)) * Math.cos(this.deg2rad(point2.latitude)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distancia en km
    
    return distance;
  }

  static deg2rad(deg) {
    return deg * (Math.PI/180);
  }

  // âœ… ENCONTRAR UBICACIÃ“N POPULAR MÃS CERCANA
  static findNearestPopularLocation(userLocation) {
    if (!userLocation || !userLocation.latitude || !userLocation.longitude) {
      return POPULAR_LOCATIONS[0]; // Retornar la primera si no hay ubicaciÃ³n
    }
    
    let nearest = POPULAR_LOCATIONS[0];
    let minDistance = this.calculateDistance(userLocation, nearest);
    
    POPULAR_LOCATIONS.forEach(location => {
      const distance = this.calculateDistance(userLocation, location);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = location;
      }
    });
    
    return {
      ...nearest,
      distance: minDistance,
      source: 'nearest_popular'
    };
  }

  // âœ… OBTENER ESTADÃSTICAS DE USO DE FALLBACK
  static getFallbackStats() {
    // En una implementaciÃ³n real, esto podrÃ­a venir de analytics
    return {
      gpsSuccessRate: 85,
      fallbackUsageRate: 15,
      popularLocationUsage: 60,
      manualLocationUsage: 25,
      defaultLocationUsage: 15
    };
  }

  // âœ… FUNCIÃ“N PRINCIPAL PARA INTEGRAR EN LA APP
  static async getLocationForUser(options = {}) {
    const {
      showUserPrompt = true,
      timeout = 10000,
      fallbackToPopular = true
    } = options;
    
    try {
      console.log('ðŸš€ Iniciando obtenciÃ³n de ubicaciÃ³n para usuario...');
      
      // 1. Intentar obtener ubicaciÃ³n GPS
      const locationResult = await this.getCurrentLocationWithFallback();
      
      if (locationResult.success && locationResult.location.source === 'gps') {
        // GPS funcionÃ³ perfectamente
        return locationResult;
      }
      
      // 2. GPS no funcionÃ³, manejar fallback
      if (showUserPrompt) {
        return new Promise((resolve) => {
          this.showLocationFallbackOptions((selection) => {
            if (selection.action) {
              // Usuario quiere hacer algo especÃ­fico
              resolve({
                success: true,
                location: null,
                action: selection.action,
                message: 'Usuario requiere acciÃ³n adicional'
              });
            } else {
              // Usuario seleccionÃ³ una ubicaciÃ³n
              resolve({
                success: true,
                location: selection,
                message: 'UbicaciÃ³n seleccionada por el usuario'
              });
            }
          });
        });
      } else {
        // Usar fallback automÃ¡tico sin preguntar
        return locationResult;
      }
      
    } catch (error) {
      console.error('âŒ Error en getLocationForUser:', error);
      
      return {
        success: true,
        location: {
          ...DEFAULT_LOCATION,
          source: 'error_fallback'
        },
        error: error.message,
        warning: 'Error obteniendo ubicaciÃ³n, usando ubicaciÃ³n por defecto'
      };
    }
  }
}

export default LocationFallbackService;
export { POPULAR_LOCATIONS, DEFAULT_LOCATION };