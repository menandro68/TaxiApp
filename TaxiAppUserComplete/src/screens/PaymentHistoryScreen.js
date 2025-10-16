import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PaymentHistoryScreen = ({ navigation }) => {
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  
  // Estados para filtros
  const [filterType, setFilterType] = useState('all'); // all, trip, recharge, refund
  const [filterDateRange, setFilterDateRange] = useState('all'); // all, today, week, month
  const [searchText, setSearchText] = useState('');
  
  // Estadísticas
  const [stats, setStats] = useState({
    totalSpent: 0,
    totalTrips: 0,
    averageSpent: 0,
    lastPayment: null,
  });

  useEffect(() => {
    loadPaymentHistory();
  }, []);

  useEffect(() => {
    applyFilters();
    calculateStats();
  }, [payments, filterType, filterDateRange, searchText]);

  // Cargar historial de pagos
  const loadPaymentHistory = async () => {
    try {
      setIsLoading(true);
      
      // Intentar cargar desde AsyncStorage
      const storedPayments = await AsyncStorage.getItem('paymentHistory');
      
      if (storedPayments) {
        const parsedPayments = JSON.parse(storedPayments);
        setPayments(parsedPayments);
      } else {
        // Generar datos de ejemplo si no hay historial
        const mockPayments = generateMockPayments();
        setPayments(mockPayments);
        await AsyncStorage.setItem('paymentHistory', JSON.stringify(mockPayments));
      }
      
    } catch (error) {
      console.error('Error cargando historial de pagos:', error);
      Alert.alert('Error', 'No se pudo cargar el historial de pagos');
    } finally {
      setIsLoading(false);
    }
  };

  // Generar pagos de ejemplo
  const generateMockPayments = () => {
    const types = ['trip', 'recharge', 'refund'];
    const methods = ['card', 'cash', 'wallet'];
    const mockPayments = [];
    
    for (let i = 0; i < 25; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 60));
      
      let amount, description, status;
      
      switch(type) {
        case 'trip':
          amount = 150 + Math.floor(Math.random() * 500);
          description = `Viaje a ${['Zona Colonial', 'Piantini', 'Naco', 'Gazcue', 'Los Prados'][Math.floor(Math.random() * 5)]}`;
          status = 'completed';
          break;
        case 'recharge':
          amount = [500, 1000, 2000, 5000][Math.floor(Math.random() * 4)];
          description = 'Recarga de saldo';
          status = 'completed';
          break;
        case 'refund':
          amount = 100 + Math.floor(Math.random() * 300);
          description = 'Reembolso por cancelación';
          status = 'completed';
          break;
      }
      
      mockPayments.push({
        id: `payment_${Date.now()}_${i}`,
        type,
        amount,
        description,
        date: date.toISOString(),
        method: methods[Math.floor(Math.random() * methods.length)],
        status,
        tripId: type === 'trip' ? `trip_${Date.now()}_${i}` : null,
        reference: `REF${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      });
    }
    
    return mockPayments.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  // Aplicar filtros
  const applyFilters = () => {
    let filtered = [...payments];
    
    // Filtrar por tipo
    if (filterType !== 'all') {
      filtered = filtered.filter(p => p.type === filterType);
    }
    
    // Filtrar por rango de fecha
    const now = new Date();
    switch(filterDateRange) {
      case 'today':
        filtered = filtered.filter(p => {
          const paymentDate = new Date(p.date);
          return paymentDate.toDateString() === now.toDateString();
        });
        break;
      case 'week':
        const weekAgo = new Date(now.setDate(now.getDate() - 7));
        filtered = filtered.filter(p => new Date(p.date) >= weekAgo);
        break;
      case 'month':
        const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
        filtered = filtered.filter(p => new Date(p.date) >= monthAgo);
        break;
    }
    
    // Filtrar por texto de búsqueda
    if (searchText.trim()) {
      filtered = filtered.filter(p => 
        p.description.toLowerCase().includes(searchText.toLowerCase()) ||
        p.reference.toLowerCase().includes(searchText.toLowerCase()) ||
        p.amount.toString().includes(searchText)
      );
    }
    
    setFilteredPayments(filtered);
  };

  // Calcular estadísticas
  const calculateStats = () => {
    if (payments.length === 0) {
      setStats({
        totalSpent: 0,
        totalTrips: 0,
        averageSpent: 0,
        lastPayment: null,
      });
      return;
    }
    
    const tripPayments = payments.filter(p => p.type === 'trip');
    const totalSpent = tripPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalTrips = tripPayments.length;
    const averageSpent = totalTrips > 0 ? totalSpent / totalTrips : 0;
    const lastPayment = payments[0]; // Ya están ordenados por fecha
    
    setStats({
      totalSpent,
      totalTrips,
      averageSpent,
      lastPayment,
    });
  };

  // Refrescar datos
  const onRefresh = async () => {
    setRefreshing(true);
    await loadPaymentHistory();
    setRefreshing(false);
  };

  // Exportar historial
  const exportHistory = () => {
    Alert.alert(
      'Exportar Historial',
      '¿En qué formato deseas exportar tu historial?',
      [
        { text: 'PDF', onPress: () => exportToPDF() },
        { text: 'Excel', onPress: () => exportToExcel() },
        { text: 'Cancelar', style: 'cancel' }
      ]
    );
  };

  const exportToPDF = () => {
    Alert.alert('Exportando a PDF', 'Tu historial será enviado a tu correo electrónico');
  };

  const exportToExcel = () => {
    Alert.alert('Exportando a Excel', 'Tu historial será enviado a tu correo electrónico');
  };

  // Obtener icono según tipo de pago
  const getPaymentIcon = (type) => {
    switch(type) {
      case 'trip':
        return { name: 'car', color: '#007AFF' };
      case 'recharge':
        return { name: 'wallet', color: '#34C759' };
      case 'refund':
        return { name: 'refresh-circle', color: '#FF9500' };
      default:
        return { name: 'cash', color: '#666' };
    }
  };

  // Obtener color según método de pago
  const getMethodColor = (method) => {
    switch(method) {
      case 'card':
        return '#007AFF';
      case 'cash':
        return '#34C759';
      case 'wallet':
        return '#FF9500';
      default:
        return '#666';
    }
  };

  // Formatear fecha
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return `Hoy, ${date.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return `Ayer, ${date.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays < 7) {
      return date.toLocaleDateString('es-DO', { weekday: 'long', hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('es-DO', { day: 'numeric', month: 'short', year: 'numeric' });
    }
  };

  // Renderizar item de pago
  const renderPaymentItem = ({ item }) => {
    const icon = getPaymentIcon(item.type);
    const isIncome = item.type === 'recharge' || item.type === 'refund';
    
    return (
      <TouchableOpacity 
        style={styles.paymentItem}
        onPress={() => {
          setSelectedPayment(item);
          setShowDetailModal(true);
        }}
      >
        <View style={[styles.paymentIcon, { backgroundColor: `${icon.color}20` }]}>
          <Icon name={icon.name} size={24} color={icon.color} />
        </View>
        
        <View style={styles.paymentInfo}>
          <Text style={styles.paymentDescription}>{item.description}</Text>
          <Text style={styles.paymentDate}>{formatDate(item.date)}</Text>
          <View style={styles.paymentMeta}>
            <View style={[styles.methodBadge, { backgroundColor: `${getMethodColor(item.method)}20` }]}>
              <Text style={[styles.methodText, { color: getMethodColor(item.method) }]}>
                {item.method === 'card' ? 'Tarjeta' : item.method === 'cash' ? 'Efectivo' : 'Billetera'}
              </Text>
            </View>
            <Text style={styles.referenceText}>#{item.reference}</Text>
          </View>
        </View>
        
        <View style={styles.paymentAmount}>
          <Text style={[
            styles.amountText,
            { color: isIncome ? '#34C759' : '#333' }
          ]}>
            {isIncome ? '+' : '-'}RD${item.amount}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Renderizar modal de detalles
  const renderDetailModal = () => {
    if (!selectedPayment) return null;
    
    const icon = getPaymentIcon(selectedPayment.type);
    const isIncome = selectedPayment.type === 'recharge' || selectedPayment.type === 'refund';
    
    return (
      <Modal
        visible={showDetailModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalles del Pago</Text>
              <TouchableOpacity 
                onPress={() => setShowDetailModal(false)}
                style={styles.modalCloseButton}
              >
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              {/* Icono y monto principal */}
              <View style={styles.detailHeader}>
                <View style={[styles.detailIcon, { backgroundColor: `${icon.color}20` }]}>
                  <Icon name={icon.name} size={40} color={icon.color} />
                </View>
                <Text style={[
                  styles.detailAmount,
                  { color: isIncome ? '#34C759' : '#333' }
                ]}>
                  {isIncome ? '+' : '-'}RD${selectedPayment.amount}
                </Text>
                <Text style={styles.detailDescription}>{selectedPayment.description}</Text>
              </View>
              
              {/* Información detallada */}
              <View style={styles.detailSection}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Fecha y hora</Text>
                  <Text style={styles.detailValue}>
                    {new Date(selectedPayment.date).toLocaleString('es-DO')}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Método de pago</Text>
                  <Text style={styles.detailValue}>
                    {selectedPayment.method === 'card' ? 'Tarjeta' : 
                     selectedPayment.method === 'cash' ? 'Efectivo' : 'Billetera'}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Referencia</Text>
                  <Text style={styles.detailValue}>#{selectedPayment.reference}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Estado</Text>
                  <View style={[styles.statusBadge, styles.statusCompleted]}>
                    <Text style={styles.statusText}>Completado</Text>
                  </View>
                </View>
                
                {selectedPayment.tripId && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>ID del viaje</Text>
                    <Text style={styles.detailValue}>#{selectedPayment.tripId}</Text>
                  </View>
                )}
              </View>
              
              {/* Acciones */}
              <View style={styles.detailActions}>
                {selectedPayment.type === 'trip' && (
                  <TouchableOpacity style={styles.actionButton}>
                    <Icon name="receipt-outline" size={20} color="#007AFF" />
                    <Text style={styles.actionButtonText}>Ver Recibo</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity style={styles.actionButton}>
                  <Icon name="share-outline" size={20} color="#007AFF" />
                  <Text style={styles.actionButtonText}>Compartir</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.actionButton}>
                  <Icon name="help-circle-outline" size={20} color="#007AFF" />
                  <Text style={styles.actionButtonText}>Reportar Problema</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  // Renderizar modal de filtros
  const renderFilterModal = () => {
    return (
      <Modal
        visible={filterModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtrar Pagos</Text>
              <TouchableOpacity 
                onPress={() => setFilterModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              {/* Filtro por tipo */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Tipo de pago</Text>
                <View style={styles.filterOptions}>
                  {[
                    { value: 'all', label: 'Todos', icon: 'list' },
                    { value: 'trip', label: 'Viajes', icon: 'car' },
                    { value: 'recharge', label: 'Recargas', icon: 'wallet' },
                    { value: 'refund', label: 'Reembolsos', icon: 'refresh-circle' }
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.filterOption,
                        filterType === option.value && styles.filterOptionActive
                      ]}
                      onPress={() => setFilterType(option.value)}
                    >
                      <Icon 
                        name={option.icon} 
                        size={20} 
                        color={filterType === option.value ? '#007AFF' : '#666'} 
                      />
                      <Text style={[
                        styles.filterOptionText,
                        filterType === option.value && styles.filterOptionTextActive
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              {/* Filtro por fecha */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Período</Text>
                <View style={styles.filterOptions}>
                  {[
                    { value: 'all', label: 'Todo' },
                    { value: 'today', label: 'Hoy' },
                    { value: 'week', label: 'Última semana' },
                    { value: 'month', label: 'Último mes' }
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.filterOption,
                        filterDateRange === option.value && styles.filterOptionActive
                      ]}
                      onPress={() => setFilterDateRange(option.value)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        filterDateRange === option.value && styles.filterOptionTextActive
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              {/* Botones de acción */}
              <View style={styles.filterActions}>
                <TouchableOpacity 
                  style={styles.filterResetButton}
                  onPress={() => {
                    setFilterType('all');
                    setFilterDateRange('all');
                    setSearchText('');
                  }}
                >
                  <Text style={styles.filterResetText}>Limpiar filtros</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.filterApplyButton}
                  onPress={() => setFilterModalVisible(false)}
                >
                  <Text style={styles.filterApplyText}>Aplicar</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  // Renderizar estadísticas
  const renderStats = () => {
    return (
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Icon name="cash-outline" size={24} color="#007AFF" />
          <Text style={styles.statValue}>RD${stats.totalSpent.toFixed(0)}</Text>
          <Text style={styles.statLabel}>Total gastado</Text>
        </View>
        
        <View style={styles.statCard}>
          <Icon name="car-outline" size={24} color="#34C759" />
          <Text style={styles.statValue}>{stats.totalTrips}</Text>
          <Text style={styles.statLabel}>Viajes totales</Text>
        </View>
        
        <View style={styles.statCard}>
          <Icon name="trending-up-outline" size={24} color="#FF9500" />
          <Text style={styles.statValue}>RD${stats.averageSpent.toFixed(0)}</Text>
          <Text style={styles.statLabel}>Promedio/viaje</Text>
        </View>
      </View>
    );
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Historial de Pagos</Text>
        <TouchableOpacity 
          onPress={exportHistory}
          style={styles.exportButton}
        >
          <Icon name="download-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Barra de búsqueda y filtros */}
      <View style={styles.searchBar}>
        <View style={styles.searchInputContainer}>
          <Icon name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por descripción o referencia..."
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setFilterModalVisible(true)}
        >
          <Icon name="filter" size={20} color="#007AFF" />
          {(filterType !== 'all' || filterDateRange !== 'all') && (
            <View style={styles.filterIndicator} />
          )}
        </TouchableOpacity>
      </View>

      {/* Estadísticas */}
      {renderStats()}

      {/* Lista de pagos */}
      {filteredPayments.length > 0 ? (
        <FlatList
          data={filteredPayments}
          renderItem={renderPaymentItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#007AFF']}
            />
          }
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Icon name="receipt-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>No hay pagos</Text>
          <Text style={styles.emptyText}>
            {searchText || filterType !== 'all' || filterDateRange !== 'all' 
              ? 'No se encontraron pagos con los filtros seleccionados'
              : 'Aún no tienes pagos registrados'}
          </Text>
        </View>
      )}

      {/* Modales */}
      {renderDetailModal()}
      {renderFilterModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  exportButton: {
    padding: 5,
  },
  
  // Barra de búsqueda
  searchBar: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 10,
    marginRight: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  filterButton: {
    width: 40,
    height: 40,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  filterIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
  },
  
  // Estadísticas
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 15,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  statCard: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  
  // Lista de pagos
  listContent: {
    paddingBottom: 20,
  },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    marginHorizontal: 15,
    marginVertical: 5,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  paymentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentDescription: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  paymentDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  paymentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  methodBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 8,
  },
  methodText: {
    fontSize: 11,
    fontWeight: '600',
  },
  referenceText: {
    fontSize: 11,
    color: '#999',
  },
  paymentAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  
  // Estado vacío
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  
  // Modal de detalles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  detailModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalCloseButton: {
    padding: 5,
  },
  modalContent: {
    padding: 20,
  },
  detailHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  detailIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  detailAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  detailDescription: {
    fontSize: 16,
    color: '#666',
  },
  detailSection: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  detailRow: {
    borderBottomWidth: 0,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusCompleted: {
    backgroundColor: '#34C75920',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#34C759',
  },
  detailActions: {
    marginTop: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  actionButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  
  // Modal de filtros
  filterModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  filterSection: {
    marginBottom: 25,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
    marginRight: 10,
    marginBottom: 10,
  },
  filterOptionActive: {
    backgroundColor: '#007AFF10',
    borderColor: '#007AFF',
  },
  filterOptionText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#666',
  },
  filterOptionTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  filterResetButton: {
    flex: 1,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    marginRight: 10,
    alignItems: 'center',
  },
  filterResetText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  filterApplyButton: {
    flex: 1,
    padding: 15,
    backgroundColor: '#007AFF',
    borderRadius: 10,
    alignItems: 'center',
  },
  filterApplyText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default PaymentHistoryScreen;