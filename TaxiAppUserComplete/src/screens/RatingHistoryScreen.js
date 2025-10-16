import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';

const RatingHistoryScreen = ({ navigation }) => {
  const [ratings, setRatings] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all'); // all, 5, 4, 3, 2, 1

  useEffect(() => {
    loadRatingsAndStats();
  }, []);

  const loadRatingsAndStats = async () => {
    try {
      // Cargar calificaciones
      const ratingsStr = await AsyncStorage.getItem('userRatings');
      const loadedRatings = ratingsStr ? JSON.parse(ratingsStr) : [];
      
      // Cargar estadísticas
      const statsStr = await AsyncStorage.getItem('userRatingStats');
      const loadedStats = statsStr ? JSON.parse(statsStr) : {
        totalRatings: 0,
        sumRatings: 0,
        averageRating: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };

      // Si no hay datos guardados, crear datos de ejemplo
      if (loadedRatings.length === 0) {
        const sampleRatings = createSampleRatings();
        await AsyncStorage.setItem('userRatings', JSON.stringify(sampleRatings));
        
        const sampleStats = calculateStatsFromRatings(sampleRatings);
        await AsyncStorage.setItem('userRatingStats', JSON.stringify(sampleStats));
        
        setRatings(sampleRatings);
        setStats(sampleStats);
      } else {
        setRatings(loadedRatings);
        setStats(loadedStats);
      }
    } catch (error) {
      console.error('Error loading ratings:', error);
      Alert.alert('Error', 'No se pudieron cargar las calificaciones');
    } finally {
      setLoading(false);
    }
  };

  const createSampleRatings = () => {
    return [
      {
        tripId: 'trip_001',
        driverId: 'driver_001',
        driverName: 'Carlos Mendoza',
        rating: 5,
        comment: 'Excelente servicio, muy puntual y amable',
        tags: ['punctual', 'friendly', 'safe'],
        timestamp: '2025-08-09T14:30:00',
        tripDate: '2025-08-09',
        tripRoute: {
          pickup: 'Megacentro, Santo Domingo Este',
          dropoff: 'Los Mina Sur'
        }
      },
      {
        tripId: 'trip_002',
        driverId: 'driver_002',
        driverName: 'María González',
        rating: 4,
        comment: 'Buen viaje, aunque el vehículo podría estar más limpio',
        tags: ['professional', 'smooth'],
        timestamp: '2025-08-08T09:15:00',
        tripDate: '2025-08-08',
        tripRoute: {
          pickup: 'Sabana Perdida',
          dropoff: 'San Luis'
        }
      },
      {
        tripId: 'trip_003',
        driverId: 'driver_003',
        driverName: 'Pedro Ramírez',
        rating: 5,
        comment: 'Conductor muy profesional, vehículo impecable',
        tags: ['clean', 'professional', 'safe'],
        timestamp: '2025-08-07T18:45:00',
        tripDate: '2025-08-07',
        tripRoute: {
          pickup: 'El Almirante',
          dropoff: 'Plaza Megacentro'
        }
      },
      {
        tripId: 'trip_004',
        driverId: 'driver_004',
        driverName: 'Ana Martínez',
        rating: 3,
        comment: 'El viaje estuvo bien, pero llegó un poco tarde',
        tags: ['late'],
        timestamp: '2025-08-06T12:00:00',
        tripDate: '2025-08-06',
        tripRoute: {
          pickup: 'Los Tres Ojos',
          dropoff: 'Sambil Santo Domingo Este'
        }
      },
      {
        tripId: 'trip_005',
        driverId: 'driver_005',
        driverName: 'José Pérez',
        rating: 5,
        comment: 'Perfecto, música agradable y conducción suave',
        tags: ['smooth', 'friendly', 'professional'],
        timestamp: '2025-08-05T16:20:00',
        tripDate: '2025-08-05',
        tripRoute: {
          pickup: 'Villa Duarte',
          dropoff: 'Coral Mall'
        }
      }
    ];
  };

  const calculateStatsFromRatings = (ratingsArray) => {
    const stats = {
      totalRatings: ratingsArray.length,
      sumRatings: 0,
      averageRating: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };

    ratingsArray.forEach(rating => {
      stats.sumRatings += rating.rating;
      stats.distribution[rating.rating]++;
    });

    stats.averageRating = stats.totalRatings > 0 
      ? (stats.sumRatings / stats.totalRatings).toFixed(1) 
      : 0;

    return stats;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRatingsAndStats();
    setRefreshing(false);
  };

  const getFilteredRatings = () => {
    if (selectedFilter === 'all') return ratings;
    return ratings.filter(r => r.rating === parseInt(selectedFilter));
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Icon
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={16}
          color={i <= rating ? '#FFD700' : '#DDD'}
        />
      );
    }
    return stars;
  };

  const getTagLabel = (tagId) => {
    const tags = {
      safe: 'Conducción segura',
      friendly: 'Amable',
      punctual: 'Puntual',
      clean: 'Vehículo limpio',
      professional: 'Profesional',
      smooth: 'Viaje cómodo',
      unsafe: 'Conducción insegura',
      rude: 'Descortés',
      late: 'Llegó tarde',
      dirty: 'Vehículo sucio',
      unprofessional: 'Poco profesional',
      uncomfortable: 'Viaje incómodo'
    };
    return tags[tagId] || tagId;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return date.toLocaleDateString('es-DO', options);
  };

  const renderRatingItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.ratingCard}
      onPress={() => navigation.navigate('TripDetails', { 
        trip: {
          ...item.tripRoute,
          date: item.tripDate,
          driverName: item.driverName,
          rating: item.rating
        }
      })}
    >
      <View style={styles.ratingHeader}>
        <View style={styles.driverInfoSection}>
          <View style={styles.driverAvatar}>
            <Text style={styles.driverInitial}>
              {item.driverName.charAt(0)}
            </Text>
          </View>
          <View style={styles.driverDetails}>
            <Text style={styles.driverName}>{item.driverName}</Text>
            <Text style={styles.tripDate}>{formatDate(item.timestamp)}</Text>
          </View>
        </View>
        <View style={styles.ratingStars}>
          {renderStars(item.rating)}
        </View>
      </View>

      <View style={styles.routeSection}>
        <View style={styles.routePoint}>
          <Icon name="radio-button-on" size={12} color="#4CAF50" />
          <Text style={styles.routeText} numberOfLines={1}>
            {item.tripRoute.pickup}
          </Text>
        </View>
        <View style={styles.routeLine} />
        <View style={styles.routePoint}>
          <Icon name="location" size={12} color="#F44336" />
          <Text style={styles.routeText} numberOfLines={1}>
            {item.tripRoute.dropoff}
          </Text>
        </View>
      </View>

      {item.tags && item.tags.length > 0 && (
        <View style={styles.tagsSection}>
          {item.tags.map(tag => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{getTagLabel(tag)}</Text>
            </View>
          ))}
        </View>
      )}

      {item.comment && (
        <Text style={styles.comment} numberOfLines={2}>
          "{item.comment}"
        </Text>
      )}
    </TouchableOpacity>
  );

  const renderStatsHeader = () => {
    if (!stats) return null;

    return (
      <View style={styles.statsContainer}>
        <View style={styles.averageSection}>
          <Text style={styles.averageRating}>{stats.averageRating}</Text>
          <View style={styles.averageStars}>
            {renderStars(Math.round(stats.averageRating))}
          </View>
          <Text style={styles.totalRatings}>
            {stats.totalRatings} calificaciones
          </Text>
        </View>

        <View style={styles.distributionSection}>
          {[5, 4, 3, 2, 1].map(star => {
            const count = stats.distribution[star] || 0;
            const percentage = stats.totalRatings > 0 
              ? (count / stats.totalRatings * 100).toFixed(0)
              : 0;
            
            return (
              <TouchableOpacity
                key={star}
                style={styles.distributionRow}
                onPress={() => setSelectedFilter(star.toString())}
              >
                <Text style={styles.starLabel}>{star}</Text>
                <Icon name="star" size={14} color="#FFD700" />
                <View style={styles.progressBarContainer}>
                  <View 
                    style={[
                      styles.progressBar,
                      { width: `${percentage}%` }
                    ]}
                  />
                </View>
                <Text style={styles.countLabel}>{count}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.filterButtons}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedFilter === 'all' && styles.filterButtonActive
            ]}
            onPress={() => setSelectedFilter('all')}
          >
            <Text style={[
              styles.filterButtonText,
              selectedFilter === 'all' && styles.filterButtonTextActive
            ]}>
              Todas
            </Text>
          </TouchableOpacity>
          {[5, 4, 3, 2, 1].map(star => (
            <TouchableOpacity
              key={star}
              style={[
                styles.filterButton,
                selectedFilter === star.toString() && styles.filterButtonActive
              ]}
              onPress={() => setSelectedFilter(star.toString())}
            >
              <Text style={[
                styles.filterButtonText,
                selectedFilter === star.toString() && styles.filterButtonTextActive
              ]}>
                {star} ⭐
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Icon name="star-outline" size={60} color="#DDD" />
      <Text style={styles.emptyText}>
        {selectedFilter === 'all' 
          ? 'No hay calificaciones aún'
          : `No hay calificaciones de ${selectedFilter} estrellas`
        }
      </Text>
      <Text style={styles.emptySubtext}>
        Tus calificaciones aparecerán aquí
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando calificaciones...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis Calificaciones</Text>
        <View style={styles.backButton} />
      </View>

      <FlatList
        data={getFilteredRatings()}
        renderItem={renderRatingItem}
        keyExtractor={item => item.tripId}
        ListHeaderComponent={renderStatsHeader}
        ListEmptyComponent={renderEmptyList}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#007AFF']}
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    width: 30,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  listContent: {
    paddingBottom: 20,
  },
  statsContainer: {
    backgroundColor: '#FFF',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  averageSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  averageRating: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#333',
  },
  averageStars: {
    flexDirection: 'row',
    marginVertical: 5,
  },
  totalRatings: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  distributionSection: {
    marginBottom: 20,
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  starLabel: {
    width: 15,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  progressBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    marginHorizontal: 10,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 4,
  },
  countLabel: {
    width: 30,
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 13,
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#FFF',
  },
  ratingCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 15,
    marginBottom: 10,
    padding: 15,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  ratingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  driverInfoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  driverAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  driverInitial: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  tripDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  ratingStars: {
    flexDirection: 'row',
  },
  routeSection: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeLine: {
    width: 1,
    height: 15,
    backgroundColor: '#DDD',
    marginLeft: 5,
    marginVertical: 2,
  },
  routeText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#333',
    flex: 1,
  },
  tagsSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
    gap: 6,
  },
  tag: {
    backgroundColor: '#E8F4FD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 6,
  },
  tagText: {
    fontSize: 12,
    color: '#007AFF',
  },
  comment: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
});

export default RatingHistoryScreen;