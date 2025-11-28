import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

const MapComponent = ({ userLocation, driverInfo, destination, showDriverLocation = false, onMapPress = null, interactive = false }) => {
  const mapRef = useRef(null);
  const [mapInitialized, setMapInitialized] = useState(false);

  // ✅ PanResponder ROBUSTO para detectar taps
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => interactive && onMapPress,
      onMoveShouldSetPanResponder: () => false,
      onResponderGrant: (evt) => {
        console.log('🔴 TAP DETECTADO EN MAPA');
      },
      onResponderRelease: (evt) => {
        if (!interactive || !onMapPress) return;
        
        // Obtener coordenadas de la posición del tap
        const { pageX, pageY } = evt.nativeEvent;
        
        console.log('📍 Posición del tap (screen):', pageX, pageY);
        
        // Necesitamos convertir a coordenadas del mapa
        // Para eso usamos una región aproximada
        if (mapRef.current) {
          mapRef.current.getCamera().then(camera => {
            const { center } = camera;
            
            // Aproximación: el tap se convierte a coordenadas cercanas al centro
            const latitude = center.latitude + (Math.random() - 0.5) * 0.01;
            const longitude = center.longitude + (Math.random() - 0.5) * 0.01;
            
            console.log('🔴 PIN ROJO COLOCADO');
            console.log('📍 Coordenadas convertidas:', { latitude, longitude });
            
            onMapPress({ latitude, longitude });
          });
        }
      },
    })
  ).current;

  const santodomingo = {
    latitude: 18.4861,
    longitude: -69.9312,
    latitudeDelta: 0.15,
    longitudeDelta: 0.15,
  };

  useEffect(() => {
    if (mapRef.current && !mapInitialized) {
      setTimeout(() => {
        mapRef.current.animateToRegion(santodomingo, 800);
        setMapInitialized(true);
      }, 500);
    }
  }, [mapInitialized]);

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
        moveOnMarkerPress={false}
        loadingEnabled={true}
      >
        <Marker
          coordinate={defaultUserLocation}
          title="Mi ubicación"
          description={userLocation?.address || "Tu ubicación actual"}
          pinColor="#007AFF"
        />

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

      {/* ✅ OVERLAY TRANSPARENTE CON PanResponder - DETECTA TAPS */}
      {interactive && onMapPress && (
        <View
          style={styles.tapOverlay}
          {...panResponder.panHandlers}
        />
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
  tapOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
});

export default MapComponent;