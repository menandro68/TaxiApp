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
  console.log('🗺️ MapComponent [interactive=' + interactive + '] destination:', destination);
  if (trackingMode) {
    console.log('🔴 userLocation:', userLocation?.latitude, userLocation?.longitude);
    console.log('🟢 driverLocation:', driverLocation?.latitude, driverLocation?.longitude);
  }
  
  const mapRef = useRef(null);
  const [currentRegion, setCurrentRegion] = useState(null);
  const touchStartData = useRef({ x: 0, y: 0, time: 0, count: 0 });
  
  // Estados para overlay markers (solución Legacy Architecture)
  const [userMarkerPos, setUserMarkerPos] = useState(null);
  const [driverMarkerPos, setDriverMarkerPos] = useState(null);
  const [mapLayout, setMapLayout] = useState({ width: SCREEN_WIDTH, height: 300 });

  // ✅ REGIÓN SANTO DOMINGO - SIEMPRE (deltas 0.15 que FUNCIONABAN)
  const santodomingo = {
    latitude: 18.4861,
    longitude: -69.9312,
    latitudeDelta: 0.15,
    longitudeDelta: 0.15,
  };

  // Función para convertir coordenadas a posición de pantalla
  const coordToPixel = (coord, region, layout) => {
    if (!coord || !region || !layout) return null;
    
    const { latitude, longitude } = coord;
    const { width, height } = layout;
    
    // Calcular posición relativa
    const x = ((longitude - region.longitude) / region.longitudeDelta + 0.5) * width;
    const y = ((region.latitude - latitude) / region.latitudeDelta + 0.5) * height;
    
    // Solo retornar si está dentro del viewport
    if (x >= -20 && x <= width + 20 && y >= -20 && y <= height + 20) {
      return { x, y };
    }
    return null;
  };

  // Actualizar posiciones de overlay markers cuando cambia la región o ubicaciones
  useEffect(() => {
    console.log('🎯 OVERLAY useEffect - trackingMode:', trackingMode, 'currentRegion:', !!currentRegion);
    
    if (!trackingMode) return;
    
    // Usar región actual o calcular una basada en las ubicaciones
    let region = currentRegion;
    if (!region && userLocation?.latitude) {
      region = {
        latitude: Number(userLocation.latitude),
        longitude: Number(userLocation.longitude),
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      };
    }
    
    if (!region) {
      console.log('🎯 OVERLAY - No hay región disponible');
      return;
    }
    
    console.log('🎯 OVERLAY - Región:', region.latitude, region.longitude, 'Delta:', region.latitudeDelta);
    console.log('🎯 OVERLAY - mapLayout:', mapLayout.width, 'x', mapLayout.height);
    
    if (userLocation?.latitude) {
      const pos = coordToPixel(
        { latitude: Number(userLocation.latitude), longitude: Number(userLocation.longitude) },
        region,
        mapLayout
      );
      console.log('🔴 OVERLAY userMarkerPos:', pos);
      setUserMarkerPos(pos);
    }
    
    if (driverLocation?.latitude) {
      const pos = coordToPixel(
        { latitude: Number(driverLocation.latitude), longitude: Number(driverLocation.longitude) },
        region,
        mapLayout
      );
      console.log('🟢 OVERLAY driverMarkerPos:', pos);
      setDriverMarkerPos(pos);
    }
  }, [trackingMode, currentRegion, userLocation, driverLocation, mapLayout]);

  // ✅ SOLUCIÓN: useEffect con setTimeout DIRECTO - NO depende de onMapReady
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapRef.current) {
        console.log('📍 FORZANDO animación a Santo Domingo (500ms después de montar)');
        mapRef.current.animateToRegion(santodomingo, 800);
        setCurrentRegion(santodomingo);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // ✅ Segundo intento después de 1.5s (backup)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapRef.current && !trackingMode && !interactive) {
        console.log('📍 Backup: Segundo animateToRegion a Santo Domingo');
        mapRef.current.animateToRegion(santodomingo, 500);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [trackingMode, interactive]);

  // ✅ Animar a userLocation cuando esté disponible
  useEffect(() => {
    if (mapRef.current && userLocation && userLocation.latitude && !trackingMode && !interactive) {
      const timer = setTimeout(() => {
        const newRegion = {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        };
        console.log('📍 Animando a ubicación del usuario:', userLocation.latitude, userLocation.longitude);
        mapRef.current.animateToRegion(newRegion, 500);
        setCurrentRegion(newRegion);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [userLocation, trackingMode, interactive]);

  // ✅ Modo interactive: animar al destino
  useEffect(() => {
    if (interactive && destination && destination.latitude && destination.longitude) {
      const timer1 = setTimeout(() => {
        if (mapRef.current) {
          console.log('📍 Animando a destino (interactive):', destination.latitude, destination.longitude);
          mapRef.current.animateToRegion({
            latitude: Number(destination.latitude),
            longitude: Number(destination.longitude),
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }, 300);
        }
      }, 500);

      const timer2 = setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: Number(destination.latitude),
            longitude: Number(destination.longitude),
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }, 300);
        }
      }, 1500);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [interactive, destination]);

  // ✅ Modo tracking: centrar entre conductor y usuario
  useEffect(() => {
    if (trackingMode && mapRef.current) {
      const timer = setTimeout(() => {
        if (driverLocation && driverLocation.latitude && userLocation && userLocation.latitude) {
          console.log('🚗 Centrando entre conductor y usuario');
          
          const midLat = (Number(driverLocation.latitude) + Number(userLocation.latitude)) / 2;
          const midLng = (Number(driverLocation.longitude) + Number(userLocation.longitude)) / 2;
          
          const newRegion = {
            latitude: midLat,
            longitude: midLng,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          };
          
          mapRef.current.animateToRegion(newRegion, 300);
          setCurrentRegion(newRegion);  // ✅ Actualizar estado para overlays
        } else if (userLocation && userLocation.latitude) {
          console.log('📍 Centrando en usuario (tracking):', userLocation.latitude, userLocation.longitude);
          const newRegion = {
            latitude: Number(userLocation.latitude),
            longitude: Number(userLocation.longitude),
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          };
          mapRef.current.animateToRegion(newRegion, 300);
          setCurrentRegion(newRegion);  // ✅ Actualizar estado para overlays
        } else {
          // Fallback a Santo Domingo si no hay ubicaciones
          console.log('📍 Tracking: Fallback a Santo Domingo');
          mapRef.current.animateToRegion(santodomingo, 300);
          setCurrentRegion(santodomingo);
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [driverLocation, trackingMode, userLocation]);

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
          const coordinate = await mapRef.current.coordinateForPoint({ x: locationX, y: locationY });
          if (coordinate && coordinate.latitude && coordinate.longitude) {
            onMapPress(coordinate);
            return;
          }
        } catch (error) {}
      }
      
      const region = currentRegion || santodomingo;
      const mapWidth = SCREEN_WIDTH;
      const mapHeight = SCREEN_HEIGHT * 0.55;
      const lng = region.longitude + (locationX / mapWidth - 0.5) * region.longitudeDelta;
      const lat = region.latitude - (locationY / mapHeight - 0.5) * region.latitudeDelta;
      onMapPress({ latitude: lat, longitude: lng });
    }
  };

  // Debug para tracking
  if (trackingMode) {
    console.log('🔍 DEBUG MARKERS:');
    console.log('  - trackingMode:', trackingMode);
    console.log('  - userLocation válido:', !!(userLocation && userLocation.latitude));
    console.log('  - driverLocation válido:', !!(driverLocation && driverLocation.latitude));
    console.log('  - userMarkerPos:', userMarkerPos);
    console.log('  - driverMarkerPos:', driverMarkerPos);
    console.log('  - currentRegion:', currentRegion ? 'SET' : 'NULL');
  }

  return (
    <View 
      style={styles.container}
      onTouchStart={interactive ? handleTouchStart : undefined}
      onTouchEnd={interactive ? handleTouchEnd : undefined}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setMapLayout({ width, height });
      }}
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
        onPress={interactive ? (event) => {
          const { latitude, longitude } = event.nativeEvent.coordinate;
          if (onMapPress) onMapPress({ latitude, longitude });
        } : undefined}
      >
        {/* Marcador del Usuario - Modo Normal */}
        {!trackingMode && !interactive && (
          <Marker
            coordinate={defaultUserLocation}
            title="Mi ubicación"
            description={userLocation?.address || "Tu ubicación actual"}
            pinColor="#007AFF"
          />
        )}

        {/* Marcador del Conductor - Modo Normal */}
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

        {/* 🔴 MARKER: Punto de recogida - Tracking Mode */}
        {trackingMode && userLocation && userLocation.latitude && (
          <Marker
            coordinate={{
              latitude: Number(userLocation.latitude),
              longitude: Number(userLocation.longitude),
            }}
            title="Punto de recogida"
            pinColor="red"
          />
        )}

        {/* 🟢 MARKER: Conductor - Tracking Mode */}
        {trackingMode && driverLocation && driverLocation.latitude && (
          <Marker
            coordinate={{
              latitude: Number(driverLocation.latitude),
              longitude: Number(driverLocation.longitude),
            }}
            title="Conductor"
            pinColor="green"
          />
        )}

        {/* Línea de ruta entre conductor y usuario (solo tracking) */}
        {trackingMode && driverLocation && userLocation && driverLocation.latitude && userLocation.latitude && (
          <Polyline
            coordinates={[
              { latitude: Number(driverLocation.latitude), longitude: Number(driverLocation.longitude) },
              { latitude: Number(userLocation.latitude), longitude: Number(userLocation.longitude) }
            ]}
            strokeColor="#007AFF"
            strokeWidth={4}
            lineDashPattern={[10, 5]}
          />
        )}
      </MapView>

      {/* 🟢 CONDUCTOR - CARRITO */}
      {trackingMode && driverMarkerPos && (
        <View 
          style={[
            styles.overlayMarker,
            { 
              left: driverMarkerPos.x - 10,
              top: driverMarkerPos.y - 10,
            }
          ]} 
          pointerEvents="none"
        >
          <Text style={styles.carEmoji}>🚗</Text>
        </View>
      )}

      {/* 🔴 USUARIO DESPUÉS (encima) */}
      {trackingMode && userMarkerPos && (
        <View 
          style={[
            styles.overlayMarker,
            { 
              left: userMarkerPos.x - 8,
              top: userMarkerPos.y - 8,
            }
          ]} 
          pointerEvents="none"
        >
          <View style={styles.userMarker}>
            <View style={styles.userMarkerInner} />
          </View>
        </View>
      )}

      {/* PIN FIJO EN EL CENTRO - Solo modo picker */}
      {interactive && (
        <View style={styles.centerPinContainer} pointerEvents="none">
          <View style={styles.centerPin} />
          <View style={styles.centerPinShadow} />
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
  centerPinContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerPin: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF0000',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    zIndex: 999,
  },
  centerPinShadow: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
    marginTop: 22,
  },
  // Estilos para overlay markers (Legacy Architecture fix) - MÁS PEQUEÑOS
  overlayMarker: {
    position: 'absolute',
    zIndex: 1000,
  },
  userMarker: {
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: '#FF0000',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 15,
  },
  userMarkerInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  driverMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#00AA00',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 10,
  },
  carIcon: {
    width: 12,
    height: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  carEmoji: {
    fontSize: 17,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
});

export default MapComponent;