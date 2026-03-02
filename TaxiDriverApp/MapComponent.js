import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Linking } from 'react-native';
import MapView, { Marker, Polyline, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import Tts from 'react-native-tts';
import MapViewDirections from 'react-native-maps-directions';

// Configurar TTS
Tts.setDefaultLanguage('es-ES');
Tts.setDefaultRate(0.5);

const GOOGLE_MAPS_APIKEY = 'AIzaSyC6HuO-nRJxdZctdH0o_-nuezUOILq868Q';

const decodePolyline = (encoded) => {
  const points = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += ((result & 1) ? ~(result >> 1) : (result >> 1));
    shift = 0; result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += ((result & 1) ? ~(result >> 1) : (result >> 1));
    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
};

// Limpiar HTML de instrucciones
const cleanInstruction = (html) => {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
};

// Calcular distancia mínima del conductor a la ruta (en metros)
// VERSIÓN PROFESIONAL: Calcula distancia al SEGMENTO más cercano, no solo puntos
const getDistanceToRoute = (location, routeCoords) => {
  if (!location || !routeCoords || routeCoords.length < 2) return Infinity;
  
  const toRad = (deg) => deg * Math.PI / 180;
  const R = 6371000; // Radio de la Tierra en metros
  
  // Función para calcular distancia entre dos puntos
  const haversine = (lat1, lon1, lat2, lon2) => {
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };
  
  // Función para calcular distancia perpendicular a un segmento de línea
  const distanceToSegment = (px, py, x1, y1, x2, y2) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    
    if (dx === 0 && dy === 0) {
      return haversine(px, py, x1, y1);
    }
    
    // Proyección del punto sobre la línea (0-1 = dentro del segmento)
    let t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
    t = Math.max(0, Math.min(1, t)); // Limitar al segmento
    
    // Punto más cercano en el segmento
    const closestLat = x1 + t * dx;
    const closestLng = y1 + t * dy;
    
    return haversine(px, py, closestLat, closestLng);
  };
  
  let minDistance = Infinity;
  
  // Verificar distancia a cada SEGMENTO de la ruta
  for (let i = 0; i < routeCoords.length - 1; i++) {
    const dist = distanceToSegment(
      location.latitude, location.longitude,
      routeCoords[i].latitude, routeCoords[i].longitude,
      routeCoords[i + 1].latitude, routeCoords[i + 1].longitude
    );
    if (dist < minDistance) minDistance = dist;
  }
  
  return minDistance;
};
const MapComponent = ({ currentTrip, tripPhase, userLocation: propUserLocation, currentStopIndex, tripStops, onLocationUpdate, onStartBackgroundTracking, onArrivedAtPickup, onArrivedAtDestination, onCancelTrip, onRouteInfoUpdate }) => {
  const mapRef = useRef(null);
  const [currentLocation, setCurrentLocation] = useState(propUserLocation || null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const routeFetched = useRef(false);
  const mapCentered = useRef(false);
  const [navigationSteps, setNavigationSteps] = useState([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const lastSpokenStep = useRef(-1);
  const spokenAnnouncements = useRef({});
  const isGettingLocation = useRef(false);
  const lastRerouteTime = useRef(0);
  const originalRouteRef = useRef([]);
  const consecutiveOffRoute = useRef(0);
  const isRerouting = useRef(false); // NUEVO: Flag para evitar recálculos simultáneos
  const lastValidHeading = useRef(0); // Guardar último heading válido

const pickupLat = currentTrip?.pickupLat || currentTrip?.pickupLocation?.latitude;
  const pickupLng = currentTrip?.pickupLng || currentTrip?.pickupLocation?.longitude;

  const pickupCoord = pickupLat && pickupLng ? {
    latitude: parseFloat(pickupLat),
    longitude: parseFloat(pickupLng)
  } : null;

  // Coordenadas del destino
  const destLat = currentTrip?.destinationLat || currentTrip?.destinationLocation?.latitude;
  const destLng = currentTrip?.destinationLng || currentTrip?.destinationLocation?.longitude;

  const destCoord = destLat && destLng ? {
    latitude: parseFloat(destLat),
    longitude: parseFloat(destLng)
  } : null;

  // Destino de navegación según la fase del viaje
  // Si hay múltiples destinos, usar el destino según currentStopIndex
  const getNavigationTarget = () => {
    if (tripPhase !== 'started') return pickupCoord;
    
    const additionalStops = tripStops?.additionalStops || [];
    if (currentStopIndex === 0 || additionalStops.length === 0) {
      return destCoord; // Primer destino principal
    }
    
    // Destino adicional - necesitamos geocodificar la dirección
    // Por ahora usamos destCoord como fallback
    return destCoord;
  };
  const navigationTarget = getNavigationTarget();

  // Sincronizar ubicación del padre (App.js) con estado local
useEffect(() => {
    if (propUserLocation && propUserLocation.latitude && propUserLocation.longitude) {
      setCurrentLocation(propUserLocation);
    }
}, [propUserLocation]);

 // ✅ Animar mapa siguiendo al conductor en tiempo real
  useEffect(() => {
    if (mapRef.current && currentLocation && currentLocation.latitude) {
      mapRef.current.animateCamera({
        center: {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
        },
        zoom: 15,
      }, { duration: 800 });
    }
  }, [currentLocation]);

  // Obtener ubicación GPS - solo una vez al montar
  useEffect(() => {
    console.log('📍 Iniciando GPS...');
    if (isGettingLocation.current) return;
    isGettingLocation.current = true;
    Geolocation.getCurrentPosition(
      (position) => {
        isGettingLocation.current = false;
        const loc = { latitude: position.coords.latitude, longitude: position.coords.longitude, heading: position.coords.heading || 0 };
        console.log('📍 GPS obtenido:', loc.latitude, loc.longitude);
        setCurrentLocation(loc);
        if (onLocationUpdate) onLocationUpdate(loc);
      },
      (error) => {
        isGettingLocation.current = false;
        console.log('❌ GPS Error:', error.message);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );

    // Actualizar cada 3 segundos
    const interval = setInterval(() => {
      if (isGettingLocation.current) return;
      isGettingLocation.current = true;
      Geolocation.getCurrentPosition(
        (position) => {
          isGettingLocation.current = false;
          const loc = { latitude: position.coords.latitude, longitude: position.coords.longitude, heading: position.coords.heading || 0 };
          setCurrentLocation(loc);
          if (onLocationUpdate) onLocationUpdate(loc);
        },
        () => {
          isGettingLocation.current = false;
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    }, 3000);

    return () => clearInterval(interval);
  }, []);

// Obtener ruta cuando tengamos ubicación y destino
  useEffect(() => {
    if (currentTrip && currentLocation && navigationTarget && !routeFetched.current) {
      console.log('🚀 Obteniendo ruta...', tripPhase === 'started' ? 'al destino' : 'al pasajero');
      routeFetched.current = true;
      fetchRoute(currentLocation, navigationTarget);
    }
    
    // Forzar recálculo cuando se recupera conexión
    if (currentLocation?.forceRecalculate && navigationTarget) {
      console.log('🔄 Forzando recálculo de ruta por reconexión...');
      routeFetched.current = false;
      originalRouteRef.current = [];
      consecutiveOffRoute.current = 0;
      isRerouting.current = false;
      fetchRoute(currentLocation, navigationTarget).then(() => {
        console.log('✅ Ruta recalculada después de reconexión');
      });
    }
  }, [currentTrip, currentLocation, navigationTarget]);

  // Recalcular ruta cuando cambie la fase del viaje
  useEffect(() => {
    if (tripPhase === 'started' && currentLocation && destCoord) {
      console.log('🔄 Fase cambiada a started - recalculando ruta al destino');
      routeFetched.current = false;
      fetchRoute(currentLocation, destCoord);
    }
  }, [tripPhase]);

  // ACTUALIZAR TIEMPO ESTIMADO CADA 15 SEGUNDOS
  const currentLocationRef = useRef(currentLocation);
  const onRouteInfoUpdateRef = useRef(onRouteInfoUpdate);
  const navigationTargetRef = useRef(navigationTarget);
  const etaIntervalRef = useRef(null);
  
  useEffect(() => { currentLocationRef.current = currentLocation; }, [currentLocation]);
  useEffect(() => { onRouteInfoUpdateRef.current = onRouteInfoUpdate; }, [onRouteInfoUpdate]);
  useEffect(() => { navigationTargetRef.current = navigationTarget; }, [navigationTarget]);
  
  useEffect(() => {
    if (!currentTrip || !navigationTarget) return;
    
    // Evitar múltiples intervalos
    if (etaIntervalRef.current) {
      console.log('🕐 ETA intervalo ya existe, ignorando');
      return;
    }
    
    console.log('🕐 CREANDO intervalo ETA');
    
    const updateETA = async () => {
      const loc = currentLocationRef.current;
      const target = navigationTargetRef.current;
      console.log('🕐 updateETA - loc:', !!loc, 'target:', !!target);
      
      if (!loc || !loc.latitude) {
        console.log('❌ ETA: Sin ubicación');
        return;
      }
      if (!target || !target.latitude) {
        console.log('❌ ETA: Sin destino');
        return;
      }
      
      try {
        const origin = `${loc.latitude},${loc.longitude}`;
        const dest = `${target.latitude},${target.longitude}`;
        console.log('🌐 ETA fetch:', origin, '->', dest);
        
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${dest}&key=${GOOGLE_MAPS_APIKEY}&language=es`
        );
        const data = await response.json();
        console.log('📡 ETA response status:', data.status);
        
        if (data.routes && data.routes[0] && data.routes[0].legs) {
          const leg = data.routes[0].legs[0];
          setRouteInfo({
            distanceText: leg.distance.text,
            durationText: leg.duration.text
          });
          if (onRouteInfoUpdateRef.current) {
            onRouteInfoUpdateRef.current({
              distanceText: leg.distance.text,
              durationText: leg.duration.text,
              durationMinutes: Math.round(leg.duration.value / 60)
            });
          }
          console.log('⏱️ ETA actualizado:', leg.duration.text);
        } else {
          console.log('⚠️ ETA: Sin rutas en respuesta');
        }
      } catch (error) {
        console.log('❌ ETA error:', error.message);
      }
    };
    
    updateETA(); // Ejecutar inmediatamente
    etaIntervalRef.current = setInterval(updateETA, 15000);

    return () => {
      if (etaIntervalRef.current) {
        clearInterval(etaIntervalRef.current);
        etaIntervalRef.current = null;
        console.log('🕐 Intervalo ETA limpiado');
      }
    };
  }, [currentTrip?.id, navigationTarget?.latitude]); // ← DEPENDENCIAS SIMPLIFICADAS

  // Actualizar paso de navegación en tiempo real
  useEffect(() => {
    if (!isNavigating || !currentLocation || navigationSteps.length === 0 || !navigationTarget) return;

    const currentStep = navigationSteps[currentStepIndex];
    if (!currentStep) return;

    // Calcular distancia al punto final del paso actual
    const R = 6371000;
    const dLat = (currentStep.endLat - currentLocation.latitude) * Math.PI / 180;
    const dLon = (currentStep.endLng - currentLocation.longitude) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(currentLocation.latitude * Math.PI / 180) * Math.cos(currentStep.endLat * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const distanceToStep = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    // Calcular distancia al destino de navegación
    const dLatP = (navigationTarget.latitude - currentLocation.latitude) * Math.PI / 180;
    const dLonP = (navigationTarget.longitude - currentLocation.longitude) * Math.PI / 180;
    const aP = Math.sin(dLatP/2) * Math.sin(dLatP/2) +
      Math.cos(currentLocation.latitude * Math.PI / 180) * Math.cos(navigationTarget.latitude * Math.PI / 180) *
      Math.sin(dLonP/2) * Math.sin(dLonP/2);
    const distanceToTarget = R * 2 * Math.atan2(Math.sqrt(aP), Math.sqrt(1-aP));

    const targetName = tripPhase === 'started' ? 'destino' : 'pasajero';
    console.log('📍 Paso:', distanceToStep.toFixed(0), 'm |', targetName + ':', distanceToTarget.toFixed(0), 'm');

    // PRIORIDAD: Detectar llegada (< 50 metros)
    if (distanceToTarget < 50) {
      if (voiceEnabled && lastSpokenStep.current !== 'arrived') {
        lastSpokenStep.current = 'arrived';
        Tts.stop();
        const mensaje = tripPhase === 'started' 
          ? 'Has llegado al destino' 
          : 'Has llegado al punto de recogida del pasajero';
        speakInstruction(mensaje);
      }
      setIsNavigating(false);
      const alertTitle = tripPhase === 'started' ? '✅ Destino' : '✅ Llegaste';
      const alertMsg = tripPhase === 'started' 
        ? 'Has llegado al destino del pasajero' 
        : 'Has llegado al punto de recogida del pasajero';
      Alert.alert(alertTitle, alertMsg, [
        {
          text: 'OK',
          onPress: () => {
            if (tripPhase === 'started') {
              if (onArrivedAtDestination) onArrivedAtDestination();
            } else {
              if (onArrivedAtPickup) onArrivedAtPickup();
            }
          }
        }
      ]);
      return;
    }

    // SISTEMA DE VOZ PROFESIONAL - Detecta giros por texto en español
    const stepKey = 'step_' + currentStepIndex;
    const nextStep = navigationSteps[currentStepIndex + 1];
    const nextInstruction = nextStep?.instruction?.toLowerCase() || '';
    
    // Detectar si hay giro por TEXTO (más confiable que maneuver)
    const hasNextTurn = nextInstruction.includes('gira') || 
                        nextInstruction.includes('derecha') || 
                        nextInstruction.includes('izquierda') ||
                        nextInstruction.includes('rotonda') ||
                        nextInstruction.includes('retorno') ||
                        nextInstruction.includes('incorpora') ||
                        nextInstruction.includes('sal ') ||
                        nextInstruction.includes('toma');
    
    // Anunciar el PRÓXIMO paso si tiene instrucción de giro
    // SISTEMA ADAPTATIVO: Funciona con pasos cortos de zona urbana
    if (nextStep && hasNextTurn) {
      // ANUNCIO 1: Preparación (60-80% del paso)
      if (distanceToStep < 80 && distanceToStep > 40 && !spokenAnnouncements.current[stepKey + '_far']) {
        spokenAnnouncements.current[stepKey + '_far'] = true;
        speakInstruction('En ' + Math.round(distanceToStep / 10) * 10 + ' metros, ' + nextStep.instruction);
      }

      // ANUNCIO 2: Recordatorio (30-50% del paso)
      if (distanceToStep < 40 && distanceToStep > 20 && !spokenAnnouncements.current[stepKey + '_mid']) {
        spokenAnnouncements.current[stepKey + '_mid'] = true;
        speakInstruction('En ' + Math.round(distanceToStep / 10) * 10 + ' metros, ' + nextStep.instruction);
      }

      // ANUNCIO 3: Alerta inmediata (<20m)
      if (distanceToStep < 20 && !spokenAnnouncements.current[stepKey + '_now']) {
        spokenAnnouncements.current[stepKey + '_now'] = true;
        speakInstruction('Ahora, ' + nextStep.instruction);
      }
    }

    // Avanzar al siguiente paso
    if (distanceToStep < 20 && currentStepIndex < navigationSteps.length - 1) {
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      
      // Anunciar siguiente tramo si no es giro
      if (voiceEnabled && nextStep && !hasNextTurn) {
        speakInstruction('Continúa recto por ' + nextStep.distance);
      }
    }

    // DETECTAR DESVÍO Y RECALCULAR RUTA AUTOMÁTICAMENTE
    // CORREGIDO: Solo detectar si NO estamos recalculando y tenemos ruta válida
    if (!isRerouting.current && originalRouteRef.current.length >= 2) {
      const distanceToRoute = getDistanceToRoute(currentLocation, originalRouteRef.current);
      
      // Solo loguear si es valor válido (no Infinity)
      if (distanceToRoute !== Infinity) {
        console.log('📏 Distancia a ruta original:', distanceToRoute.toFixed(0), 'm');
      }
      
      const now = Date.now();
      const REROUTE_THRESHOLD = 30; // metros - umbral profesional con cálculo de segmentos
      const REROUTE_COOLDOWN = 30000; // 30 segundos entre recálculos
      const CONSECUTIVE_REQUIRED = 4; // 4 lecturas consecutivas para confirmar desvío real
      
      if (distanceToRoute !== Infinity && distanceToRoute > REROUTE_THRESHOLD) {
        consecutiveOffRoute.current++;
        console.log('⚠️ Fuera de ruta:', consecutiveOffRoute.current, '/', CONSECUTIVE_REQUIRED);
        
        if (consecutiveOffRoute.current >= CONSECUTIVE_REQUIRED && (now - lastRerouteTime.current) > REROUTE_COOLDOWN) {
          console.log('🔄 DESVÍO CONFIRMADO:', distanceToRoute.toFixed(0), 'm - Recalculando ruta...');
          
          // VERIFICAR que tenemos destino válido antes de recalcular
          if (!navigationTarget || !navigationTarget.latitude) {
            console.log('❌ No hay destino válido para recalcular');
            consecutiveOffRoute.current = 0;
            return;
          }
          
          // Marcar que estamos recalculando ANTES de hacer nada
          isRerouting.current = true;
          consecutiveOffRoute.current = 0;
          
          // RESETEAR SISTEMA DE VOZ para que funcione con la nueva ruta
          setCurrentStepIndex(0);
          lastSpokenStep.current = -1;
          spokenAnnouncements.current = {};
          
          // Recalcular ruta con try-catch para evitar crashes
          try {
            fetchRoute(currentLocation, navigationTarget)
              .then((result) => {
                if (result && result.length > 0) {
                  // Ruta válida - actualizar cooldown y anunciar
                  lastRerouteTime.current = Date.now();
                  speakInstruction('Ruta recalculada');
                  console.log('✅ Recálculo completado con', result.length, 'pasos');
                } else {
                  // Ruta descartada - permitir reintento inmediato
                  console.log('⚠️ Ruta descartada, permitiendo reintento');
                }
              })
              .catch((error) => {
                console.log('❌ Error en recálculo:', error);
              })
              .finally(() => {
                isRerouting.current = false;
              });
          } catch (error) {
            console.log('❌ Error crítico en recálculo:', error);
            isRerouting.current = false;
          }
        }
      } else if (distanceToRoute !== Infinity) {
        // Reset contador cuando vuelve a la ruta
        if (consecutiveOffRoute.current > 0) {
          console.log('✅ Volvió a la ruta - contador reseteado');
        }
        consecutiveOffRoute.current = 0;
      }
    }

    // Centrar mapa en conductor
    if (mapRef.current) {
      mapRef.current.animateCamera({
        center: {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
        },
        heading: currentLocation.heading || 0,
        pitch: 45,
        zoom: 18,
      }, { duration: 300 });
    }
  }, [currentLocation, isNavigating, currentStepIndex, navigationSteps, voiceEnabled, navigationTarget, tripPhase]);

  const fetchRoute = async (origin, destination, maxRetries = 3) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🛣️ API Directions... (intento ${attempt}/${maxRetries})`);
        let heading = origin?.heading || 0;
        if (heading > 0) {
          lastValidHeading.current = heading;
        } else {
          heading = lastValidHeading.current;
        }
        console.log('🧭 Heading enviado a API:', heading, '(último válido:', lastValidHeading.current, ')');
        const headingParam = heading > 0 ? `&heading=${Math.round(heading)}` : '';
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&mode=driving&language=es${headingParam}&key=${GOOGLE_MAPS_APIKEY}`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        const data = await response.json();

        if (data.status === 'OK' && data.routes.length > 0) {
          const route = data.routes[0];
          const leg = route.legs[0];
          const points = leg.steps.flatMap(step => decodePolyline(step.polyline.points));

     // Ruta de Google siempre es válida - no descartar por heading
          console.log('✅ Ruta aceptada:', points.length, 'puntos');

          const steps = leg.steps.map((step, index) => ({
            index,
            instruction: cleanInstruction(step.html_instructions),
            distance: step.distance.text,
            endLat: step.end_location.lat,
            endLng: step.end_location.lng,
            maneuver: step.maneuver || 'straight'
          }));

          console.log('✅ Ruta:', points.length, 'puntos,', steps.length, 'pasos');
          setRouteCoordinates(points);
          setNavigationSteps(steps);
          originalRouteRef.current = points;
          consecutiveOffRoute.current = 0;
          console.log('📌 Ruta original guardada (fetchRoute):', points.length, 'pts');
          setRouteInfo({
            distanceText: leg.distance.text,
            durationText: leg.duration.text
          });
          if (onRouteInfoUpdate) {
            onRouteInfoUpdate({
              distanceText: leg.distance.text,
              durationText: leg.duration.text,
              durationMinutes: Math.round(leg.duration.value / 60)
            });
          }

          if (!isNavigating) {
            setTimeout(() => centerMap(), 500);
          }

          if (onStartBackgroundTracking && currentTrip) {
            onStartBackgroundTracking(currentTrip.id, destination.latitude, destination.longitude);
          }
          return steps;
        }
        
        // API respondió pero sin rutas válidas
        console.log(`⚠️ API sin rutas (intento ${attempt}), status: ${data.status}`);
        
      } catch (error) {
        console.error(`❌ Error ruta intento ${attempt}:`, error.message || error);
      }
      
      // Esperar antes de reintentar (2s, 4s)
      if (attempt < maxRetries) {
        console.log(`⏳ Reintentando en ${attempt * 2}s...`);
        await new Promise(resolve => setTimeout(resolve, attempt * 2000));
      }
    }
    console.log('❌ Todos los intentos de ruta fallaron');
    return null;
  };

  const centerMap = () => {
    if (!mapRef.current || !pickupCoord) return;
    
    console.log('🔍 Centrando mapa con animateToRegion...');
    
    // Calcular región que incluya conductor y pasajero
    let region;
    
    if (currentLocation) {
      // Si tenemos ambas ubicaciones, calcular bounds
      const minLat = Math.min(currentLocation.latitude, pickupCoord.latitude);
      const maxLat = Math.max(currentLocation.latitude, pickupCoord.latitude);
      const minLng = Math.min(currentLocation.longitude, pickupCoord.longitude);
      const maxLng = Math.max(currentLocation.longitude, pickupCoord.longitude);
      
    const deltaLat = Math.max((maxLat - minLat) * 1.5, 0.01);
    const deltaLng = Math.max((maxLng - minLng) * 1.5, 0.01);
    const midLat = (minLat + maxLat) / 2 + (deltaLat * 0.4);
    const midLng = (minLng + maxLng) / 2;
      
      region = {
        latitude: midLat,
        longitude: midLng,
        latitudeDelta: deltaLat,
        longitudeDelta: deltaLng,
      };
    } else {
      // Solo pickup
      region = {
        latitude: pickupCoord.latitude,
        longitude: pickupCoord.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }
    
    console.log('🗺️ Región:', region);
    mapRef.current.animateToRegion(region, 1000);
    mapCentered.current = true;
  };

  const speakInstruction = (text) => {
    if (!voiceEnabled) return;
    Tts.stop();
    Tts.speak(text);
  };

  // Función para abrir navegación externa (Google Maps o Waze)
  const openExternalNavigation = (targetCoord, app = 'google') => {
    const { latitude, longitude } = targetCoord;
    const url = app === 'waze' 
      ? `https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`
      : `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;
    
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'No se pudo abrir la aplicación de navegación');
    });
  };

  const startNavigation = async () => {
    console.log('🚀 startNavigation INICIADO');

    // Verificar que tenemos destino
    const target = navigationTarget || pickupCoord || destCoord;
    if (!target) {
      console.log('❌ Sin destino de navegación');
      Alert.alert('Error', 'No hay destino disponible para navegar.');
      return;
    }
    console.log('✅ Target:', target.latitude, target.longitude);

    // ESTRATEGIA ROBUSTA: Múltiples fuentes de ubicación
    let location = currentLocation || propUserLocation;

    // Si no hay ubicación, intentar getLastKnownPosition (instantáneo)
    if (!location || !location.latitude) {
      console.log('📍 Sin ubicación en memoria, intentando lastKnownPosition...');
      try {
        const lastPos = await new Promise((resolve, reject) => {
          Geolocation.getCurrentPosition(
            resolve, 
            reject, 
            { enableHighAccuracy: false, timeout: 2000, maximumAge: 300000 } // 5 min cache
          );
        });
        location = { latitude: lastPos.coords.latitude, longitude: lastPos.coords.longitude };
        setCurrentLocation(location);
        console.log('✅ Última ubicación conocida obtenida');
      } catch (e) {
        console.log('⚠️ No hay última ubicación conocida');
      }
    }

    // Si aún no hay ubicación, intento rápido de GPS
    if (!location || !location.latitude) {
      console.log('📍 Intentando GPS rápido...');
      try {
        const position = await new Promise((resolve, reject) => {
          Geolocation.getCurrentPosition(
            resolve, 
            reject, 
            { enableHighAccuracy: true, timeout: 3000, maximumAge: 60000 }
          );
        });
        location = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        setCurrentLocation(location);
        console.log('✅ GPS rápido exitoso');
      } catch (e) {
        console.log('❌ GPS rápido falló');
      }
    }

    // FALLBACK PROFESIONAL: Ofrecer navegación externa
    if (!location || !location.latitude) {
      console.log('❌ GPS no disponible, ofreciendo navegación externa');
      Alert.alert(
        '📍 GPS Temporalmente No Disponible',
        '¿Deseas abrir la navegación en otra aplicación?',
        [
          { text: 'Google Maps', onPress: () => openExternalNavigation(target, 'google') },
          { text: 'Waze', onPress: () => openExternalNavigation(target, 'waze') },
          { text: 'Reintentar', onPress: () => startNavigation() },
          { text: 'Cancelar', style: 'cancel' }
        ]
      );
      return;
    }

    console.log('📍 Ubicación final:', location.latitude, location.longitude);

    // Obtener ruta - siempre intentar obtener nueva si no hay pasos
    let steps = navigationSteps;
    if (!steps || steps.length === 0) {
      console.log('⏳ Obteniendo ruta...');
      routeFetched.current = false;
      const fetchedSteps = await fetchRoute(location, target);
      if (fetchedSteps && fetchedSteps.length > 0) {
        steps = fetchedSteps;
      }
    }

    // Si aún no hay ruta, reintentar
    if (!steps || steps.length === 0) {
      console.log('⚠️ Reintentando ruta...');
      const fetchedSteps = await fetchRoute(location, target);
      if (fetchedSteps && fetchedSteps.length > 0) {
        steps = fetchedSteps;
      }
    }

    // Verificar que tenemos ruta
    if (!steps || steps.length === 0) {
      Alert.alert(
        '⏳ Obteniendo ruta',
        'No se pudo obtener la ruta. ¿Qué deseas hacer?',
        [
          { text: 'Reintentar', onPress: () => startNavigation() },
          { text: 'Cancelar', style: 'cancel' }
        ]
      );
      return;
    }
    
    console.log('✅ Iniciando navegación con', steps.length, 'pasos');
    
    // Resetear estado de recálculo
    isRerouting.current = false;
    consecutiveOffRoute.current = 0;
    
    setIsNavigating(true);
    setCurrentStepIndex(0);
    lastSpokenStep.current = 0;
    spokenAnnouncements.current = {};
    const destino = tripPhase === 'started' ? 'al destino' : 'al pasajero';
    speakInstruction('Iniciando navegación ' + destino + '. ' + steps[0].instruction);
  };

  const stopNavigation = () => {
    setIsNavigating(false);
    isRerouting.current = false;
    consecutiveOffRoute.current = 0;
    Tts.stop();
    centerMap();
  };

  const getManeuverIcon = (maneuver) => {
    const icons = {
      'turn-left': '⬅️', 'turn-right': '➡️',
      'turn-slight-left': '↖️', 'turn-slight-right': '↗️',
      'uturn-left': '↩️', 'uturn-right': '↪️',
      'roundabout-left': '🔄', 'roundabout-right': '🔄'
    };
    return icons[maneuver] || '⬆️';
  };

  const handleCenterMap = () => {
    console.log('👆 Botón Al pasajero presionado');
    if (pickupCoord && mapRef.current) {
      centerMap();
    } else {
      Alert.alert('Espera', 'Obteniendo ubicación del pasajero...');
    }
  };

  // Región inicial FIJA en Santo Domingo (evita vista mundial)
  const initialRegion = {
    latitude: 18.4861,
    longitude: -69.9312,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  };

  console.log('🎨 RENDER - Route:', routeCoordinates.length, 'Pickup:', !!pickupCoord, 'Location:', !!currentLocation, 'Phase:', tripPhase);
  
  if (pickupCoord) {
    console.log('📍 MARKER PASAJERO:', pickupCoord.latitude.toFixed(5), pickupCoord.longitude.toFixed(5));
}
  if (currentLocation) {
    console.log('🚗 MARKER CONDUCTOR:', currentLocation.latitude.toFixed(5), currentLocation.longitude.toFixed(5));
  }
  if (routeCoordinates.length > 0) {
    console.log('📊 PRIMEROS 30 PUNTOS:', JSON.stringify(routeCoordinates.slice(0, 30).map(p => [p.latitude.toFixed(6), p.longitude.toFixed(6)])));
    console.log('🛣️ RUTA inicio:', routeCoordinates[0].latitude.toFixed(5), routeCoordinates[0].longitude.toFixed(5));
    console.log('🛣️ RUTA fin:', routeCoordinates[routeCoordinates.length-1].latitude.toFixed(5), routeCoordinates[routeCoordinates.length-1].longitude.toFixed(5));
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={initialRegion}
     showsUserLocation={false}
        showsMyLocationButton={true}
        toolbarEnabled={false}
        onMapReady={() => {
          console.log('🗺️ Mapa listo!');
          setTimeout(() => {
            if (pickupCoord) {
              centerMap();
            }
          }, 1000);
        }}
      >
        {/* MapViewDirections - DESHABILITADO para evitar conflictos
        {currentLocation && navigationTarget && !isNavigating && (
          <MapViewDirections
            origin={currentLocation}
            destination={navigationTarget}
            apikey={GOOGLE_MAPS_APIKEY}
            strokeWidth={0}
            mode="DRIVING"
            precision="high"
            onReady={(result) => {
              console.log('✅ MVD:', result.coordinates.length, 'pts');
              setRouteCoordinates(result.coordinates);
              if (originalRouteRef.current.length === 0) {
                originalRouteRef.current = result.coordinates;
                console.log('📌 Ruta original guardada:', result.coordinates.length, 'pts');
              }
            }}
            onError={(err) => console.log('❌ MVD ERROR:', err)}
          />
        )}
        */}
        
        {/* Polyline - DIBUJA la ruta (se recorta conforme avanzas) */}
        {routeCoordinates.length >= 2 && (
          <Polyline
            key={`route-${routeCoordinates.length}-${routeCoordinates[0]?.latitude}`}
            coordinates={(() => {
              if (!currentLocation || !isNavigating) return routeCoordinates;
              
              // Encontrar el punto más cercano en la ruta
              let minDist = Infinity;
              let closestIndex = 0;
              
              for (let i = 0; i < routeCoordinates.length; i++) {
                const dx = routeCoordinates[i].latitude - currentLocation.latitude;
                const dy = routeCoordinates[i].longitude - currentLocation.longitude;
                const dist = dx * dx + dy * dy;
                if (dist < minDist) {
                  minDist = dist;
                  closestIndex = i;
                }
              }
              
              // Retornar solo desde el punto más cercano hasta el final
              return routeCoordinates.slice(closestIndex);
            })()}
            strokeColor="#FF0000"
            strokeWidth={6}
            lineCap="round"
            lineJoin="round"
            geodesic={false}
            zIndex={100}
          />
        )}

 {/* MARKER PASAJERO - Custom View */}
        {pickupCoord && (
          <Marker
            identifier="pickup"
            coordinate={pickupCoord}
            title="📍 Pasajero"
            description={currentTrip?.user || 'Punto de recogida'}
            zIndex={999}
            anchor={{ x: 0.5, y: 1 }}
            tracksViewChanges={true}
          >
            <View style={styles.markerPassenger}>
              <Text style={styles.markerIcon}>🟢</Text>
            </View>
          </Marker>
        )}

        {/* MARKER CONDUCTOR */}
        {currentLocation && (
   <Marker
            identifier="driver"
            coordinate={currentLocation}
            title="🚗 Tu ubicación"
            zIndex={998}
            anchor={{ x: 0.5, y: 0.5 }}
            flat={true}
            rotation={currentLocation.heading || 0}
            tracksViewChanges={false}
          >
            <View style={{
              width: 40,
              height: 40,
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              {/* Flecha direccional */}
              <View style={{
                width: 0,
                height: 0,
                borderLeftWidth: 10,
                borderRightWidth: 10,
                borderBottomWidth: 16,
                borderLeftColor: 'transparent',
                borderRightColor: 'transparent',
                borderBottomColor: '#1a73e8',
                marginBottom: -2,
              }} />
              {/* Cuerpo del carro */}
              <View style={{
                width: 20,
                height: 22,
                backgroundColor: '#1a73e8',
                borderRadius: 4,
                borderWidth: 2,
                borderColor: '#ffffff',
              }} />
            </View>
          </Marker>
        )}

        {/* MARKER DESTINO - Bandera roja */}
        {destCoord && (
          <Marker
            identifier="destination"
            coordinate={destCoord}
            title="🏁 Destino"
            description={currentTrip?.destination || 'Destino del viaje'}
            zIndex={997}
            anchor={{ x: 0.5, y: 1 }}
            tracksViewChanges={true}
          >
            <View style={{
              alignItems: 'center',
            }}>
              <View style={{
                backgroundColor: '#FF3B30',
                paddingHorizontal: 4,
                paddingVertical: 2,
                borderRadius: 6,
                borderWidth: 1,
                borderColor: '#fff',
                elevation: 5,
              }}>
                <Text style={{ color: '#fff', fontSize: 7, fontWeight: 'bold' }}>🏁 Destino</Text>
              </View>
              <View style={{
                width: 1.5,
                height: 5,
                backgroundColor: '#FF3B30',
              }} />
              <View style={{
                width: 5,
                height: 5,
                borderRadius: 2.5,
                backgroundColor: '#FF3B30',
                borderWidth: 1,
                borderColor: '#fff',
              }} />
            </View>
          </Marker>
        )}
      </MapView>

   {/* PANEL SUPERIOR - INFO - OCULTO
      <View style={styles.infoPanel}>
        <Text style={styles.infoText}>📏 {routeInfo?.distanceText || '...'}</Text>
        <Text style={styles.infoText}>⏱️ {routeInfo?.durationText || '...'}</Text>
      </View>
      */}

      {/* INDICADOR DE DATOS CARGADOS - OCULTO
      <View style={styles.statusPanel}>
        <Text style={styles.statusText}>
          {routeCoordinates.length > 0 ? '🛣️ Ruta lista' : '⏳ Cargando ruta...'}
        </Text>
      </View>
      */}

      {/* DEBUG - OCULTO
      <View style={styles.debugPanel}>
        <Text style={styles.debugText}>
          Ruta: {routeCoordinates.length} pts | Pickup: {pickupCoord ? '✓' : '✗'} | GPS: {currentLocation ? '✓' : '✗'}
        </Text>
        {pickupCoord && (
          <Text style={styles.debugText}>
            📍 Pasajero: {pickupCoord.latitude.toFixed(4)}, {pickupCoord.longitude.toFixed(4)}
          </Text>
        )}
        {currentLocation && (
          <Text style={styles.debugText}>
            🚗 Conductor: {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
          </Text>
        )}
      </View>
      */}

      {/* PANEL NAVEGACIÓN - OCULTO
      {isNavigating && navigationSteps[currentStepIndex] && (
        <View style={styles.navPanel}>
          <View style={styles.navHeader}>
            <Text style={styles.navIcon}>{getManeuverIcon(navigationSteps[currentStepIndex].maneuver)}</Text>
            <Text style={styles.navDistance}>{navigationSteps[currentStepIndex].distance}</Text>
            <TouchableOpacity onPress={() => setVoiceEnabled(!voiceEnabled)}>
              <Text style={styles.voiceIcon}>{voiceEnabled ? '🔊' : '🔇'}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.navInstruction} numberOfLines={2}>{navigationSteps[currentStepIndex].instruction}</Text>
          <Text style={styles.navStep}>Paso {currentStepIndex + 1} de {navigationSteps.length}</Text>
        </View>
      )}
      */}

      {/* BOTONES */}
     {currentTrip && tripPhase !== 'arrived' && tripPhase !== 'at_destination' && (
        <View style={styles.buttons}>
          {!isNavigating ? (
        <>
           <TouchableOpacity style={[styles.btn, styles.btnRed, {flex: 0.4, paddingTop: 12, paddingBottom: 8}]} onPress={onCancelTrip}>
                <Text style={[styles.btnText, {fontSize: 13}]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnGreen]} onPress={startNavigation}>
                <Text style={styles.btnText}>{tripPhase === 'started' ? '🚗 Ir al Destino' : '🚗 Ir Pasajero'}</Text>
              </TouchableOpacity>
              {/* OCULTO
              <TouchableOpacity style={[styles.btn, styles.btnBlue]} onPress={handleCenterMap}>
                <Text style={styles.btnText}>👤 Ver ruta</Text>
              </TouchableOpacity>
              */}
            </>
 ) : (
            tripPhase === 'started' ? (
              <View style={[styles.btn, {backgroundColor: '#1a73e8', flex: 1}]}>
                <Text style={styles.btnText}>⏱️ Llegada: {routeInfo?.durationText || 'Calculando...'}</Text>
              </View>
            ) : (
              <TouchableOpacity style={[styles.btn, styles.btnGreen]} onPress={() => speakInstruction(navigationSteps[currentStepIndex]?.instruction)}>
                <Text style={styles.btnText}>🔊 Repetir</Text>
              </TouchableOpacity>
            )
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },
  infoPanel: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-around',
    elevation: 5,
  },
  infoText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  debugPanel: {
    position: 'absolute',
    top: 70,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 6,
    borderRadius: 5,
  },
  debugText: { color: '#0f0', fontSize: 11 },
  statusPanel: {
    position: 'absolute',
    top: 100,
    left: 10,
    backgroundColor: '#2196F3',
    padding: 8,
    borderRadius: 5,
  },
  statusText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  markerPassenger: {
    backgroundColor: 'transparent',
    padding: 0,
  },
  markerDriver: {
    backgroundColor: 'transparent',
    padding: 0,
  },
  markerIcon: {
    fontSize: 24,
    textAlign: 'center',
  },
buttons: {
    position: 'absolute',
    bottom: 90,
    left: 15,
    right: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  btn: {
    flex: 1,
    marginHorizontal: 5,
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
    elevation: 5,
  },
  btnGreen: { backgroundColor: '#28a745' },
  btnBlue: { backgroundColor: '#007AFF' },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  btnRed: { backgroundColor: '#dc3545' },
  navPanel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1a73e8',
    padding: 15,
    elevation: 10,
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  navIcon: { fontSize: 36, marginRight: 15 },
  navDistance: { fontSize: 22, fontWeight: 'bold', color: 'white', flex: 1 },
  voiceIcon: { fontSize: 24 },
  navInstruction: { fontSize: 16, color: 'white', fontWeight: '500' },
  navStep: { fontSize: 11, color: '#aaa', marginTop: 5 },
});

export default MapComponent;