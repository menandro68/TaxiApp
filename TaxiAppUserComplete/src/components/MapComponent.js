import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Text,
} from 'react-native';
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
  // DEBUG
  console.log('🗺️ MapComponent destination:', destination);
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

  // ✅ FORZAR zoom a Santo Domingo después de montar (solo si NO es tracking)
  useEffect(() => {
    if (mapRef.current && !mapInitialized && !trackingMode) {
      setTimeout(() => {
        mapRef.current.animateToRegion(santodomingo, 800);
        setCurrentRegion(santodomingo);
        setMapInitialized(true);
      }, 500);
    } else if (trackingMode) {
      setMapInitialized(true);
    }
  }, [mapInitialized, trackingMode]);

  // ✅ Hacer zoom automático a la ubicación del usuario cuando cambia (solo si NO es tracking)
  useEffect(() => {
    if (mapRef.current && userLocation && mapInitialized && !trackingMode) {
      const newRegion = {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      };
      mapRef.current.animateToRegion(newRegion, 500);
      setCurrentRegion(newRegion);
    }
  }, [userLocation, mapInitialized, trackingMode]);

  // ✅ TRACKING MODE: Ajustar mapa para mostrar conductor y usuario
  useEffect(() => {
    if (trackingMode && mapRef.current && driverLocation && userLocation) {
      const coordinates = [
        { latitude: userLocation.latitude, longitude: userLocation.longitude },
        { latitude: driverLocation.latitude, longitude: driverLocation.longitude }
      ];
      
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
        animated: true
      });
    }
  }, [driverLocation, trackingMode, userLocation]);

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
        pitchEnabled={true}
        rotateEnabled={true}
        moveOnMarkerPress={false}
        loadingEnabled={true}
        onRegionChangeComplete={handleRegionChangeComplete}
      >
        {/* Marcador del Usuario - Modo Normal (azul standard) */}
        {!trackingMode && (
          <Marker
            coordinate={defaultUserLocation}
            title="Mi ubicación"
            description={userLocation?.address || "Tu ubicación actual"}
            pinColor="#007AFF"
          />
        )}

        {/* Marcador del Usuario - Modo Tracking */}
        {trackingMode && userLocation && userLocation.latitude && userLocation.longitude && (
          <Marker
            coordinate={{
              latitude: Number(userLocation.latitude),
              longitude: Number(userLocation.longitude),
            }}
            title="📍 Tu ubicación"
            description={userLocation.address || "Punto de recogida"}
            pinColor="blue"
            onPress={() => console.log('🔵 Marker USUARIO tocado')}
          />
        )}

        {/* Marcador del Conductor - Modo Tracking */}
        {trackingMode && driverLocation && driverLocation.latitude && driverLocation.longitude && (
          <Marker
            coordinate={{
              latitude: Number(driverLocation.latitude),
              longitude: Number(driverLocation.longitude)
            }}
            title={driverInfo?.name || '🚗 Conductor'}
            description={driverInfo?.car || 'En camino'}
            pinColor="green"
            onPress={() => console.log('🟢 Marker CONDUCTOR tocado')}
          />
        )}

        {/* Marcador del Conductor - Modo Normal (verde standard) */}
        {!trackingMode && showDriverLocation && driverInfo && driverInfo.currentLocation && (
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

        {/* Línea de ruta entre conductor y usuario (solo tracking) */}
        {trackingMode && driverLocation && userLocation && (
          <Polyline
            coordinates={[
              { latitude: driverLocation.latitude, longitude: driverLocation.longitude },
              { latitude: userLocation.latitude, longitude: userLocation.longitude }
            ]}
            strokeColor="#007AFF"
            strokeWidth={4}
            lineDashPattern={[10, 5]}
          />
        )}

        {/* Marcador rojo - destino seleccionado */}
        {destination && destination.latitude && destination.longitude && (
          <Marker
            coordinate={{
              latitude: destination.latitude,
              longitude: destination.longitude,
            }}
            title="🎯 Destino"
            description={destination.address || "Destino del viaje"}
            pinColor="#FF3B30"
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
  // Marcador del usuario (punto azul) - Tracking Mode
  userMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 122, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  userMarkerInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#007AFF',
  },
  // Marcador del conductor (carro) - Tracking Mode
  driverMarker: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverMarkerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 6,
  },
  carIcon: {
    width: 26,
    height: 18,
    backgroundColor: '#fff',
    borderRadius: 5,
  },
  carMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  carEmoji: {
    fontSize: 24,
  },
});

export default MapComponent;