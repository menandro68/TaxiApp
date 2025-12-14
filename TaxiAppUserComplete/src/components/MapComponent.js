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
  const [mapInitialized, setMapInitialized] = useState(false);
  const [currentRegion, setCurrentRegion] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  
  // Posiciones de pantalla para overlay
  const [userScreenPos, setUserScreenPos] = useState(null);
  const [driverScreenPos, setDriverScreenPos] = useState(null);
  
  const touchStartData = useRef({ x: 0, y: 0, time: 0, count: 0 });

  const santodomingo = {
    latitude: 18.4861,
    longitude: -69.9312,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  };

  // Convertir coordenadas a posición de pantalla
  const updateScreenPositions = async () => {
    if (!mapRef.current || !trackingMode) return;
    
    try {
      if (userLocation?.latitude && userLocation?.longitude) {
        const userPoint = await mapRef.current.pointForCoordinate({
          latitude: Number(userLocation.latitude),
          longitude: Number(userLocation.longitude),
        });
        setUserScreenPos(userPoint);
      }
      
      if (driverLocation?.latitude && driverLocation?.longitude) {
        const driverPoint = await mapRef.current.pointForCoordinate({
          latitude: Number(driverLocation.latitude),
          longitude: Number(driverLocation.longitude),
        });
        setDriverScreenPos(driverPoint);
      }
    } catch (e) {
      console.log('Error calculando posiciones:', e);
    }
  };

  useEffect(() => {
    if (mapRef.current && !mapInitialized && !trackingMode && !interactive) {
      setTimeout(() => {
        mapRef.current.animateToRegion(santodomingo, 800);
        setCurrentRegion(santodomingo);
        setMapInitialized(true);
      }, 500);
    } else if (trackingMode || interactive) {
      setMapInitialized(true);
    }
  }, [mapInitialized, trackingMode, interactive]);

  useEffect(() => {
    if (mapRef.current && userLocation && mapInitialized && !trackingMode && !interactive) {
      const newRegion = {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      };
      mapRef.current.animateToRegion(newRegion, 500);
      setCurrentRegion(newRegion);
    }
  }, [userLocation, mapInitialized, trackingMode, interactive]);

  useEffect(() => {
    if (interactive && destination && destination.latitude && destination.longitude) {
      const timer1 = setTimeout(() => {
        if (mapRef.current) {
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

  useEffect(() => {
    if (trackingMode && mapRef.current) {
      if (driverLocation && driverLocation.latitude && userLocation && userLocation.latitude) {
        console.log('🚗 Centrando en conductor:', driverLocation.latitude, driverLocation.longitude);
        
        const coordinates = [
          { latitude: Number(driverLocation.latitude), longitude: Number(driverLocation.longitude) },
          { latitude: Number(userLocation.latitude), longitude: Number(userLocation.longitude) }
        ];
        
        mapRef.current.fitToCoordinates(coordinates, {
          edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
          animated: true
        });
        
        // Actualizar posiciones después de animar
        setTimeout(updateScreenPositions, 500);
      } else if (userLocation) {
        mapRef.current.animateToRegion({
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }, 300);
      }
    }
  }, [driverLocation, trackingMode, userLocation]);

  const defaultUserLocation = {
    latitude: userLocation?.latitude || 18.4861,
    longitude: userLocation?.longitude || -69.9312,
  };

  const handleRegionChangeComplete = (region) => {
    setCurrentRegion(region);
    if (trackingMode) {
      updateScreenPositions();
    }
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
        onMapReady={() => {
          setMapReady(true);
          setTimeout(updateScreenPositions, 500);
        }}
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

        {/* Línea de ruta entre conductor y usuario (solo tracking) */}
        {trackingMode && driverLocation && userLocation && (
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

      {/* 🔴 OVERLAY: Marcador Usuario - Tracking Mode */}
      {trackingMode && userScreenPos && (
        <View 
          style={[
            styles.overlayMarker, 
            { left: userScreenPos.x - 12, top: userScreenPos.y - 12 }
          ]} 
          pointerEvents="none"
        >
          <View style={styles.userDot} />
        </View>
      )}

      {/* 🟢 OVERLAY: Marcador Conductor - Tracking Mode */}
      {trackingMode && driverScreenPos && (
        <View 
          style={[
            styles.overlayMarker, 
            { left: driverScreenPos.x - 14, top: driverScreenPos.y - 14 }
          ]} 
          pointerEvents="none"
        >
          <View style={styles.driverDot}>
            <Text style={styles.carEmoji}>🚗</Text>
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
  overlayMarker: {
    position: 'absolute',
    zIndex: 999,
  },
  userDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF0000',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    elevation: 5,
  },
  driverDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#34C759',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  carEmoji: {
    fontSize: 14,
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
});

export default MapComponent;