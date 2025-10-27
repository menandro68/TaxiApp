// src/services/DriverMatchingAlgorithm.js
import firestore from '@react-native-firebase/firestore';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SharedStorage from './SharedStorage'; // NUEVO: Importar SharedStorage

class DriverMatchingAlgorithm {
  constructor() {
    this.searchRadii = [1, 2, 3, 5, 8, 12]; // Radios en km
    this.maxSearchTime = 120000; // 2 minutos máximo
    this.driverResponseTimeout = 15000; // 15 segundos para responder
    this.retryDelay = 2000; // NUEVO: Delay entre reintentos
    this.activeSearches = new Map();
  }

  // Calcular distancia entre dos puntos
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Obtener conductores disponibles desde el BACKEND
  async getAvailableDrivers(centerLat, centerLon, radiusKm) {
    try {
      // Primero intentar conectar al backend en la nube
      const apiUrl = 'https://web-production-99844.up.railway.app/api/drivers/available';
      
      console.log('🌐 Intentando conectar al backend:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Conductores del backend:', data.drivers?.length || 0);
        
        // Devolver conductores del backend
        return data.drivers || [];
      } else {
        console.warn('⚠️ Backend respondió con error, usando modo simulado');
        return this.getSimulatedDrivers(centerLat, centerLon, radiusKm);
      }
    } catch (error) {
      console.error('❌ Error conectando al backend:', error);
      console.log('📦 Usando datos simulados como fallback');
      return this.getSimulatedDrivers(centerLat, centerLon, radiusKm);
    }
  }

  // Datos simulados como FALLBACK
  getSimulatedDrivers(centerLat, centerLon, radiusKm) {
    if (radiusKm <= 3) {
      return [
        {
          id: 'driver1',
          name: 'Juan Pérez',
          rating: 4.8,
          distance: 0.8,
          acceptanceRate: 0.9,
          completedTrips: 250,
          vehicle_model: 'Toyota Corolla',
          vehicle_plate: 'AA-123456',
          currentLocation: { latitude: centerLat + 0.005, longitude: centerLon + 0.005 } 
        },
        {
          id: 'driver2',
          name: 'María García',
          rating: 4.5,
          distance: 1.5,
          acceptanceRate: 0.85,
          completedTrips: 180,
          vehicle_model: 'Honda Civic',
          vehicle_plate: 'BB-789012',
          currentLocation: { latitude: centerLat - 0.008, longitude: centerLon + 0.008 } 
        }
      ];
    } else if (radiusKm <= 8) {
      return [
        {
          id: 'driver3',
          name: 'Carlos López',
          rating: 4.9,
          distance: 5.2,
          acceptanceRate: 0.95,
          completedTrips: 500,
          vehicle_model: 'Hyundai Elantra',
          vehicle_plate: 'CC-345678',
          currentLocation: { latitude: centerLat + 0.02, longitude: centerLon - 0.02 }   
        }
      ];
    }
    return [];
  }

  // NUEVO: Método para buscar conductores en un radio específico
  async searchDriversInRadius(userLocation, radius) {
    return await this.getAvailableDrivers(
      userLocation.latitude,
      userLocation.longitude,
      radius
    );
  }

  // Calcular puntuación de prioridad
  calculateDriverScore(driver, userPreferences = {}) {
    let score = 0;
    
    const distanceScore = Math.max(0, (10 - driver.distance) / 10) * 40;
    score += distanceScore;
    
    const ratingScore = (driver.rating || 4.0) / 5 * 30;
    score += ratingScore;
    
    const acceptanceRate = driver.acceptanceRate || 0.8;
    score += acceptanceRate * 20;
    
    const completedTrips = Math.min(driver.completedTrips || 0, 1000);
    score += (completedTrips / 1000) * 10;
    
    return Math.round(score * 100) / 100;
  }

  // Método principal ACTUALIZADO con filtro de conductores bloqueados
  async findDriver(userLocation, userPreferences = {}) {
    console.log('🔍 Iniciando búsqueda de conductores...');
    
    // Obtener lista de conductores bloqueados
    const blockedDrivers = await SharedStorage.getBlockedDrivers();
    const blockedIds = blockedDrivers.map(driver => driver.id);
    console.log(`🚫 Conductores bloqueados: ${blockedIds.length}`);
    
    for (let i = 0; i < this.searchRadii.length; i++) {
      const radius = this.searchRadii[i];
      console.log(`📡 Intento ${i + 1}/${this.searchRadii.length} - Radio: ${radius}km`);
      
      // Buscar conductores en el radio actual
      const availableDrivers = await this.searchDriversInRadius(userLocation, radius);
      
      // NUEVO: Filtrar conductores bloqueados
      const unblockedDrivers = availableDrivers.filter(
        driver => !blockedIds.includes(driver.id)
      );
      
      console.log(`👥 Encontrados: ${availableDrivers.length} conductores`);
      console.log(`✅ No bloqueados: ${unblockedDrivers.length} conductores`);
      
      if (unblockedDrivers.length > 0) {
        // Calcular puntuación para cada conductor no bloqueado
        const scoredDrivers = unblockedDrivers.map(driver => ({
          ...driver,
          score: this.calculateDriverScore(driver, userPreferences)
        }));
        
        // Ordenar por puntuación (mayor a menor)
        scoredDrivers.sort((a, b) => b.score - a.score);
        
        // Seleccionar el mejor conductor
        const selectedDriver = scoredDrivers[0];
        console.log(`✅ Conductor seleccionado: ${selectedDriver.name} (Score: ${selectedDriver.score})`);
        
        return {
          success: true,
          driver: selectedDriver,
          searchRadius: radius,
          attempts: i + 1,
          totalDriversFound: availableDrivers.length,
          unblockedDriversFound: unblockedDrivers.length
        };
      }
      
      // Esperar antes del siguiente intento
      if (i < this.searchRadii.length - 1) {
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      }
    }
    
    // No se encontraron conductores no bloqueados
    return {
      success: false,
      message: 'No hay conductores disponibles',
      maxRadiusSearched: this.searchRadii[this.searchRadii.length - 1],
      attempts: this.searchRadii.length
    };
  }

  // Método principal con reintentos (VERSIÓN ORIGINAL - mantenida como findDriverWithRetries)
  async findDriverWithRetries(userLocation, tripDetails) {
    console.log('🚕 Iniciando búsqueda de conductor con reintentos...');
    const searchId = Date.now().toString();
    
    this.activeSearches.set(searchId, {
      status: 'searching',
      startTime: Date.now(),
      attempts: 0,
      rejectedDrivers: []
    });

    try {
      for (let i = 0; i < this.searchRadii.length; i++) {
        const radius = this.searchRadii[i];
        console.log(`📍 Búsqueda intento ${i + 1} - Radio: ${radius}km`);
        
        const availableDrivers = await this.getAvailableDrivers(
          userLocation.latitude,
          userLocation.longitude,
          radius
        );

        const searchData = this.activeSearches.get(searchId);
        const filteredDrivers = availableDrivers.filter(
          driver => !searchData.rejectedDrivers.includes(driver.id)
        );

        if (filteredDrivers.length > 0) {
          console.log(`✅ ${filteredDrivers.length} conductores disponibles`);
          
          const scoredDrivers = filteredDrivers.map(driver => ({
            ...driver,
            score: this.calculateDriverScore(driver)
          }));
          
          scoredDrivers.sort((a, b) => b.score - a.score);
          
          for (const driver of scoredDrivers) {
            console.log(`🚗 Intentando con conductor ${driver.name}...`);
            
            const notifyResult = await this.notifyDriver(driver.id, tripDetails);
            
            if (notifyResult.success) {
              const accepted = await this.waitForDriverResponse(
                notifyResult.requestId, 
                driver.id
              );
              
              if (accepted) {
                return {
                  success: true,
                  driver: driver,
                  searchTime: Date.now() - searchData.startTime,
                  attempts: i + 1,
                  rejections: searchData.rejectedDrivers.length
                };
              } else {
                console.log(`❌ Conductor ${driver.name} rechazó`);
                searchData.rejectedDrivers.push(driver.id);
              }
            }
          }
        }
        
        if (i < this.searchRadii.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
      
      return {
        success: false,
        message: 'No hay conductores disponibles o todos rechazaron',
        searchTime: Date.now() - this.activeSearches.get(searchId).startTime,
        rejections: this.activeSearches.get(searchId).rejectedDrivers.length
      };
      
    } finally {
      this.activeSearches.delete(searchId);
    }
  }

  // Esperar respuesta del conductor
  async waitForDriverResponse(requestId, driverId) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const accepted = Math.random() > 0.3;
        console.log(`📱 Respuesta del conductor: ${accepted ? 'ACEPTADO' : 'RECHAZADO'}`);
        resolve(accepted);
      }, 2000);
    });
  }

  // Enviar notificación
  async notifyDriver(driverId, tripRequest) {
    try {
      console.log(`📱 Notificando al conductor ${driverId}`);
      return { success: true, requestId: 'test123' };
    } catch (error) {
      console.error('❌ Error enviando notificación:', error);
      return { success: false, error: error.message };
    }
  }

  // Manejar respuesta
  async handleDriverResponse(requestId, driverId, accepted) {
    try {
      console.log(`📋 Procesando respuesta: ${accepted ? 'ACEPTADO' : 'RECHAZADO'}`);
      return { 
        success: true, 
        accepted: accepted,
        tripId: accepted ? 'trip123' : null
      };
    } catch (error) {
      console.error('❌ Error procesando respuesta:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new DriverMatchingAlgorithm();