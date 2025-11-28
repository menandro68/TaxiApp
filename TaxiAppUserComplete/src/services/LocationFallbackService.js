import { Alert } from 'react-native';
import PermissionService from './PermissionService';
import Geolocation from '@react-native-community/geolocation';

// Ubicaciones populares de Santo Domingo Este para fallback
const POPULAR_LOCATIONS = [
  {
    id: 'megacentro',
    name: 'Megacentro',
    address: 'Av. San Vicente de Paúl, Santo Domingo Este',
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
    address: 'Ave. Máximo Gómez, Santo Domingo',
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
    name: 'Aeropuerto Las Américas',
    address: 'Autopista Las Américas, Punta Caucedo',
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

// Ubicación por defecto para Santo Domingo Este
const DEFAULT_LOCATION = {
  latitude: 18.4861,
  longitude: -69.9312,
  address: 'Santo Domingo Este, República Dominicana',
  accuracy: 'fallback'
};

class LocationFallbackService {
  
  // ✅ VERIFICAR SI GPS ESTÁ DISPONIBLE Y HABILITADO
  static async checkGPSAvailability() {
    return new Promise(async (resolve) => {
      console.log('📍 Verificando disponibilidad del GPS...');

      // Primero verificar y solicitar permisos
      const permissionResult = await PermissionService.requestLocationPermission();

      if (!permissionResult.success) {
        resolve({
          available: false,
          reason: 'permission_denied',
          message: 'Permisos de ubicación no concedidos',
          location: null
        });
        return;
      }

      // Intentar obtener ubicación con reintentos
      let attempts = 0;
      const maxAttempts = 3;
      
      const tryGetLocation = (useHighAccuracy, timeout, maxAge) => {
        attempts++;
        console.log(`📍 Intento ${attempts}/${maxAttempts} - HighAccuracy: ${useHighAccuracy}, Timeout: ${timeout}ms, MaxAge: ${maxAge}ms`);
        
        Geolocation.getCurrentPosition(
          (position) => {
            console.log('✅ GPS disponible y funcionando');
            resolve({
              available: true,
              reason: 'success',
              message: 'GPS disponible',
              location: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy
              }
            });
          },
          (error) => {
            console.log(`❌ Intento ${attempts} falló:`, error.message);
            
            // Si aún tenemos intentos, probar con diferentes configuraciones
            if (attempts < maxAttempts) {
              if (attempts === 1) {
                // Segundo intento: usar ubicación en caché (últimos 60 segundos)
                console.log('🔄 Reintentando con ubicación en caché...');
                tryGetLocation(true, 3000, 60000);
              } else if (attempts === 2) {
                // Tercer intento: baja precisión, caché más antigua
                console.log('🔄 Reintentando con baja precisión...');
                tryGetLocation(false, 2000, 300000);
              }
            } else {
              // Todos los intentos fallaron
              let reason = 'unknown_error';
              let message = 'Error desconocido';

              switch (error.code) {
                case 1:
                  reason = 'permission_denied';
                  message = 'Permisos de ubicación denegados';
                  break;
                case 2:
                  reason = 'position_unavailable';
                  message = 'Ubicación no disponible';
                  break;
                case 3:
                  reason = 'timeout';
                  message = 'Tiempo de espera agotado';
                  break;
              }

              resolve({
                available: false,
                reason,
                message,
                location: null
              });
            }
          },
          {
            enableHighAccuracy: useHighAccuracy,
            timeout: timeout,
            maximumAge: maxAge,
            distanceFilter: 0
          }
        );
      };
      
      // Primer intento: alta precisión, caché de 10 segundos
      tryGetLocation(true, 5000, 10000);
    });
  }

  // ✅ OBTENER UBICACIÓN CON FALLBACK AUTOMÁTICO
  static async getCurrentLocationWithFallback() {
    try {
      console.log('🔍 Obteniendo ubicación con fallback...');
      
      // Primero intentar GPS real
      const gpsCheck = await this.checkGPSAvailability();
      
      if (gpsCheck.available) {
        console.log('✅ Usando ubicación GPS real');
        return {
          success: true,
          location: {
            ...gpsCheck.location,
            address: await this.getReverseGeocode(gpsCheck.location.latitude, gpsCheck.location.longitude),
            source: 'gps'
          }
        };
      }
      
      // Si GPS no está disponible, usar fallback
      console.log('⚠️ GPS no disponible, usando ubicación por defecto');
      console.log('Razón:', gpsCheck.reason, '-', gpsCheck.message);
      
      return {
        success: true,
        location: {
          ...DEFAULT_LOCATION,
          source: 'fallback',
          fallbackReason: gpsCheck.reason
        },
        warning: `No se pudo obtener tu ubicación exacta: ${gpsCheck.message}`
      };
      
    } catch (error) {
      console.error('❌ Error en getCurrentLocationWithFallback:', error);
      
      return {
        success: true, // Siempre devolver success con fallback
        location: {
          ...DEFAULT_LOCATION,
          source: 'fallback',
          fallbackReason: 'error'
        },
        warning: 'Error obteniendo ubicación, usando ubicación por defecto'
      };
    }
  }

  // ✅ OBTENER LISTA DE UBICACIONES POPULARES
  static getPopularLocations() {
    return POPULAR_LOCATIONS.map(location => ({
      ...location,
      source: 'popular'
    }));
  }

  // ✅ FILTRAR UBICACIONES POR CATEGORÍA
  static getLocationsByCategory(category) {
    return POPULAR_LOCATIONS.filter(location => 
      location.category === category
    );
  }

  // ✅ BUSCAR UBICACIÓN POR NOMBRE
  static searchLocationByName(query) {
    const searchTerm = query.toLowerCase().trim();
    
    return POPULAR_LOCATIONS.filter(location =>
      location.name.toLowerCase().includes(searchTerm) ||
      location.address.toLowerCase().includes(searchTerm)
    );
  }

  // ✅ MOSTRAR OPCIONES DE FALLBACK AL USUARIO
  static showLocationFallbackOptions(onLocationSelected) {
    Alert.alert(
      '🔍 Seleccionar ubicación',
      'No se pudo obtener tu ubicación exacta. ¿Qué te gustaría hacer?',
      [
        {
          text: 'Usar ubicación por defecto',
          onPress: () => {
            console.log('👤 Usuario seleccionó ubicación por defecto');
            onLocationSelected({
              ...DEFAULT_LOCATION,
              source: 'user_selected_default'
            });
          }
        },
        {
          text: 'Elegir en el mapa',
          onPress: () => {
            console.log('🗺️ Usuario quiere elegir en el mapa');
            onLocationSelected({
              action: 'choose_on_map'
            });
          }
        },
        {
          text: 'Ubicaciones populares',
          onPress: () => {
            console.log('🏢 Usuario quiere ver ubicaciones populares');
            onLocationSelected({
              action: 'show_popular_locations'
            });
          }
        },
        {
          text: 'Reintentar GPS',
          onPress: () => {
            console.log('🔄 Usuario quiere reintentar GPS');
            onLocationSelected({
              action: 'retry_gps'
            });
          }
        }
      ],
      { cancelable: false }
    );
  }

  // ✅ VALIDAR COORDENADAS
  static validateCoordinates(latitude, longitude) {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    const isValidLat = lat >= -90 && lat <= 90;
    const isValidLng = lng >= -180 && lng <= 180;
    
    // Verificar que esté en República Dominicana (aproximadamente)
    const isInDR = lat >= 17.5 && lat <= 20.0 && lng >= -72.0 && lng <= -68.0;
    
    return {
      valid: isValidLat && isValidLng,
      inDominicanRepublic: isInDR,
      coordinates: { latitude: lat, longitude: lng }
    };
  }

  // ✅ FORMATEAR DIRECCIÓN PARA MOSTRAR
  static formatAddressForDisplay(location) {
    if (!location) return 'Ubicación no disponible';
    
    if (location.address) {
      return location.address;
    }
    
    if (location.latitude && location.longitude) {
      return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
    }
    
    return 'Ubicación desconocida';
  }

  // ✅ CALCULAR DISTANCIA ENTRE DOS PUNTOS (Haversine)
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

  // ✅ ENCONTRAR UBICACIÓN POPULAR MÁS CERCANA
  static findNearestPopularLocation(userLocation) {
    if (!userLocation || !userLocation.latitude || !userLocation.longitude) {
      return POPULAR_LOCATIONS[0]; // Retornar la primera si no hay ubicación
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

  // ✅ OBTENER ESTADÍSTICAS DE USO DE FALLBACK
  static getFallbackStats() {
    // En una implementación real, esto podría venir de analytics
    return {
      gpsSuccessRate: 85,
      fallbackUsageRate: 15,
      popularLocationUsage: 60,
      manualLocationUsage: 25,
      defaultLocationUsage: 15
    };
  }

  // ✅ FUNCIÓN PRINCIPAL PARA INTEGRAR EN LA APP
  static async getLocationForUser(options = {}) {
    const {
      showUserPrompt = true,
      timeout = 10000,
      fallbackToPopular = true
    } = options;
    
    try {
      console.log('🚀 Iniciando obtención de ubicación para usuario...');
      
      // 1. Intentar obtener ubicación GPS
      const locationResult = await this.getCurrentLocationWithFallback();
      
      if (locationResult.success && locationResult.location.source === 'gps') {
        // GPS funcionó perfectamente
        return locationResult;
      }
      
      // 2. GPS no funcionó, manejar fallback
      if (showUserPrompt) {
        return new Promise((resolve) => {
          this.showLocationFallbackOptions((selection) => {
            if (selection.action) {
              // Usuario quiere hacer algo específico
              resolve({
                success: true,
                location: null,
                action: selection.action,
                message: 'Usuario requiere acción adicional'
              });
            } else {
              // Usuario seleccionó una ubicación
              resolve({
                success: true,
                location: selection,
                message: 'Ubicación seleccionada por el usuario'
              });
            }
          });
        });
      } else {
        // Usar fallback automático sin preguntar
        return locationResult;
      }
      
    } catch (error) {
      console.error('❌ Error en getLocationForUser:', error);
      
      return {
        success: true,
        location: {
          ...DEFAULT_LOCATION,
          source: 'error_fallback'
        },
        error: error.message,
        warning: 'Error obteniendo ubicación, usando ubicación por defecto'
      };
    }
  }

  // ✅ REVERSE GEOCODING - Convertir coordenadas a dirección
  static async getReverseGeocode(latitude, longitude) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      
      if (data.address) {
        const address = data.address;
        const street = address.road || address.pedestrian || '';
        const number = address.house_number || '';
        const neighborhood = address.neighbourhood || address.suburb || '';
        const city = address.city || address.town || 'Santo Domingo';
        
        const fullAddress = [
          street && number ? `${street} ${number}` : street,
          neighborhood,
          city
        ].filter(Boolean).join(', ');
        
        return fullAddress || 'Ubicación desconocida';
      }
      return 'Ubicación desconocida';
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return 'Ubicación desconocida';
    }
  }
}

export default LocationFallbackService;
export { POPULAR_LOCATIONS, DEFAULT_LOCATION };