import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Animated,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const { width: screenWidth } = Dimensions.get('window');

const MultipleDestinationsModal = ({ 
  visible,
  onClose,
  onConfirm,
  currentDestination,
  userLocation,
  vehicleType = 'economy',
  onPriceUpdate
}) => {
  const [destinations, setDestinations] = useState([
    { 
      id: 1, 
      address: currentDestination || '', 
      placeholder: 'Destino principal',
      isMain: true 
    }
  ]);
  const slideAnim = useRef(new Animated.Value(300)).current;

  React.useEffect(() => {
    if (visible) {
      // Inicializar con el destino actual si existe
      if (currentDestination) {
        setDestinations([
          { 
            id: 1, 
            address: currentDestination, 
            placeholder: 'Destino principal',
            isMain: true 
          }
        ]);
      }
      
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, currentDestination]);

  const addDestination = () => {
    if (destinations.length >= 4) {
      Alert.alert('Límite alcanzado', 'Máximo 4 destinos por viaje');
      return;
    }

    const newDestination = {
      id: Date.now(),
      address: '',
      placeholder: `Parada ${destinations.length}`,
      isMain: false
    };
    
    const updatedDestinations = [...destinations, newDestination];
    setDestinations(updatedDestinations);
    
    // Actualizar precio estimado
    updateEstimatedPrice(updatedDestinations);
  };

  const removeDestination = (id) => {
    const dest = destinations.find(d => d.id === id);
    if (dest?.isMain) {
      Alert.alert('Error', 'No puedes eliminar el destino principal');
      return;
    }

    if (destinations.length === 1) {
      Alert.alert('Error', 'Debe tener al menos un destino');
      return;
    }

    const updatedDestinations = destinations.filter(d => d.id !== id);
    setDestinations(updatedDestinations);
    updateEstimatedPrice(updatedDestinations);
  };

  const updateDestination = (id, address) => {
    const updatedDestinations = destinations.map(d => 
      d.id === id ? { ...d, address } : d
    );
    setDestinations(updatedDestinations);
  };

  const updateEstimatedPrice = (dests) => {
    const basePrice = getBasePrice(vehicleType);
    const additionalStops = dests.length - 1;
    const extraCost = additionalStops * 50; // RD$50 por parada adicional
    const totalPrice = basePrice + extraCost;
    
    if (onPriceUpdate) {
      onPriceUpdate(totalPrice, dests.length);
    }
  };

  const getBasePrice = (type) => {
    switch(type) {
      case 'economy': return 334;
      case 'comfort': return 434;
      case 'premium': return 601;
      default: return 334;
    }
  };

  const handleConfirm = () => {
    const validDestinations = destinations.filter(d => d.address.trim() !== '');
    
    if (validDestinations.length === 0) {
      Alert.alert('Error', 'Ingresa al menos un destino');
      return;
    }

    // Preparar datos para enviar
    const destinationsData = {
      main: validDestinations[0],
      additional: validDestinations.slice(1),
      total: validDestinations.length,
      estimatedPrice: getBasePrice(vehicleType) + ((validDestinations.length - 1) * 50)
    };

    if (onConfirm) {
      onConfirm(destinationsData);
    }
    
    onClose();
  };

  const calculateTotalPrice = () => {
    const basePrice = getBasePrice(vehicleType);
    const additionalStops = destinations.length - 1;
    const extraCost = additionalStops * 50;
    return basePrice + extraCost;
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
        >
          <Animated.View 
            style={[
              styles.modalContent,
              {
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.dragIndicator} />
              <Text style={styles.modalTitle}>Agregar múltiples destinos</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={onClose}
              >
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Origen */}
              <View style={styles.routeContainer}>
                <View style={styles.locationItem}>
                  <View style={styles.iconWrapper}>
                    <View style={styles.originDot} />
                  </View>
                  <View style={styles.locationInfo}>
                    <Text style={styles.locationLabel}>ORIGEN</Text>
                    <Text style={styles.locationText}>
                      {userLocation?.address || 'Ubicación actual (GPS)'}
                    </Text>
                  </View>
                </View>

                {/* Línea conectora */}
                <View style={styles.verticalLine} />

                {/* Destinos */}
                {destinations.map((dest, index) => (
                  <View key={dest.id}>
                    <View style={styles.locationItem}>
                      <View style={styles.iconWrapper}>
                        <View style={[
                          styles.destinationDot,
                          index === destinations.length - 1 && styles.finalDot
                        ]}>
                          <Text style={styles.dotNumber}>{index + 1}</Text>
                        </View>
                      </View>
                      
                      <TextInput
                        style={styles.destinationInput}
                        placeholder={dest.placeholder}
                        placeholderTextColor="#999"
                        value={dest.address}
                        onChangeText={(text) => updateDestination(dest.id, text)}
                      />
                      
                      {!dest.isMain && (
                        <TouchableOpacity
                          onPress={() => removeDestination(dest.id)}
                          style={styles.removeBtn}
                        >
                          <Icon name="close-circle" size={24} color="#FF3B30" />
                        </TouchableOpacity>
                      )}
                    </View>
                    
                    {index < destinations.length - 1 && (
                      <View style={styles.verticalLine} />
                    )}
                  </View>
                ))}

                {/* Botón agregar parada */}
                {destinations.length < 4 && (
                  <TouchableOpacity 
                    style={styles.addButton}
                    onPress={addDestination}
                  >
                    <Icon name="add-circle-outline" size={24} color="#007AFF" />
                    <Text style={styles.addButtonText}>Agregar parada</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Información de precio */}
              <View style={styles.priceContainer}>
                <View style={styles.priceHeader}>
                  <Icon name="cash-outline" size={20} color="#333" />
                  <Text style={styles.priceTitle}>Desglose de tarifa</Text>
                </View>
                
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Tarifa base ({vehicleType}):</Text>
                  <Text style={styles.priceValue}>RD$ {getBasePrice(vehicleType)}</Text>
                </View>
                
                {destinations.length > 1 && (
                  <>
                    <View style={styles.priceRow}>
                      <Text style={styles.priceLabel}>
                        Paradas adicionales ({destinations.length - 1}):
                      </Text>
                      <Text style={styles.priceValue}>
                        RD$ {(destinations.length - 1) * 50}
                      </Text>
                    </View>
                    
                    <View style={styles.priceDivider} />
                  </>
                )}
                
                <View style={styles.priceRow}>
                  <Text style={styles.totalLabel}>Total estimado:</Text>
                  <Text style={styles.totalValue}>
                    RD$ {calculateTotalPrice()}
                  </Text>
                </View>
              </View>

              {/* Información adicional */}
              {destinations.length > 1 && (
                <View style={styles.infoBox}>
                  <Icon name="information-circle" size={18} color="#FFA500" />
                  <Text style={styles.infoText}>
                    • Tiempo máximo de espera: 3 minutos por parada{'\n'}
                    • El conductor puede rechazar paradas no confirmadas{'\n'}
                    • Precio final puede variar según tráfico y tiempo
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Botón confirmar */}
            <View style={styles.footer}>
              <TouchableOpacity 
                style={styles.confirmButton}
                onPress={handleConfirm}
              >
                <Text style={styles.confirmButtonText}>
                  Confirmar {destinations.length} {destinations.length === 1 ? 'destino' : 'destinos'} • RD$ {calculateTotalPrice()}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  keyboardAvoid: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    maxHeight: '85%',
  },
  modalHeader: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#DDD',
    borderRadius: 2,
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    top: 20,
  },
  scrollContent: {
    flex: 1,
  },
  routeContainer: {
    padding: 20,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  iconWrapper: {
    width: 40,
    alignItems: 'center',
    marginRight: 12,
  },
  originDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    borderWidth: 3,
    borderColor: '#FFF',
    elevation: 2,
  },
  destinationDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    elevation: 2,
  },
  finalDot: {
    backgroundColor: '#FF3B30',
  },
  dotNumber: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  verticalLine: {
    position: 'absolute',
    left: 39,
    top: 44,
    width: 2,
    height: 44,
    backgroundColor: '#E0E0E0',
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: '600',
    marginBottom: 2,
  },
  locationText: {
    fontSize: 16,
    color: '#333',
  },
  destinationInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingVertical: 8,
  },
  removeBtn: {
    padding: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    backgroundColor: '#F0F8FF',
  },
  addButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  priceContainer: {
    margin: 20,
    padding: 15,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
  },
  priceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  priceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
  },
  priceValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  priceDivider: {
    height: 1,
    backgroundColor: '#DDD',
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 18,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  infoBox: {
    flexDirection: 'row',
    margin: 20,
    marginTop: 0,
    padding: 12,
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FFA500',
  },
  infoText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  footer: {
    padding: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: 'bold',
  },
});

export default MultipleDestinationsModal;