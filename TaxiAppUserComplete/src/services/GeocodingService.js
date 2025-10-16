import Geocoder from 'react-native-geocoding';

// Configuración de la API Key de Google
const GOOGLE_API_KEY = 'AIzaSyC6Hu0-nRJxdZctdH0o_-nuezU0ILq868Q';

class GeocodingService {
  constructor() {
    this.initializeGeocoder();
  }

  // Inicializar Geocoder con la API Key
  initializeGeocoder() {
    Geocoder.init(GOOGLE_API_KEY, {
      language: 'es',
      region: 'DO', // Agregar región República Dominicana
    });
    console.log('✅ Servicio de Geocoding inicializado');
  }

  // GEOCODING: Convertir dirección a coordenadas
  async getCoordinatesFromAddress(address) {
    try {
      console.log('📍 Buscando coordenadas para:', address);
      
      // Agregar contexto de República Dominicana si no está presente
      const fullAddress = address.includes('República Dominicana') 
        ? address 
        : `${address}, Santo Domingo, República Dominicana`;
      
      const response = await Geocoder.from(fullAddress);
      
      if (response.results.length > 0) {
        const location = response.results[0].geometry.location;
        const formattedAddress = response.results[0].formatted_address;
        
        console.log('✅ Coordenadas encontradas:', location);
        
        return {
          success: true,
          coordinates: {
            latitude: location.lat,
            longitude: location.lng
          },
          formattedAddress: formattedAddress,
          placeId: response.results[0].place_id
        };
      }
      
      return {
        success: false,
        error: 'No se encontraron coordenadas para esta dirección'
      };
      
    } catch (error) {
      console.error('❌ Error en geocoding:', error);
      console.log('Código de error:', error.code);
      console.log('Mensaje completo:', error.message);
      return {
        success: false,
        error: error.message || 'Error al buscar coordenadas'
      };
    }
  }

  // REVERSE GEOCODING: Convertir coordenadas a dirección
  async getAddressFromCoordinates(latitude, longitude) {
    try {
      console.log('📍 Buscando dirección para:', { latitude, longitude });
      
      const response = await Geocoder.from(latitude, longitude);
      
      if (response.results.length > 0) {
        const address = response.results[0].formatted_address;
        const components = response.results[0].address_components;
        
        // Extraer componentes útiles
        let streetNumber = '';
        let street = '';
        let neighborhood = '';
        let city = '';
        let country = '';
        
        components.forEach(component => {
          const types = component.types;
          if (types.includes('street_number')) {
            streetNumber = component.long_name;
          }
          if (types.includes('route')) {
            street = component.long_name;
          }
          if (types.includes('neighborhood') || types.includes('sublocality')) {
            neighborhood = component.long_name;
          }
          if (types.includes('locality')) {
            city = component.long_name;
          }
          if (types.includes('country')) {
            country = component.long_name;
          }
        });
        
        console.log('✅ Dirección encontrada:', address);
        
        return {
          success: true,
          fullAddress: address,
          components: {
            streetNumber,
            street,
            neighborhood,
            city,
            country
          },
          shortAddress: neighborhood || city || 'Ubicación encontrada'
        };
      }
      
      return {
        success: false,
        error: 'No se encontró dirección para estas coordenadas'
      };
      
    } catch (error) {
      console.error('❌ Error en reverse geocoding:', error);
      return {
        success: false,
        error: error.message || 'Error al buscar dirección'
      };
    }
  }

  // Buscar lugares cercanos
  async searchNearbyPlaces(latitude, longitude, keyword = '', radius = 5000) {
    try {
      console.log('🔍 Buscando lugares cercanos:', keyword);
      
      // Primero obtener la dirección actual
      const addressResult = await this.getAddressFromCoordinates(latitude, longitude);
      
      if (!addressResult.success) {
        return {
          success: false,
          error: 'No se pudo determinar la ubicación actual'
        };
      }
      
      // Buscar lugares cercanos con el keyword
      const searchQuery = keyword 
        ? `${keyword} cerca de ${addressResult.shortAddress}` 
        : addressResult.shortAddress;
      
      const response = await Geocoder.from(searchQuery);
      
      const places = response.results.slice(0, 10).map((result, index) => ({
        id: result.place_id || `place_${index}`,
        name: result.name || result.formatted_address.split(',')[0],
        address: result.formatted_address,
        coordinates: {
          latitude: result.geometry.location.lat,
          longitude: result.geometry.location.lng
        },
        types: result.types || []
      }));
      
      console.log(`✅ ${places.length} lugares encontrados`);
      
      return {
        success: true,
        places: places
      };
      
    } catch (error) {
      console.error('❌ Error buscando lugares cercanos:', error);
      return {
        success: false,
        error: error.message || 'Error al buscar lugares'
      };
    }
  }

  // Validar si las coordenadas están en República Dominicana
  isInDominicanRepublic(latitude, longitude) {
    // Límites aproximados de República Dominicana
    const DR_BOUNDS = {
      north: 19.9823,
      south: 17.3611,
      east: -68.3179,
      west: -72.0075
    };
    
    return (
      latitude >= DR_BOUNDS.south &&
      latitude <= DR_BOUNDS.north &&
      longitude >= DR_BOUNDS.west &&
      longitude <= DR_BOUNDS.east
    );
  }

  // Calcular distancia entre dos puntos (en kilómetros)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
      Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return Math.round(distance * 100) / 100; // Redondear a 2 decimales
  }

  deg2rad(deg) {
    return deg * (Math.PI / 180);
  }
}

export default new GeocodingService();