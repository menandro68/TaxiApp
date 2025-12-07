import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Linking } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import Geolocation from '@react-native-community/geolocation';

const GOOGLE_MAPS_APIKEY = 'AIzaSyC6HuO-nRJxdZctdH0o_-nuezUOILq868Q';

const MapComponent = ({ currentTrip, tripPhase, onLocationUpdate, onStartBackgroundTracking }) => {
  const mapRef = useRef(null);
  const [mapInitialized, setMapInitialized] = useState(false);
  
  const [currentLocation, setCurrentLocation] = useState(null);
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);

  // Región por defecto - Santo Domingo
  const santodomingo = {
    latitude: 18.4861,
    longitude: -69.9312,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  };

  // ✅ FORZAR zoom a Santo Domingo después de montar
  useEffect(() => {
    if (mapRef.current && !mapInitialized) {
      setTimeout(() => {
        mapRef.current.animateToRegion(santodomingo, 800);
        setMapInitialized(true);
        console.log('🗺️ Mapa inicializado en Santo Domingo');
      }, 500);
    }
  }, [mapInitialized]);

  // ✅ Obtener ubicación GPS real
  useEffect(() => {
    getCurrentLocation();
    
    // Actualizar ubicación cada 10 segundos
    const interval = setInterval(() => {
      getCurrentLocation();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // ✅ Cuando cambia la ubicación, hacer zoom y notificar
  useEffect(() => {
    if (mapRef.current && currentLocation && mapInitialized) {
      mapRef.current.animateToRegion(
        {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        },
        500
      );
    }
  }, [currentLocation, mapInitialized]);

  // ✅ Configurar viaje activo
  useEffect(() => {
    if (currentTrip && currentLocation) {
      setOrigin({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      });
      // TODO: Usar coordenadas reales del destino del viaje
      setDestination({
        latitude: currentTrip.destinationLat || 18.4861,
        longitude: currentTrip.destinationLng || -69.9404,
      });
    }
  }, [currentTrip, currentLocation]);

  const getCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        console.log('📍 Ubicación GPS obtenida:', latitude, longitude);
        
        setCurrentLocation({ latitude, longitude });
        setOrigin({ latitude, longitude });
        
        if (onLocationUpdate) {
          onLocationUpdate({ latitude, longitude });
        }
      },
      (error) => {
        console.log('❌ Error obteniendo ubicación:', error.message);
        // Usar ubicación por defecto si falla GPS
        if (!currentLocation) {
          setCurrentLocation({
            latitude: santodomingo.latitude,
            longitude: santodomingo.longitude,
          });
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={santodomingo}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        showsScale={true}
        mapType="standard"
        scrollEnabled={true}
        zoomEnabled={true}
        pitchEnabled={true}
        rotateEnabled={true}
      >
        {/* Marcador del conductor */}
        {currentLocation && (
          <Marker
            coordinate={currentLocation}
            title="📍 Tu ubicación"
            description="Estás aquí"
            pinColor="#007AFF"
          />
        )}

        {/* Marcador del destino */}
        {destination && currentTrip && (
          <Marker
            coordinate={destination}
            title="🎯 Destino"
            description={currentTrip?.destination || "Destino del viaje"}
            pinColor="#FF3B30"
          />
        )}

        {/* Ruta entre origen y destino */}
        {origin && destination && currentTrip && (
          <MapViewDirections
            origin={origin}
            destination={destination}
            apikey={GOOGLE_MAPS_APIKEY}
            strokeWidth={4}
            strokeColor="#3b82f6"
            optimizeWaypoints={true}
            onReady={result => {
              setRouteInfo({
                distance: result.distance,
                duration: result.duration
              });
            }}
            onError={(errorMessage) => {
              console.log('Error con direcciones:', errorMessage);
            }}
          />
        )}
      </MapView>

      {/* Panel de información de ruta */}
      {routeInfo && currentTrip && (
        <View style={styles.routeInfo}>
          <Text style={styles.routeText}>
            📏 Distancia: {routeInfo.distance.toFixed(1)} km
          </Text>
          <Text style={styles.routeText}>
            ⏱️ Tiempo: {Math.round(routeInfo.duration)} min
          </Text>
        </View>
      )}

      {/* Botones de navegación */}
      {currentTrip && (
        <View style={styles.navigationButtons}>
          <TouchableOpacity 
            style={styles.navButton}
            onPress={async () => {
              const pickupLat = currentTrip.pickupLocation?.latitude || currentTrip.pickupLat;
              const pickupLng = currentTrip.pickupLocation?.longitude || currentTrip.pickupLng;
              
              if (pickupLat && pickupLng) {
                // Iniciar background tracking antes de abrir Google Maps
                if (onStartBackgroundTracking) {
                  await onStartBackgroundTracking(currentTrip.id, pickupLat, pickupLng);
                }
                const url = `https://www.google.com/maps/dir/?api=1&destination=${pickupLat},${pickupLng}&travelmode=driving`;
                Linking.openURL(url);
              } else if (currentTrip.pickup) {
                const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(currentTrip.pickup)}&travelmode=driving`;
                Linking.openURL(url);
              } else {
                Alert.alert('Error', 'No hay ubicación del pasajero disponible');
              }
            }}
          >
            <Text style={styles.navButtonText}>👤 Al pasajero</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.navButton}
            onPress={() => {
              const destLat = currentTrip.destinationLocation?.latitude || currentTrip.destinationLat;
              const destLng = currentTrip.destinationLocation?.longitude || currentTrip.destinationLng;
              
              if (destLat && destLng) {
                const url = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=driving`;
                Linking.openURL(url);
              } else if (currentTrip.destination) {
                const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(currentTrip.destination)}&travelmode=driving`;
                Linking.openURL(url);
              } else {
                Alert.alert('Error', 'No hay ubicación del destino disponible');
              }
            }}
          >
            <Text style={styles.navButtonText}>🎯 Al destino</Text>
          </TouchableOpacity>
        </View>
      )}
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
  routeInfo: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  routeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  navigationButtons: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  navButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  navButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default MapComponent;