import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AddressHistoryService from '../services/AddressHistoryService';

const AddressHistoryScreen = ({ navigation }) => {
  const [history, setHistory] = useState([]);
  const [recentAddresses, setRecentAddresses] = useState([]);
  const [frequentAddresses, setFrequentAddresses] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // all, recent, frequent
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Cargar todos los datos
      const [allHistory, recent, frequent, stats] = await Promise.all([
        AddressHistoryService.getHistory(),
        AddressHistoryService.getRecentAddresses(),
        AddressHistoryService.getFrequentAddresses(),
        AddressHistoryService.getStatistics()
      ]);

      setHistory(allHistory);
      setRecentAddresses(recent);
      setFrequentAddresses(frequent);
      setStatistics(stats);
    } catch (error) {
      console.error('Error cargando datos:', error);
      Alert.alert('Error', 'No se pudo cargar el historial');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const selectAddress = (address) => {
    Alert.alert(
      'Usar dirección',
      `¿Deseas ir a ${address.name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Usar',
          onPress: () => {
            // Volver a la pantalla principal con la dirección seleccionada
            navigation.navigate('Main', {
              selectedDestination: {
                name: address.name,
                address: address.address,
                coordinates: address.coordinates
              }
            });
          }
        }
      ]
    );
  };

  const deleteAddress = async (id) => {
    Alert.alert(
      'Eliminar del historial',
      '¿Estás seguro de eliminar esta dirección del historial?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const success = await AddressHistoryService.removeFromHistory(id);
            if (success) {
              loadData();
            }
          }
        }
      ]
    );
  };

  const clearAllHistory = () => {
    Alert.alert(
      'Limpiar historial',
      '¿Estás seguro de eliminar TODO el historial? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpiar todo',
          style: 'destructive',
          onPress: async () => {
            const success = await AddressHistoryService.clearHistory();
            if (success) {
              loadData();
              Alert.alert('Éxito', 'Historial limpiado');
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Hoy';
    } else if (diffDays === 1) {
      return 'Ayer';
    } else if (diffDays < 7) {
      return `Hace ${diffDays} días`;
    } else {
      return date.toLocaleDateString('es-DO');
    }
  };

  const renderAddressItem = ({ item }) => (
    <TouchableOpacity
      style={styles.addressItem}
      onPress={() => selectAddress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.addressIcon}>
        <Icon name="location" size={24} color="#007AFF" />
      </View>
      
      <View style={styles.addressContent}>
        <Text style={styles.addressName} numberOfLines={1}>
          {item.name || item.address}
        </Text>
        <Text style={styles.addressText} numberOfLines={1}>
          {item.address}
        </Text>
        <View style={styles.addressMeta}>
          <Text style={styles.metaText}>
            {formatDate(item.lastUsed)}
          </Text>
          {item.count > 1 && (
            <Text style={styles.countBadge}>
              {item.count} viajes
            </Text>
          )}
        </View>
      </View>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => deleteAddress(item.id)}
      >
        <Icon name="close-circle" size={22} color="#FF3B30" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderStatistics = () => {
    if (!statistics || statistics.totalTrips === 0) return null;

    return (
      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>Estadísticas</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{statistics.totalTrips}</Text>
            <Text style={styles.statLabel}>Viajes totales</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{statistics.uniqueDestinations}</Text>
            <Text style={styles.statLabel}>Destinos únicos</Text>
          </View>
        </View>
        {statistics.mostVisited && (
          <View style={styles.mostVisited}>
            <Icon name="star" size={16} color="#FFD700" />
            <Text style={styles.mostVisitedText}>
              Más visitado: {statistics.mostVisited.address} ({statistics.mostVisited.count} veces)
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'all' && styles.activeTab]}
        onPress={() => setActiveTab('all')}
      >
        <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
          Todos ({history.length})
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.tab, activeTab === 'recent' && styles.activeTab]}
        onPress={() => setActiveTab('recent')}
      >
        <Text style={[styles.tabText, activeTab === 'recent' && styles.activeTabText]}>
          Recientes
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.tab, activeTab === 'frequent' && styles.activeTab]}
        onPress={() => setActiveTab('frequent')}
      >
        <Text style={[styles.tabText, activeTab === 'frequent' && styles.activeTabText]}>
          Frecuentes
        </Text>
      </TouchableOpacity>
    </View>
  );

  const getDataForTab = () => {
    switch (activeTab) {
      case 'recent':
        return recentAddresses;
      case 'frequent':
        return frequentAddresses;
      default:
        return history;
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando historial...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Historial de Direcciones</Text>
        <TouchableOpacity onPress={clearAllHistory}>
          <Icon name="trash-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {renderStatistics()}
      {renderTabs()}

      <FlatList
        data={getDataForTab()}
        renderItem={renderAddressItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#007AFF']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="time-outline" size={60} color="#ccc" />
            <Text style={styles.emptyText}>No hay direcciones en el historial</Text>
            <Text style={styles.emptySubtext}>
              Tus destinos se guardarán automáticamente aquí
            </Text>
          </View>
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
    backgroundColor: '#007AFF',
    padding: 16,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  statsContainer: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  mostVisited: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  mostVisitedText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#fff',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  addressItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    alignItems: 'center',
  },
  addressIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  addressContent: {
    flex: 1,
  },
  addressName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 3,
  },
  addressText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  addressMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 11,
    color: '#999',
  },
  countBadge: {
    marginLeft: 10,
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    fontSize: 11,
    color: '#007AFF',
    fontWeight: '500',
  },
  deleteButton: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});

export default AddressHistoryScreen;