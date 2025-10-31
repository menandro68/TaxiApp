// DriverSearchService.js
import Geolocation from '@react-native-community/geolocation';
import { getBackendUrl } from '../config/config';

class DriverSearchService {
  constructor() {
    this.searchRadii = [3, 5, 8, 12, 20]; // Radios en km: 3km, 5km, 8km, 12km, 20km
    this.maxAttempts = 5;
    this.searchDelay = 2000; // 2 segundos entre búsquedas
  }

  // Calcular distancia entre dos puntos (Haversine formula)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance; // Distancia en km
  }

  toRad(deg) {
    return deg * (Math.PI / 180);
  }

  // Buscar conductores con radio incremental
  async searchDriversIncremental(userLocation, onProgress) {
    console.log('🔍 Iniciando búsqueda incremental de conductores...');
    
    for (let attempt = 0; attempt < this.maxAttempts; attempt++) {
      const radius = this.searchRadii[attempt];
      
      // Callback de progreso
      if (onProgress) {
        onProgress({
          attempt: attempt + 1,
          totalAttempts: this.maxAttempts,
          radius,
          message: `Buscando en ${radius}km...`
        });
      }

      console.log(`📡 Intento ${attempt + 1}/${this.maxAttempts} - Radio: ${radius}km`);
      
      // Buscar conductores en este radio
      const drivers = await this.searchDriversInRadius(userLocation, radius);
      
      if (drivers && drivers.length > 0) {
        // Ordenar por distancia
        const sortedDrivers = this.sortDriversByDistance(drivers, userLocation);
        
        console.log(`✅ ${drivers.length} conductor(es) encontrado(s) en ${radius}km`);
        
        // AGREGAR DELAY MÍNIMO PARA MOSTRAR BÚSQUEDA (30-40 segundos)
        const minSearchTime = 30000 + Math.random() * 10000; // 30-40 segundos aleatorios
        await this.delay(minSearchTime);
        
        return {
          success: true,
          driver: sortedDrivers[0], // El más cercano
          allDrivers: sortedDrivers,
          searchRadius: radius,
          attempts: attempt + 1
        };
      }
      
      // Esperar antes del siguiente intento
      if (attempt < this.maxAttempts - 1) {
        await this.delay(this.searchDelay);
      }
    }
    
    console.log('❌ No se encontraron conductores después de todos los intentos');
    
    // AGREGAR DELAY DE 30-40 SEGUNDOS
    const minSearchTime2 = 30000 + Math.random() * 10000; // 30-40 segundos
    await this.delay(minSearchTime2);
    
    return {
      success: false,
      message: 'No hay conductores disponibles en tu área',
      maxRadiusSearched: this.searchRadii[this.maxAttempts - 1]
    };
  }

  // Buscar conductores en un radio específico
  async searchDriversInRadius(userLocation, radiusKm) {
    try {
      const backendUrl = getBackendUrl();
      const apiUrl = `${backendUrl}/drivers/available`;
      
      console.log(`📍 Llamando a API: ${apiUrl}`);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.drivers && data.drivers.length > 0) {
          console.log(`✅ ${data.drivers.length} conductores reales encontrados`);
          
          const drivers = data.drivers.map(driver => ({
            id: driver.id,
            name: driver.full_name,
            vehicle: {
              make: driver.vehicle_make || 'N/A',
              model: driver.vehicle_model || 'N/A',
              plate: driver.vehicle_plate || 'N/A',
              color: driver.vehicle_color || 'N/A'
            },
            rating: driver.rating || 4.5,
            trips: driver.total_trips || 0,
            location: {
              latitude: parseFloat(driver.latitude),
              longitude: parseFloat(driver.longitude)
            },
            status: driver.status || 'available',
            eta: this.estimateETA(
              this.calculateDistance(
                userLocation.latitude,
                userLocation.longitude,
                parseFloat(driver.latitude),
                parseFloat(driver.longitude)
              )
            ),
            phone: driver.phone || '+1-809-555-0123'
          }));

          const driversInRadius = drivers.filter(driver => {
            const distance = this.calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              driver.location.latitude,
              driver.location.longitude
            );
            return distance <= radiusKm;
          });

          if (driversInRadius.length > 0) {
            return driversInRadius;
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️ Error conectando a API: ${error.message}`);
    }

    console.log('⚠️ No hay conductores disponibles - SIN FALLBACK');
    return []; // Retornar array vacío - NO usar mock drivers
  }

  // Ordenar conductores por distancia
  sortDriversByDistance(drivers, userLocation) {
    return drivers.sort((a, b) => {
      const distA = this.calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        a.location.latitude,
        a.location.longitude
      );
      const distB = this.calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        b.location.latitude,
        b.location.longitude
      );
      return distA - distB;
    });
  }

  // Generar conductores de prueba
  generateMockDrivers(userLocation, maxRadius) {
    const drivers = [
      {
        id: 'driver_001',
        name: 'Carlos Mendoza',
        vehicle: {
          make: 'Honda',
          model: 'Civic',
          plate: 'A123456',
          color: 'Gris'
        },
        rating: 4.8,
        trips: 1250,
        location: {
          latitude: userLocation.latitude + 0.008, // ~0.9km
          longitude: userLocation.longitude + 0.005
        },
        status: 'available',
        eta: 3
      },
      {
        id: 'driver_002',
        name: 'María Rodríguez',
        vehicle: {
          make: 'Toyota',
          model: 'Corolla',
          plate: 'B789012',
          color: 'Blanco'
        },
        rating: 4.9,
        trips: 2100,
        location: {
          latitude: userLocation.latitude + 0.025, // ~2.8km
          longitude: userLocation.longitude - 0.015
        },
        status: 'available',
        eta: 5
      },
      {
        id: 'driver_003',
        name: 'Juan Pérez',
        vehicle: {
          make: 'Hyundai',
          model: 'Elantra',
          plate: 'C345678',
          color: 'Negro'
        },
        rating: 4.7,
        trips: 890,
        location: {
          latitude: userLocation.latitude - 0.035, // ~3.9km
          longitude: userLocation.longitude + 0.020
        },
        status: 'available',
        eta: 7
      },
      {
        id: 'driver_004',
        name: 'Ana García',
        vehicle: {
          make: 'Nissan',
          model: 'Sentra',
          plate: 'D901234',
          color: 'Azul'
        },
        rating: 4.6,
        trips: 650,
        location: {
          latitude: userLocation.latitude + 0.055, // ~6.2km
          longitude: userLocation.longitude - 0.030
        },
        status: 'available',
        eta: 10
      },
      {
        id: 'driver_005',
        name: 'Roberto Díaz',
        vehicle: {
          make: 'Kia',
          model: 'Forte',
          plate: 'E567890',
          color: 'Rojo'
        },
        rating: 4.5,
        trips: 430,
        location: {
          latitude: userLocation.latitude - 0.080, // ~9km
          longitude: userLocation.longitude + 0.045
        },
        status: 'available',
        eta: 12
      }
    ];

    // Agregar distancia calculada a cada conductor
    return drivers.map(driver => ({
      ...driver,
      distance: this.calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        driver.location.latitude,
        driver.location.longitude
      )
    }));
  }

  // Función de delay
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Estimar tiempo de llegada basado en distancia
  estimateETA(distanceKm) {
    // Estimación: 30 km/h velocidad promedio en ciudad
    const avgSpeed = 30;
    const timeHours = distanceKm / avgSpeed;
    const timeMinutes = Math.ceil(timeHours * 60);
    return Math.max(2, timeMinutes); // Mínimo 2 minutos
  }
}

export default new DriverSearchService();