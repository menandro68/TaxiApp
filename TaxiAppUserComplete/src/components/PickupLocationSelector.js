import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Icon from 'react-native-vector-icons/Ionicons';
import LocationPickerService from '../services/LocationPickerService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const PickupLocationSelector = ({ 
  visible, 
  onClose, 
  onLocationSelected,
  currentLocation 
}) => {
  const [mapRegion, setMapRegion] = useState({
    latitude: currentLocation?.latitude || 18.4861,
    longitude: currentLocation?.longitude || -69.9312,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  });

  const [selectedLocation, setSelectedLocation] = useState(null);
  const [address, setAddress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [recentLocations, setRecentLocations] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [markerCoordinate, setMarkerCoordinate] = useState(null);

  const mapRef = useRef(null);
  const searchTimeout = useRef(null);

  // Lugares populares predefinidos
  const popularPlaces = [
    { name: 'Ágora Mall', latitude: 18.4729, longitude: -69.9399, icon: '🛍️' },
    { name: 'Aeropuerto Las Américas', latitude: 18.4297, longitude: -69.6689, icon: '✈️' },
    { name: 'Sambil Santo Domingo', latitude: 18.4822, longitude: -69.9117, icon: '🛍️' },
    { name: 'Hospital CEDIMAT', latitude: 18.4721, longitude: -69.9368, icon: '🏥' },
    { name: 'Universidad APEC', latitude: 18.4712, longitude: -69.9286, icon: '🎓' },
  ];

  useEffect(() => {
    if (visible) {
      loadRecentLocations();
      if (currentLocation) {
        setMapRegion({
          ...mapRegion,
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
        });
        setMarkerCoordinate({
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
        });
      }
    }
  }, [visible]);

  // Cargar ubicaciones recientes
  const loadRecentLocations = async () => {
    const recent = await LocationPickerService.getRecentLocations();
    setRecentLocations(recent);
  };

  // Manejar cambio de región del mapa
  const onRegionChangeComplete = async (region) => {
    setMapRegion(region);
    const centerCoordinate = {
      latitude: region.latitude,
      longitude: region.longitude,
    };
    setMarkerCoordinate(centerCoordinate);
    
    // Obtener dirección de la nueva ubicación
    setIsLoadingAddress(true);
    const addressData = await LocationPickerService.reverseGeocode(
      region.latitude,
      region.longitude
    );
    setAddress(addressData.formatted_address);
    setSelectedLocation({
      ...centerCoordinate,
      address: addressData.formatted_address,
      details: addressData
    });
    setIsLoadingAddress(false);
  };

  // Buscar direcciones
  const handleSearch = async (text) => {
    setSearchQuery(text);
    
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (text.length < 3) {
      setSearchResults([]);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true);
      const results = await LocationPickerService.searchAddress(text);
      setSearchResults(results);
      setIsSearching(false);
    }, 500);
  };

  // Seleccionar resultado de búsqueda
  const selectSearchResult = (result) => {
    const newRegion = {
      latitude: result.latitude,
      longitude: result.longitude,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    };
    
    setMapRegion(newRegion);
    setMarkerCoordinate({
      latitude: result.latitude,
      longitude: result.longitude,
    });
    setAddress(result.formatted_address);
    setSelectedLocation({
      latitude: result.latitude,
      longitude: result.longitude,
      address: result.formatted_address,
    });
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
    
    // Animar el mapa a la nueva ubicación
    mapRef.current?.animateToRegion(newRegion, 1000);
  };

  // Seleccionar lugar popular
  const selectPopularPlace = (place) => {
    const newRegion = {
      latitude: place.latitude,
      longitude: place.longitude,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    };
    
    setMapRegion(newRegion);
    setMarkerCoordinate({
      latitude: place.latitude,
      longitude: place.longitude,
    });
    setAddress(place.name);
    setSelectedLocation({
      latitude: place.latitude,
      longitude: place.longitude,
      address: place.name,
    });
    
    mapRef.current?.animateToRegion(newRegion, 1000);
  };

  // Usar ubicación actual
  const useCurrentLocation = async () => {
    try {
      const location = await LocationPickerService.getCurrentLocation();
      
      if (!LocationPickerService.isInServiceArea(location.latitude, location.longitude)) {
        Alert.alert('Fuera del área', 'Esta ubicación está fuera del área de servicio');
        return;
      }
      
      const newRegion = {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };
      
      setMapRegion(newRegion);
      setMarkerCoordinate({
        latitude: location.latitude,
        longitude: location.longitude,
      });
      
      setIsLoadingAddress(true);
      const addressData = await LocationPickerService.reverseGeocode(
        location.latitude,
        location.longitude
      );
      setAddress(addressData.formatted_address);
      setSelectedLocation({
        latitude: location.latitude,
        longitude: location.longitude,
        address: addressData.formatted_address,
        details: addressData
      });
      setIsLoadingAddress(false);
      
      mapRef.current?.animateToRegion(newRegion, 1000);
    } catch (error) {
      Alert.alert('Error', 'No se pudo obtener tu ubicación actual');
    }
  };

  // Confirmar ubicación
  const confirmLocation = async () => {
    if (!selectedLocation) {
      Alert.alert('Error', 'Por favor selecciona una ubicación');
      return;
    }
    
    // Guardar en recientes
    await LocationPickerService.saveRecentLocation(selectedLocation);
    
    // Devolver la ubicación seleccionada
    onLocationSelected(selectedLocation);
    onClose();
  };
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Seleccionar punto de recogida</Text>
          <TouchableOpacity onPress={confirmLocation} style={styles.confirmButton}>
            <Text style={styles.confirmText}>Confirmar</Text>
          </TouchableOpacity>
        </View>

        {/* Mapa */}
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={mapRegion}
            onRegionChangeComplete={onRegionChangeComplete}
            showsUserLocation={true}
            showsMyLocationButton={false}
          />
          
          {/* Pin central */}
          <View style={styles.markerFixed}>
            <Icon name="location" size={40} color="#007AFF" />
          </View>

          {/* Botón de ubicación actual */}
          <TouchableOpacity 
            style={styles.currentLocationButton}
            onPress={useCurrentLocation}
          >
            <Icon name="locate" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {/* Dirección actual */}
        <View style={styles.addressContainer}>
          {isLoadingAddress ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <Text style={styles.addressText} numberOfLines={2}>
              {address || 'Mueve el mapa para seleccionar ubicación'}
            </Text>
          )}
        </View>

        {/* Barra de búsqueda */}
        <TouchableOpacity 
          style={styles.searchBar}
          onPress={() => setShowSearch(true)}
        >
          <Icon name="search" size={20} color="#666" />
          <Text style={styles.searchPlaceholder}>Buscar dirección...</Text>
        </TouchableOpacity>

        {/* Lugares populares */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.popularPlaces}
        >
          {popularPlaces.map((place, index) => (
            <TouchableOpacity
              key={index}
              style={styles.popularPlace}
              onPress={() => selectPopularPlace(place)}
            >
              <Text style={styles.placeIcon}>{place.icon}</Text>
              <Text style={styles.placeName}>{place.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Ubicaciones recientes */}
        {recentLocations.length > 0 && (
          <View style={styles.recentSection}>
            <Text style={styles.sectionTitle}>Recientes</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {recentLocations.slice(0, 3).map((loc, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.recentItem}
                  onPress={() => selectSearchResult(loc)}
                >
                  <Icon name="time-outline" size={16} color="#666" />
                  <Text style={styles.recentText} numberOfLines={1}>
                    {loc.address}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Modal de búsqueda */}
        {showSearch && (
          <Modal
            visible={showSearch}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowSearch(false)}
          >
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.searchModal}
            >
              <View style={styles.searchContainer}>
                <View style={styles.searchHeader}>
                  <TouchableOpacity onPress={() => setShowSearch(false)}>
                    <Icon name="arrow-back" size={24} color="#333" />
                  </TouchableOpacity>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar dirección..."
                    value={searchQuery}
                    onChangeText={handleSearch}
                    autoFocus
                  />
                  {isSearching && <ActivityIndicator size="small" color="#007AFF" />}
                </View>

                <ScrollView style={styles.searchResults}>
                  {searchResults.map((result, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.searchResult}
                      onPress={() => selectSearchResult(result)}
                    >
                      <Icon name="location-outline" size={20} color="#666" />
                      <Text style={styles.resultText} numberOfLines={2}>
                        {result.formatted_address}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </Modal>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  confirmButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  confirmText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  markerFixed: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -20,
    marginTop: -40,
  },
  currentLocationButton: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  addressContainer: {
    padding: 16,
    backgroundColor: '#f8f8f8',
    minHeight: 60,
    justifyContent: 'center',
  },
  addressText: {
    fontSize: 14,
    color: '#333',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  searchPlaceholder: {
    marginLeft: 8,
    color: '#666',
    fontSize: 16,
  },
  popularPlaces: {
    maxHeight: 80,
    paddingHorizontal: 16,
  },
  popularPlace: {
    alignItems: 'center',
    marginRight: 16,
    padding: 8,
  },
  placeIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  placeName: {
    fontSize: 12,
    color: '#666',
  },
  recentSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  recentText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#333',
    maxWidth: 120,
  },
  searchModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  searchContainer: {
    backgroundColor: '#fff',
    height: screenHeight * 0.7,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    flex: 1,
    marginHorizontal: 12,
    fontSize: 16,
  },
  searchResults: {
    flex: 1,
  },
  searchResult: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  resultText: {
    marginLeft: 12,
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
});

export default PickupLocationSelector;