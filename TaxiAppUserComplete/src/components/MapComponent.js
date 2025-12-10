import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const MapComponent = ({
  userLocation,
  driverLocation,
  driverInfo,
  destination,
  showDriverLocation = false,
  onMapPress = null,
  interactive = false,
  trackingMode = false
}) => {
  const mapRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [currentRegion, setCurrentRegion] = useState(null);
  const touchStartData = useRef({ x: 0, y: 0, time: 0, count: 0 });

  const santodomingo = {
    latitude: 18.4861,
    longitude: -69.9312,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  };

  // Cuando el mapa esta listo
  const onMapReady = () => {
    console.log('Mapa listo');
    setMapReady(true);
  };

  // Modo normal: zoom a Santo Domingo y luego a usuario
  useEffect(() => {
    if (mapReady && mapRef.current && !trackingMode) {
      if (userLocation) {
        const region = {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        };
        mapRef.current.animateToRegion(region, 500);
      } else {
        mapRef.current.animateToRegion(santodomingo, 500);
      }
    }
  }, [mapReady, userLocation, trackingMode]);

  // TRACKING MODE: Ajustar para mostrar conductor y usuario
  useEffect(() => {
    if (trackingMode && mapReady && mapRef.current && driverLocation && userLocation) {
      console.log('Ajustando mapa para tracking:', {
        user: { lat: userLocation.latitude, lng: userLocation.longitude },
        driver: { lat: driverLocation.latitude, lng: driverLocation.longitude }
      });

      // Calcular region que incluya ambos puntos
      const minLat = Math.min(userLocation.latitude, driverLocation.latitude);
      const maxLat = Math.max(userLocation.latitude, driverLocation.latitude);
      const minLng = Math.min(userLocation.longitude, driverLocation.longitude);
      const maxLng = Math.max(userLocation.longitude, driverLocation.longitude);

      const latDelta = (maxLat - minLat) * 1.5 + 0.01;
      const lngDelta = (maxLng - minLng) * 1.5 + 0.01;

      const region = {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: Math.max(latDelta, 0.02),
        longitudeDelta: Math.max(lngDelta, 0.02),
      };

      mapRef.current.animateToRegion(region, 300);
    }
  }, [driverLocation, trackingMode, mapReady, userLocation]);

  const defaultUserLocation = {
    latitude: userLocation?.latitude || 18.4861,
    longitude: userLocation?.longitude || -69.9312,
  };

  const handleRegionChangeComplete = (region) => {
    setCurrentRegion(region);
  };

  const handleTouchStart = (evt) => {
    if (!interactive) return;
    const touches = evt.nativeEvent.touches;
    touchStartData.current = {
      x: touches[0]?.pageX || 0,
      y: touches[0]?.pageY || 0,
      time: Date.now(),
      count: touches.length,
    };
  };

  const handleTouchEnd = async (evt) => {
    if (!interactive || !onMapPress) return;
    const { x, y, time, count } = touchStartData.current;
    if (count > 1) return;

    const endX = evt.nativeEvent.pageX;
    const endY = evt.nativeEvent.pageY;
    const elapsed = Date.now() - time;
    const dx = Math.abs(endX - x);
    const dy = Math.abs(endY - y);

    if (dx < 15 && dy < 15 && elapsed < 300) {
      const locationX = evt.nativeEvent.locationX;
      const locationY = evt.nativeEvent.locationY;

      if (mapRef.current) {
        try {
          const coordinate = await mapRef.current.coordinateForPoint({
            x: locationX,
            y: locationY,
          });
          if (coordinate && coordinate.latitude && coordinate.longitude) {
            onMapPress(coordinate);
            return;
          }
        } catch (error) {
          console.log('coordinateForPoint fallo:', error.message);
        }
      }

      const region = currentRegion || santodomingo;
      const mapWidth = SCREEN_WIDTH;
      const mapHeight = SCREEN_HEIGHT * 0.55;
      const lng = region.longitude + (locationX / mapWidth - 0.5) * region.longitudeDelta;
      const lat = region.latitude - (locationY / mapHeight - 0.5) * region.latitudeDelta;
      onMapPress({ latitude: lat, longitude: lng });
    }
  };

  return (
    <View
      style={styles.container}
      onTouchStart={interactive ? handleTouchStart : undefined}
      onTouchEnd={interactive ? handleTouchEnd : undefined}
    >
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={santodomingo}
        onMapReady={onMapReady}
        showsUserLocation={!trackingMode}
        showsMyLocationButton={!trackingMode}
        showsCompass={true}
        showsScale={true}
        showsBuildings={true}
        mapType="standard"
        minZoomLevel={10}
        maxZoomLevel={18}
        scrollEnabled={true}
        zoomEnabled={true}
        pitchEnabled={false}
        rotateEnabled={false}
        moveOnMarkerPress={false}
        loadingEnabled={true}
        onRegionChangeComplete={handleRegionChangeComplete}
      >
        {/* Marcador Usuario - Modo Normal */}
        {!trackingMode && (
          <Marker
            coordinate={defaultUserLocation}
            title="Mi ubicacion"
            description={userLocation?.address || "Tu ubicacion actual"}
            pinColor="blue"
          />
        )}

        {/* Marcador Usuario - Modo Tracking (punto de recogida) */}
        {trackingMode && userLocation && (
          <Marker
            coordinate={{
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
            }}
            title="Tu ubicacion"
            description="Punto de recogida"
            pinColor="blue"
            anchor={{ x: 0.5, y: 0.5 }}
          />
        )}

        {/* Marcador Conductor - Modo Tracking */}
        {trackingMode && driverLocation && (
          <Marker
            coordinate={{
              latitude: driverLocation.latitude,
              longitude: driverLocation.longitude
            }}
            title={driverInfo?.name || 'Conductor'}
            description={driverInfo?.car || 'En camino'}
            pinColor="green"
            anchor={{ x: 0.5, y: 0.5 }}
          />
        )}

        {/* Marcador Conductor - Modo Normal */}
        {!trackingMode && showDriverLocation && driverInfo && driverInfo.currentLocation && (
          <Marker
            coordinate={{
              latitude: driverInfo.currentLocation.latitude,
              longitude: driverInfo.currentLocation.longitude,
            }}
            title="Conductor"
            description={driverInfo.name}
            pinColor="green"
          />
        )}

        {/* Linea de ruta conductor-usuario (solo tracking) */}
        {trackingMode && driverLocation && userLocation && (
          <Polyline
            coordinates={[
              { latitude: driverLocation.latitude, longitude: driverLocation.longitude },
              { latitude: userLocation.latitude, longitude: userLocation.longitude }
            ]}
            strokeColor="#007AFF"
            strokeWidth={3}
            lineDashPattern={[10, 5]}
          />
        )}

        {/* Marcador Destino */}
        {destination && destination.latitude && destination.longitude && (
          <Marker
            coordinate={{
              latitude: destination.latitude,
              longitude: destination.longitude,
            }}
            title="Destino"
            description={destination.address || "Destino del viaje"}
            pinColor="red"
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
