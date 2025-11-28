import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const MapComponent = ({ 
  userLocation, 
  driverInfo, 
  destination, 
  showDriverLocation = false, 
  onMapPress = null, 
  interactive = false 
}) => {
  const mapRef = useRef(null);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [currentRegion, setCurrentRegion] = useState(null);
  
  // Variables para detectar tap
  const touchStartData = useRef({ x: 0, y: 0, time: 0, count: 0 });

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
        setCurrentRegion(santodomingo);
        setMapInitialized(true);
      }, 500);
    }
  }, [mapInitialized]);

  // ✅ Hacer zoom automático a la ubicación del usuario cuando cambia
  useEffect(() => {
    if (mapRef.current && userLocation && mapInitialized) {
      const newRegion = {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      };
      mapRef.current.animateToRegion(newRegion, 500);
      setCurrentRegion(newRegion);
    }
  }, [userLocation, mapInitialized]);

  const defaultUserLocation = {
    latitude: userLocation?.latitude || 18.4861,
    longitude: userLocation?.longitude || -69.9312,
  };

  // ✅ Guardar región actual cuando el mapa se mueve
  const handleRegionChangeComplete = (region) => {
    setCurrentRegion(region);
  };

  // ✅ Detectar inicio de toque
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

  // ✅ Detectar fin de toque y procesar tap
  const handleTouchEnd = async (evt) => {
    if (!interactive || !onMapPress) return;
    
    const { x, y, time, count } = touchStartData.current;
    
    // Si hubo más de un dedo, NO es tap (es zoom)
    if (count > 1) {
      return;
    }
    
    const endX = evt.nativeEvent.pageX;
    const endY = evt.nativeEvent.pageY;
    const elapsed = Date.now() - time;
    const dx = Math.abs(endX - x);
    const dy = Math.abs(endY - y);
    
    // Es TAP si: 1 dedo, poco movimiento, poco tiempo
    if (dx < 15 && dy < 15 && elapsed < 300) {
      console.log('🔴 TAP DETECTADO!');
      
      // Calcular locationX/Y relativo al mapa
      const locationX = evt.nativeEvent.locationX;
      const locationY = evt.nativeEvent.locationY;
      
      console.log('🟡 Procesando tap en:', locationX, locationY);
      
      // Usar coordinateForPoint del MapView
      if (mapRef.current) {
        try {
          const coordinate = await mapRef.current.coordinateForPoint({
            x: locationX,
            y: locationY,
          });
          
          if (coordinate && coordinate.latitude && coordinate.longitude) {
            console.log('🔴 PIN ROJO - Coordenadas precisas:', coordinate);
            onMapPress(coordinate);
            return;
          }
        } catch (error) {
          console.log('⚠️ coordinateForPoint falló:', error.message);
        }
      }
      
      // Fallback: cálculo manual
      const region = currentRegion || santodomingo;
      const mapWidth = SCREEN_WIDTH;
      const mapHeight = SCREEN_HEIGHT * 0.55;
      
      const lng = region.longitude + (locationX / mapWidth - 0.5) * region.longitudeDelta;
      const lat = region.latitude - (locationY / mapHeight - 0.5) * region.latitudeDelta;
      
      const coordinate = { latitude: lat, longitude: lng };
      console.log('🔴 PIN ROJO - Coordenadas calculadas:', coordinate);
      onMapPress(coordinate);
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
        onRegionChangeComplete={handleRegionChangeComplete}
      >
        {/* Marcador azul - ubicación del usuario */}
        <Marker
          coordinate={defaultUserLocation}
          title="Mi ubicación"
          description={userLocation?.address || "Tu ubicación actual"}
          pinColor="#007AFF"
        />

        {/* Marcador rojo - destino seleccionado */}
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

        {/* Marcador verde - conductor */}
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