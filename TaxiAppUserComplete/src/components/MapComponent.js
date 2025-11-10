import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

const MapComponent = ({ userLocation, driverInfo, destination, showDriverLocation = false }) => {
  const mapRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);

  // Región por defecto - Santo Domingo CORRECTO
  const santodomingo = {
    latitude: 18.4861,
    longitude: -69.9312,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  };

  // ✅ Inicializar cuando el mapa está listo
  const handleMapReady = () => {
    setMapReady(true);
    if (mapRef.current) {
      mapRef.current.animateToRegion(santodomingo, 500);
    }
  };

  // ✅ Hacer zoom automático a la ubicación del usuario si existe
  useEffect(() => {
    if (mapRef.current && userLocation && mapReady) {
      mapRef.current.animateToRegion(
        {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        },
        500
      );
    }
  }, [userLocation, mapReady]);

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
        onMapReady={handleMapReady}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        showsScale={true}
        mapType="standard"
      >
        {/* Marcador de ubicación actual del usuario */}
        <Marker
          coordinate={defaultUserLocation}
          title="📍 Mi ubicación"
          description={userLocation?.address || "Tu ubicación actual"}
          pinColor="#0099FF"
        />

        {/* Marcador de destino si existe */}
        {destination && destination.latitude && destination.longitude && (
          <Marker
            coordinate={{
              latitude: destination.latitude,
              longitude: destination.longitude,
            }}
            title="📍 Destino"
            description={destination.address || "Destino del viaje"}
            pinColor="#FF3B30"
          />
        )}

        {/* Marcador del conductor si existe */}
        {showDriverLocation && driverInfo && driverInfo.currentLocation && (
          <Marker
            coordinate={{
              latitude: driverInfo.currentLocation.latitude,
              longitude: driverInfo.currentLocation.longitude,
            }}
            title="🚗 Conductor"
            description={driverInfo.name}
            pinColor="#34C759"
          />
        )}
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