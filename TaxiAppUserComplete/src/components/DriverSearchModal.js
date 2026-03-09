// DriverSearchModal.js - SIN MapView (evita bug de África)
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import DriverSearchService from '../services/DriverSearchService';

const { width, height } = Dimensions.get('window');
const RADAR_SIZE = width * 0.9; // 90% del ancho
const RADAR_CENTER = RADAR_SIZE / 2;

const DriverSearchModal = ({ visible, onClose, onDriverFound, userLocation, onDriversLoaded, tripRequestId }) => {
  const [searchProgress, setSearchProgress] = useState({
    attempt: 0,
    totalAttempts: 5,
    radius: 0,
    message: 'Iniciando búsqueda...',
  });
  const [isSearching, setIsSearching] = useState(false);
  const [driverFound, setDriverFound] = useState(null);
  const [searchFailed, setSearchFailed] = useState(false);
  const [pulseAnim1] = useState(new Animated.Value(0));
  const [pulseAnim2] = useState(new Animated.Value(0));
  const [pulseAnim3] = useState(new Animated.Value(0));
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef(null);

  useEffect(() => {
    if (visible && userLocation) {
      console.log('📍 Modal: Iniciando búsqueda');
      loadAvailableDrivers();
      setTimeout(() => {
        startSearch();
      }, 100);
    }
  }, [visible, userLocation]);

  useEffect(() => {
    if (isSearching || visible) {
      startPulseAnimation();
    }
  }, [isSearching, visible]);

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => setMapReady(true), 300);
      return () => clearTimeout(timer);
    } else {
      setMapReady(false);
    }
  }, [visible]);

  const loadAvailableDrivers = async () => {
    try {
      const drivers = await DriverSearchService.searchDriversInRadius(userLocation, 15);
      if (drivers && drivers.length > 0) {
        setAvailableDrivers(drivers);
        console.log('🚗 Conductores disponibles:', drivers.length);
        if (onDriversLoaded) {
          onDriversLoaded(drivers);
        }
      }
    } catch (error) {
      console.log('No se pudieron cargar conductores:', error);
    }
  };

  const startPulseAnimation = () => {
    // Reiniciar
    pulseAnim1.setValue(0);
    pulseAnim2.setValue(0);
    pulseAnim3.setValue(0);

    // Animación escalonada de 3 círculos
    Animated.loop(
      Animated.stagger(400, [
        Animated.timing(pulseAnim1, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim2, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim3, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

const startSearch = async () => {
    setIsSearching(true);
    setSearchFailed(false);
    setDriverFound(null);

    try {
      const result = await DriverSearchService.searchDriversIncremental(
        userLocation,
        (progress) => {
          setSearchProgress(progress);
        }
      );

      if (result.success) {
        setDriverFound(result.driver);
        setTimeout(() => {
          onDriverFound(result.driver);
          if (onDriversLoaded) onDriversLoaded([]);
        }, 2000);
      } else {
        setSearchFailed(true);
        setIsSearching(false);
      }
    } catch (error) {
      console.error('Error buscando conductores:', error);
      setSearchFailed(true);
      setIsSearching(false);
    }
  };

  // POLLING DE SEGURIDAD: detectar aceptación aunque FCM falle
  useEffect(() => {
    if (!visible || !tripRequestId) return;
    let stopped = false;

    const poll = async () => {
      try {
        const res = await fetch(
          `https://web-production-99844.up.railway.app/api/trips/search-status/${tripRequestId}`
        );
        const data = await res.json();
        if (data.driverAssigned && data.driver && !stopped) {
          stopped = true;
          onDriverFound(data.driver);
        }
      } catch (e) {}
    };

    const interval = setInterval(poll, 3000);
    return () => { stopped = true; clearInterval(interval); };
  }, [visible, tripRequestId]);

  const handleClose = () => {
    Alert.alert('Cancelar búsqueda', '¿Estás seguro que deseas cancelar?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Sí',
        onPress: () => {
          if (onDriversLoaded) {
            onDriversLoaded([]);
          }
          onClose();
        },
      },
    ]);
  };

  const handleRetry = () => {
    setSearchFailed(false);
    loadAvailableDrivers();
    startSearch();
  };

  // Calcular posición del conductor relativa al usuario
  const getDriverPosition = (driver, index) => {
    const userLat = userLocation?.latitude || 18.4861;
    const userLng = userLocation?.longitude || -69.9312;
    const driverLat = parseFloat(driver.location?.latitude || driver.latitude);
    const driverLng = parseFloat(driver.location?.longitude || driver.longitude);
    
    const markerSize = RADAR_SIZE * 0.075;

    if (!driverLat || !driverLng || isNaN(driverLat) || isNaN(driverLng)) {
      const angle = (index * 120) * (Math.PI / 180);
      const radius = RADAR_CENTER * 0.6;
      return {
        top: RADAR_CENTER + Math.sin(angle) * radius - markerSize / 2,
        left: RADAR_CENTER + Math.cos(angle) * radius - markerSize / 2,
      };
    }

    const deltaLat = (driverLat - userLat) * 5000;
    const deltaLng = (driverLng - userLng) * 5000;

    const maxRadius = RADAR_CENTER * 0.7;
    const distance = Math.sqrt(deltaLat * deltaLat + deltaLng * deltaLng);
    const scale = distance > maxRadius ? maxRadius / distance : 1;

    const x = deltaLng * scale;
    const y = -deltaLat * scale;

    return {
      top: RADAR_CENTER + y - markerSize / 2,
      left: RADAR_CENTER + x - markerSize / 2,
    };
  };

  if (!visible) return null;

  const renderPulseCircle = (anim, size, delay) => (
    <Animated.View
      style={[
        styles.pulseCircle,
        {
          width: size,
          height: size,
          borderRadius: 20,
          opacity: anim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.6, 0],
          }),
          transform: [
            {
              scale: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.3, 1],
              }),
            },
          ],
        },
      ]}
    />
  );

  const renderSearching = () => (
    <View style={styles.searchingContainer}>
      {/* Contenedor del radar */}
      <View style={[styles.radarContainer, { width: RADAR_SIZE + 20, height: RADAR_SIZE + 20 }]}>
        {/* Fondo del círculo */}
        <View style={[styles.radarBackground, { width: RADAR_SIZE, height: RADAR_SIZE, borderRadius: 20, overflow: 'hidden' }]}>
          {mapReady && userLocation ? (
            <MapView
              ref={mapRef}
              provider={PROVIDER_GOOGLE}
              style={{ width: RADAR_SIZE, height: RADAR_SIZE }}
              initialRegion={{
                latitude: 18.4861,
                longitude: -69.9312,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              }}
              onMapReady={() => {
                console.log('🗺️ Mapa del modal listo');
                setTimeout(() => {
                  if (mapRef.current && userLocation) {
                    mapRef.current.animateToRegion({
                      latitude: userLocation.latitude,
                      longitude: userLocation.longitude,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    }, 500);
                  }
                }, 300);
              }}
              scrollEnabled={false}
              zoomEnabled={false}
              rotateEnabled={false}
              pitchEnabled={false}
            >
              <Marker coordinate={{ latitude: userLocation.latitude, longitude: userLocation.longitude }}>
                <View style={styles.userMarker}>
                  <Icon name="location" size={10} color="#fff" />
                </View>
              </Marker>
              {availableDrivers.map((driver, index) => {
                const lat = parseFloat(driver.location?.latitude || driver.latitude);
                const lng = parseFloat(driver.location?.longitude || driver.longitude);
                if (!lat || !lng || isNaN(lat) || isNaN(lng)) return null;
                return (
                  <Marker key={`driver-${driver.id || index}`} coordinate={{ latitude: lat, longitude: lng }}>
                    <Text style={{ fontSize: 24 }}>🚗</Text>
                  </Marker>
                );
              })}
            </MapView>
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Icon name="map" size={40} color="#007AFF" />
              <Text style={{ marginTop: 10, color: '#007AFF' }}>Cargando mapa...</Text>
            </View>
          )}
        </View>
      </View>

      <Text style={styles.searchTitle}>Buscando conductores cerca de ti</Text>
      <Text style={styles.searchMessage}>{searchProgress.message}</Text>

      {availableDrivers.length > 0 && (
        <Text style={styles.driversCount}>
          {availableDrivers.length} conductor{availableDrivers.length > 1 ? 'es' : ''} en tu zona
        </Text>
      )}

      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${(searchProgress.attempt / searchProgress.totalAttempts) * 100}%` },
          ]}
        />
      </View>

      <View style={styles.searchInfo}>
        <Icon name="location" size={16} color="#666" />
        <Text style={styles.searchInfoText}>
          Radio de búsqueda: {searchProgress.radius < 1 ? `${searchProgress.radius * 1000}m` : `${searchProgress.radius}km`}
        </Text>
      </View>

      <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
        <Text style={styles.cancelButtonText}>Cancelar búsqueda</Text>
      </TouchableOpacity>
    </View>
  );

  const renderDriverFound = () => (
    <View style={styles.foundContainer}>
      <View style={styles.successIcon}>
        <Icon name="checkmark-circle" size={80} color="#34C759" />
      </View>

      <Text style={styles.foundTitle}>¡Conductor encontrado!</Text>

      {driverFound && (
        <View style={styles.driverInfo}>
          <View style={styles.driverDetails}>
            <Text style={styles.driverName}>{driverFound.name}</Text>
            <View style={styles.ratingContainer}>
              <Icon name="star" size={16} color="#FFD700" />
              <Text style={styles.rating}>{driverFound.rating}</Text>
              <Text style={styles.trips}>• {driverFound.trips} viajes</Text>
            </View>
          </View>

          <View style={styles.vehicleInfo}>
            <Icon name="car" size={20} color="#666" />
            <Text style={styles.vehicleText}>
              {driverFound.vehicle.make} {driverFound.vehicle.model}
            </Text>
          </View>

          <View style={styles.plateInfo}>
            <Text style={styles.plateLabel}>Placa:</Text>
            <Text style={styles.plateNumber}>{driverFound.vehicle.plate}</Text>
          </View>

          <View style={styles.etaContainer}>
            <Icon name="time" size={20} color="#007AFF" />
            <Text style={styles.etaText}>
              Llegará en aproximadamente {driverFound.eta} minutos
            </Text>
          </View>
        </View>
      )}

      <Text style={styles.redirectText}>Redirigiendo...</Text>
    </View>
  );

  const renderSearchFailed = () => (
    <View style={styles.failedContainer}>
      <Icon name="alert-circle" size={80} color="#FF3B30" />

      <Text style={styles.failedTitle}>Sin conductores disponibles</Text>
      <Text style={styles.failedMessage}>
        EN ESTE MOMENTO NO TENEMOS CONDUCTORES DISPONIBLE INTENTELO MAS TARDES
      </Text>

      <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
        <Icon name="refresh" size={20} color="#fff" />
        <Text style={styles.retryButtonText}>Intentar de nuevo</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.closeButtonAlt} onPress={handleClose}>
        <Text style={styles.closeButtonAltText}>Cerrar</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.fullScreenModal}>
      {/* Header con botón cerrar */}
      <View style={styles.header}>
        <Text style={styles.appName}>Squid Usuario</Text>
        <Text style={styles.appSlogan}>Tu viaje seguro y rapido</Text>
      </View>

      {(isSearching || (!driverFound && !searchFailed)) && renderSearching()}
      {!isSearching && driverFound && renderDriverFound()}
      {!isSearching && searchFailed && renderSearchFailed()}
    </View>
  );
};

const styles = StyleSheet.create({
  fullScreenModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    zIndex: 9999,
  },
  header: {
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 10,
  },
  appName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#34C759',
  },
  appSlogan: {
    fontSize: 14,
    color: '#34C759',
  },
  searchingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  radarContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  radarBackground: {
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#007AFF',
    borderRadius: 20,
  },
  pulseCircle: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#007AFF',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  staticCircle: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.3)',
    backgroundColor: 'transparent',
  },
  userMarkerContainer: {
    position: 'absolute',
    zIndex: 10,
  },
  userMarker: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  driverMarkerContainer: {
    position: 'absolute',
    zIndex: 50,
  },
  driverMarker: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverEmoji: {
    fontSize: 40,
  },
  searchTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  searchMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  driversCount: {
    fontSize: 13,
    color: '#34C759',
    fontWeight: '600',
    marginBottom: 12,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginBottom: 15,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  searchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  searchInfoText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 5,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  cancelButtonText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
  },
  foundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  successIcon: {
    marginBottom: 15,
  },
  foundTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  driverInfo: {
    width: '100%',
    backgroundColor: '#f8f8f8',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
  },
  driverDetails: {
    marginBottom: 10,
  },
  driverName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 14,
    color: '#333',
    marginLeft: 5,
    fontWeight: '600',
  },
  trips: {
    fontSize: 14,
    color: '#666',
    marginLeft: 5,
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  vehicleText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
  },
  plateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  plateLabel: {
    fontSize: 14,
    color: '#666',
  },
  plateNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 5,
  },
  etaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f2ff',
    padding: 10,
    borderRadius: 8,
  },
  etaText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 8,
    fontWeight: '600',
  },
  redirectText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  failedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  failedTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    marginBottom: 10,
  },
  failedMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  retryButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  closeButtonAlt: {
    paddingVertical: 10,
  },
  closeButtonAltText: {
    color: '#666',
    fontSize: 14,
  },
});

export default DriverSearchModal;