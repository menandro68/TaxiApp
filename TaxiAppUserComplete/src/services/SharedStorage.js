import AsyncStorage from '@react-native-async-storage/async-storage';
import SecureStorage from './SecureStorage';
import EncryptionService from './EncryptionService';

// Claves para el almacenamiento
const STORAGE_KEYS = {
  TRIP_REQUEST: 'trip_request',
  TRIP_STATUS: 'trip_status',
  DRIVER_INFO: 'driver_info',
  USER_LOCATION: 'user_location',
  DRIVER_LOCATION: 'driver_location',
  USER_PROFILE: 'user_profile' // ← Nueva clave agregada
};

// Estados de viaje (actualizados)
const TRIP_STATES = {
  IDLE: 'IDLE',
  REQUESTING_RIDE: 'REQUESTING_RIDE', 
  DRIVER_ASSIGNED: 'DRIVER_ASSIGNED',
  IN_RIDE: 'IN_RIDE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
};

// Funciones base
const storeData = async (key, value) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`❌ Error al guardar en ${key}:`, error);
  }
};

const getData = async (key) => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (error) {
    console.error(`❌ Error al leer de ${key}:`, error);
    return null;
  }
};

const removeData = async (key) => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error(`❌ Error al eliminar ${key}:`, error);
  }
};

const SharedStorage = {
  // === DATOS DE VIAJE ===
  saveTripRequest: async (tripData) => {
    await storeData(STORAGE_KEYS.TRIP_REQUEST, tripData);
    console.log('💾 Solicitud de viaje guardada:', tripData);
  },

  getTripRequest: async () => {
    const data = await getData(STORAGE_KEYS.TRIP_REQUEST);
    console.log('📱 Solicitud de viaje obtenida:', data);
    return data;
  },

  clearTripRequest: async () => {
    await removeData(STORAGE_KEYS.TRIP_REQUEST);
    console.log('🗑️ Solicitud de viaje eliminada');
  },

  updateTripStatus: async (status) => {
    await storeData(STORAGE_KEYS.TRIP_STATUS, status);
    console.log('🔄 Estado de viaje actualizado:', status);
  },

  getTripStatus: async () => {
    const status = await getData(STORAGE_KEYS.TRIP_STATUS);
    console.log('📊 Estado actual del viaje:', status);
    return status || TRIP_STATES.IDLE;
  },

  clearTripStatus: async () => {
    await removeData(STORAGE_KEYS.TRIP_STATUS);
    console.log('🗑️ Estado del viaje eliminado');
  },

  saveDriverInfo: async (info) => {
    await storeData(STORAGE_KEYS.DRIVER_INFO, info);
    console.log('👨‍✈️ Info del conductor guardada:', info);
  },

  getDriverInfo: async () => {
    const data = await getData(STORAGE_KEYS.DRIVER_INFO);
    console.log('📣 Info del conductor obtenida:', data);
    return data;
  },

  clearDriverInfo: async () => {
    await removeData(STORAGE_KEYS.DRIVER_INFO);
    console.log('🗑️ Info del conductor eliminada');
  },

  saveUserLocation: async (location) => {
    const locationWithTimestamp = { ...location, timestamp: Date.now() };
    await storeData(STORAGE_KEYS.USER_LOCATION, locationWithTimestamp);
    console.log('📍 Ubicación del usuario guardada:', locationWithTimestamp);
  },

  getUserLocation: async () => {
    const data = await getData(STORAGE_KEYS.USER_LOCATION);
    if (data && data.timestamp) {
      const age = Date.now() - data.timestamp;
      if (age > 60 * 1000) { // 60 segundos
        console.log('📍 Ubicación expirada (edad:', Math.round(age/1000), 's) - ignorando');
        return null;
      }
      console.log('📍 Ubicación del usuario obtenida (edad:', Math.round(age/1000), 's):', data);
    } else {
      console.log('📍 Ubicación del usuario obtenida (sin timestamp):', data);
    }
    return data;
  },

  clearUserLocation: async () => {
    await removeData(STORAGE_KEYS.USER_LOCATION);
    console.log('🗑️ Ubicación del usuario eliminada');
  },

  saveDriverLocation: async (location) => {
    await storeData(STORAGE_KEYS.DRIVER_LOCATION, location);
    console.log('🚗 Ubicación del conductor guardada:', location);
  },

  getDriverLocation: async () => {
    const data = await getData(STORAGE_KEYS.DRIVER_LOCATION);
    console.log('🚗 Ubicación del conductor obtenida:', data);
    return data;
  },

  clearDriverLocation: async () => {
    await removeData(STORAGE_KEYS.DRIVER_LOCATION);
    console.log('🗑️ Ubicación del conductor eliminada');
  },

  // === FUNCIONES DE PERFIL DE USUARIO (ENCRIPTADAS) ===
  saveUserProfile: async (profile) => {
    await SecureStorage.saveUserProfile(profile);
    console.log('👤 Perfil de usuario guardado de forma segura');
  },

  getUserProfile: async () => {
    const data = await SecureStorage.getUserProfile();
    console.log('👤 Perfil de usuario obtenido de forma segura');
    return data || {
      name: '',
      phone: '',
      email: '',
      preferredVehicle: 'economico'
    };
  },

  initializeUserProfile: async () => {
    const existingProfile = await SecureStorage.getUserProfile();
    if (!existingProfile) {
      const defaultProfile = {
        name: '',
        phone: '',
        email: '',
        preferredVehicle: 'economico',
        createdAt: new Date().toISOString()
      };
      await SecureStorage.saveUserProfile(defaultProfile);
      console.log('👤 Perfil de usuario inicializado');
      return defaultProfile;
    }
    return existingProfile;
  },

  updateUserProfile: async (updates) => {
    const currentProfile = await SecureStorage.getUserProfile() || {};
    const updatedProfile = { ...currentProfile, ...updates };
    await SecureStorage.saveUserProfile(updatedProfile);
    console.log('👤 Perfil de usuario actualizado:', updatedProfile);
    return updatedProfile;
  },

  deleteUserProfile: async () => {
    try {
      await SecureStorage.clearUserProfile();
      console.log('🗑️ Perfil de usuario eliminado');
      return true;
    } catch (error) {
      console.error('❌ Error eliminando perfil:', error);
      return false;
    }
  },

  // === LUGARES FAVORITOS ===
  saveFavoritePlace: async (place) => {
    try {
      const favorites = await getData('favorite_places') || [];
      const exists = favorites.some(fav => 
        fav.latitude === place.latitude && 
        fav.longitude === place.longitude
      );
      
      if (!exists) {
        favorites.push({
          ...place,
          id: `fav_${Date.now()}`,
          addedAt: new Date().toISOString()
        });
        await storeData('favorite_places', favorites);
        console.log('⭐ Lugar favorito guardado:', place.name);
      }
      return favorites;
    } catch (error) {
      console.error('❌ Error guardando favorito:', error);
      return [];
    }
  },

  getFavoritePlaces: async () => {
    try {
      const favorites = await getData('favorite_places') || [];
      console.log('📍 Lugares favoritos obtenidos:', favorites.length);
      return favorites;
    } catch (error) {
      console.error('❌ Error obteniendo favoritos:', error);
      return [];
    }
  },

  removeFavoritePlace: async (placeId) => {
    try {
      const favorites = await getData('favorite_places') || [];
      const filtered = favorites.filter(fav => fav.id !== placeId);
      await storeData('favorite_places', filtered);
      console.log('🗑️ Lugar favorito eliminado');
      return filtered;
    } catch (error) {
      console.error('❌ Error eliminando favorito:', error);
      return [];
    }
  },

  // === CONDUCTORES BLOQUEADOS ===
  blockDriver: async (driverInfo) => {
    try {
      const blockedDrivers = await getData('blocked_drivers') || [];
      const exists = blockedDrivers.some(driver => driver.id === driverInfo.id);
      
      if (!exists) {
        blockedDrivers.push({
          id: driverInfo.id,
          name: driverInfo.name,
          blockedAt: new Date().toISOString(),
          reason: driverInfo.reason || 'Sin especificar'
        });
        await storeData('blocked_drivers', blockedDrivers);
        console.log('🚫 Conductor bloqueado:', driverInfo.name);
      }
      return blockedDrivers;
    } catch (error) {
      console.error('❌ Error bloqueando conductor:', error);
      return [];
    }
  },

  getBlockedDrivers: async () => {
    try {
      const blocked = await getData('blocked_drivers') || [];
      console.log('🚫 Conductores bloqueados:', blocked.length);
      return blocked;
    } catch (error) {
      console.error('❌ Error obteniendo bloqueados:', error);
      return [];
    }
  },

  unblockDriver: async (driverId) => {
    try {
      const blocked = await getData('blocked_drivers') || [];
      const filtered = blocked.filter(driver => driver.id !== driverId);
      await storeData('blocked_drivers', filtered);
      console.log('✅ Conductor desbloqueado');
      return filtered;
    } catch (error) {
      console.error('❌ Error desbloqueando conductor:', error);
      return [];
    }
  },

  // === VERIFICACIÓN DE EMAIL/TELÉFONO ===
  saveVerificationStatus: async (verificationData) => {
    try {
      const currentProfile = await SecureStorage.getUserProfile() || {};
      const updatedProfile = {
        ...currentProfile,
        emailVerified: verificationData.emailVerified || false,
        phoneVerified: verificationData.phoneVerified || false,
        verificationDate: verificationData.verificationDate || null
      };
      await SecureStorage.saveUserProfile(updatedProfile);
      console.log('✅ Estado de verificación actualizado');
      return updatedProfile;
    } catch (error) {
      console.error('❌ Error guardando verificación:', error);
      return null;
    }
  },

  sendVerificationCode: async (type, value) => {
    try {
      // Simular envío de código
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      await storeData(`verification_${type}_code`, code);
      await storeData(`verification_${type}_timestamp`, Date.now());
      console.log(`📧 Código de verificación ${type} enviado:`, code);
      return { success: true, code }; // En producción, no devolver el código
    } catch (error) {
      console.error('❌ Error enviando código:', error);
      return { success: false };
    }
  },

  verifyCode: async (type, inputCode) => {
    try {
      const storedCode = await getData(`verification_${type}_code`);
      const timestamp = await getData(`verification_${type}_timestamp`);
      
      // Verificar que el código no haya expirado (10 minutos)
      const now = Date.now();
      const tenMinutes = 10 * 60 * 1000;
      
      if (!storedCode || !timestamp || (now - timestamp) > tenMinutes) {
        return { success: false, message: 'Código expirado' };
      }
      
      if (storedCode === inputCode) {
        // Limpiar código usado
        await removeData(`verification_${type}_code`);
        await removeData(`verification_${type}_timestamp`);
        
        // Actualizar estado de verificación
        const verificationData = {};
        verificationData[`${type}Verified`] = true;
        verificationData.verificationDate = new Date().toISOString();
        
        await SharedStorage.saveVerificationStatus(verificationData);
        
        return { success: true, message: 'Verificación exitosa' };
      } else {
        return { success: false, message: 'Código incorrecto' };
      }
    } catch (error) {
      console.error('❌ Error verificando código:', error);
      return { success: false, message: 'Error al verificar' };
    }
  },

  // === FLUJO DE VIAJE ===
  assignDriver: async (driverInfo) => {
    await SharedStorage.saveDriverInfo(driverInfo);
    await SharedStorage.updateTripStatus(TRIP_STATES.DRIVER_ASSIGNED);
    console.log('✅ Conductor asignado exitosamente');
  },

  startTrip: async () => {
    await SharedStorage.updateTripStatus(TRIP_STATES.IN_RIDE);
    console.log('🚀 Viaje iniciado');
  },

  completeTrip: async () => {
    await SharedStorage.updateTripStatus(TRIP_STATES.COMPLETED);
    console.log('🎉 Viaje completado');
  },

  cancelTrip: async () => {
    await SharedStorage.updateTripStatus(TRIP_STATES.CANCELLED);
    console.log('❌ Viaje cancelado');
  },

  clearTripData: async () => {
    await SharedStorage.clearTripRequest();
    await SharedStorage.clearTripStatus();
    await SharedStorage.clearDriverInfo();
    console.log('🧹 Todos los datos del viaje eliminados');
  },

  // === GESTIÓN DE USER_ID ===
  saveUserId: async (userId) => {
    try {
      await SecureStorage.saveUserId(userId);
      console.log('✅ User ID guardado de forma segura:', userId);
    } catch (error) {
      console.error('❌ Error guardando user ID:', error);
    }
  },

  getUserId: async () => {
    try {
      const userId = await SecureStorage.getUserId();
      console.log('👤 User ID obtenido:', userId);
      return userId;
    } catch (error) {
      console.error('❌ Error obteniendo user ID:', error);
      return null;
    }
  },

  // === AUTENTICACIÓN (ENCRIPTADA) ===
  getAuthToken: async () => {
    try {
      return await SecureStorage.getAuthToken();
    } catch (error) {
      console.error('❌ Error obteniendo token:', error);
      return null;
    }
  },

  saveAuthToken: async (token) => {
    try {
      await SecureStorage.saveAuthToken(token);
      console.log('🔐 Token guardado de forma segura');
    } catch (error) {
      console.error('❌ Error guardando token:', error);
    }
  },

  clearAuth: async () => {
    try {
      await SecureStorage.clearAuth();
      await SecureStorage.clearUserProfile();
      console.log('🗑️ Datos de autenticación eliminados');
    } catch (error) {
      console.error('❌ Error limpiando auth:', error);
    }
  },

  // === MÉTODOS ADICIONALES PARA APP.JS ===
  startRideRequest: async (origin, destination, vehicleType, price) => {
    const tripData = {
      id: `trip_${Date.now()}`,
      origin,
      destination,
      vehicleType,
      estimatedPrice: price,
      status: TRIP_STATES.REQUESTING_RIDE,
      createdAt: new Date().toISOString()
    };
    await SharedStorage.saveTripRequest(tripData);
    await SharedStorage.updateTripStatus(TRIP_STATES.REQUESTING_RIDE);
    return tripData;
  },

  acceptDriver: async (driverInfo) => {
    await SharedStorage.saveDriverInfo(driverInfo);
    await SharedStorage.updateTripStatus(TRIP_STATES.DRIVER_ASSIGNED);
  },

  startRide: async () => {
    await SharedStorage.updateTripStatus(TRIP_STATES.IN_RIDE);
  },

  completeRide: async (completionData) => {
    await SharedStorage.updateTripStatus(TRIP_STATES.COMPLETED);
    await storeData('completion_data', completionData);
  },

  cancelRide: async (reason) => {
    await SharedStorage.updateTripStatus(TRIP_STATES.CANCELLED);
    await storeData('cancellation_reason', reason);
  },

  resetToIdle: async () => {
    await SharedStorage.updateTripStatus(TRIP_STATES.IDLE);
    await SharedStorage.clearTripRequest();
    await SharedStorage.clearDriverInfo();
  },

  // === DEPURACIÓN ===
  debugStorage: async () => {
    console.log('🔍 === DEBUG SHAREDSTORAGE ===');
    const tripRequest = await SharedStorage.getTripRequest();
    const tripStatus = await SharedStorage.getTripStatus();
    const driverInfo = await SharedStorage.getDriverInfo();
    const userProfile = await SharedStorage.getUserProfile();
    console.log('Trip Request:', tripRequest);
    console.log('Trip Status:', tripStatus);
    console.log('Driver Info:', driverInfo);
    console.log('User Profile:', userProfile);
    console.log('🔍 === FIN DEBUG ===');
  }
};

// Exportaciones finales
export default SharedStorage;
export { STORAGE_KEYS, TRIP_STATES };