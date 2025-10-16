import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  Platform
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import Geolocation from '@react-native-community/geolocation';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

// TU API KEY DE GOOGLE MAPS
const GOOGLE_MAPS_API_KEY = 'YOUR_GOOGLE_MAPS_API_KEY';

const NavigationComponent = ({ 
  origin, 
  destination, 
  onRouteReady,
  onArrival,
  isNavigating = false 
}) => {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [instructions, setInstructions] = useState('');
  const [stepIndex, setStepIndex] = useState(0);
  const [steps, setSteps] = useState([]);
  
  const mapRef = useRef(null);
  const watchId = useRef(null);

  useEffect(() => {
    startLocationTracking();
    
    return () => {
      if (watchId.current) {
        Geolocation.clearWatch(watchId.current);
      }
    };
  }, []);

  useEffect(() => {
    if (currentLocation && isNavigating) {
      updateNavigationStep();
    }
  }, [currentLocation, stepIndex]);

  const startLocationTracking = () => {
    Geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ latitude, longitude });
      },
      error => console.log('Error getting location:', error),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
    );

    watchId.current = Geolocation.watchPosition(
      position => {
        const { latitude, longitude, heading, speed } = position.coords;
        setCurrentLocation({
          latitude,
          longitude,
          heading,
          speed: speed ? speed * 3.6 : 0 // Convertir a km/h
        });
      },
      error => console.log('Error watching location:', error),
      {
        enableHighAccuracy: true,
        distanceFilter: 10,
        interval: 5000,
        fastestInterval: 2000
      }
    );
  };

  const updateNavigationStep = () => {
    if (!steps.length || !currentLocation) return;

    // Buscar el siguiente paso basado en la ubicación actual
    for (let i = stepIndex; i < steps.length; i++) {
      const step = steps[i];
      const stepDistance = calculateDistance(
        currentLocation,
        step.start_location
      );

      if (stepDistance < 50) { // Menos de 50 metros del siguiente paso
        setStepIndex(i);
        setInstructions(cleanInstructions(step.html_instructions));
        
        // Anunciar instrucción por voz (opcional)
        // speakInstruction(step.html_instructions);
        break;
      }
    }

    // Verificar si llegó al destino
    if (destination) {
      const distanceToDestination = calculateDistance(
        currentLocation,
        destination
      );

      if (distanceToDestination < 30) { // Menos de 30 metros del destino
        if (onArrival) {
          onArrival();
        }
      }
    }
  };

  const calculateDistance = (point1, point2) => {
    const R = 6371e3; // Radio de la Tierra en metros
    const φ1 = point1.latitude * Math.PI / 180;
    const φ2 = point2.latitude * Math.PI / 180;
    const Δφ = (point2.latitude - point1.latitude) * Math.PI / 180;
    const Δλ = (point2.longitude - point1.longitude) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distancia en metros
  };

  const cleanInstructions = (html) => {
    return html.replace(/<[^>]*>/g, ''); // Remover tags HTML
  };

  const formatDistance = (meters) => {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
  };

  const formatDuration = (minutes) => {
    if (minutes < 60) {
      return `${Math.round(minutes)} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}min`;
  };

  const centerMap = () => {
    if (mapRef.current && currentLocation) {
      mapRef.current.animateToRegion({
        ...currentLocation,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 1000);
    }
  };

  const fitToRoute = () => {
    if (mapRef.current && routeCoordinates.length > 0) {
      mapRef.current.fitToCoordinates(routeCoordinates, {
        edgePadding: {
          top: 100,
          right: 50,
          bottom: 200,
          left: 50
        },
        animated: true
      });
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: origin?.latitude || 37.78825,
          longitude: origin?.longitude || -122.4324,
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LONGITUDE_DELTA,
        }}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsTraffic={true}
        showsCompass={false}
      >
        {origin && (
          <Marker
            coordinate={origin}
            title="Punto de recogida"
            pinColor="green"
          />
        )}

        {destination && (
          <Marker
            coordinate={destination}
            title="Destino"
            pinColor="red"
          />
        )}

        {origin && destination && (
          <MapViewDirections
            origin={origin}
            destination={destination}
            apikey={GOOGLE_MAPS_API_KEY}
            strokeWidth={4}
            strokeColor="#4285F4"
            optimizeWaypoints={true}
            onReady={result => {
              setDistance(result.distance);
              setDuration(result.duration);
              setRouteCoordinates(result.coordinates);
              setSteps(result.legs[0].steps);
              
              if (onRouteReady) {
                onRouteReady({
                  distance: result.distance,
                  duration: result.duration,
                  coordinates: result.coordinates
                });
              }

              // Ajustar el mapa a la ruta
              setTimeout(() => fitToRoute(), 500);
            }}
            onError={(errorMessage) => {
              console.log('Error con direcciones:', errorMessage);
              Alert.alert('Error', 'No se pudo calcular la ruta');
            }}
          />
        )}
      </MapView>

      {/* Panel de navegación */}
      {isNavigating && (
        <View style={styles.navigationPanel}>
          <View style={styles.instructionContainer}>
            <Icon name="navigation" size={30} color="#4285F4" />
            <Text style={styles.instruction}>{instructions || 'Calculando ruta...'}</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Distancia</Text>
              <Text style={styles.infoValue}>{formatDistance(distance * 1000)}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Tiempo</Text>
              <Text style={styles.infoValue}>{formatDuration(duration)}</Text>
            </View>
            {currentLocation?.speed > 0 && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Velocidad</Text>
                <Text style={styles.infoValue}>{Math.round(currentLocation.speed)} km/h</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Botones flotantes */}
      <TouchableOpacity 
        style={styles.centerButton}
        onPress={centerMap}
      >
        <Icon name="my-location" size={24} color="#4285F4" />
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.routeButton}
        onPress={fitToRoute}
      >
        <Icon name="route" size={24} color="#4285F4" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  navigationPanel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  instructionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  instruction: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
    color: '#333',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  infoItem: {
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
  },
  infoValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 2,
  },
  centerButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  routeButton: {
    position: 'absolute',
    bottom: 160,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

export default NavigationComponent;