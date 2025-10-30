import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

const MapComponent = ({ userLocation, driverInfo, destination, showDriverLocation = false }) => {
  const mapRef = useRef(null);

  // Región por defecto más zoomed
  const santodomingo = {
    latitude: 18.4861,
    longitude: -69.9312,
    latitudeDelta: 0.05,    // ← REDUCIDO de 0.1
    longitudeDelta: 0.05,   // ← REDUCIDO de 0.1
  };

  // ✅ NUEVO: Hacer zoom automático a la ubicación del usuario
  useEffect(() => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        },
        500 // animación en 500ms
      );
    }
  }, [userLocation]);

  const defaultUserLocation = {
    latitude: userLocation?.latitude || 18.4861,
    longitude: userLocation?.longitude || -69.9312,
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={santodomingo}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={true}
        showsScale={true}
        mapType="standard"
      >
        <Marker
          coordinate={defaultUserLocation}
          title="📍 Tu ubicación"
          description="Ubicación actual"
          pinColor="#007AFF"
        />
      </MapView>
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
});

export default MapComponent;