// LocationFallbackService.js - Sistema de fallback para usuarios sin GPS
import { Alert } from 'react-native';

// Ubicaciones predefinidas de Santo Domingo Este y áreas populares
const PREDEFINED_LOCATIONS = {
  // Centro de Santo Domingo Este (ubicación por defecto)
  default: {
    latitude: 18.4861,
    longitude: -69.8563,
    address: 'Santo Domingo Este, República Dominicana',
    description: 'Centro de Santo Domingo Este'
  },
  
  // Ubicaciones populares en Santo Domingo Este
  popular: [
    {
      id: 'plaza_central',
      name: '🏪 Plaza Central',
      latitude: 18.4850,
      longitude: -69.8570,
      address: 'Plaza Central, Santo Domingo Este'
    },
    {
      id: 'megacentro',
      name: '🛒 Megacentro',
      latitude: 18.4820,
      longitude: -69.8600,
      address: 'Megacentro, Santo Domingo Este'
    },
    {
      id: 'ciudad_olimpica',
      name: '🏃 Ciudad Olímpica',
      latitude: 18.4900,
      longitude: -69.8400,
      address: 'Ciudad Olímpica, Santo Domingo Este'
    },
    {
      id: 'parque_mirador_este',
      name: '🌳 Parque Mirador Este',
      latitude: 18.4950,
      longitude: -69.8300,
      address: 'Parque Mirador Este, Santo Domingo Este'
    },
    {
      id: 'hospital_plaza',
      name: '🏥 Hospital Plaza de la Salud',
      latitude: 18.4830,
      longitude: -69.8550,
      address: 'Hospital Plaza de la Salud, Santo Domingo Este'
    }
  ]
};

// Función para obtener ubicación de fallback por defecto
const getDefaultLocation = () => {
  console.log('📍 Usando ubicación de fallback por defecto');
  return PREDEFINED_LOCATIONS.default;
};

// Función para obtener todas las ubicaciones populares
const getPopularLocations = () => {
  console.log('📍 Obteniendo ubicaciones populares');
  return PREDEFINED_LOCATIONS.popular;
};

// Función para mostrar modal de selección de ubicación
const showLocationSelectionModal = (onLocationSelected) => {
  const locations = getPopularLocations();
  const locationTitles = locations.map(loc => loc.name);
  
  Alert.alert(
    'Seleccionar Ubicación',
    'El GPS no está disponible. Selecciona tu ubicación aproximada:',
    [
      ...locations.map(location => ({
        text: location.name,
        onPress: () => {
          console.log('📍 Ubicación seleccionada:', location.name);
          onLocationSelected({
            latitude: location.latitude,
            longitude: location.longitude,
            address: location.address,
            type: 'manual'
          });
        }
      })),
      {
        text: 'Usar ubicación por defecto',
        onPress: () => {
          const defaultLoc = getDefaultLocation();
          onLocationSelected({
            ...defaultLoc,
            type: 'fallback'
          });
        }
      }
    ]
  );
};

// Función principal del servicio de fallback
const LocationFallbackService = {
  // Obtener ubicación usando fallback
  getFallbackLocation: async (onLocationReceived) => {
    console.log('🔄 Iniciando proceso de fallback de ubicación...');
    
    try {
      // Mostrar modal para selección manual
      showLocationSelectionModal((selectedLocation) => {
        console.log('✅ Ubicación de fallback obtenida:', selectedLocation);
        onLocationReceived(selectedLocation);
      });
      
    } catch (error) {
      console.error('❌ Error en fallback de ubicación:', error);
      
      // En caso de error, usar ubicación por defecto
      const defaultLocation = {
        ...getDefaultLocation(),
        type: 'fallback'
      };
      
      onLocationReceived(defaultLocation);
    }
  },

  // Verificar si una ubicación es de fallback
  isFallbackLocation: (location) => {
    return location && (location.type === 'fallback' || location.type === 'manual');
  },

  // Obtener descripción del tipo de ubicación
  getLocationTypeDescription: (location) => {
    if (!location || !location.type) {
      return { icon: '❓', text: 'Ubicación desconocida', color: '#666666' };
    }

    switch (location.type) {
      case 'gps':
        return { icon: '🎯', text: 'Ubicación GPS', color: '#00C851' };
      case 'fallback':
        return { icon: '📍', text: 'Ubicación aproximada', color: '#FF9500' };
      case 'manual':
        return { icon: '🗺️', text: 'Seleccionada manualmente', color: '#007AFF' };
      default:
        return { icon: '📍', text: 'Ubicación estimada', color: '#666666' };
    }
  },

  // Obtener todas las ubicaciones disponibles
  getAllLocations: () => {
    return {
      default: PREDEFINED_LOCATIONS.default,
      popular: PREDEFINED_LOCATIONS.popular
    };
  }
};

export default LocationFallbackService;
export { PREDEFINED_LOCATIONS };