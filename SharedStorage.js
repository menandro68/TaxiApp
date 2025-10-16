import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  TRIP_REQUEST: 'trip_request',
  TRIP_STATUS: 'trip_status',
  DRIVER_INFO: 'driver_info',
  USER_LOCATION: 'user_location',
  DRIVER_LOCATION: 'driver_location'
};

const TRIP_STATES = {
  IDLE: 'idle',
  REQUESTING_RIDE: 'requesting',
  DRIVER_ASSIGNED: 'driver_assigned',
  DRIVER_ARRIVING: 'driver_arriving',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

const storeData = async (key, value) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error al guardar en ' + key + ':', error);
  }
};

const getData = async (key) => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (error) {
    console.error('Error al leer de ' + key + ':', error);
    return null;
  }
};

const removeData = async (key) => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error('Error al eliminar ' + key + ':', error);
  }
};

const SharedStorage = {
  saveTripRequest: async (tripData) => {
    await storeData(STORAGE_KEYS.TRIP_REQUEST, tripData);
    console.log('Solicitud de viaje guardada:', tripData);
  },

  getTripRequest: async () => {
    const data = await getData(STORAGE_KEYS.TRIP_REQUEST);
    return data;
  },

  updateTripStatus: async (status) => {
    await storeData(STORAGE_KEYS.TRIP_STATUS, status);
  },

  getTripStatus: async () => {
    const status = await getData(STORAGE_KEYS.TRIP_STATUS);
    return status || TRIP_STATES.IDLE;
  },

  saveDriverInfo: async (info) => {
    await storeData(STORAGE_KEYS.DRIVER_INFO, info);
  },

  getDriverInfo: async () => {
    return await getData(STORAGE_KEYS.DRIVER_INFO);
  },

  saveUserLocation: async (location) => {
    await storeData(STORAGE_KEYS.USER_LOCATION, location);
  },

  getUserLocation: async () => {
    return await getData(STORAGE_KEYS.USER_LOCATION);
  },

  assignDriver: async (driverInfo) => {
    await SharedStorage.saveDriverInfo(driverInfo);
    await SharedStorage.updateTripStatus(TRIP_STATES.DRIVER_ASSIGNED);
  },

  startTrip: async () => {
    await SharedStorage.updateTripStatus(TRIP_STATES.IN_PROGRESS);
  },

  completeTrip: async () => {
    await SharedStorage.updateTripStatus(TRIP_STATES.COMPLETED);
  },

  cancelTrip: async () => {
    await SharedStorage.updateTripStatus(TRIP_STATES.CANCELLED);
  }
};

export default SharedStorage;
export { STORAGE_KEYS, TRIP_STATES };