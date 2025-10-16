// PaymentMethodsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import PaymentStorage from '../services/PaymentStorage';
import PaymentMethodCard from '../components/PaymentMethodCard';
import AddPaymentMethodModal from '../components/AddPaymentMethodModal';

const PaymentMethodsScreen = ({ navigation }) => {
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMethod, setEditingMethod] = useState(null);

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      setIsLoading(true);
      const methods = await PaymentStorage.getPaymentMethods();
      setPaymentMethods(methods);
    } catch (error) {
      console.error('Error cargando métodos de pago:', error);
      Alert.alert('Error', 'No se pudieron cargar los métodos de pago');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadPaymentMethods();
  };

  const handleDelete = async (id) => {
    try {
      const result = await PaymentStorage.deletePaymentMethod(id);
      if (result.success) {
        Alert.alert('✅ Éxito', 'Método de pago eliminado');
        loadPaymentMethods();
      } else {
        Alert.alert('Error', 'No se pudo eliminar el método de pago');
      }
    } catch (error) {
      console.error('Error eliminando método de pago:', error);
      Alert.alert('Error', 'Ocurrió un error al eliminar');
    }
  };

  const handleSetDefault = async (id) => {
    try {
      const result = await PaymentStorage.setDefaultPaymentMethod(id);
      if (result.success) {
        Alert.alert('✅ Éxito', 'Método de pago predeterminado actualizado');
        loadPaymentMethods();
      } else {
        Alert.alert('Error', 'No se pudo actualizar el método predeterminado');
      }
    } catch (error) {
      console.error('Error actualizando método predeterminado:', error);
      Alert.alert('Error', 'Ocurrió un error');
    }
  };

  const handleEdit = (method) => {
    // Por ahora solo mostramos un mensaje
    Alert.alert('Editar', `Editar ${method.cardholderName || method.name}`);
    // Aquí podrías implementar la edición completa
  };

  const handleAddMethod = (newMethod) => {
    loadPaymentMethods();
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Icon name="card-outline" size={80} color="#ccc" />
      <Text style={styles.emptyTitle}>No hay métodos de pago</Text>
      <Text style={styles.emptySubtitle}>
        Agrega un método de pago para realizar tus viajes
      </Text>
      <TouchableOpacity 
        style={styles.addFirstButton}
        onPress={() => setShowAddModal(true)}
      >
        <Icon name="add-circle" size={24} color="#fff" />
        <Text style={styles.addFirstButtonText}>Agregar método de pago</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando métodos de pago...</Text>
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
        <Text style={styles.headerTitle}>Métodos de pago</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#007AFF']}
          />
        }
      >
        {paymentMethods.length === 0 ? (
          renderEmptyState()
        ) : (
          <>
            <Text style={styles.sectionTitle}>Tus métodos de pago</Text>
            {paymentMethods.map((method) => (
              <PaymentMethodCard
                key={method.id}
                paymentMethod={method}
                onDelete={handleDelete}
                onSetDefault={handleSetDefault}
                onEdit={handleEdit}
              />
            ))}
            
            {/* Información adicional */}
            <View style={styles.infoContainer}>
              <Icon name="information-circle-outline" size={20} color="#666" />
              <Text style={styles.infoText}>
                Puedes tener múltiples métodos de pago. Toca en uno para establecerlo como predeterminado.
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* Botón flotante para agregar */}
      {paymentMethods.length > 0 && (
        <TouchableOpacity 
          style={styles.floatingButton}
          onPress={() => setShowAddModal(true)}
        >
          <Icon name="add" size={30} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Modal para agregar método de pago */}
      <AddPaymentMethodModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddMethod}
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
  headerSpacer: {
    width: 34,
  },
  content: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 20,
    marginHorizontal: 20,
    marginBottom: 10,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  addFirstButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  addFirstButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#e8f4fd',
    margin: 20,
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bee5eb',
  },
  infoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    color: '#0c5460',
    lineHeight: 18,
  },
});

export default PaymentMethodsScreen;
