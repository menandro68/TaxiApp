import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import Geolocation from '@react-native-community/geolocation';
import { GOOGLE_MAPS_APIKEY } from '../config/googleMapsConfig';

const MapComponent = ({ userLocation, driverInfo, destination, showDriverLocation = false }) => {
  const mapRef = useRef(null);
  
  const [currentLocation, setCurrentLocation] = useState({
    latitude: userLocation?.latitude || 18.4861,
    longitude: userLocation?.longitude || -69.9312,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  const [origin, setOrigin] = useState(null);
  const [destinationLocation, setDestinationLocation] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);

  useEffect(() => {
    getCurrentLocation();
  }, [userLocation]);

  useEffect(() => {
    if (destination) {
      setDestinationLocation({
        latitude: destination.latitude || 18.4861,
        longitude: destination.longitude || -69.9312,
      });
    }
  }, [destination]);

  const getCurrentLocation = () => {
    if (userLocation) {
      const newLocation = {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };
      setCurrentLocation(newLocation);
      setOrigin({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
      });

      if (mapRef.current) {
        mapRef.current.animateToRegion(newLocation, 1000);
      }
    } else {
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
        },
        (error) => {
          console.log('Error obteniendo ubicación:', error);
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
      );
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: 18.4861,
          longitude: -69.9312,
          latitudeDelta: 0.2,
          longitudeDelta: 0.2,
        }}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        showsScale={true}
        mapType="standard"
      >
        {/* Marcador del usuario */}
        {origin && (
          <Marker
            coordinate={origin}
            title="📍 Mi ubicación"
            description="Tu ubicación actual"
            pinColor="#007AFF"
          />
        )}

        {/* Marcador del destino */}
        {destinationLocation && (
          <Marker
            coordinate={destinationLocation}
            title="🎯 Destino"
            description={destination?.address || "Destino del viaje"}
            pinColor="#FF3B30"
          />
        )}

        {/* Marcador del conductor */}
        {showDriverLocation && driverInfo?.currentLocation && (
          <Marker
            coordinate={driverInfo.currentLocation}
            title="🚗 Conductor"
            description={driverInfo.name}
            pinColor="#34C759"
          />
        )}

        {/* Ruta entre origen y destino */}
        {origin && destinationLocation && (
          <MapViewDirections
            origin={origin}
            destination={destinationLocation}
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
            📏 {routeInfo.distance.toFixed(1)} km
          </Text>
          <Text style={styles.routeText}>
            ⏱️ {Math.round(routeInfo.duration)} min
          </Text>
        </View>
      )}

      {/* Botones de navegación */}
      {driverInfo && (
        <View style={styles.navigationButtons}>
          <TouchableOpacity 
            style={styles.navButton}
            onPress={() => Alert.alert('Información', `${driverInfo.name} está en camino`)}
          >
            <Text style={styles.navButtonText}>🚗 Conductor</Text>
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