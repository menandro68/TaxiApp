// DriverSearchScreen.js - Pantalla de navegación (solución al bug de MapView en Modal)
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Alert,
  BackHandler,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import DriverSearchService from '../services/DriverSearchService';

const { width, height } = Dimensions.get('window');
const RADAR_SIZE = width * 0.9;
const RADAR_CENTER = RADAR_SIZE / 2;

const DriverSearchScreen = ({ navigation, route }) => {
  const { userLocation, tripRequestId } = route.params || {};
  console.log('📍 DriverSearchScreen userLocation:', JSON.stringify(userLocation));
  
  const [searchProgress, setSearchProgress] = useState({
    attempt: 0,
    totalAttempts: 5,
    radius: 0,
    message: 'Iniciando búsqueda...',
  });
  const [isSearching, setIsSearching] = useState(false);
  const [driverFound, setDriverFound] = useState(null);
  const [searchFailed, setSearchFailed] = useState(false);
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [mapReady, setMapReady] = useState(false);
  const [showMarkers, setShowMarkers] = useState(false);
  const mapRef = useRef(null);

  // Calcular posición del conductor en el overlay
  const getDriverPosition = (driver, index) => {
    const userLat = userLocation?.latitude || 18.4861;
    const userLng = userLocation?.longitude || -69.9312;
    const driverLat = parseFloat(driver.location?.latitude || driver.latitude);
    const driverLng = parseFloat(driver.location?.longitude || driver.longitude);
    
    const markerSize = RADAR_SIZE * 0.1;
    const totalDrivers = availableDrivers.length;

    if (!driverLat || !driverLng || isNaN(driverLat) || isNaN(driverLng)) {
      const angle = (index * (360 / Math.max(totalDrivers, 1))) * (Math.PI / 180);
      const radius = RADAR_CENTER * 0.5;
      return {
        top: RADAR_CENTER + Math.sin(angle) * radius - markerSize / 2,
        left: RADAR_CENTER + Math.cos(angle) * radius - markerSize / 2,
      };
    }

    // Convertir diferencia de coordenadas a píxeles
    const deltaLat = (driverLat - userLat) * 8000;
    const deltaLng = (driverLng - userLng) * 8000;

    const maxRadius = RADAR_CENTER * 0.85;
    const distance = Math.sqrt(deltaLat * deltaLat + deltaLng * deltaLng);
    const scale = distance > maxRadius ? maxRadius / distance : 1;

    const x = deltaLng * scale;
    const y = -deltaLat * scale;

    return {
      top: RADAR_CENTER + y - markerSize / 2,
      left: RADAR_CENTER + x - markerSize / 2,
    };
  };

  // Manejar botón atrás de Android
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleClose();
      return true;
    });
    return () => backHandler.remove();
  }, []);

  useEffect(() => {
    if (userLocation) {
      console.log('📍 DriverSearchScreen: Iniciando búsqueda');
      loadAvailableDrivers();
      setTimeout(() => {
        startSearch();
      }, 100);
    }
  }, [userLocation]);

  // Delay para MapView
  useEffect(() => {
    const timer = setTimeout(() => setMapReady(true), 500);
    return () => clearTimeout(timer);
  }, []);

  // Activar marcadores después de que el mapa esté listo
  useEffect(() => {
    if (mapReady) {
      const timer = setTimeout(() => {
        setShowMarkers(true);
        console.log('🚗 Activando marcadores overlay');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [mapReady]);

  const loadAvailableDrivers = async () => {
    try {
      const drivers = await DriverSearchService.searchDriversInRadius(userLocation, 15);
      if (drivers && drivers.length > 0) {
        setAvailableDrivers(drivers);
        console.log('🚗 Conductores disponibles:', drivers.length);
      }
    } catch (error) {
      console.log('No se pudieron cargar conductores:', error);
    }
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
          // Navegar de vuelta con el conductor encontrado
          navigation.navigate('Main', { 
            driverFound: result.driver,
            fromDriverSearch: true 
          });
        }, 2000);
      } else {
        setSearchFailed(true);
      }
    } catch (error) {
      console.error('Error buscando conductores:', error);
      setSearchFailed(true);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClose = () => {
    Alert.alert('Cancelar búsqueda', '¿Estás seguro que deseas cancelar?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Sí',
        onPress: () => {
          navigation.navigate('Main', { 
            searchCancelled: true,
            fromDriverSearch: true 
          });
        },
      },
    ]);
  };

  const handleRetry = () => {
    setSearchFailed(false);
    loadAvailableDrivers();
    startSearch();
  };

  const renderSearching = () => (
    <View style={styles.searchingContainer}>
      {/* Contenedor del mapa */}
      <View style={[styles.mapContainer, { width: RADAR_SIZE, height: RADAR_SIZE }]}>
        {mapReady && userLocation ? (
          <View style={{ flex: 1 }}>
            <MapView
              ref={mapRef}
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              initialRegion={{
                latitude: userLocation?.latitude || 18.4861,
                longitude: userLocation?.longitude || -69.9312,
                latitudeDelta: 0.015,
                longitudeDelta: 0.015,
              }}
              onLayout={() => {
                console.log('🗺️ MapView onLayout - forzando posición');
                setTimeout(() => {
                  if (mapRef.current && userLocation) {
                    mapRef.current.setCamera({
                      center: {
                        latitude: userLocation.latitude,
                        longitude: userLocation.longitude,
                      },
                      zoom: 15,
                      pitch: 0,
                      heading: 0,
                    });
                  }
                }, 100);
              }}
              scrollEnabled={false}
              zoomEnabled={false}
              rotateEnabled={false}
              pitchEnabled={false}
              showsUserLocation={true}
              showsMyLocationButton={false}
            />
            {/* Overlay con pin del usuario y carritos de conductores */}
            {showMarkers && (
              <View style={styles.driversOverlay}>
                {/* Pin azul del usuario en el centro */}
                <View style={[styles.userPinOverlay, { top: RADAR_CENTER - 13, left: RADAR_CENTER - 13 }]}>
                  <View style={styles.userPinDot} />
                </View>
                
                {/* Carritos de conductores */}
                {availableDrivers.map((driver, index) => {
                  const position = getDriverPosition(driver, index);
                  console.log('🚗 Carrito posición:', driver.id, position);
                  return (
                    <View
                      key={`driver-overlay-${driver.id || index}`}
                      style={[
                        styles.driverMarkerOverlay,
                        { top: position.top, left: position.left },
                      ]}
                    >
                      <Text style={styles.driverEmoji}>🚗</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.loadingMap}>
            <Icon name="map" size={40} color="#007AFF" />
            <Text style={styles.loadingMapText}>Cargando mapa...</Text>
          </View>
        )}
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
          Radio: {searchProgress.radius < 1 ? `${searchProgress.radius * 1000}m` : `${searchProgress.radius}km`}
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
          <Text style={styles.driverName}>{driverFound.name}</Text>
          <View style={styles.ratingContainer}>
            <Icon name="star" size={16} color="#FFD700" />
            <Text style={styles.rating}>{driverFound.rating}</Text>
            <Text style={styles.trips}>• {driverFound.trips} viajes</Text>
          </View>

          <View style={styles.vehicleInfo}>
            <Icon name="car" size={20} color="#666" />
            <Text style={styles.vehicleText}>
              {driverFound.vehicle?.make} {driverFound.vehicle?.model}
            </Text>
          </View>

          <View style={styles.plateInfo}>
            <Text style={styles.plateLabel}>Placa:</Text>
            <Text style={styles.plateNumber}>{driverFound.vehicle?.plate}</Text>
          </View>

          <View style={styles.etaContainer}>
            <Icon name="time" size={20} color="#007AFF" />
            <Text style={styles.etaText}>
              Llegará en ~{driverFound.eta} minutos
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
        No hay conductores disponibles en este momento. Intenta más tarde.
      </Text>

      <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
        <Icon name="refresh" size={20} color="#fff" />
        <Text style={styles.retryButtonText}>Intentar de nuevo</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.closeButtonAlt} onPress={() => navigation.goBack()}>
        <Text style={styles.closeButtonAltText}>Cerrar</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
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
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
  mapContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#007AFF',
    marginBottom: 30,
  },
  map: {
    flex: 1,
  },
  loadingMap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
  },
  loadingMapText: {
    marginTop: 10,
    color: '#007AFF',
  },
  userMarker: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    elevation: 5,
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
  driverName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
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
  driversOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  driverMarkerOverlay: {
    position: 'absolute',
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverMarker: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#00C851',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    elevation: 5,
  },
  driverEmoji: {
    fontSize: 28,
  },
  userPinOverlay: {
    position: 'absolute',
    width: 26,
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  userPinDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    borderWidth: 3,
    borderColor: '#fff',
    elevation: 5,
  },
});

export default DriverSearchScreen;