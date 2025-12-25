import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FavoriteAddressesScreen = ({ navigation, route }) => {
  const thirdPartyField = route?.params?.thirdPartyField;
  console.log('🔍 FavoriteAddresses recibió thirdPartyField:', thirdPartyField, 'params:', route?.params);
  const [addresses, setAddresses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  
  // Formulario para nueva dirección
  const [newAddress, setNewAddress] = useState({
    name: '',
    address: '',
    icon: 'home',
    type: 'home' // home, work, other
  });

  // Iconos predefinidos
  const addressIcons = [
    { type: 'home', icon: 'home', label: 'Casa', color: '#007AFF' },
    { type: 'work', icon: 'briefcase', label: 'Trabajo', color: '#34C759' },
    { type: 'heart', icon: 'heart', label: 'Favorito', color: '#FF3B30' },
    { type: 'school', icon: 'school', label: 'Estudio', color: '#FF9500' },
    { type: 'cart', icon: 'cart', label: 'Compras', color: '#AF52DE' },
    { type: 'restaurant', icon: 'restaurant', label: 'Restaurante', color: '#FF2D55' },
    { type: 'fitness', icon: 'fitness', label: 'Gimnasio', color: '#00C7BE' },
    { type: 'medical', icon: 'medical', label: 'Hospital', color: '#FF453A' }
  ];

  useEffect(() => {
    loadAddresses();
  }, []);

  // Cargar direcciones guardadas
  const loadAddresses = async () => {
    try {
      setIsLoading(true);
      const savedAddresses = await AsyncStorage.getItem('favoriteAddresses');
      if (savedAddresses) {
        setAddresses(JSON.parse(savedAddresses));
      } else {
        // Direcciones de ejemplo para República Dominicana
        const defaultAddresses = [
          {
            id: '1',
            name: 'Casa',
            address: 'Megacentro, Santo Domingo Este',
            icon: 'home',
            type: 'home',
            coordinates: { lat: 18.5001, lng: -69.8508 }
          },
          {
            id: '2',
            name: 'Trabajo',
            address: 'Av. Winston Churchill, Piantini',
            icon: 'briefcase',
            type: 'work',
            coordinates: { lat: 18.4677, lng: -69.9399 }
          }
        ];
        setAddresses(defaultAddresses);
        await AsyncStorage.setItem('favoriteAddresses', JSON.stringify(defaultAddresses));
      }
    } catch (error) {
      console.error('Error cargando direcciones:', error);
      Alert.alert('Error', 'No se pudieron cargar las direcciones');
    } finally {
      setIsLoading(false);
    }
  };

  // Guardar nueva dirección
  const saveNewAddress = async () => {
    if (!newAddress.name.trim() || !newAddress.address.trim()) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    try {
      const addressToSave = {
        id: Date.now().toString(),
        name: newAddress.name.trim(),
        address: newAddress.address.trim(),
        icon: newAddress.icon,
        type: newAddress.type,
        coordinates: null // Se podría integrar con Google Maps API
      };

      const updatedAddresses = [...addresses, addressToSave];
      setAddresses(updatedAddresses);
      await AsyncStorage.setItem('favoriteAddresses', JSON.stringify(updatedAddresses));
      
      // Limpiar formulario
      setNewAddress({
        name: '',
        address: '',
        icon: 'home',
        type: 'home'
      });
      
      setShowAddModal(false);
      Alert.alert('Éxito', 'Dirección agregada correctamente');
    } catch (error) {
      console.error('Error guardando dirección:', error);
      Alert.alert('Error', 'No se pudo guardar la dirección');
    }
  };

  // Actualizar dirección existente
  const updateAddress = async () => {
    if (!editingAddress.name.trim() || !editingAddress.address.trim()) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    try {
      const updatedAddresses = addresses.map(addr => 
        addr.id === editingAddress.id ? editingAddress : addr
      );
      
      setAddresses(updatedAddresses);
      await AsyncStorage.setItem('favoriteAddresses', JSON.stringify(updatedAddresses));
      
      setShowEditModal(false);
      setEditingAddress(null);
      Alert.alert('Éxito', 'Dirección actualizada correctamente');
    } catch (error) {
      console.error('Error actualizando dirección:', error);
      Alert.alert('Error', 'No se pudo actualizar la dirección');
    }
  };

  // Eliminar dirección
  const deleteAddress = async (addressId) => {
    Alert.alert(
      'Eliminar dirección',
      '¿Estás seguro de que deseas eliminar esta dirección?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedAddresses = addresses.filter(addr => addr.id !== addressId);
              setAddresses(updatedAddresses);
              await AsyncStorage.setItem('favoriteAddresses', JSON.stringify(updatedAddresses));
              Alert.alert('Éxito', 'Dirección eliminada');
            } catch (error) {
              console.error('Error eliminando dirección:', error);
              Alert.alert('Error', 'No se pudo eliminar la dirección');
            }
          }
        }
      ]
    );
  };

  // Seleccionar dirección para usar
  const selectAddress = (address) => {
    const fieldLabel = thirdPartyField === 'origen' ? 'punto de origen' : 'destino';
    Alert.alert(
      'Usar esta dirección',
      `¿Deseas usar "${address.name}" como ${fieldLabel}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Usar',
          onPress: async () => {
            // Guardar dirección en AsyncStorage y volver
            await AsyncStorage.setItem('pendingFavoriteAddress', JSON.stringify({
              name: address.name,
              address: address.address,
              coordinates: address.coordinates,
              type: 'favorite'
            }));
            navigation.goBack();
          }
        }
      ]
    );
  };

  // Renderizar cada dirección
  const renderAddress = ({ item }) => {
    const iconConfig = addressIcons.find(ic => ic.type === item.type) || addressIcons[0];
    
    return (
      <TouchableOpacity 
        style={styles.addressCard}
        onPress={() => selectAddress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: iconConfig.color + '20' }]}>
          <Icon name={item.icon} size={24} color={iconConfig.color} />
        </View>
        
        <View style={styles.addressInfo}>
          <Text style={styles.addressName}>{item.name}</Text>
          <Text style={styles.addressText}>{item.address}</Text>
        </View>
        
        <View style={styles.addressActions}>
          <TouchableOpacity 
            onPress={() => {
              setEditingAddress({...item});
              setShowEditModal(true);
            }}
            style={styles.actionButton}
          >
            <Icon name="create-outline" size={22} color="#007AFF" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => deleteAddress(item.id)}
            style={styles.actionButton}
          >
            <Icon name="trash-outline" size={22} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // Modal para agregar dirección
  const renderAddModal = () => (
    <Modal
      visible={showAddModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowAddModal(false)}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalContainer}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nueva Dirección</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.inputLabel}>Nombre (ej: Casa, Trabajo)</Text>
            <TextInput
              style={styles.input}
              placeholder="Nombre de la dirección"
              value={newAddress.name}
              onChangeText={(text) => setNewAddress({...newAddress, name: text})}
            />

            <Text style={styles.inputLabel}>Dirección completa</Text>
            <TextInput
              style={[styles.input, styles.addressInput]}
              placeholder="Calle, número, sector, ciudad"
              value={newAddress.address}
              onChangeText={(text) => setNewAddress({...newAddress, address: text})}
              multiline={true}
              numberOfLines={2}
            />

            <Text style={styles.inputLabel}>Tipo de lugar</Text>
            <View style={styles.iconGrid}>
              {addressIcons.map((iconItem) => (
                <TouchableOpacity
                  key={iconItem.type}
                  style={[
                    styles.iconOption,
                    newAddress.type === iconItem.type && styles.iconOptionSelected,
                    { borderColor: iconItem.color }
                  ]}
                  onPress={() => setNewAddress({
                    ...newAddress, 
                    type: iconItem.type,
                    icon: iconItem.icon
                  })}
                >
                  <Icon 
                    name={iconItem.icon} 
                    size={24} 
                    color={newAddress.type === iconItem.type ? iconItem.color : '#999'} 
                  />
                  <Text style={[
                    styles.iconLabel,
                    newAddress.type === iconItem.type && { color: iconItem.color }
                  ]}>
                    {iconItem.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity 
              style={styles.saveButton}
              onPress={saveNewAddress}
            >
              <Text style={styles.saveButtonText}>Guardar Dirección</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  // Modal para editar dirección
  const renderEditModal = () => (
    <Modal
      visible={showEditModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowEditModal(false)}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalContainer}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Editar Dirección</Text>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {editingAddress && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Nombre</Text>
              <TextInput
                style={styles.input}
                placeholder="Nombre de la dirección"
                value={editingAddress.name}
                onChangeText={(text) => setEditingAddress({...editingAddress, name: text})}
              />

              <Text style={styles.inputLabel}>Dirección completa</Text>
              <TextInput
                style={[styles.input, styles.addressInput]}
                placeholder="Calle, número, sector, ciudad"
                value={editingAddress.address}
                onChangeText={(text) => setEditingAddress({...editingAddress, address: text})}
                multiline={true}
                numberOfLines={2}
              />

              <Text style={styles.inputLabel}>Tipo de lugar</Text>
              <View style={styles.iconGrid}>
                {addressIcons.map((iconItem) => (
                  <TouchableOpacity
                    key={iconItem.type}
                    style={[
                      styles.iconOption,
                      editingAddress.type === iconItem.type && styles.iconOptionSelected,
                      { borderColor: iconItem.color }
                    ]}
                    onPress={() => setEditingAddress({
                      ...editingAddress, 
                      type: iconItem.type,
                      icon: iconItem.icon
                    })}
                  >
                    <Icon 
                      name={iconItem.icon} 
                      size={24} 
                      color={editingAddress.type === iconItem.type ? iconItem.color : '#999'} 
                    />
                    <Text style={[
                      styles.iconLabel,
                      editingAddress.type === iconItem.type && { color: iconItem.color }
                    ]}>
                      {iconItem.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity 
                style={styles.saveButton}
                onPress={updateAddress}
              >
                <Text style={styles.saveButtonText}>Actualizar Dirección</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando direcciones...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Direcciones Favoritas</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={addresses}
        renderItem={renderAddress}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="location-outline" size={60} color="#ccc" />
            <Text style={styles.emptyText}>No tienes direcciones guardadas</Text>
            <Text style={styles.emptySubtext}>Agrega tus lugares favoritos para acceder más rápido</Text>
          </View>
        }
      />

      <TouchableOpacity 
        style={styles.fab}
        onPress={() => setShowAddModal(true)}
      >
        <Icon name="add" size={30} color="#fff" />
      </TouchableOpacity>

      {renderAddModal()}
      {renderEditModal()}
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
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  addressCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  addressInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  addressName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    color: '#666',
  },
  addressActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
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
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    marginTop: 16,
    marginHorizontal: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginHorizontal: 20,
    backgroundColor: '#f9f9f9',
  },
  addressInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginTop: 8,
  },
  iconOption: {
    width: '23%',
    aspectRatio: 1,
    borderWidth: 2,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    margin: '1%',
    borderColor: '#ddd',
  },
  iconOptionSelected: {
    backgroundColor: '#f0f8ff',
  },
  iconLabel: {
    fontSize: 10,
    marginTop: 4,
    color: '#999',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    padding: 16,
    margin: 20,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default FavoriteAddressesScreen;