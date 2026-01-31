import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PermissionService from './PermissionService';
import Geolocation from '@react-native-community/geolocation';

// ====================================================================
// SISTEMA DE CACHÉ DE DIRECCIONES PERSISTENTE
// Soluciona el problema de direcciones inconsistentes (Calle 2 vs Calle 4)
// ====================================================================
const AddressCache = {
  // Configuración
  CONFIG: {
    CACHE_DURATION_MS: 30 * 60 * 1000,  // 30 minutos de validez
    MIN_DISTANCE_FOR_UPDATE: 100,        // 100 metros mínimo para actualizar
    COORDINATE_PRECISION: 3,             // 3 decimales (~100m de grid)
    STORAGE_KEY: 'address_cache_v2',     // Clave para AsyncStorage
    INSTANT_CACHE_MAX_AGE: 300 * 1000   // 60 segundos para cache instantaneo (sin GPS)
  },
  
  // Estado interno
  _cache: null,
  _initialized: false,
  _shownToUser: null,  // Coordenadas mostradas al usuario para comparación
  
  // Inicializar caché desde storage (llamar antes de usar)
  async initialize() {
    if (this._initialized) return;
    
    // Lista de direcciones inválidas (compartida)
    const INVALID_ADDRESSES = [
      'ubicacion desconocida',
      'ubicación desconocida', 
      'unknown location',
      'error',
      'null',
      'undefined'
    ];
    
    try {
      const stored = await AsyncStorage.getItem(this.CONFIG.STORAGE_KEY);
      if (stored) {
        this._cache = JSON.parse(stored);
        
        // AUTO-LIMPIEZA: Si la dirección guardada es inválida, limpiar automáticamente
        const addressLower = (this._cache.address || '').toLowerCase().trim();
        if (!this._cache.address || addressLower.length < 5 || INVALID_ADDRESSES.includes(addressLower)) {
          console.log('📍 Caché: AUTO-LIMPIEZA - Dirección inválida detectada:', this._cache.address);
          this._cache = null;
          await AsyncStorage.removeItem(this.CONFIG.STORAGE_KEY);
          this._initialized = true;
          return;
        }
        const age = Date.now() - this._cache.timestamp;
        console.log('📍 Caché: Cargado desde storage (edad:', Math.round(age/1000), 's)');
        
        // Limpiar si expiró
        if (age > this.CONFIG.CACHE_DURATION_MS) {
          console.log('📍 Caché: Expirado, limpiando...');
          // this._cache = null; // COMENTADO - conservar para fallback
          // await AsyncStorage.removeItem(this.CONFIG.STORAGE_KEY); // COMENTADO
        }
      } else {
        console.log('📍 Caché: No hay caché en storage');
      }
    } catch (error) {
      console.log('📍 Caché: Error al cargar:', error.message);
      this._cache = null;
    }
    
    this._initialized = true;
  },
  
  // Redondear coordenadas a grid de ~100m (3 decimales)
  roundCoordinates(lat, lng) {
    const precision = this.CONFIG.COORDINATE_PRECISION;
    const factor = Math.pow(10, precision);
    return {
      latitude: Math.round(lat * factor) / factor,
      longitude: Math.round(lng * factor) / factor
    };
  },
  
  // Calcular distancia en metros (Haversine simplificado)
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000; // Radio de la Tierra en metros
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  },
  
  // Verificar si el caché es válido
  isValid(currentLat, currentLng) {
    if (!this._cache) {
      console.log('📍 Caché: No hay caché previo');
      return false;
    }
    
    const age = Date.now() - this._cache.timestamp;
    
    // IMPORTANTE: Si hay coords mostradas al usuario, comparar contra esas
    let refLat = this._cache.latitude;
    let refLng = this._cache.longitude;
    
    if (this._shownToUser) {
      refLat = this._shownToUser.latitude;
      refLng = this._shownToUser.longitude;
      console.log('📍 Usando coords mostradas como referencia:', refLat.toFixed(4), refLng.toFixed(4));
    }
    
    const distance = this.calculateDistance(
      currentLat, currentLng,
      refLat, refLng
    );
    
    // Válido si: menos de 30 min Y menos de 100m de distancia
    const isTimeValid = age < this.CONFIG.CACHE_DURATION_MS;
    const isDistanceValid = distance < this.CONFIG.MIN_DISTANCE_FOR_UPDATE;
    
    if (!isTimeValid) {
      console.log('📍 Caché: Expirado (edad:', Math.round(age/1000), 's)');
      return false;
    }
    
    if (!isDistanceValid) {
      console.log('📍 Caché: Movimiento detectado (', Math.round(distance), 'm) - FORZANDO nuevo geocoding');
      return false;
    }
    
    console.log('📍 Caché: Válido (dist:', Math.round(distance), 'm, edad:', Math.round(age/1000), 's)');
    return true;
  },
  
  // Obtener dirección cacheada
  get() {
    return this._cache ? this._cache.address : null;
  },
  
  // Guardar nueva dirección (con persistencia)
  async set(lat, lng, address) {
    // VALIDACIÓN PROFESIONAL: Nunca guardar direcciones inválidas
    const INVALID_ADDRESSES = [
      'ubicacion desconocida',
      'ubicación desconocida', 
      'unknown location',
      'error',
      'null',
      'undefined'
    ];
    
    const addressLower = (address || '').toLowerCase().trim();
    
    // Rechazar si es inválida o muy corta
    if (!address || addressLower.length < 5 || INVALID_ADDRESSES.includes(addressLower)) {
      console.log('📍 Caché: RECHAZADO - Dirección inválida:', address);
      return; // No guardar
    }
    
    this._cache = {
      latitude: lat,
      longitude: lng,
      address: address,
      timestamp: Date.now()
    };
    
    // Persistir en AsyncStorage
    try {
      await AsyncStorage.setItem(
        this.CONFIG.STORAGE_KEY, 
        JSON.stringify(this._cache)
      );
      console.log('📍 Caché: Guardado y persistido -', address.substring(0, 40) + '...');
    } catch (error) {
      console.log('📍 Caché: Error al persistir:', error.message);
    }
  },
  
  // Limpiar caché
  async clear() {
    this._cache = null;
    this._initialized = false;
    this._shownToUser = null;
    try {
      await AsyncStorage.removeItem(this.CONFIG.STORAGE_KEY);
      console.log('📍 Caché: Limpiado');
    } catch (error) {
      console.log('📍 Caché: Error al limpiar:', error.message);
    }
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

  // VERIFICAR SI GPS ESTA DISPONIBLE - CON WATCHPOSITION PROGRESIVO
  static async checkGPSAvailability(highAccuracy = true) {
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

      // Variables para watchPosition
      let watchId = null;
      let bestLocation = null;
      let resolved = false;
      const startTime = Date.now();
      const TOTAL_TIMEOUT = 5000;
      const MIN_ACCURACY = highAccuracy ? 100 : 300;

      // Función para resolver y limpiar
      const finishWatch = (result) => {
        if (resolved) return;
        resolved = true;
        if (watchId !== null) {
          Geolocation.clearWatch(watchId);
        }
        resolve(result);
      };

      // Timeout global
      const timeoutId = setTimeout(() => {
        console.log('Timeout global alcanzado');
        if (bestLocation) {
          console.log('Usando mejor ubicacion obtenida:', bestLocation.accuracy, 'm');
          finishWatch({
            available: true,
            reason: 'timeout_with_location',
            message: 'GPS con ubicacion parcial',
            location: bestLocation
          });
        } else {
          finishWatch({
            available: false,
            reason: 'timeout',
            message: 'No se pudo obtener ubicacion',
            location: null
          });
        }
      }, TOTAL_TIMEOUT);

      // Iniciar watchPosition
      console.log('Iniciando watchPosition progresivo...');
      watchId = Geolocation.watchPosition(
        (position) => {
          const accuracy = position.coords.accuracy;
          const elapsed = Date.now() - startTime;
          console.log('Ubicacion recibida:', accuracy.toFixed(1), 'm (', elapsed, 'ms)');

          // Guardar si es mejor que la anterior
          if (!bestLocation || accuracy < bestLocation.accuracy) {
            bestLocation = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: accuracy,
              timestamp: position.timestamp
            };
            console.log('Nueva mejor ubicacion:', accuracy.toFixed(1), 'm');
          }

          // Si la precisión es buena, terminar inmediatamente
          if (accuracy <= MIN_ACCURACY) {
            console.log('Precision excelente:', accuracy.toFixed(1), 'm - terminando');
            clearTimeout(timeoutId);
            finishWatch({
              available: true,
              reason: 'success',
              message: 'GPS disponible',
              location: bestLocation
            });
          }
        },
     (error) => {
          console.log('Error watchPosition:', error.code, error.message);
          // Código 2 = POSITION_UNAVAILABLE (GPS desactivado)
          if (error.code === 2) {
            finishWatch({
              available: false,
              reason: 'gps_disabled',
              message: 'GPS del dispositivo desactivado',
              location: null
            });
          }
        },
        {
          enableHighAccuracy: highAccuracy,
          timeout: TOTAL_TIMEOUT,
          maximumAge: 10000,
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

        const useHighAccuracy = attempt === 1; // Solo primer intento usa GPS puro
        console.log(useHighAccuracy ? '??? Usando GPS alta precisi�n' : '?? Usando WiFi/red celular');
        const gpsCheck = await this.checkGPSAvailability(useHighAccuracy);
        lastGpsCheck = gpsCheck;

        if (gpsCheck.available) {
          console.log('Usando ubicacion GPS real');
          
          // ====== SISTEMA ROBUSTO DE DIRECCIONES CON CACHÉ PERSISTENTE ======
          const { latitude, longitude } = gpsCheck.location;
          
          // Paso 0: Inicializar caché desde storage (si no está inicializado)
          await AddressCache.initialize();
          
          // Paso 1: Redondear coordenadas para consistencia (~100m grid)
          const rounded = AddressCache.roundCoordinates(latitude, longitude);
          console.log('📍 Coordenadas originales:', latitude.toFixed(6), longitude.toFixed(6));
          console.log('📍 Coordenadas redondeadas:', rounded.latitude, rounded.longitude);
          
          // Paso 2: Verificar si tenemos caché válido
          let address;
          if (AddressCache.isValid(latitude, longitude)) {
            // Usar dirección cacheada
            address = AddressCache.get();
            console.log('📍 Usando dirección cacheada:', address.substring(0, 30) + '...');
          } else {
            // Obtener nueva dirección con coordenadas redondeadas
            address = await this.getReverseGeocodeOptimized(rounded.latitude, rounded.longitude);
            // Guardar en caché (persistente)
            await AddressCache.set(latitude, longitude, address);
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
          await new Promise(resolve => setTimeout(resolve, 0));
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
  // REVERSE GEOCODING OPTIMIZADO - Google Maps con parámetros específicos
  // ====================================================================
  static async getReverseGeocodeOptimized(latitude, longitude) {
    try {
      const GOOGLE_MAPS_APIKEY = 'AIzaSyC6HuO-nRJxdZctdH0o_-nuezUOILq868Q';
      
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_APIKEY}&language=es&result_type=street_address|route|premise`;
      
      console.log('📍 Consultando Google para:', latitude.toFixed(4), longitude.toFixed(4));
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const result = data.results[0];
        let address = result.formatted_address;

        // Limpiar dirección si es muy larga
        if (address.length > 60) {
          address = address
            .replace(', Republica Dominicana', '')
            .replace(', Dominican Republic', '')
            .replace(', República Dominicana', '');
        }

        console.log('📍 Dirección obtenida:', address);
        return address;
      }
      
      console.log('📍 Sin resultados de Google');
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
  // CARGA INSTANTÁNEA - Para UI inmediata mientras GPS carga en background
  // ====================================================================
  
  // Obtener ubicación cacheada instantáneamente (sin esperar GPS)
  static async getInstantCachedLocation() {
    try {
      console.log('⚡ Intentando carga instantánea desde caché...');
      
      // Inicializar caché desde AsyncStorage
      await AddressCache.initialize();
      
      // Si hay caché (sin verificar distancia porque no tenemos GPS aún)
      if (AddressCache._cache && AddressCache._cache.address) {
        const age = Date.now() - AddressCache._cache.timestamp;
        
        // Solo usar si tiene menos de 60 segundos (cache instantaneo)
        if (age < AddressCache.CONFIG.INSTANT_CACHE_MAX_AGE) {
          console.log('⚡ Caché instantáneo disponible (edad:', Math.round(age/1000), 's)');
          
          // Guardar que estas coords se mostraron al usuario
          AddressCache._shownToUser = {
            latitude: AddressCache._cache.latitude,
            longitude: AddressCache._cache.longitude
          };
          
          return {
            success: true,
            location: {
              latitude: AddressCache._cache.latitude,
              longitude: AddressCache._cache.longitude,
              address: AddressCache._cache.address,
              source: 'cached_instant'
            },
            fromCache: true,
            cacheAge: Math.round(age / 1000)
          };
        } else {
          console.log('⚡ Caché expirado, necesita GPS fresco');
        }
      } else {
        console.log('⚡ No hay caché disponible');
      }
      
      return null;
    } catch (error) {
      console.log('⚡ Error en carga instantánea:', error.message);
      return null;
    }
  }

  // ====================================================================
  // UTILIDADES DE CACHÉ - Para uso externo si es necesario
  // ====================================================================
  
  // Limpiar caché de direcciones (útil al cerrar sesión o cambiar de zona)
  static async clearAddressCache() {
    await AddressCache.clear();
  }

  // Obtener estado del caché (para debugging)
  static getAddressCacheStatus() {
    return {
      hasCache: AddressCache._cache !== null,
      lastAddress: AddressCache._cache ? AddressCache._cache.address : null,
      lastLocation: AddressCache._cache ? {
        latitude: AddressCache._cache.latitude,
        longitude: AddressCache._cache.longitude
      } : null,
      cacheAge: AddressCache._cache && AddressCache._cache.timestamp
        ? Math.round((Date.now() - AddressCache._cache.timestamp) / 1000) + 's'
        : null,
      initialized: AddressCache._initialized,
      shownToUser: AddressCache._shownToUser
    };
  }
}

export default LocationFallbackService;
export { POPULAR_LOCATIONS, DEFAULT_LOCATION, AddressCache };