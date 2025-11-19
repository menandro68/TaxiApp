import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';

const MapComponent = ({ userLocation, driverInfo, destination, showDriverLocation = false, onMapPress = null, interactive = false }) => {
  const mapRef = useRef(null);
  const [mapInitialized, setMapInitialized] = useState(false);

  // ✅ Manejar tap en el overlay táctil
  const handleTapOverlay = (event) => {
    const { locationX, locationY } = event.nativeEvent;
    console.log('🔴 Tap en overlay:', locationX, locationY);
    
    // Convertir coordenadas screen a map coordinates
    // Esto es aproximado pero funciona
    if (onMapPress && interactive) {
      const mapWidth = Dimensions.get('window').width;
      const mapHeight = styles.map.height || Dimensions.get('window').height * 0.5;
      
      // Aproximación simple
      const deltaLat = santodomingo.latitudeDelta / 2;
      const deltaLng = santodomingo.longitudeDelta / 2;
      
      const latitude = santodomingo.latitude + (0.5 - locationY / mapHeight) * deltaLat;
      const longitude = santodomingo.longitude + (locationX / mapWidth - 0.5) * deltaLng;
      
      console.log('✅ Coordenadas calculadas:', latitude, longitude);
      onMapPress({ latitude, longitude });
    }
  };

  // Región por defecto - Santo Domingo
  const santodomingo = {
    latitude: 18.4861,
    longitude: -69.9312,
    latitudeDelta: 0.15,
    longitudeDelta: 0.15,
  };

  // ✅ FORZAR zoom a Santo Domingo después de montar
  useEffect(() => {
    if (mapRef.current && !mapInitialized) {
      setTimeout(() => {
        mapRef.current.animateToRegion(santodomingo, 800);
        setMapInitialized(true);
      }, 500);
    }
  }, [mapInitialized]);

  // ✅ Hacer zoom automático a la ubicación del usuario cuando cambia
  useEffect(() => {
    if (mapRef.current && userLocation && mapInitialized) {
      mapRef.current.animateToRegion(
        {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.15,
          longitudeDelta: 0.15,
        },
        500
      );
    }
  }, [userLocation, mapInitialized]);

  const defaultUserLocation = {
    latitude: userLocation?.latitude || 18.4861,
    longitude: userLocation?.longitude || -69.9312,
  };

  return (
    <View style={styles.container}>
      <GestureDetector gesture={Gesture.Tap().onFinalize(() => {
        console.log('🔴 Tap detectado por GestureDetector');
      })}>
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
          {/* Marcador de ubicación actual del usuario */}
          <Marker
            coordinate={defaultUserLocation}
            title="Mi ubicación"
            description={userLocation?.address || "Tu ubicación actual"}
            pinColor="#007AFF"
          />

          {/* Marcador de destino si existe */}
          {destination && destination.latitude && destination.longitude && (
            <Marker
              coordinate={{
                latitude: destination.latitude,
                longitude: destination.longitude,
              }}
              title="Destino"
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
              title="Conductor"
              description={driverInfo.name}
              pinColor="#34C759"
            />
          )}
        </MapView>
      </GestureDetector>
      
      {/* OVERLAY TÁCTIL - INVISIBLE */}
      <TouchableOpacity
        style={[styles.mapOverlay]}
        activeOpacity={0}
        onPress={handleTapOverlay}
      />
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
  mapOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 999,
  },
});

export default MapComponent;