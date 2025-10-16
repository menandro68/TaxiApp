import RouteService from './RouteService';

// ============================================
// SERVICIO DE TRACKING DEL CONDUCTOR
// ============================================

class DriverTrackingService {
  
  // Variables estÃ¡ticas para el tracking
  static trackingInterval = null;
  static currentRoute = null;
  static currentStep = 0;
  static totalSteps = 0;
  static isTracking = false;
  static callbacks = {
    onLocationUpdate: null,
    onArrival: null,
    onRouteProgress: null
  };

  // ============================================
  // INICIAR TRACKING DEL CONDUCTOR
  // ============================================
  
  static async startTracking(driverLocation, destinationLocation, callbacks = {}) {
    try {
      console.log('ðŸš— Iniciando tracking del conductor...', {
        driver: driverLocation,
        destination: destinationLocation
      });

      // Guardar callbacks
      this.callbacks = { ...this.callbacks, ...callbacks };

      // Obtener ruta del conductor al pasajero/destino
      const route = await RouteService.getRoute(driverLocation, destinationLocation);
      
      if (!route || !route.polyline) {
        throw new Error('No se pudo obtener la ruta del conductor');
      }

      // Decodificar polyline para obtener puntos de la ruta
      const routePoints = RouteService.decodePolyline(route.polyline);
      
      if (routePoints.length === 0) {
        throw new Error('No se pudieron decodificar los puntos de la ruta');
      }

      // Configurar tracking
      this.currentRoute = routePoints;
      this.currentStep = 0;
      this.totalSteps = routePoints.length;
      this.isTracking = true;

      console.log('âœ… Ruta configurada para tracking:', {
        totalPoints: this.totalSteps,
        distance: route.distance.text,
        duration: route.duration.text
      });

      // Iniciar movimiento simulado
      this.startMovementSimulation();

      return {
        success: true,
        route,
        totalSteps: this.totalSteps,
        estimatedDuration: route.duration.seconds
      };

    } catch (error) {
      console.error('âŒ Error iniciando tracking:', error);
      
      // Fallback: simular movimiento directo
      this.startDirectMovement(driverLocation, destinationLocation);
      
      return {
        success: false,
        error: error.message,
        fallback: true
      };
    }
  }

  // ============================================
  // SIMULACIÃ“N DE MOVIMIENTO A LO LARGO DE LA RUTA
  // ============================================
  
  static startMovementSimulation() {
    // Limpiar interval anterior si existe
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
    }

    // Velocidad de movimiento (cada 2 segundos)
    const updateInterval = 2000;
    
    // Calcular puntos por segundo basado en la duraciÃ³n estimada
    const pointsPerUpdate = Math.max(1, Math.floor(this.totalSteps / 30)); // Aproximadamente 30 actualizaciones para completar el viaje

    this.trackingInterval = setInterval(() => {
      if (!this.isTracking || this.currentStep >= this.totalSteps) {
        this.stopTracking();
        return;
      }

      // Obtener posiciÃ³n actual
      const currentPosition = this.currentRoute[this.currentStep];
      
      // Calcular progreso
      const progress = (this.currentStep / this.totalSteps) * 100;
      const remainingSteps = this.totalSteps - this.currentStep;
      const estimatedTimeRemaining = Math.ceil((remainingSteps / pointsPerUpdate) * (updateInterval / 1000 / 60)); // En minutos

      // Crear informaciÃ³n del conductor
      const driverUpdate = {
        location: {
          latitude: currentPosition.latitude,
          longitude: currentPosition.longitude
        },
        progress: progress,
        remainingSteps: remainingSteps,
        estimatedTimeRemaining: estimatedTimeRemaining,
        currentStep: this.currentStep,
        totalSteps: this.totalSteps,
        isMoving: true,
        timestamp: new Date().toISOString()
      };

      console.log('ðŸ“ Actualizando posiciÃ³n del conductor:', {
        step: this.currentStep,
        progress: `${progress.toFixed(1)}%`,
        eta: `${estimatedTimeRemaining} min`,
        location: currentPosition
      });

      // Ejecutar callback de actualizaciÃ³n de ubicaciÃ³n
      if (this.callbacks.onLocationUpdate) {
        this.callbacks.onLocationUpdate(driverUpdate);
      }

      // Ejecutar callback de progreso de ruta
      if (this.callbacks.onRouteProgress) {
        this.callbacks.onRouteProgress({
          progress: progress,
          currentStep: this.currentStep,
          totalSteps: this.totalSteps,
          estimatedTimeRemaining: estimatedTimeRemaining
        });
      }

      // Avanzar en la ruta
      this.currentStep += pointsPerUpdate;

      // Verificar si llegÃ³ al destino
      if (this.currentStep >= this.totalSteps - 1) {
        console.log('ðŸŽ¯ Â¡Conductor ha llegado al destino!');
        
        // Ejecutar callback de llegada
        if (this.callbacks.onArrival) {
          this.callbacks.onArrival({
            finalLocation: this.currentRoute[this.totalSteps - 1],
            totalTime: Math.ceil((this.totalSteps * updateInterval) / 1000 / 60),
            completedSteps: this.totalSteps
          });
        }

        this.stopTracking();
      }

    }, updateInterval);
  }

  // ============================================
  // MOVIMIENTO DIRECTO (FALLBACK)
  // ============================================
  
  static startDirectMovement(startLocation, endLocation) {
    console.log('ðŸ”„ Iniciando movimiento directo (fallback)');
    
    // Crear puntos intermedios para movimiento suave
    const steps = 20; // 20 pasos para llegar al destino
    const latStep = (endLocation.latitude - startLocation.latitude) / steps;
    const lngStep = (endLocation.longitude - startLocation.longitude) / steps;
    
    let currentStep = 0;
    
    this.trackingInterval = setInterval(() => {
      if (currentStep >= steps) {
        this.stopTracking();
        
        if (this.callbacks.onArrival) {
          this.callbacks.onArrival({
            finalLocation: endLocation,
            totalTime: Math.ceil((steps * 3000) / 1000 / 60), // 3 segundos por paso
            completedSteps: steps
          });
        }
        return;
      }

      const currentLocation = {
        latitude: startLocation.latitude + (latStep * currentStep),
        longitude: startLocation.longitude + (lngStep * currentStep)
      };

      const progress = (currentStep / steps) * 100;
      const estimatedTimeRemaining = Math.ceil((steps - currentStep) * 3 / 60); // 3 segundos por paso

      const driverUpdate = {
        location: currentLocation,
        progress: progress,
        remainingSteps: steps - currentStep,
        estimatedTimeRemaining: estimatedTimeRemaining,
        currentStep: currentStep,
        totalSteps: steps,
        isMoving: true,
        timestamp: new Date().toISOString(),
        fallbackMode: true
      };

      console.log('ðŸ“ Movimiento directo - Paso:', currentStep, 'Progreso:', `${progress.toFixed(1)}%`);

      if (this.callbacks.onLocationUpdate) {
        this.callbacks.onLocationUpdate(driverUpdate);
      }

      if (this.callbacks.onRouteProgress) {
        this.callbacks.onRouteProgress({
          progress: progress,
          currentStep: currentStep,
          totalSteps: steps,
          estimatedTimeRemaining: estimatedTimeRemaining
        });
      }

      currentStep++;
    }, 3000); // Cada 3 segundos
  }

  // ============================================
  // DETENER TRACKING
  // ============================================
  
  static stopTracking() {
    console.log('ðŸ›‘ Deteniendo tracking del conductor');
    
    this.isTracking = false;
    
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }

    // Reset variables
    this.currentRoute = null;
    this.currentStep = 0;
    this.totalSteps = 0;
  }

  // ============================================
  // PAUSAR/REANUDAR TRACKING
  // ============================================
  
  static pauseTracking() {
    console.log('â¸ï¸ Pausando tracking del conductor');
    
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }
    
    this.isTracking = false;
  }

  static resumeTracking() {
    console.log('â–¶ï¸ Reanudando tracking del conductor');
    
    if (this.currentRoute && this.currentStep < this.totalSteps) {
      this.isTracking = true;
      this.startMovementSimulation();
    }
  }

  // ============================================
  // OBTENER ESTADO ACTUAL
  // ============================================
  
  static getCurrentState() {
    return {
      isTracking: this.isTracking,
      currentStep: this.currentStep,
      totalSteps: this.totalSteps,
      progress: this.totalSteps > 0 ? (this.currentStep / this.totalSteps) * 100 : 0,
      currentLocation: this.currentRoute && this.currentStep < this.totalSteps 
        ? this.currentRoute[this.currentStep] 
        : null,
      hasRoute: this.currentRoute !== null
    };
  }

  // ============================================
  // SIMULAR DIFERENTES VELOCIDADES
  // ============================================
  
  static setTrackingSpeed(speed = 'normal') {
    const speeds = {
      slow: 4000,    // 4 segundos por actualizaciÃ³n
      normal: 2000,  // 2 segundos por actualizaciÃ³n  
      fast: 1000,    // 1 segundo por actualizaciÃ³n
      veryfast: 500  // 0.5 segundos por actualizaciÃ³n
    };

    const interval = speeds[speed] || speeds.normal;
    
    if (this.isTracking && this.trackingInterval) {
      this.stopTracking();
      setTimeout(() => {
        this.startMovementSimulation();
      }, 100);
    }

    console.log(`ðŸŽï¸ Velocidad de tracking configurada a: ${speed} (${interval}ms)`);
  }

  // ============================================
  // CALCULAR ETA DINÃMICO
  // ============================================
  
  static calculateDynamicETA() {
    if (!this.isTracking || !this.currentRoute) {
      return null;
    }

    const remainingSteps = this.totalSteps - this.currentStep;
    const averageStepTime = 2; // segundos por paso
    const estimatedSeconds = remainingSteps * averageStepTime;
    const estimatedMinutes = Math.ceil(estimatedSeconds / 60);

    return {
      seconds: estimatedSeconds,
      minutes: estimatedMinutes,
      text: estimatedMinutes === 1 ? '1 min' : `${estimatedMinutes} min`,
      remainingSteps: remainingSteps,
      completionPercentage: (this.currentStep / this.totalSteps) * 100
    };
  }

  // ============================================
  // SIMULAR EVENTOS DEL CONDUCTOR
  // ============================================
  
  static simulateDriverEvents() {
    // Simular eventos aleatorios durante el viaje
    const events = [
      'conductor_started',
      'conductor_pickup_area',
      'conductor_waiting',
      'conductor_arrived'
    ];

    // Simular evento aleatorio cada 30-60 segundos
    const randomDelay = Math.random() * 30000 + 30000;
    
    setTimeout(() => {
      if (this.isTracking) {
        const randomEvent = events[Math.floor(Math.random() * events.length)];
        console.log('ðŸŽ­ Evento del conductor simulado:', randomEvent);
        
        // AquÃ­ podrÃ­as ejecutar callbacks especÃ­ficos para cada evento
        if (this.callbacks.onDriverEvent) {
          this.callbacks.onDriverEvent({
            event: randomEvent,
            timestamp: new Date().toISOString(),
            currentLocation: this.currentRoute ? this.currentRoute[this.currentStep] : null
          });
        }
      }
    }, randomDelay);
  }
}

// ============================================
// EXPORTACIÃ“N
// ============================================

export default DriverTrackingService;