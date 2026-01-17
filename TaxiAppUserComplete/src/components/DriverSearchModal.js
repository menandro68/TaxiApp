// DriverSearchModal.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import DriverSearchService from '../services/DriverSearchService';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

const { width, height } = Dimensions.get('window');

const DriverSearchModal = ({ visible, onClose, onDriverFound, userLocation }) => {
  const [searchProgress, setSearchProgress] = useState({
    attempt: 0,
    totalAttempts: 5,
    radius: 0,
    message: 'Iniciando búsqueda...',
  });
  const [isSearching, setIsSearching] = useState(false);
  const [driverFound, setDriverFound] = useState(null);
  const [searchFailed, setSearchFailed] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const mapRef = useRef(null);

  // Región centrada en usuario o Santo Domingo por defecto
  const getMapRegion = () => ({
    latitude: userLocation?.latitude || 18.4861,
    longitude: userLocation?.longitude || -69.9312,
    latitudeDelta: 0.03,
    longitudeDelta: 0.03,
  });

  useEffect(() => {
    if (visible && userLocation) {
      loadAvailableDrivers();
      
      // Timer 1: Centrar mapa después de 500ms
      const timer1 = setTimeout(() => {
        if (mapRef.current) {
          console.log('📍 Modal: Centrando mapa en usuario');
          mapRef.current.animateToRegion({
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            latitudeDelta: 0.03,
            longitudeDelta: 0.03,
          }, 500);
        }
      }, 500);
      
      // Timer 2: Backup - Centrar de nuevo después de 1500ms
      const timer2 = setTimeout(() => {
        if (mapRef.current) {
          console.log('📍 Modal: Backup centrado en usuario');
          mapRef.current.animateToRegion({
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            latitudeDelta: 0.03,
            longitudeDelta: 0.03,
          }, 300);
        }
      }, 1500);
      
      setTimeout(() => {
        startSearch();
      }, 100);
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [visible, userLocation]);

  useEffect(() => {
    if (isSearching) {
      startPulseAnimation();
    }
  }, [isSearching]);

  // Cargar conductores disponibles para mostrar en el mapa
  const loadAvailableDrivers = async () => {
    try {
      const drivers = await DriverSearchService.searchDriversInRadius(userLocation, 15);
      if (drivers && drivers.length > 0) {
        setAvailableDrivers(drivers);
        console.log('🚗 Conductores disponibles para mapa:', drivers.length);
      }
    } catch (error) {
      console.log('No se pudieron cargar conductores para mapa:', error);
    }
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
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
          handleClose();
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

  const renderSearching = () => (
    <View style={styles.searchingContainer}>
      {/* MAPA DENTRO DEL MODAL */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={getMapRegion()}
          showsUserLocation={true}
          showsMyLocationButton={false}
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
        >
          {/* Marcador de ubicación del usuario */}
          {userLocation && (
            <Marker
              coordinate={{
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
              }}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={styles.userMarker}>
                <View style={styles.userMarkerInner} />
              </View>
            </Marker>
          )}

          {/* Marcadores de conductores disponibles */}
          {availableDrivers.map((driver, index) => (
            <Marker
              key={driver.id || index}
              coordinate={{
                latitude: driver.location?.latitude || driver.latitude,
                longitude: driver.location?.longitude || driver.longitude,
              }}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={styles.driverMarker}>
                <Icon name="car" size={16} color="#fff" />
              </View>
            </Marker>
          ))}
        </MapView>

        {/* Overlay con animación de radar */}
        <View style={styles.radarOverlay}>
          <Animated.View style={[styles.pulseContainer, { transform: [{ scale: pulseAnim }] }]}>
            <View style={styles.radarContainer}>
              <View style={[styles.radarRing, styles.radarRing1]} />
              <View style={[styles.radarRing, styles.radarRing2]} />
              <View style={[styles.radarRing, styles.radarRing3]} />
            </View>
          </Animated.View>
        </View>
      </View>

      <Text style={styles.searchTitle}>Buscando conductores cerca de ti</Text>
      <Text style={styles.searchMessage}>{searchProgress.message}</Text>

      <View style={styles.progressBar}>
        <View 
          style={[
            styles.progressFill, 
            { width: `${(searchProgress.attempt / searchProgress.totalAttempts) * 100}%` }
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
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleClose}
      onDismiss={() => {
        setIsSearching(false);
      }}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          {(isSearching || (!driverFound && !searchFailed)) && renderSearching()}
          {!isSearching && driverFound && renderDriverFound()}
          {!isSearching && searchFailed && renderSearchFailed()}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: width - 40,
    maxWidth: 400,
    alignItems: 'center',
  },
  searchingContainer: {
    alignItems: 'center',
    width: '100%',
  },
  mapContainer: {
    width: '100%',
    height: 200,
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 20,
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  radarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  pulseContainer: {
  },
  radarContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radarRing: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 100,
    opacity: 0.5,
  },
  radarRing1: {
    width: 40,
    height: 40,
  },
  radarRing2: {
    width: 80,
    height: 80,
  },
  radarRing3: {
    width: 120,
    height: 120,
  },
  userMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 122, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  userMarkerInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF',
  },
  driverMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  searchTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  searchMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginBottom: 20,
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
    marginBottom: 20,
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
    alignItems: 'center',
  },
  successIcon: {
    marginBottom: 20,
  },
  foundTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  driverInfo: {
    width: '100%',
    backgroundColor: '#f8f8f8',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
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
    alignItems: 'center',
  },
  failedTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  failedMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
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