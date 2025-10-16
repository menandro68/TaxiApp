/**
 * Sistema de Cálculo de Tarifas Dinámicas
 * Para App de Taxi - República Dominicana
 * Valores en Pesos Dominicanos (RD$)
 */

class FareCalculator {
  constructor() {
    // Configuración de tarifas base para Santo Domingo
    this.config = {
      // Tarifas base por tipo de vehículo
      vehicleTypes: {
        standard: {
          name: 'Estándar',
          baseFare: 100,          // Tarifa base RD$
          perKm: 25,              // Por kilómetro RD$
          perMinute: 5,           // Por minuto RD$
          minFare: 150,           // Tarifa mínima RD$
          icon: '🚗'
        },
        comfort: {
          name: 'Confort',
          baseFare: 150,
          perKm: 35,
          perMinute: 7,
          minFare: 200,
          icon: '🚙'
        },
        premium: {
          name: 'Premium',
          baseFare: 200,
          perKm: 45,
          perMinute: 10,
          minFare: 300,
          icon: '🚘'
        },
        xl: {
          name: 'XL (7 pasajeros)',
          baseFare: 250,
          perKm: 50,
          perMinute: 12,
          minFare: 350,
          icon: '🚐'
        }
      },

      // Zonas de Santo Domingo con multiplicadores
      zones: {
        'Distrito Nacional': 1.0,
        'Santo Domingo Este': 1.0,
        'Santo Domingo Norte': 1.1,
        'Santo Domingo Oeste': 1.1,
        'Boca Chica': 1.2,
        'Aeropuerto Las Américas': 1.5,
        'Zona Colonial': 1.2,
        'Piantini': 1.3,
        'Naco': 1.3
      },

      // Horarios especiales (24 horas)
      timeMultipliers: {
        // Hora pico mañana (7:00 - 9:00)
        peakMorning: {
          start: 7,
          end: 9,
          multiplier: 1.5,
          name: 'Hora Pico Mañana'
        },
        // Hora pico tarde (17:00 - 20:00)
        peakEvening: {
          start: 17,
          end: 20,
          multiplier: 1.5,
          name: 'Hora Pico Tarde'
        },
        // Tarifa nocturna (22:00 - 5:00)
        night: {
          start: 22,
          end: 5,
          multiplier: 1.3,
          name: 'Tarifa Nocturna'
        },
        // Fin de semana
        weekend: {
          multiplier: 1.2,
          name: 'Fin de Semana'
        }
      },

      // Cargos adicionales
      additionalCharges: {
        toll: 50,                    // Peaje promedio RD$
        airportPickup: 200,          // Recogida en aeropuerto
        waitingTime: 3,              // Por minuto de espera RD$
        extraStop: 75,               // Parada adicional RD$
        luggage: 25,                 // Por maleta grande RD$
        pet: 100,                    // Mascota
        rain: 1.2                    // Multiplicador por lluvia
      },

      // Descuentos y promociones
      discounts: {
        firstRide: 0.5,              // 50% primera carrera
        student: 0.15,               // 15% estudiantes
        senior: 0.20,                // 20% tercera edad
        corporate: 0.10,             // 10% corporativo
        loyaltyProgram: {
          bronze: 0.05,              // 5% descuento
          silver: 0.10,              // 10% descuento
          gold: 0.15,                // 15% descuento
          platinum: 0.20             // 20% descuento
        }
      },

      // Configuración de propinas sugeridas
      tipSuggestions: [
        { percentage: 10, label: '10%' },
        { percentage: 15, label: '15%' },
        { percentage: 20, label: '20%' },
        { percentage: 0, label: 'Sin propina' }
      ]
    };

    // Estado de clima (se actualizaría desde una API)
    this.weatherConditions = {
      isRaining: false,
      severity: 'normal' // normal, light, heavy
    };
  }

  /**
   * Calcula la tarifa del viaje
   * @param {Object} tripDetails - Detalles del viaje
   * @returns {Object} Desglose completo de la tarifa
   */
  calculateFare(tripDetails) {
    const {
      vehicleType = 'standard',
      distance,           // en kilómetros
      duration,           // en minutos
      pickupZone,
      dropoffZone,
      stops = [],
      hasLuggage = false,
      hasPet = false,
      isAirportPickup = false,
      discountCode = null,
      loyaltyLevel = null,
      tipPercentage = 0
    } = tripDetails;

    // Obtener configuración del vehículo
    const vehicle = this.config.vehicleTypes[vehicleType];
    if (!vehicle) {
      throw new Error('Tipo de vehículo no válido');
    }

    // Cálculo base
    let baseFare = vehicle.baseFare;
    let distanceFare = distance * vehicle.perKm;
    let timeFare = duration * vehicle.perMinute;
    
    // Subtotal inicial
    let subtotal = baseFare + distanceFare + timeFare;

    // Aplicar multiplicadores de zona
    const zoneMultiplier = this.getZoneMultiplier(pickupZone, dropoffZone);
    subtotal *= zoneMultiplier;

    // Aplicar multiplicadores de tiempo
    const timeMultiplier = this.getTimeMultiplier();
    subtotal *= timeMultiplier.multiplier;

    // Aplicar multiplicador de clima
    if (this.weatherConditions.isRaining) {
      subtotal *= this.config.additionalCharges.rain;
    }

    // Cargos adicionales
    let additionalCharges = 0;
    
    if (isAirportPickup) {
      additionalCharges += this.config.additionalCharges.airportPickup;
    }
    
    if (stops.length > 0) {
      additionalCharges += stops.length * this.config.additionalCharges.extraStop;
    }
    
    if (hasLuggage) {
      additionalCharges += this.config.additionalCharges.luggage;
    }
    
    if (hasPet) {
      additionalCharges += this.config.additionalCharges.pet;
    }

    // Total antes de descuentos
    let totalBeforeDiscount = subtotal + additionalCharges;

    // Aplicar descuentos
    let discountAmount = 0;
    let discountApplied = null;

    if (discountCode) {
      const discount = this.applyDiscountCode(discountCode, totalBeforeDiscount);
      discountAmount = discount.amount;
      discountApplied = discount.description;
    } else if (loyaltyLevel) {
      const loyaltyDiscount = this.config.discounts.loyaltyProgram[loyaltyLevel] || 0;
      discountAmount = totalBeforeDiscount * loyaltyDiscount;
      discountApplied = `Descuento ${loyaltyLevel} (${loyaltyDiscount * 100}%)`;
    }

    // Total después de descuentos
    let finalTotal = totalBeforeDiscount - discountAmount;

    // Aplicar tarifa mínima
    if (finalTotal < vehicle.minFare) {
      finalTotal = vehicle.minFare;
    }

    // Calcular propina
    const tipAmount = finalTotal * (tipPercentage / 100);
    const totalWithTip = finalTotal + tipAmount;

    // Retornar desglose completo
    return {
      breakdown: {
        baseFare: this.roundToTwo(baseFare),
        distanceFare: this.roundToTwo(distanceFare),
        timeFare: this.roundToTwo(timeFare),
        zoneMultiplier: zoneMultiplier,
        timeMultiplier: timeMultiplier,
        weatherMultiplier: this.weatherConditions.isRaining ? this.config.additionalCharges.rain : 1,
        additionalCharges: this.roundToTwo(additionalCharges),
        subtotal: this.roundToTwo(totalBeforeDiscount),
        discountAmount: this.roundToTwo(discountAmount),
        discountApplied: discountApplied,
        finalTotal: this.roundToTwo(finalTotal),
        tipAmount: this.roundToTwo(tipAmount),
        totalWithTip: this.roundToTwo(totalWithTip)
      },
      summary: {
        vehicleType: vehicle.name,
        vehicleIcon: vehicle.icon,
        distance: `${distance} km`,
        duration: `${duration} min`,
        total: this.formatCurrency(finalTotal),
        totalWithTip: this.formatCurrency(totalWithTip),
        savings: discountAmount > 0 ? this.formatCurrency(discountAmount) : null
      },
      metadata: {
        calculatedAt: new Date().toISOString(),
        pickupZone: pickupZone,
        dropoffZone: dropoffZone,
        stops: stops.length,
        special: {
          isAirportPickup,
          hasLuggage,
          hasPet,
          isRaining: this.weatherConditions.isRaining
        }
      }
    };
  }

  /**
   * Obtiene el multiplicador de zona
   */
  getZoneMultiplier(pickupZone, dropoffZone) {
    const pickupMultiplier = this.config.zones[pickupZone] || 1.0;
    const dropoffMultiplier = this.config.zones[dropoffZone] || 1.0;
    return Math.max(pickupMultiplier, dropoffMultiplier);
  }

  /**
   * Obtiene el multiplicador de tiempo actual
   */
  getTimeMultiplier() {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    
    // Verificar fin de semana
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return {
        multiplier: this.config.timeMultipliers.weekend.multiplier,
        name: this.config.timeMultipliers.weekend.name
      };
    }
    
    // Verificar hora pico mañana
    if (hour >= this.config.timeMultipliers.peakMorning.start && 
        hour < this.config.timeMultipliers.peakMorning.end) {
      return this.config.timeMultipliers.peakMorning;
    }
    
    // Verificar hora pico tarde
    if (hour >= this.config.timeMultipliers.peakEvening.start && 
        hour < this.config.timeMultipliers.peakEvening.end) {
      return this.config.timeMultipliers.peakEvening;
    }
    
    // Verificar tarifa nocturna
    if (hour >= this.config.timeMultipliers.night.start || 
        hour < this.config.timeMultipliers.night.end) {
      return this.config.timeMultipliers.night;
    }
    
    // Tarifa normal
    return {
      multiplier: 1.0,
      name: 'Tarifa Normal'
    };
  }

  /**
   * Aplica código de descuento
   */
  applyDiscountCode(code, amount) {
    const discountCodes = {
      'PRIMERA': { discount: 0.5, description: '50% Primera Carrera' },
      'ESTUDIANTE': { discount: 0.15, description: '15% Descuento Estudiante' },
      'SENIOR': { discount: 0.20, description: '20% Tercera Edad' },
      'CORP2024': { discount: 0.10, description: '10% Corporativo' },
      'VERANO25': { discount: 0.25, description: '25% Promoción Verano' }
    };

    const discountInfo = discountCodes[code.toUpperCase()];
    if (discountInfo) {
      return {
        amount: amount * discountInfo.discount,
        description: discountInfo.description
      };
    }

    return { amount: 0, description: null };
  }

  /**
   * Estima la tarifa antes del viaje
   */
  estimateFare(pickupCoords, dropoffCoords, vehicleType = 'standard') {
    // Estimación basada en distancia lineal (se mejoraría con Google Directions API)
    const distance = this.calculateDistance(pickupCoords, dropoffCoords);
    const estimatedDuration = Math.round(distance * 3); // Estimación: 3 min por km
    
    const estimation = this.calculateFare({
      vehicleType,
      distance,
      duration: estimatedDuration,
      pickupZone: 'Santo Domingo Este',
      dropoffZone: 'Distrito Nacional'
    });

    return {
      min: this.roundToTwo(estimation.breakdown.finalTotal * 0.9),
      max: this.roundToTwo(estimation.breakdown.finalTotal * 1.1),
      estimated: estimation.breakdown.finalTotal,
      currency: 'RD$',
      disclaimer: 'Precio estimado. El precio final puede variar según tráfico y ruta.'
    };
  }

  /**
   * Calcula distancia entre dos puntos (Haversine)
   */
  calculateDistance(coord1, coord2) {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.toRad(coord2.lat - coord1.lat);
    const dLon = this.toRad(coord2.lng - coord1.lng);
    const lat1 = this.toRad(coord1.lat);
    const lat2 = this.toRad(coord2.lat);

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.sin(dLon/2) * Math.sin(dLon/2) * 
              Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c;
    
    return Math.round(d * 10) / 10; // Redondear a 1 decimal
  }

  /**
   * Actualiza condiciones del clima
   */
  updateWeatherConditions(isRaining, severity = 'normal') {
    this.weatherConditions.isRaining = isRaining;
    this.weatherConditions.severity = severity;
  }

  /**
   * Obtiene sugerencias de propina
   */
  getTipSuggestions(fareAmount) {
    return this.config.tipSuggestions.map(tip => ({
      ...tip,
      amount: this.roundToTwo(fareAmount * (tip.percentage / 100))
    }));
  }

  // Utilidades
  toRad(Value) {
    return Value * Math.PI / 180;
  }

  roundToTwo(num) {
    return Math.round(num * 100) / 100;
  }

  formatCurrency(amount) {
    return `RD$ ${amount.toLocaleString('es-DO', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    })}`;
  }
}

export default new FareCalculator();