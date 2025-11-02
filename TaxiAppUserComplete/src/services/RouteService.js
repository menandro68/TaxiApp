import { GOOGLE_MAPS_CONFIG } from '../config/config';

// ============================================
// CONFIGURACIÃ“N DE TARIFAS
// ============================================

const PRICING_CONFIG = {
  // Tarifas base en RD$ (Pesos Dominicanos)
  BASE_FARE: 60,           // Tarifa base
  PRICE_PER_KM: 25,        // RD$ por kilÃ³metro
  PRICE_PER_MINUTE: 8,     // RD$ por minuto
  MINIMUM_FARE: 120,       // Tarifa mÃ­nima
  
  // Factores de multiplicaciÃ³n por hora
  PEAK_HOURS_MULTIPLIER: 1.5,   // Horas pico (7-9 AM, 5-7 PM)
  NIGHT_MULTIPLIER: 1.3,        // Noche (10 PM - 6 AM)
  WEEKEND_MULTIPLIER: 1.2,      // Fines de semana
  
  // Horas pico
  PEAK_HOURS: [
    { start: 7, end: 9 },    // 7 AM - 9 AM
    { start: 17, end: 19 }   // 5 PM - 7 PM
  ],
  
  // Tipos de vehÃ­culo
  VEHICLE_TYPES: {
    economy: {
      name: 'EconÃ³mico',
      multiplier: 1.0,
      description: 'La opciÃ³n mÃ¡s econÃ³mica'
    },
    comfort: {
      name: 'Confort',
      multiplier: 1.3,
      description: 'VehÃ­culos mÃ¡s cÃ³modos'
    },
    premium: {
      name: 'Premium',
      multiplier: 1.8,
      description: 'VehÃ­culos de lujo'
    }
  }
};

// ============================================
// SERVICIO DE RUTAS
// ============================================

class RouteService {
  
  // ============================================
  // OBTENER RUTA ENTRE DOS PUNTOS
  // ============================================
  
  static async getRoute(origin, destination, vehicleType = 'economy') {
    try {
      console.log('ðŸ—ºï¸ Calculando ruta:', { origin, destination, vehicleType });
      
      const originStr = `${origin.latitude},${origin.longitude}`;
      const destinationStr = `${destination.latitude},${destination.longitude}`;
      
      const url = `https://maps.googleapis.com/maps/api/directions/json?` +
        `origin=${originStr}&` +
        `destination=${destinationStr}&` +
        `mode=driving&` +
        `language=es&` +
        `region=do&` +
        `key=${GOOGLE_MAPS_CONFIG.API_KEY}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status !== 'OK') {
        throw new Error(`Error en Google Directions: ${data.status}`);
      }
      
      if (!data.routes || data.routes.length === 0) {
        throw new Error('No se encontraron rutas');
      }
      
      const route = data.routes[0];
      const leg = route.legs[0];
      
      // Extraer informaciÃ³n de la ruta
      const routeInfo = {
        distance: {
          text: leg.distance.text,
          meters: leg.distance.value,
          kilometers: (leg.distance.value / 1000).toFixed(1)
        },
        duration: {
          text: leg.duration.text,
          seconds: leg.duration.value,
          minutes: Math.ceil(leg.duration.value / 60)
        },
        polyline: route.overview_polyline.points,
        steps: leg.steps.map(step => ({
          instruction: step.html_instructions.replace(/<[^>]*>/g, ''),
          distance: step.distance.text,
          duration: step.duration.text,
          startLocation: step.start_location,
          endLocation: step.end_location
        })),
        bounds: {
          northeast: route.bounds.northeast,
          southwest: route.bounds.southwest
        }
      };
      
      // Calcular precio estimado
      const pricing = this.calculatePrice(
        routeInfo.distance.kilometers,
        routeInfo.duration.minutes,
        vehicleType
      );
      
      const result = {
        ...routeInfo,
        pricing,
        vehicleType,
        timestamp: new Date().toISOString()
      };
      
      console.log('âœ… Ruta calculada:', result);
      return result;
      
    } catch (error) {
      console.error('âŒ Error calculando ruta:', error);
      throw error;
    }
  }
  
  // ============================================
  // CALCULAR PRECIO DEL VIAJE
  // ============================================
  
  static calculatePrice(distanceKm, durationMinutes, vehicleType = 'economy') {
    try {
      const distance = parseFloat(distanceKm);
      const duration = parseInt(durationMinutes);
      
      // CÃ¡lculo base
      let basePrice = PRICING_CONFIG.BASE_FARE + 
                     (distance * PRICING_CONFIG.PRICE_PER_KM) + 
                     (duration * PRICING_CONFIG.PRICE_PER_MINUTE);
      
      // Aplicar tarifa mÃ­nima
      basePrice = Math.max(basePrice, PRICING_CONFIG.MINIMUM_FARE);
      
      // Multiplicador por tipo de vehÃ­culo
      const vehicleMultiplier = PRICING_CONFIG.VEHICLE_TYPES[vehicleType]?.multiplier || 1.0;
      basePrice *= vehicleMultiplier;
      
      // Multiplicadores por hora
      const now = new Date();
      const currentHour = now.getHours();
      const isWeekend = now.getDay() === 0 || now.getDay() === 6;
      
      let timeMultiplier = 1.0;
      
      // Horas pico
      const isPeakHour = PRICING_CONFIG.PEAK_HOURS.some(
        peak => currentHour >= peak.start && currentHour < peak.end
      );
      
      if (isPeakHour) {
        timeMultiplier = PRICING_CONFIG.PEAK_HOURS_MULTIPLIER;
      }
      // Horas nocturnas
      else if (currentHour >= 22 || currentHour < 6) {
        timeMultiplier = PRICING_CONFIG.NIGHT_MULTIPLIER;
      }
      // Fines de semana
      else if (isWeekend) {
        timeMultiplier = PRICING_CONFIG.WEEKEND_MULTIPLIER;
      }
      
      const finalPrice = Math.round(basePrice * timeMultiplier);
      
      const pricingDetails = {
        basePrice: Math.round(basePrice / timeMultiplier),
        vehicleType,
        vehicleMultiplier,
        timeMultiplier,
        timeType: isPeakHour ? 'peak' : 
                 (currentHour >= 22 || currentHour < 6) ? 'night' : 
                 isWeekend ? 'weekend' : 'normal',
        finalPrice,
        currency: 'RD$',
        breakdown: {
          baseFare: PRICING_CONFIG.BASE_FARE,
          distanceFare: Math.round(distance * PRICING_CONFIG.PRICE_PER_KM),
          timeFare: Math.round(duration * PRICING_CONFIG.PRICE_PER_MINUTE),
          minimumFare: PRICING_CONFIG.MINIMUM_FARE
        }
      };
      
      console.log('ðŸ’° Precio calculado:', pricingDetails);
      return pricingDetails;
      
    } catch (error) {
      console.error('âŒ Error calculando precio:', error);
      return {
        finalPrice: PRICING_CONFIG.MINIMUM_FARE,
        error: 'Error en cÃ¡lculo de precio'
      };
    }
  }
  
  // ============================================
  // ESTIMACIÃ“N RÃPIDA SIN API (PARA PREVIEW)
  // ============================================
  
  static estimateQuickPrice(origin, destination, vehicleType = 'economy') {
    try {
      // CÃ¡lculo aproximado usando distancia en lÃ­nea recta
      const distance = this.calculateStraightLineDistance(origin, destination);
      const estimatedDuration = Math.max(distance * 2, 10); // Aproximadamente 2 min por km
      
      const pricing = this.calculatePrice(distance, estimatedDuration, vehicleType);
      
      return {
        distance: {
          kilometers: distance.toFixed(1),
          text: `${distance.toFixed(1)} km (aprox.)`
        },
        duration: {
          minutes: estimatedDuration,
          text: `${estimatedDuration} min (aprox.)`
        },
        pricing,
        isEstimate: true
      };
      
    } catch (error) {
      console.error('âŒ Error en estimaciÃ³n rÃ¡pida:', error);
      return null;
    }
  }
  
  // ============================================
  // CALCULAR DISTANCIA EN LÃNEA RECTA
  // ============================================
  
  static calculateStraightLineDistance(origin, destination) {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.toRad(destination.latitude - origin.latitude);
    const dLon = this.toRad(destination.longitude - origin.longitude);
    
    const lat1 = this.toRad(origin.latitude);
    const lat2 = this.toRad(destination.latitude);
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.sin(dLon/2) * Math.sin(dLon/2) * 
              Math.cos(lat1) * Math.cos(lat2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return distance;
  }
  
  static toRad(deg) {
    return deg * (Math.PI/180);
  }
  
  // ============================================
  // DECODIFICAR POLYLINE PARA MOSTRAR RUTA
  // ============================================
  
  static decodePolyline(encoded) {
    try {
      const poly = [];
      let index = 0;
      const len = encoded.length;
      let lat = 0;
      let lng = 0;
      
      while (index < len) {
        let b;
        let shift = 0;
        let result = 0;
        
        do {
          b = encoded.charCodeAt(index++) - 63;
          result |= (b & 0x1f) << shift;
          shift += 5;
        } while (b >= 0x20);
        
        const dlat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
        lat += dlat;
        
        shift = 0;
        result = 0;
        
        do {
          b = encoded.charCodeAt(index++) - 63;
          result |= (b & 0x1f) << shift;
          shift += 5;
        } while (b >= 0x20);
        
        const dlng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
        lng += dlng;
        
        poly.push({
          latitude: lat / 1e5,
          longitude: lng / 1e5
        });
      }
      
      return poly;
    } catch (error) {
      console.error('âŒ Error decodificando polyline:', error);
      return [];
    }
  }
  
  // ============================================
  // OBTENER MÃšLTIPLES OPCIONES DE VEHÃCULO
  // ============================================
  
  static async getMultipleVehicleOptions(origin, destination) {
    try {
      const baseRoute = await this.getRoute(origin, destination, 'economy');
      
      const options = Object.keys(PRICING_CONFIG.VEHICLE_TYPES).map(vehicleType => {
        const vehicleInfo = PRICING_CONFIG.VEHICLE_TYPES[vehicleType];
        const pricing = this.calculatePrice(
          baseRoute.distance.kilometers,
          baseRoute.duration.minutes,
          vehicleType
        );
        
        return {
          vehicleType,
          name: vehicleInfo.name,
          description: vehicleInfo.description,
          price: pricing.finalPrice,
          eta: baseRoute.duration.text,
          distance: baseRoute.distance.text,
          pricing
        };
      });
      
      return {
        route: baseRoute,
        options
      };
      
    } catch (error) {
      console.error('âŒ Error obteniendo opciones de vehÃ­culo:', error);
      throw error;
    }
  }
}

// ============================================
// EXPORTACIONES
// ============================================

export default RouteService;
export { PRICING_CONFIG };