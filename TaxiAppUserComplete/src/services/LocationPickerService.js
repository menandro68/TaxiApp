import Geolocation from '@react-native-community/geolocation';
import AsyncStorage from '@react-native-async-storage/async-storage';

class LocationPickerService {
  constructor() {
    this.currentLocation = null;
    this.watchId = null;
  }

  // Obtener ubicación actual con alta precisión
  getCurrentLocation() {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          };
          this.currentLocation = location;
          resolve(location);
        },
        (error) => reject(error),
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 1000,
          distanceFilter: 10
        }
      );
    });
  }

  // Observar cambios en la ubicación
  watchLocation(callback) {
    this.watchId = Geolocation.watchPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
        this.currentLocation = location;
        callback(location);
      },
      (error) => console.error('Error watching location:', error),
      {
        enableHighAccuracy: true,
        distanceFilter: 5,
        interval: 5000,
        fastestInterval: 2000
      }
    );
    return this.watchId;
  }

  // Detener observación
  stopWatching() {
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  // Geocoding inverso (coordenadas a dirección)
  async reverseGeocode(latitude, longitude) {
    try {
      // Simulación - en producción usar Google Geocoding API
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
      );
      
      if (!response.ok) throw new Error('Geocoding failed');
      
      const data = await response.json();
      
      return {
        formatted_address: data.display_name,
        street: data.address?.road || '',
        neighborhood: data.address?.neighbourhood || data.address?.suburb || '',
        city: data.address?.city || data.address?.town || 'Santo Domingo',
        country: data.address?.country || 'República Dominicana'
      };
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      // Fallback
      return {
        formatted_address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        street: 'Ubicación seleccionada',
        neighborhood: '',
        city: 'Santo Domingo',
        country: 'República Dominicana'
      };
    }
  }

  // Buscar direcciones (geocoding)
  async searchAddress(query) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}, Santo Domingo, República Dominicana&limit=5`
      );
      
      if (!response.ok) throw new Error('Search failed');
      
      const data = await response.json();
      
      return data.map(item => ({
        place_id: item.place_id,
        formatted_address: item.display_name,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        type: item.type
      }));
    } catch (error) {
      console.error('Address search error:', error);
      return [];
    }
  }

  // Guardar ubicación reciente
  async saveRecentLocation(location) {
    try {
      const recent = await this.getRecentLocations();
      
      // Evitar duplicados
      const filtered = recent.filter(
        loc => !(Math.abs(loc.latitude - location.latitude) < 0.0001 && 
                Math.abs(loc.longitude - location.longitude) < 0.0001)
      );
      
      // Agregar al inicio
      filtered.unshift({
        ...location,
        timestamp: new Date().toISOString()
      });
      
      // Mantener máximo 10
      const toSave = filtered.slice(0, 10);
      
      await AsyncStorage.setItem('recent_pickup_locations', JSON.stringify(toSave));
      return true;
    } catch (error) {
      console.error('Error saving recent location:', error);
      return false;
    }
  }

  // Obtener ubicaciones recientes
  async getRecentLocations() {
    try {
      const data = await AsyncStorage.getItem('recent_pickup_locations');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting recent locations:', error);
      return [];
    }
  }

  // Validar si una ubicación está en zona de servicio
  isInServiceArea(latitude, longitude) {
    // Límites aproximados del Gran Santo Domingo
    const bounds = {
      north: 18.55,
      south: 18.40,
      east: -69.80,
      west: -70.05
    };
    
    return latitude >= bounds.south && 
           latitude <= bounds.north && 
           longitude >= bounds.west && 
           longitude <= bounds.east;
  }

  // Calcular distancia entre dos puntos (en metros)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Radio de la Tierra en metros
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distancia en metros
  }
}

export default new LocationPickerService();