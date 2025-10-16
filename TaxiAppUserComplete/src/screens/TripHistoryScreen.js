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

const TripHistoryScreen = ({ navigation }) => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadTripHistory();
  }, []);

  const loadTripHistory = async () => {
    try {
      // Por ahora cargaremos datos locales, después conectaremos con el backend real
      const storedTrips = await AsyncStorage.getItem('userTripHistory');
      if (storedTrips) {
        setTrips(JSON.parse(storedTrips));
      } else {
        // Datos de ejemplo para pruebas
        const sampleTrips = [
          {
            id: '1',
            date: '2025-08-09',
            time: '14:30',
            pickup: 'Megacentro, Santo Domingo Este',
            dropoff: 'Los Mina Sur',
            driverName: 'Juan Pérez',
            driverRating: 4.8,
            price: 'RD$ 350',
            status: 'completed',
            duration: '15 min',
            distance: '5.2 km'
          },
          {
            id: '2',
            date: '2025-08-08',
            time: '09:15',
            pickup: 'Sabana Perdida',
            dropoff: 'San Luis',
            driverName: 'María González',
            driverRating: 4.9,
            price: 'RD$ 450',
            status: 'completed',
            duration: '22 min',
            distance: '8.7 km'
          },
          {
            id: '3',
            date: '2025-08-07',
            time: '18:45',
            pickup: 'El Almirante',
            dropoff: 'Plaza Megacentro',
            driverName: 'Carlos Rodríguez',
            driverRating: 4.7,
            price: 'RD$ 280',
            status: 'cancelled',
            duration: '0 min',
            distance: '0 km'
          }
        ];
        await AsyncStorage.setItem('userTripHistory', JSON.stringify(sampleTrips));
        setTrips(sampleTrips);
      }
    } catch (error) {
      console.error('Error loading trip history:', error);
      Alert.alert('Error', 'No se pudo cargar el historial de viajes');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTripHistory();
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed':
        return '#4CAF50';
      case 'cancelled':
        return '#F44336';
      case 'in_progress':
        return '#FF9800';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'completed':
        return 'Completado';
      case 'cancelled':
        return 'Cancelado';
      case 'in_progress':
        return 'En progreso';
      default:
        return 'Desconocido';
    }
  };

  const renderTripItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.tripCard}
      onPress={() => navigation.navigate('TripDetails', { trip: item })}
    >
      <View style={styles.tripHeader}>
        <View>
          <Text style={styles.tripDate}>{item.date}</Text>
          <Text style={styles.tripTime}>{item.time}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>

      <View style={styles.tripRoute}>
        <View style={styles.routePoint}>
          <View style={[styles.routeDot, { backgroundColor: '#4CAF50' }]} />
          <View style={styles.routeInfo}>
            <Text style={styles.routeLabel}>Origen</Text>
            <Text style={styles.routeAddress}>{item.pickup}</Text>
          </View>
        </View>

        <View style={styles.routeLine} />

        <View style={styles.routePoint}>
          <View style={[styles.routeDot, { backgroundColor: '#F44336' }]} />
          <View style={styles.routeInfo}>
            <Text style={styles.routeLabel}>Destino</Text>
            <Text style={styles.routeAddress}>{item.dropoff}</Text>
          </View>
        </View>
      </View>

      <View style={styles.tripFooter}>
        <View style={styles.driverInfo}>
          <Text style={styles.driverName}>{item.driverName}</Text>
          <Text style={styles.driverRating}>⭐ {item.driverRating}</Text>
        </View>
        <View style={styles.tripStats}>
          <Text style={styles.tripDistance}>{item.distance}</Text>
          <Text style={styles.tripDuration}>{item.duration}</Text>
        </View>
        <Text style={styles.tripPrice}>{item.price}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No hay viajes en tu historial</Text>
      <Text style={styles.emptySubtext}>Tus viajes aparecerán aquí</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Cargando historial...</Text>
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
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Historial de Viajes</Text>
        <View style={styles.backButton} />
      </View>

      <FlatList
        data={trips}
        renderItem={renderTripItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#007bff']}
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#007bff',
    paddingTop: 40,
    paddingBottom: 15,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 30,
  },
  backButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
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
  listContainer: {
    padding: 15,
  },
  tripCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  tripDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  tripTime: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tripRoute: {
    marginBottom: 15,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  routeInfo: {
    marginLeft: 10,
    flex: 1,
  },
  routeLabel: {
    fontSize: 12,
    color: '#666',
  },
  routeAddress: {
    fontSize: 14,
    color: '#333',
    marginTop: 2,
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: '#ddd',
    marginLeft: 5,
    marginVertical: 5,
  },
  tripFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  driverRating: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  tripStats: {
    alignItems: 'center',
    flex: 1,
  },
  tripDistance: {
    fontSize: 12,
    color: '#666',
  },
  tripDuration: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  tripPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007bff',
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
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
});

export default TripHistoryScreen;