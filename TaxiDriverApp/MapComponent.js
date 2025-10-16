import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import Geolocation from '@react-native-community/geolocation';

// IMPORTANTE: Reemplaza con tu API Key de Google
const GOOGLE_MAPS_APIKEY = 'AIzaSyC6HuO-nRJxdZctdH0o_-nuezUOILq868Q';

const MapComponent = ({ currentTrip, tripPhase, onLocationUpdate }) => {
  const [currentLocation, setCurrentLocation] = useState({
    latitude: 18.4765,
    longitude: -69.9173,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);

  useEffect(() => {
    getCurrentLocation();
    
    // Si hay un viaje activo, configurar origen y destino
    if (currentTrip) {
      setOrigin({
        latitude: 18.4765,
        longitude: -69.9173,
      });
      setDestination({
        latitude: 18.4861,
        longitude: -69.9404,
      });
    }
  }, [currentTrip]);

  const getCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newLocation = {
          latitude,
          longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        };
        setCurrentLocation(newLocation);
        setOrigin({ latitude, longitude });
        
        if (onLocationUpdate) {
          onLocationUpdate({ latitude, longitude });
        }
      },
      (error) => {
        console.log('Error obteniendo ubicación:', error);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
    );
  };

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={currentLocation}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {/* Marcador del conductor */}
        {origin && (
          <Marker
            coordinate={origin}
            title="📍 Tu ubicación"
            description="Estás aquí"
          />
        )}

        {/* Marcador del destino */}
        {destination && (
          <Marker
            coordinate={destination}
            title="🎯 Destino"
            description={currentTrip?.destination || "Destino del viaje"}
          />
        )}

        {/* Ruta entre origen y destino */}
        {origin && destination && GOOGLE_MAPS_APIKEY !== 'TU_API_KEY_AQUI' && (
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
      {routeInfo && (
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
            onPress={() => Alert.alert('Navegación', 'Iniciando navegación al pasajero')}
          >
            <Text style={styles.navButtonText}>👤 Al pasajero</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.navButton}
            onPress={() => Alert.alert('Navegación', 'Iniciando navegación al destino')}
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