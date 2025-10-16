import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  FlatList,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { GOOGLE_MAPS_CONFIG } from './config';
import UserSharedStorage from './SharedStorage';

const { width } = Dimensions.get('window');

const AddressSearchComponent = ({
  placeholder = "¿A dónde quieres ir?",
  onPlaceSelected,
  onTextChange,
  currentLocation = null,
  showFavorites = true,
  isOrigin = false, // true para origen, false para destino
  value = "",
  style = {},
}) => {
  
  // ============================================
  // ESTADOS DEL COMPONENTE
  // ============================================
  
  const [searchText, setSearchText] = useState(value);
  const [favorites, setFavorites] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const autocompleteRef = useRef(null);

  // ============================================
  // INICIALIZACIÓN
  // ============================================
  
  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    setSearchText(value);
  }, [value]);

  const loadUserData = async () => {
    try {
      // Cargar lugares favoritos
      const userFavorites = await UserSharedStorage.getFavoritePlaces();
      setFavorites(userFavorites.slice(0, 5)); // Mostrar solo los primeros 5
      
      // Cargar búsquedas recientes (se podría implementar)
      // const recent = await UserSharedStorage.getRecentSearches();
      // setRecentSearches(recent);
      
    } catch (error) {
      console.error('❌ Error cargando datos del usuario:', error);
    }
  };

  // ============================================
  // LUGARES PREDEFINIDOS DE SANTO DOMINGO
  // ============================================
  
  const popularPlaces = [
    {
      id: 'sambil',
      name: 'Sambil Santo Domingo',
      address: 'Av. John F. Kennedy, Santo Domingo',
      location: { latitude: 18.4682, longitude: -69.9408 },
      type: 'Centro Comercial',
      icon: '🏬'
    },
    {
      id: 'zona_colonial',
      name: 'Zona Colonial',
      address: 'Ciudad Colonial, Santo Domingo',
      location: { latitude: 18.4765, longitude: -69.8933 },
      type: 'Histórico',
      icon: '🏛️'
    },
    {
      id: 'megacentro',
      name: 'Megacentro',
      address: 'Av. John F. Kennedy, Santo Domingo',
      location: { latitude: 18.5204, longitude: -69.8584 },
      type: 'Centro Comercial',
      icon: '🏬'
    },
    {
      id: 'aeropuerto',
      name: 'Aeropuerto Las Américas',
      address: 'Autopista Las Américas, Punta Caucedo',
      location: { latitude: 18.4297, longitude: -69.6689 },
      type: 'Aeropuerto',
      icon: '✈️'
    },
    {
      id: 'malecon',
      name: 'Malecón de Santo Domingo',
      address: 'Av. George Washington, Santo Domingo',
      location: { latitude: 18.4668, longitude: -69.8954 },
      type: 'Turístico',
      icon: '🌊'
    },
    {
      id: 'plaza_cultura',
      name: 'Plaza de la Cultura',
      address: 'Av. Máximo Gómez, Santo Domingo',
      location: { latitude: 18.4664, longitude: -69.9139 },
      type: 'Cultural',
      icon: '🎭'
    },
    {
      id: 'centro_olimpico',
      name: 'Centro Olímpico Juan Pablo Duarte',
      address: 'Av. John F. Kennedy, Santo Domingo',
      location: { latitude: 18.4844, longitude: -69.9322 },
      type: 'Deportivo',
      icon: '🏟️'
    },
    {
      id: 'hospital_plaza',
      name: 'Hospital Plaza de la Salud',
      address: 'Av. Ortega y Gasset, Santo Domingo',
      location: { latitude: 18.4722, longitude: -69.9180 },
      type: 'Hospital',
      icon: '🏥'
    }
  ];

  // ============================================
  // FUNCIONES DE BÚSQUEDA
  // ============================================
  
  const handlePlaceSelect = async (data, details = null) => {
    try {
      setIsLoading(true);
      
      if (!details) {
        console.log('⚠️ No se obtuvieron detalles del lugar');
        return;
      }

      const selectedPlace = {
        id: details.place_id,
        name: data.structured_formatting?.main_text || data.description,
        address: data.description,
        location: {
          latitude: details.geometry.location.lat,
          longitude: details.geometry.location.lng,
        },
        types: details.types,
        placeId: details.place_id,
        timestamp: new Date().toISOString(),
      };

      console.log('📍 Lugar seleccionado:', selectedPlace);

      // Guardar en historial si es destino
      if (!isOrigin) {
        await saveToSearchHistory(selectedPlace);
      }

      // Ejecutar callback
      if (onPlaceSelected) {
        onPlaceSelected(selectedPlace);
      }

      setSearchText(selectedPlace.name);
      setShowSuggestions(false);

    } catch (error) {
      console.error('❌ Error seleccionando lugar:', error);
      Alert.alert('Error', 'No se pudo seleccionar el lugar');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePopularPlaceSelect = async (place) => {
    try {
      const selectedPlace = {
        id: place.id,
        name: place.name,
        address: place.address,
        location: place.location,
        type: place.type,
        timestamp: new Date().toISOString(),
      };

      console.log('🌟 Lugar popular seleccionado:', selectedPlace);

      // Guardar en historial
      if (!isOrigin) {
        await saveToSearchHistory(selectedPlace);
      }

      // Ejecutar callback
      if (onPlaceSelected) {
        onPlaceSelected(selectedPlace);
      }

      setSearchText(place.name);
      setShowSuggestions(false);

      // Limpiar el autocomplete
      if (autocompleteRef.current) {
        autocompleteRef.current.setAddressText(place.name);
      }

    } catch (error) {
      console.error('❌ Error seleccionando lugar popular:', error);
    }
  };

  const handleFavoriteSelect = async (favorite) => {
    try {
      const selectedPlace = {
        id: favorite.id,
        name: favorite.name || favorite.address,
        address: favorite.address,
        location: {
          latitude: favorite.latitude,
          longitude: favorite.longitude,
        },
        timestamp: new Date().toISOString(),
      };

      console.log('⭐ Favorito seleccionado:', selectedPlace);

      // Ejecutar callback
      if (onPlaceSelected) {
        onPlaceSelected(selectedPlace);
      }

      setSearchText(selectedPlace.name);
      setShowSuggestions(false);

    } catch (error) {
      console.error('❌ Error seleccionando favorito:', error);
    }
  };

  const saveToSearchHistory = async (place) => {
    try {
      // Esta función se puede implementar más adelante para guardar historial
      console.log('💾 Guardando en historial:', place.name);
    } catch (error) {
      console.error('❌ Error guardando en historial:', error);
    }
  };

  const getCurrentLocationPlace = async () => {
    try {
      setIsLoading(true);
      
      if (!currentLocation) {
        Alert.alert('Error', 'Ubicación actual no disponible');
        return;
      }

      const currentPlace = {
        id: 'current_location',
        name: 'Mi ubicación actual',
        address: 'Tu ubicación actual',
        location: currentLocation,
        timestamp: new Date().toISOString(),
      };

      console.log('📍 Ubicación actual seleccionada');

      if (onPlaceSelected) {
        onPlaceSelected(currentPlace);
      }

      setSearchText('Mi ubicación actual');
      setShowSuggestions(false);

    } catch (error) {
      console.error('❌ Error obteniendo ubicación actual:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchText('');
    setShowSuggestions(false);
    if (autocompleteRef.current) {
      autocompleteRef.current.clear();
    }
    if (onTextChange) {
      onTextChange('');
    }
  };

  // ============================================
  // RENDERIZADO DE SUGERENCIAS
  // ============================================
  
  const renderQuickActions = () => {
    if (!showSuggestions) return null;

    return (
      <View style={styles.quickActionsContainer}>
        {/* Ubicación actual */}
        {currentLocation && (
          <TouchableOpacity 
            style={styles.quickActionItem}
            onPress={getCurrentLocationPlace}
          >
            <Text style={styles.quickActionIcon}>📍</Text>
            <View style={styles.quickActionText}>
              <Text style={styles.quickActionTitle}>Mi ubicación actual</Text>
              <Text style={styles.quickActionSubtitle}>Usar mi ubicación GPS</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Separador */}
        {currentLocation && <View style={styles.separator} />}
      </View>
    );
  };

  const renderPopularPlaces = () => {
    if (!showSuggestions) return null;

    return (
      <View style={styles.popularPlacesContainer}>
        <Text style={styles.sectionTitle}>Lugares populares</Text>
        <FlatList
          data={popularPlaces}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.popularPlaceItem}
              onPress={() => handlePopularPlaceSelect(item)}
            >
              <Text style={styles.popularPlaceIcon}>{item.icon}</Text>
              <View style={styles.popularPlaceText}>
                <Text style={styles.popularPlaceTitle}>{item.name}</Text>
                <Text style={styles.popularPlaceSubtitle}>{item.type} • {item.address}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>
    );
  };

  const renderFavorites = () => {
    if (!showSuggestions || !showFavorites || favorites.length === 0) return null;

    return (
      <View style={styles.favoritesContainer}>
        <Text style={styles.sectionTitle}>Lugares favoritos</Text>
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.favoriteItem}
              onPress={() => handleFavoriteSelect(item)}
            >
              <Text style={styles.favoriteIcon}>⭐</Text>
              <View style={styles.favoriteText}>
                <Text style={styles.favoriteTitle}>{item.name || 'Lugar favorito'}</Text>
                <Text style={styles.favoriteSubtitle}>{item.address}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>
    );
  };

  // ============================================
  // RENDERIZADO PRINCIPAL
  // ============================================
  
  return (
    <View style={[styles.container, style]}>
      {/* Campo de búsqueda principal */}
      <View style={styles.searchContainer}>
        <GooglePlacesAutocomplete
          ref={autocompleteRef}
          placeholder={placeholder}
          onPress={handlePlaceSelect}
          query={{
            key: GOOGLE_MAPS_CONFIG.API_KEY,
            language: 'es',
            components: 'country:do', // Solo República Dominicana
            location: `${GOOGLE_MAPS_CONFIG.DEFAULT_REGION.latitude},${GOOGLE_MAPS_CONFIG.DEFAULT_REGION.longitude}`,
            radius: 50000, // 50km alrededor de Santo Domingo
            strictbounds: false,
            types: 'establishment|geocode', // Lugares y direcciones
          }}
          fetchDetails={true}
          enablePoweredByContainer={false}
          textInputProps={{
            value: searchText,
            onChangeText: (text) => {
              setSearchText(text);
              if (onTextChange) {
                onTextChange(text);
              }
            },
            onFocus: () => setShowSuggestions(true),
            autoCorrect: false,
            autoCapitalize: 'words',
          }}
          styles={{
            textInputContainer: styles.textInputContainer,
            textInput: styles.textInput,
            listView: styles.listView,
            row: styles.autocompleteRow,
            description: styles.autocompleteDescription,
          }}
          debounce={300}
          minLength={2}
          nearbyPlacesAPI="GooglePlacesSearch"
          GooglePlacesSearchQuery={{
            rankby: 'distance',
            type: 'establishment'
          }}
          filterReverseGeocodingByTypes={[
            'locality',
            'administrative_area_level_3',
            'establishment'
          ]}
        />
        
        {/* Botón para limpiar */}
        {searchText.length > 0 && (
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={clearSearch}
          >
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        )}

        {/* Indicador de carga */}
        {isLoading && (
          <View style={styles.loadingIndicator}>
            <ActivityIndicator size="small" color="#007AFF" />
          </View>
        )}
      </View>

      {/* Overlay de sugerencias */}
      {showSuggestions && (
        <TouchableOpacity 
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowSuggestions(false)}
        >
          <View style={styles.suggestionsContainer}>
            {renderQuickActions()}
            {renderFavorites()}
            {renderPopularPlaces()}
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ============================================
// ESTILOS
// ============================================

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1,
  },
  
  // Campo de búsqueda
  searchContainer: {
    position: 'relative',
  },
  textInputContainer: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    borderBottomWidth: 0,
  },
  textInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  listView: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginTop: 5,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  autocompleteRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  autocompleteDescription: {
    fontSize: 14,
    color: '#333',
  },
  clearButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    color: '#666',
  },
  loadingIndicator: {
    position: 'absolute',
    right: 45,
    top: 16,
  },

  // Overlay y sugerencias
  overlay: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  suggestionsContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginTop: 5,
    maxHeight: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },

  // Acciones rápidas
  quickActionsContainer: {
    paddingVertical: 12,
  },
  quickActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  quickActionIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 30,
    textAlign: 'center',
  },
  quickActionText: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  quickActionSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },

  // Lugares populares
  popularPlacesContainer: {
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    paddingHorizontal: 16,
    paddingBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  popularPlaceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  popularPlaceIcon: {
    fontSize: 18,
    marginRight: 12,
    width: 30,
    textAlign: 'center',
  },
  popularPlaceText: {
    flex: 1,
  },
  popularPlaceTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  popularPlaceSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },

  // Favoritos
  favoritesContainer: {
    paddingVertical: 12,
  },
  favoriteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  favoriteIcon: {
    fontSize: 18,
    marginRight: 12,
    width: 30,
    textAlign: 'center',
  },
  favoriteText: {
    flex: 1,
  },
  favoriteTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  favoriteSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },

  // Separador
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 16,
  },
});

export default AddressSearchComponent;
