import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  FlatList,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const { width: screenWidth } = Dimensions.get('window');

// Base de datos de POIs en Santo Domingo
const POI_DATABASE = {
  shopping: [
    { id: 'agora', name: 'Ágora Mall', address: 'Av. Abraham Lincoln', coordinates: { lat: 18.4726, lng: -69.9392 }, popular: true },
    { id: 'bluemall', name: 'Blue Mall', address: 'Av. Winston Churchill', coordinates: { lat: 18.4822, lng: -69.9421 }, popular: true },
    { id: 'megacentro', name: 'Megacentro', address: 'Av. San Vicente de Paul', coordinates: { lat: 18.5037, lng: -69.8567 }, popular: true },
    { id: 'plazacentral', name: 'Plaza Central', address: 'Av. 27 de Febrero', coordinates: { lat: 18.4756, lng: -69.9308 } },
    { id: 'sambil', name: 'Sambil Santo Domingo', address: 'Av. John F. Kennedy', coordinates: { lat: 18.4868, lng: -69.9118 } },
    { id: 'nacional27', name: 'Supermercado Nacional 27 Feb', address: 'Av. 27 de Febrero', coordinates: { lat: 18.4721, lng: -69.9247 } },
    { id: 'carrefour', name: 'Carrefour', address: 'Autopista Duarte', coordinates: { lat: 18.5123, lng: -69.8934 } },
  ],
  
  hospitals: [
    { id: 'cedimat', name: 'CEDIMAT', address: 'Av. Ortega y Gasset', coordinates: { lat: 18.4691, lng: -69.9385 }, popular: true },
    { id: 'homs', name: 'HOMS', address: 'Av. Máximo Gómez', coordinates: { lat: 18.4785, lng: -69.9147 }, popular: true },
    { id: 'plazasalud', name: 'Hospital Plaza de la Salud', address: 'Av. Ortega y Gasset', coordinates: { lat: 18.4612, lng: -69.9421 } },
    { id: 'abreu', name: 'Clínica Abreu', address: 'Calle Beller', coordinates: { lat: 18.4723, lng: -69.9156 } },
    { id: 'corazones', name: 'Corazones Unidos', address: 'Av. Independencia', coordinates: { lat: 18.4681, lng: -69.9287 } },
  ],
  
  universities: [
    { id: 'uasd', name: 'UASD', address: 'Av. Alma Mater', coordinates: { lat: 18.4627, lng: -69.9121 }, popular: true },
    { id: 'intec', name: 'INTEC', address: 'Av. Los Próceres', coordinates: { lat: 18.4875, lng: -69.9615 }, popular: true },
    { id: 'unphu', name: 'UNPHU', address: 'Av. John F. Kennedy', coordinates: { lat: 18.4657, lng: -69.9453 } },
    { id: 'apec', name: 'UNAPEC', address: 'Av. Máximo Gómez', coordinates: { lat: 18.4711, lng: -69.9128 } },
    { id: 'pucmm', name: 'PUCMM Santiago', address: 'Santiago', coordinates: { lat: 19.4447, lng: -70.6832 } },
  ],
  
  transport: [
    { id: 'aila', name: 'Aeropuerto Las Américas', address: 'Autopista Las Américas', coordinates: { lat: 18.4297, lng: -69.6688 }, popular: true },
    { id: 'cibao', name: 'Aeropuerto del Cibao', address: 'Santiago', coordinates: { lat: 19.4061, lng: -70.6047 } },
    { id: 'caribe', name: 'Caribe Tours', address: 'Av. 27 de Febrero', coordinates: { lat: 18.4821, lng: -69.9173 } },
    { id: 'metro', name: 'Metro Tours', address: 'Av. Winston Churchill', coordinates: { lat: 18.4795, lng: -69.9381 } },
    { id: 'bavaro', name: 'Bávaro Express', address: 'Av. Máximo Gómez', coordinates: { lat: 18.4692, lng: -69.9087 } },
  ],
  
  government: [
    { id: 'palacio', name: 'Palacio Nacional', address: 'Av. México', coordinates: { lat: 18.4769, lng: -69.8992 } },
    { id: 'suprema', name: 'Suprema Corte', address: 'Av. Enrique Jiménez Moya', coordinates: { lat: 18.4712, lng: -69.9018 } },
    { id: 'jce', name: 'JCE', address: 'Av. Luperón', coordinates: { lat: 18.4824, lng: -69.9287 } },
    { id: 'dgii', name: 'DGII Torre', address: 'Av. México', coordinates: { lat: 18.4758, lng: -69.8967 } },
  ],
  
  entertainment: [
    { id: 'olimpico', name: 'Estadio Olímpico', address: 'Av. 27 de Febrero', coordinates: { lat: 18.4832, lng: -69.9178 } },
    { id: 'quisqueya', name: 'Estadio Quisqueya', address: 'Ensanche La Fe', coordinates: { lat: 18.4915, lng: -69.9085 } },
    { id: 'bellas', name: 'Palacio Bellas Artes', address: 'Av. Máximo Gómez', coordinates: { lat: 18.4693, lng: -69.9045 } },
    { id: 'teatro', name: 'Teatro Nacional', address: 'Plaza de la Cultura', coordinates: { lat: 18.4724, lng: -69.9115 } },
    { id: 'colonial', name: 'Zona Colonial', address: 'Ciudad Colonial', coordinates: { lat: 18.4729, lng: -69.8836 }, popular: true },
  ],
  
  hotels: [
    { id: 'jaragua', name: 'Hotel Jaragua', address: 'Av. George Washington', coordinates: { lat: 18.4657, lng: -69.9023 } },
    { id: 'sheraton', name: 'Sheraton', address: 'Av. George Washington', coordinates: { lat: 18.4582, lng: -69.9134 } },
    { id: 'intercontinental', name: 'InterContinental', address: 'Av. Winston Churchill', coordinates: { lat: 18.4713, lng: -69.9478 } },
    { id: 'embassy', name: 'Embassy Suites', address: 'Av. Tiradentes', coordinates: { lat: 18.4698, lng: -69.9312 } },
  ],
  
  banks: [
    { id: 'popular27', name: 'Banco Popular 27 Feb', address: 'Av. 27 de Febrero', coordinates: { lat: 18.4792, lng: -69.9234 } },
    { id: 'bhd27', name: 'BHD León 27 Feb', address: 'Av. 27 de Febrero', coordinates: { lat: 18.4756, lng: -69.9267 } },
    { id: 'reservas', name: 'Banreservas Torre', address: 'Av. Winston Churchill', coordinates: { lat: 18.4821, lng: -69.9421 } },
    { id: 'central', name: 'Banco Central', address: 'Av. Pedro H. Ureña', coordinates: { lat: 18.4687, lng: -69.9234 } },
  ],
};

// Categorías con íconos
const CATEGORIES = [
  { id: 'all', name: 'Todos', icon: 'apps' },
  { id: 'shopping', name: 'Compras', icon: 'cart' },
  { id: 'hospitals', name: 'Hospitales', icon: 'medkit' },
  { id: 'universities', name: 'Universidades', icon: 'school' },
  { id: 'transport', name: 'Transporte', icon: 'airplane' },
  { id: 'government', name: 'Gobierno', icon: 'business' },
  { id: 'entertainment', name: 'Entretenimiento', icon: 'game-controller' },
  { id: 'hotels', name: 'Hoteles', icon: 'bed' },
  { id: 'banks', name: 'Bancos', icon: 'cash' },
];

const SmartDestinationSelector = ({ visible, onClose, onSelectDestination, currentLocation, mode }) => {
  // Mapbox Geocoding API (GRATIS - 100,000 llamadas/mes)
const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoibWVuYW5kcm82OCIsImEiOiJjbWlmY2hiMHcwY29sM2VuNGk2dnlzMzliIn0.PqOOzFKFJA7Q5jPbGwOG8Q';
  const [mapboxResults, setMapboxResults] = useState([]);
  const [isSearchingMapbox, setIsSearchingMapbox] = useState(false);

  // Función para buscar en Mapbox Geocoding API
  const searchMapboxPlaces = async (text) => {
    if (!text || text.length < 3) {
      setMapboxResults([]);
      return;
    }

    setIsSearchingMapbox(true);
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&country=do&language=es&limit=5`
      );
      const data = await response.json();
      
      console.log('📍 Mapbox Geocoding response:', data.features?.length || 0, 'resultados');
      
      if (data.features && data.features.length > 0) {
        const places = data.features.map((feature, index) => ({
          id: `mapbox-${index}-${Date.now()}`,
          name: feature.text || feature.place_name.split(',')[0],
          address: feature.place_name,
          fullDescription: feature.place_name,
          coordinates: {
            lat: feature.center[1],
            lng: feature.center[0]
          },
          isMapboxResult: true
        }));
        setMapboxResults(places);
      } else {
        setMapboxResults([]);
      }
    } catch (error) {
      console.error('❌ Error buscando en Mapbox:', error);
      setMapboxResults([]);
    }
    setIsSearchingMapbox(false);
  };

  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [recentSearches, setRecentSearches] = useState([
    'Ágora Mall', 'CEDIMAT', 'Aeropuerto Las Américas'
  ]);

  useEffect(() => {
    if (visible) {
      loadInitialResults();
    }
  }, [visible, selectedCategory]);

  // Cargar resultados iniciales o por categoría
  const loadInitialResults = () => {
    if (selectedCategory === 'all') {
      // Mostrar lugares populares de todas las categorías
      const popularPlaces = [];
      Object.values(POI_DATABASE).forEach(category => {
        category.forEach(place => {
          if (place.popular) {
            popularPlaces.push(place);
          }
        });
      });
      setResults(popularPlaces);
    } else {
      // Mostrar todos los lugares de la categoría seleccionada
      setResults(POI_DATABASE[selectedCategory] || []);
    }
  };

  // Buscar por texto
  const handleSearch = (text) => {
    setSearchText(text);
    
    if (!text.trim()) {
      loadInitialResults();
      setMapboxResults([]);
      return;
    }

    const searchLower = text.toLowerCase();
    const searchResults = [];
    
    Object.values(POI_DATABASE).forEach(category => {
      category.forEach(place => {
        if (place.name.toLowerCase().includes(searchLower) || 
            place.address.toLowerCase().includes(searchLower)) {
          searchResults.push(place);
        }
      });
    });
    
    setResults(searchResults);
    
    // También buscar en Mapbox
    searchMapboxPlaces(text);
  };

  // Calcular distancia (simplificada)
  const calculateDistance = (place) => {
    if (!currentLocation) return null;
    if (!place.coordinates) return null;
    
    const lat1 = currentLocation.latitude;
    const lon1 = currentLocation.longitude;
    const lat2 = place.coordinates.lat;
    const lon2 = place.coordinates.lng;
    
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return distance.toFixed(1);
  };

  // Seleccionar destino
  const handleSelectPlace = (place) => {
    // Agregar a búsquedas recientes
    const updatedRecent = [place.name, ...recentSearches.filter(s => s !== place.name)].slice(0, 5);
    setRecentSearches(updatedRecent);
    
    onSelectDestination({
      name: place.name,
      address: place.address || place.fullDescription,
      coordinates: place.coordinates,
      type: place.isMapboxResult ? 'mapbox' : 'poi'
    });
    
    // Limpiar y cerrar
    setSearchText('');
    setSelectedCategory('all');
    setMapboxResults([]);
  };

  // Renderizar categorías
  const renderCategories = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.categoriesContainer}
    >
      {CATEGORIES.map(category => (
        <TouchableOpacity
          key={category.id}
          style={[
            styles.categoryChip,
            selectedCategory === category.id && styles.categoryChipSelected
          ]}
          onPress={() => setSelectedCategory(category.id)}
        >
          <Icon 
            name={category.icon} 
            size={20} 
            color={selectedCategory === category.id ? '#fff' : '#007AFF'} 
          />
          <Text style={[
            styles.categoryText,
            selectedCategory === category.id && styles.categoryTextSelected
          ]}>
            {category.name}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  // Renderizar item de resultado
  const renderResultItem = ({ item }) => {
    const distance = calculateDistance(item);
    
    return (
      <TouchableOpacity
        style={styles.resultItem}
        onPress={() => handleSelectPlace(item)}
      >
        <View style={styles.resultIcon}>
          <Icon 
            name={item.isMapboxResult ? "globe" : "location"} 
            size={24} 
            color={item.isMapboxResult ? "#4264FB" : "#007AFF"} 
          />
        </View>
        <View style={styles.resultContent}>
          <Text style={styles.resultName}>{item.name}</Text>
          <Text style={styles.resultAddress}>{item.address}</Text>
          {distance && (
            <Text style={styles.resultDistance}>📍 {distance} km</Text>
          )}
          {item.isMapboxResult && (
            <Text style={styles.mapboxBadge}>🗺️ Mapbox</Text>
          )}
        </View>
        <Icon name="chevron-forward" size={20} color="#999" />
      </TouchableOpacity>
    );
  };

  // Combinar resultados locales y de Mapbox
  const combinedResults = [...results, ...mapboxResults];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>📍 Buscar destino</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {/* Barra de búsqueda */}
          <View style={styles.searchContainer}>
            <Icon name="search" size={20} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar lugar o dirección..."
              value={searchText}
              onChangeText={handleSearch}
              autoFocus={true}
              placeholderTextColor="#999"
            />
            {isSearchingMapbox && (
              <ActivityIndicator size="small" color="#007AFF" />
            )}
            {searchText.length > 0 && !isSearchingMapbox && (
              <TouchableOpacity onPress={() => handleSearch('')}>
                <Icon name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>

          {/* Categorías */}
          {renderCategories()}

          {/* Búsquedas recientes */}
          {!searchText && recentSearches.length > 0 && (
            <View style={styles.recentContainer}>
              <Text style={styles.sectionTitle}>Recientes</Text>
              <View style={styles.recentTags}>
                {recentSearches.map((search, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.recentTag}
                    onPress={() => handleSearch(search)}
                  >
                    <Icon name="time-outline" size={16} color="#666" />
                    <Text style={styles.recentText}>{search}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Loading overlay */}
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Obteniendo ubicación...</Text>
            </View>
          )}

          {/* Resultados */}
          <View style={styles.resultsContainer}>
            {combinedResults.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>
                  {searchText ? `Resultados (${combinedResults.length})` : 
                   selectedCategory === 'all' ? 'Lugares populares' : 
                   CATEGORIES.find(c => c.id === selectedCategory)?.name}
                </Text>
                <FlatList
                  data={combinedResults}
                  renderItem={renderResultItem}
                  keyExtractor={(item, index) => item.id || `result-${index}`}
                  showsVerticalScrollIndicator={false}
                  style={styles.resultsList}
                />
              </>
            ) : (
              <View style={styles.emptyContainer}>
                <Icon name="search-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No se encontraron resultados</Text>
                <Text style={styles.emptySubtext}>Intenta con otro término</Text>
              </View>
            )}
          </View>

          {/* Botón de ubicación actual */}
          <TouchableOpacity 
            style={styles.currentLocationButton}
            onPress={() => {
              if (currentLocation) {
                onSelectDestination({
                  name: 'Mi ubicación actual',
                  address: currentLocation.address || 'Ubicación GPS',
                  coordinates: {
                    lat: currentLocation.latitude,
                    lng: currentLocation.longitude
                  },
                  type: 'current'
                });
              }
            }}
          >
            <Icon name="navigate" size={20} color="#007AFF" />
            <Text style={styles.currentLocationText}>Usar mi ubicación actual</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    margin: 15,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  categoriesContainer: {
    paddingHorizontal: 15,
    marginBottom: 15,
    maxHeight: 50,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  categoryChipSelected: {
    backgroundColor: '#007AFF',
  },
  categoryText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  categoryTextSelected: {
    color: '#fff',
  },
  recentContainer: {
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  recentTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  recentTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 10,
  },
  recentText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#666',
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 15,
  },
  resultsList: {
    flex: 1,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  resultContent: {
    flex: 1,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 3,
  },
  resultAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  resultDistance: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  mapboxBadge: {
    fontSize: 11,
    color: '#4264FB',
    fontWeight: '500',
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 5,
  },
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f8ff',
    padding: 15,
    margin: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  currentLocationText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
});

export default SmartDestinationSelector;