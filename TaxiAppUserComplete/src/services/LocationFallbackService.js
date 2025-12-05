import { Alert } from 'react-native';
import PermissionService from './PermissionService';
import Geolocation from '@react-native-community/geolocation';

// ====================================================================
// SISTEMA DE CACHÉ DE DIRECCIONES - Para consistencia y rendimiento
// ====================================================================
const AddressCache = {
  // Almacén de caché
  _cache: {
    lastLocation: null,      // Última ubicación válida
    lastAddress: null,       // Última dirección obtenida
    lastTimestamp: null,     // Timestamp de la última actualización
    lastRoundedCoords: null  // Coordenadas redondeadas
  },

  // Configuración
  CONFIG: {
    CACHE_DURATION_MS: 5 * 60 * 1000,  // 5 minutos de validez
    MIN_DISTANCE_FOR_UPDATE: 50,        // 50 metros mínimo para actualizar
    COORDINATE_PRECISION: 4             // 4 decimales (~11 metros)
  },

  // Redondear coordenadas para consistencia
  roundCoordinates(latitude, longitude) {
    const precision = this.CONFIG.COORDINATE_PRECISION;
    const factor = Math.pow(10, precision);
    return {
      latitude: Math.round(latitude * factor) / factor,
      longitude: Math.round(longitude * factor) / factor
    };
  },

  // Calcular distancia entre dos puntos (Haversine simplificado)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Radio de la Tierra en metros
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distancia en metros
  },

  // Verificar si el caché es válido
  isValid(newLat, newLng) {
    if (!this._cache.lastLocation || !this._cache.lastAddress || !this._cache.lastTimestamp) {
      console.log('📍 Caché: No hay caché previo');
      return false;
    }

    // Verificar tiempo
    const now = Date.now();
    const age = now - this._cache.lastTimestamp;
    if (age > this.CONFIG.CACHE_DURATION_MS) {
      console.log('📍 Caché: Expirado (', Math.round(age/1000), 's)');
      return false;
    }

    // Verificar distancia
    const distance = this.calculateDistance(
      this._cache.lastLocation.latitude,
      this._cache.lastLocation.longitude,
      newLat,
      newLng
    );

    if (distance > this.CONFIG.MIN_DISTANCE_FOR_UPDATE) {
      console.log('📍 Caché: Movimiento detectado (', Math.round(distance), 'm)');
      return false;
    }

    console.log('📍 Caché: Válido (dist:', Math.round(distance), 'm, edad:', Math.round(age/1000), 's)');
    return true;
  },

  // Obtener dirección del caché
  get() {
    return this._cache.lastAddress;
  },

  // Guardar en caché
  set(latitude, longitude, address) {
    this._cache.lastLocation = { latitude, longitude };
    this._cache.lastAddress = address;
    this._cache.lastTimestamp = Date.now();
    this._cache.lastRoundedCoords = this.roundCoordinates(latitude, longitude);
    console.log('📍 Caché: Guardado -', address.substring(0, 40) + '...');
  },

  // Limpiar caché
  clear() {
    this._cache = {
      lastLocation: null,
      lastAddress: null,
      lastTimestamp: null,
      lastRoundedCoords: null
    };
    console.log('📍 Caché: Limpiado');
  }
};

// Ubicaciones populares de Santo Domingo Este para fallback
const POPULAR_LOCATIONS = [
  {
    id: 'megacentro',
    name: 'Megacentro',
    address: 'Av. San Vicente de Paul, Santo Domingo Este',
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
    address: 'Ave. Maximo Gomez, Santo Domingo',
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
    name: 'Aeropuerto Las Americas',
    address: 'Autopista Las Americas, Punta Caucedo',
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

// Ubicacion por defecto para Santo Domingo Este
const DEFAULT_LOCATION = {
  latitude: 18.4861,
  longitude: -69.9312,
  address: 'Santo Domingo Este, Republica Dominicana',
  accuracy: 'fallback'
};

class LocationFallbackService {

  // VERIFICAR SI GPS ESTA DISPONIBLE Y HABILITADO
  static async checkGPSAvailability() {
    return new Promise(async (resolve) => {
      console.log('Verificando disponibilidad del GPS...');

      // Primero verificar y solicitar permisos
      const permissionResult = await PermissionService.requestLocationPermission();

      if (!permissionResult.success) {
        resolve({
          available: false,
          reason: 'permission_denied',
          message: 'Permisos de ubicacion no concedidos',
          location: null
        });
        return;
      }

      // Obtener ubicacion fresca
      console.log('Obteniendo ubicacion GPS...');

      Geolocation.getCurrentPosition(
        (position) => {
          // Validar precision minima (50 metros)
          if (position.coords.accuracy > 50) {
            console.log('GPS con baja precision:', position.coords.accuracy, 'm - reintentando...');
            resolve({
              available: false,
              reason: 'low_accuracy',
              message: `Precision insuficiente: ${Math.round(position.coords.accuracy)}m`,
              location: null
            });
            return;
          }

          console.log('GPS disponible y funcionando - Precision:', position.coords.accuracy, 'm');
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
          console.log('GPS fallo:', error.message);

          let reason = 'unknown_error';
          let message = 'Error desconocido';

          switch (error.code) {
            case 1:
              reason = 'permission_denied';
              message = 'Permisos de ubicacion denegados';
              break;
            case 2:
              reason = 'position_unavailable';
              message = 'Ubicacion no disponible';
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
        },
        {
          enableHighAccuracy: true,   // Alta precision GPS
          timeout: 10000,             // 10 segundos por intento (3 intentos = 30s max)
          maximumAge: 0,              // SIN CACHE - siempre ubicacion fresca
          distanceFilter: 0
        }
      );
    });
  }

  // OBTENER UBICACION CON FALLBACK AUTOMATICO
  static async getCurrentLocationWithFallback() {
    try {
      console.log('Obteniendo ubicacion con fallback...');
      
      // Reintentar GPS hasta 3 veces si hay baja precision
      const MAX_RETRIES = 3;
      let lastGpsCheck = null;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        console.log('Intento GPS ' + attempt + '/' + MAX_RETRIES + '...');

        const gpsCheck = await this.checkGPSAvailability();
        lastGpsCheck = gpsCheck;

        if (gpsCheck.available) {
          console.log('Usando ubicacion GPS real');
          
          // ====== SISTEMA ROBUSTO DE DIRECCIONES ======
          const { latitude, longitude } = gpsCheck.location;
          
          // Paso 1: Redondear coordenadas para consistencia
          const rounded = AddressCache.roundCoordinates(latitude, longitude);
          console.log('📍 Coordenadas originales:', latitude.toFixed(6), longitude.toFixed(6));
          console.log('📍 Coordenadas redondeadas:', rounded.latitude, rounded.longitude);
          
          // Paso 2: Verificar si tenemos caché válido
          let address;
          if (AddressCache.isValid(latitude, longitude)) {
            // Usar dirección cacheada
            address = AddressCache.get();
            console.log('📍 Usando dirección cacheada');
          } else {
            // Obtener nueva dirección con coordenadas redondeadas
            address = await this.getReverseGeocodeOptimized(rounded.latitude, rounded.longitude);
            // Guardar en caché
            AddressCache.set(latitude, longitude, address);
          }
          
          return {
            success: true,
            location: {
              ...gpsCheck.location,
              address: address,
              source: 'gps'
            }
          };
        }

        // Si es baja precision o timeout y no es el ultimo intento, reintentar
        if ((gpsCheck.reason === 'low_accuracy' || gpsCheck.reason === 'timeout') && attempt < MAX_RETRIES) {
          console.log('Esperando 2s antes de reintentar...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
        
        // Si es error de permisos, no reintentar
        if (gpsCheck.reason === 'permission_denied') {
          break;
        }
      }

      // Despues de reintentos, usar fallback
      console.log('GPS no disponible despues de reintentos, usando fallback');
      console.log('Razon:', lastGpsCheck.reason, '-', lastGpsCheck.message);
      
      // Obtener direccion real de las coordenadas por defecto
      const fallbackAddress = await this.getReverseGeocodeOptimized(DEFAULT_LOCATION.latitude, DEFAULT_LOCATION.longitude);

      return {
        success: true,
        location: {
          latitude: DEFAULT_LOCATION.latitude,
          longitude: DEFAULT_LOCATION.longitude,
          address: fallbackAddress,
          source: 'fallback',
          fallbackReason: lastGpsCheck.reason
        },
        warning: `No se pudo obtener tu ubicacion exacta: ${lastGpsCheck.message}`
      };

    } catch (error) {
      console.error('Error en getCurrentLocationWithFallback:', error);

      // Ultimo recurso con geocoding
      const emergencyAddress = await this.getReverseGeocodeOptimized(DEFAULT_LOCATION.latitude, DEFAULT_LOCATION.longitude);

      return {
        success: true,
        location: {
          latitude: DEFAULT_LOCATION.latitude,
          longitude: DEFAULT_LOCATION.longitude,
          address: emergencyAddress,
          source: 'fallback',
          fallbackReason: 'error'
        },
        warning: 'Error obteniendo ubicacion, usando ubicacion por defecto'
      };
    }
  }

  // OBTENER LISTA DE UBICACIONES POPULARES
  static getPopularLocations() {
    return POPULAR_LOCATIONS.map(location => ({
      ...location,
      source: 'popular'
    }));
  }

  // FILTRAR UBICACIONES POR CATEGORIA
  static getLocationsByCategory(category) {
    return POPULAR_LOCATIONS.filter(location =>
      location.category === category
    );
  }

  // BUSCAR UBICACION POR NOMBRE
  static searchLocationByName(query) {
    const searchTerm = query.toLowerCase().trim();

    return POPULAR_LOCATIONS.filter(location =>
      location.name.toLowerCase().includes(searchTerm) ||
      location.address.toLowerCase().includes(searchTerm)
    );
  }

  // MOSTRAR OPCIONES DE FALLBACK AL USUARIO
  static showLocationFallbackOptions(onLocationSelected) {
    Alert.alert(
      'Seleccionar ubicacion',
      'No se pudo obtener tu ubicacion exacta. Que te gustaria hacer?',
      [
        {
          text: 'Usar ubicacion por defecto',
          onPress: () => {
            console.log('Usuario selecciono ubicacion por defecto');
            onLocationSelected({
              ...DEFAULT_LOCATION,
              source: 'user_selected_default'
            });
          }
        },
        {
          text: 'Elegir en el mapa',
          onPress: () => {
            console.log('Usuario quiere elegir en el mapa');
            onLocationSelected({
              action: 'choose_on_map'
            });
          }
        },
        {
          text: 'Ubicaciones populares',
          onPress: () => {
            console.log('Usuario quiere ver ubicaciones populares');
            onLocationSelected({
              action: 'show_popular_locations'
            });
          }
        },
        {
          text: 'Reintentar GPS',
          onPress: () => {
            console.log('Usuario quiere reintentar GPS');
            onLocationSelected({
              action: 'retry_gps'
            });
          }
        }
      ],
      { cancelable: false }
    );
  }

  // VALIDAR COORDENADAS
  static validateCoordinates(latitude, longitude) {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    const isValidLat = lat >= -90 && lat <= 90;
    const isValidLng = lng >= -180 && lng <= 180;
    
    // Verificar que este en Republica Dominicana (aproximadamente)
    const isInDR = lat >= 17.5 && lat <= 20.0 && lng >= -72.0 && lng <= -68.0;

    return {
      valid: isValidLat && isValidLng,
      inDominicanRepublic: isInDR,
      coordinates: { latitude: lat, longitude: lng }
    };
  }

  // FORMATEAR DIRECCION PARA MOSTRAR
  static formatAddressForDisplay(location) {
    if (!location) return 'Ubicacion no disponible';

    if (location.address) {
      return location.address;
    }

    if (location.latitude && location.longitude) {
      return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
    }

    return 'Ubicacion desconocida';
  }

  // CALCULAR DISTANCIA ENTRE DOS PUNTOS (Haversine)
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

  // ENCONTRAR UBICACION POPULAR MAS CERCANA
  static findNearestPopularLocation(userLocation) {
    if (!userLocation || !userLocation.latitude || !userLocation.longitude) {
      return POPULAR_LOCATIONS[0]; // Retornar la primera si no hay ubicacion
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

  // OBTENER ESTADISTICAS DE USO DE FALLBACK
  static getFallbackStats() {
    // En una implementacion real, esto podria venir de analytics
    return {
      gpsSuccessRate: 85,
      fallbackUsageRate: 15,
      popularLocationUsage: 60,
      manualLocationUsage: 25,
      defaultLocationUsage: 15
    };
  }

  // FUNCION PRINCIPAL PARA INTEGRAR EN LA APP
  static async getLocationForUser(options = {}) {
    const {
      showUserPrompt = true,
      timeout = 10000,
      fallbackToPopular = true
    } = options;

    try {
      console.log('Iniciando obtencion de ubicacion para usuario...');

      // 1. Intentar obtener ubicacion GPS
      const locationResult = await this.getCurrentLocationWithFallback();
      
      if (locationResult.success && locationResult.location.source === 'gps') {
        // GPS funciono perfectamente
        return locationResult;
      }

      // 2. GPS no funciono, manejar fallback
      if (showUserPrompt) {
        return new Promise((resolve) => {
          this.showLocationFallbackOptions((selection) => {
            if (selection.action) {
              // Usuario quiere hacer algo especifico
              resolve({
                success: true,
                location: null,
                action: selection.action,
                message: 'Usuario requiere accion adicional'
              });
            } else {
              // Usuario selecciono una ubicacion
              resolve({
                success: true,
                location: selection,
                message: 'Ubicacion seleccionada por el usuario'
              });
            }
          });
        });
      } else {
        // Usar fallback automatico sin preguntar
        return locationResult;
      }

    } catch (error) {
      console.error('Error en getLocationForUser:', error);

      // Usar geocoding incluso en error
      const errorAddress = await this.getReverseGeocodeOptimized(DEFAULT_LOCATION.latitude, DEFAULT_LOCATION.longitude);

      return {
        success: true,
        location: {
          latitude: DEFAULT_LOCATION.latitude,
          longitude: DEFAULT_LOCATION.longitude,
          address: errorAddress,
          source: 'error_fallback'
        },
        error: error.message,
        warning: 'Error obteniendo ubicacion, usando ubicacion por defecto'
      };
    }
  }

  // ====================================================================
  // REVERSE GEOCODING OPTIMIZADO - Mapbox con parámetros específicos
  // ====================================================================
  static async getReverseGeocodeOptimized(latitude, longitude) {
    try {
      // Construir URL con parámetros optimizados para direcciones específicas
      const params = new URLSearchParams({
        access_token: 'pk.eyJ1IjoibWVuYW5kcm82OCIsImEiOiJjbWlmY2hiMHcwY29sM2VuNGk2dnlzMzliIn0.PqOOzFKFJA7Q5jPbGwOG8Q',
        language: 'es',
        types: 'address,poi',           // Priorizar direcciones y puntos de interés
        limit: 1,                        // Solo necesitamos el mejor resultado
        country: 'DO'                    // Limitar a República Dominicana
      });

      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?${params}`;
      
      console.log('📍 Consultando Mapbox para:', latitude.toFixed(4), longitude.toFixed(4));
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        let address = feature.place_name;

        // Extraer componentes de la dirección para formato más limpio
        const context = feature.context || [];
        const streetName = feature.text || '';
        const streetNumber = feature.address || '';
        
        // Buscar localidad/barrio en el contexto
        let locality = '';
        let region = '';
        
        context.forEach(item => {
          if (item.id.startsWith('locality') || item.id.startsWith('neighborhood')) {
            locality = item.text;
          }
          if (item.id.startsWith('place')) {
            region = item.text;
          }
        });

        // Construir dirección optimizada
        if (streetName) {
          let optimizedAddress = streetName;
          if (streetNumber) {
            optimizedAddress = `${streetName} ${streetNumber}`;
          }
          if (locality) {
            optimizedAddress += `, ${locality}`;
          }
          if (region && region !== locality) {
            optimizedAddress += `, ${region}`;
          }
          
          // Agregar país si no está muy largo
          if (optimizedAddress.length < 50) {
            optimizedAddress += ', República Dominicana';
          }
          
          address = optimizedAddress;
        } else {
          // Limpiar dirección por defecto si es muy larga
          if (address.length > 60) {
            address = address
              .replace(', Republica Dominicana', '')
              .replace(', Dominican Republic', '')
              .replace(', República Dominicana', '');
          }
        }

        console.log('📍 Dirección obtenida:', address);
        return address;
      }
      
      console.log('📍 Sin resultados de Mapbox');
      return 'Ubicacion desconocida';
      
    } catch (error) {
      console.error('Error reverse geocoding optimizado:', error);
      return 'Ubicacion desconocida';
    }
  }

  // Mantener función anterior para compatibilidad
  static async getReverseGeocode(latitude, longitude) {
    return this.getReverseGeocodeOptimized(latitude, longitude);
  }

  // ====================================================================
  // UTILIDADES DE CACHÉ - Para uso externo si es necesario
  // ====================================================================
  
  // Limpiar caché de direcciones (útil al cerrar sesión o cambiar de zona)
  static clearAddressCache() {
    AddressCache.clear();
  }

  // Obtener estado del caché (para debugging)
  static getAddressCacheStatus() {
    return {
      hasCache: AddressCache._cache.lastAddress !== null,
      lastAddress: AddressCache._cache.lastAddress,
      lastLocation: AddressCache._cache.lastLocation,
      cacheAge: AddressCache._cache.lastTimestamp 
        ? Math.round((Date.now() - AddressCache._cache.lastTimestamp) / 1000) + 's'
        : null
    };
  }
}

export default LocationFallbackService;
export { POPULAR_LOCATIONS, DEFAULT_LOCATION, AddressCache };