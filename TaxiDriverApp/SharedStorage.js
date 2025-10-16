import AsyncStorage from '@react-native-async-storage/async-storage';

// Claves para el almacenamiento
const STORAGE_KEYS = {
  TRIP_REQUEST: 'trip_request',
  TRIP_STATUS: 'trip_status',
  DRIVER_INFO: 'driver_info',
  USER_LOCATION: 'user_location',
  DRIVER_LOCATION: 'driver_location'
};

// Estados de viaje
const TRIP_STATES = {
  IDLE: 'idle',
  REQUESTING: 'requesting',
  DRIVER_ASSIGNED: 'driver_assigned',
  DRIVER_ARRIVING: 'driver_arriving',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

// Guardar datos
const storeData = async (key, value) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`❌ Error al guardar en ${key}:`, error);
  }
};

// Obtener datos
const getData = async (key) => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (error) {
    console.error(`❌ Error al leer de ${key}:`, error);
    return null;
  }
};

// Limpiar datos
const removeData = async (key) => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error(`❌ Error al eliminar ${key}:`, error);
  }
};

// Funciones específicas
const SharedStorage = {
  // Trip request
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

  // Trip status
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

  // Driver info
  saveDriverInfo: async (info) => {
    await storeData(STORAGE_KEYS.DRIVER_INFO, info);
    console.log('👨‍✈️ Info del conductor guardada:', info);
  },

  getDriverInfo: async () => {
    const data = await getData(STORAGE_KEYS.DRIVER_INFO);
    console.log('📋 Info del conductor obtenida:', data);
    return data;
  },

  clearDriverInfo: async () => {
    await removeData(STORAGE_KEYS.DRIVER_INFO);
    console.log('🗑️ Info del conductor eliminada');
  },

  // User location
  saveUserLocation: async (location) => {
    await storeData(STORAGE_KEYS.USER_LOCATION, location);
    console.log('📍 Ubicación del usuario guardada:', location);
  },

  getUserLocation: async () => {
    const data = await getData(STORAGE_KEYS.USER_LOCATION);
    console.log('📍 Ubicación del usuario obtenida:', data);
    return data;
  },

  clearUserLocation: async () => {
    await removeData(STORAGE_KEYS.USER_LOCATION);
    console.log('🗑️ Ubicación del usuario eliminada');
  },

  // Driver location
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

  // 🧠 Funciones de alto nivel para flujo de viajes
  assignDriver: async (driverInfo) => {
    await SharedStorage.saveDriverInfo(driverInfo);
    await SharedStorage.updateTripStatus(TRIP_STATES.DRIVER_ASSIGNED);
    console.log('✅ Conductor asignado exitosamente');
  },

  startTrip: async () => {
    await SharedStorage.updateTripStatus(TRIP_STATES.IN_PROGRESS);
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

  // 🛠️ Función de depuración
  debugStorage: async () => {
    console.log('🔍 === DEBUG SHAREDSTORAGE ===');
    const tripRequest = await SharedStorage.getTripRequest();
    const tripStatus = await SharedStorage.getTripStatus();
    const driverInfo = await SharedStorage.getDriverInfo();
    console.log('Trip Request:', tripRequest);
    console.log('Trip Status:', tripStatus);
    console.log('Driver Info:', driverInfo);
    console.log('🔍 === FIN DEBUG ===');
  }
};

// Exportaciones finales
export default SharedStorage;
export { STORAGE_KEYS, TRIP_STATES };
