import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import MapView, { Marker, Polyline, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import Tts from 'react-native-tts';

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

const MapComponent = ({ currentTrip, tripPhase, onLocationUpdate, onStartBackgroundTracking }) => {
  const mapRef = useRef(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const routeFetched = useRef(false);
  const mapCentered = useRef(false);
  const [navigationSteps, setNavigationSteps] = useState([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const lastSpokenStep = useRef(-1);

  const pickupLat = currentTrip?.pickupLat || currentTrip?.pickupLocation?.latitude;
  const pickupLng = currentTrip?.pickupLng || currentTrip?.pickupLocation?.longitude;

  const pickupCoord = pickupLat && pickupLng ? {
    latitude: parseFloat(pickupLat),
    longitude: parseFloat(pickupLng)
  } : null;

  // Obtener ubicación GPS - solo una vez al montar
  useEffect(() => {
    console.log('📍 Iniciando GPS...');
    Geolocation.getCurrentPosition(
      (position) => {
        const loc = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        console.log('📍 GPS obtenido:', loc.latitude, loc.longitude);
        setCurrentLocation(loc);
        if (onLocationUpdate) onLocationUpdate(loc);
      },
      (error) => console.log('❌ GPS Error:', error.message),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );

    // Actualizar cada 10 segundos
    const interval = setInterval(() => {
      Geolocation.getCurrentPosition(
        (position) => {
          const loc = { latitude: position.coords.latitude, longitude: position.coords.longitude };
          setCurrentLocation(loc);
          if (onLocationUpdate) onLocationUpdate(loc);
        },
        () => {},
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Obtener ruta cuando tengamos ubicación y pickup
  useEffect(() => {
    if (currentTrip && currentLocation && pickupCoord && !routeFetched.current) {
      console.log('🚀 Obteniendo ruta al pasajero...');
      routeFetched.current = true;
      fetchRoute(currentLocation, pickupCoord);
    }
  }, [currentTrip, currentLocation, pickupCoord]);

  // Actualizar paso de navegación en tiempo real
  useEffect(() => {
    if (!isNavigating || !currentLocation || navigationSteps.length === 0 || !pickupCoord) return;

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

    // Calcular distancia al pickup
    const dLatP = (pickupCoord.latitude - currentLocation.latitude) * Math.PI / 180;
    const dLonP = (pickupCoord.longitude - currentLocation.longitude) * Math.PI / 180;
    const aP = Math.sin(dLatP/2) * Math.sin(dLatP/2) +
      Math.cos(currentLocation.latitude * Math.PI / 180) * Math.cos(pickupCoord.latitude * Math.PI / 180) *
      Math.sin(dLonP/2) * Math.sin(dLonP/2);
    const distanceToPickup = R * 2 * Math.atan2(Math.sqrt(aP), Math.sqrt(1-aP));

    console.log('📍 Paso:', distanceToStep.toFixed(0), 'm | Pickup:', distanceToPickup.toFixed(0), 'm');

    // PRIORIDAD: Detectar llegada al pasajero (< 50 metros)
    if (distanceToPickup < 50) {
      if (voiceEnabled && lastSpokenStep.current !== 'arrived') {
        lastSpokenStep.current = 'arrived';
        Tts.stop();
        speakInstruction('Has llegado al punto de recogida del pasajero');
      }
      setIsNavigating(false);
      Alert.alert('✅ Llegaste', 'Has llegado al punto de recogida del pasajero');
      return;
    }

    const timeNow = Date.now();
    const lastSpoken = typeof lastSpokenStep.current === 'number' ? lastSpokenStep.current : 0;
    const timeSinceLastSpeak = timeNow - lastSpoken;

    // Anticipar próximo giro (150m antes)
    const nextStep = navigationSteps[currentStepIndex + 1];
    if (nextStep && distanceToStep < 150 && distanceToStep > 50 && timeSinceLastSpeak > 6000) {
      lastSpokenStep.current = timeNow;
      speakInstruction('En ' + Math.round(distanceToStep) + ' metros, ' + nextStep.instruction);
    }

    // Avanzar al siguiente paso cuando estemos cerca
    if (distanceToStep < 35 && currentStepIndex < navigationSteps.length - 1) {
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      lastSpokenStep.current = timeNow;
      
      if (voiceEnabled) {
        // Decir la instrucción actual y la distancia del tramo
        const stepDistance = navigationSteps[nextIndex].distance;
        speakInstruction(navigationSteps[nextIndex].instruction + '. Continúa por ' + stepDistance);
      }
    }

    // Centrar mapa en conductor
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.003,
        longitudeDelta: 0.003,
      }, 300);
    }
  }, [currentLocation, isNavigating, currentStepIndex, navigationSteps, voiceEnabled, pickupCoord]);

  const fetchRoute = async (origin, destination) => {
    try {
      console.log('🛣️ API Directions...');
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&mode=driving&language=es&key=${GOOGLE_MAPS_APIKEY}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.routes.length > 0) {
        const route = data.routes[0];
        const leg = route.legs[0];
        const points = decodePolyline(route.overview_polyline.points);
        
        // Extraer pasos de navegación
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
        setRouteInfo({
          distanceText: leg.distance.text,
          durationText: leg.duration.text
        });

        // Centrar mapa después de obtener ruta
        setTimeout(() => centerMap(), 500);

        // Iniciar background tracking
        if (onStartBackgroundTracking && currentTrip) {
          onStartBackgroundTracking(currentTrip.id, destination.latitude, destination.longitude);
        }
      }
    } catch (error) {
      console.error('❌ Error ruta:', error);
    }
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

  const startNavigation = () => {
    if (navigationSteps.length === 0) {
      Alert.alert('Espera', 'Cargando ruta...');
      return;
    }
    setIsNavigating(true);
    setCurrentStepIndex(0);
    lastSpokenStep.current = 0;
    speakInstruction('Iniciando navegación. ' + navigationSteps[0].instruction);
  };

  const stopNavigation = () => {
    setIsNavigating(false);
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

  console.log('🎨 RENDER - Route:', routeCoordinates.length, 'Pickup:', !!pickupCoord, 'Location:', !!currentLocation);
  
  if (pickupCoord) {
    console.log('📍 MARKER PASAJERO:', pickupCoord.latitude.toFixed(5), pickupCoord.longitude.toFixed(5));
  }
  if (currentLocation) {
    console.log('🚗 MARKER CONDUCTOR:', currentLocation.latitude.toFixed(5), currentLocation.longitude.toFixed(5));
  }
  if (routeCoordinates.length > 0) {
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
        onMapReady={() => {
          console.log('🗺️ Mapa listo!');
          setTimeout(() => {
            if (pickupCoord) {
              centerMap();
            }
          }, 1000);
        }}
      >
        {/* POLYLINE - RUTA AZUL - MÁS GRUESA */}
        {routeCoordinates.length >= 2 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#FF0000"
            strokeWidth={5}
            zIndex={200}
            lineCap="round"
            lineJoin="round"
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

        {/* MARKER CONDUCTOR - Verde */}
        {currentLocation && (
          <Marker
            identifier="driver"
            coordinate={currentLocation}
            title="🚗 Tu ubicación"
            zIndex={998}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={true}
          >
            <View style={styles.markerDriver}>
              <Text style={styles.markerIcon}>🚙</Text>
            </View>
          </Marker>
        )}
      </MapView>

      {/* PANEL SUPERIOR - INFO */}
      <View style={styles.infoPanel}>
        <Text style={styles.infoText}>📏 {routeInfo?.distanceText || '...'}</Text>
        <Text style={styles.infoText}>⏱️ {routeInfo?.durationText || '...'}</Text>
      </View>

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

      {/* PANEL NAVEGACIÓN */}
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

      {/* BOTONES */}
      {currentTrip && (
        <View style={styles.buttons}>
          {!isNavigating ? (
            <>
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
            <TouchableOpacity style={[styles.btn, styles.btnGreen]} onPress={() => speakInstruction(navigationSteps[currentStepIndex]?.instruction)}>
              <Text style={styles.btnText}>🔊 Repetir</Text>
            </TouchableOpacity>
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
    bottom: 25,
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