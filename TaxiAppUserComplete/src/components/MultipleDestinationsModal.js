import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  ScrollView,
  Alert,
  Platform,
  Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const MultipleDestinationsModal = forwardRef(({ 
  visible,
  onClose,
  onConfirm,
  currentDestination,
  userLocation,
  vehicleType = 'economy',
  onPriceUpdate,
  onSelectLocation
}, ref) => {
  const [additionalStops, setAdditionalStops] = useState([]);
  const [activeStopId, setActiveStopId] = useState(null);
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Exponer función para actualizar stop desde App.tsx
  useImperativeHandle(ref, () => ({
    updateStopAddress: (stopId, address) => {
      console.log('📍 Actualizando stop:', stopId, 'con:', address);
      setAdditionalStops(prev => 
        prev.map(s => s.id === stopId ? { ...s, address } : s)
      );
    },
    getActiveStopId: () => activeStopId,
    getAdditionalStops: () => additionalStops
  }));

  useEffect(() => {
    if (visible) {
      setAdditionalStops([]);
      setActiveStopId(null);
      
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 65,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [visible]);

  const addStop = () => {
    if (additionalStops.length >= 3) {
      Alert.alert('Límite alcanzado', 'Puedes agregar máximo 3 destinos adicionales');
      return;
    }

    const newStop = {
      id: Date.now(),
      address: '',
      placeholder: `Destino ${additionalStops.length + 2}`
    };
    
    const updatedStops = [...additionalStops, newStop];
    setAdditionalStops(updatedStops);
    
    // Abrir selector de ubicación automáticamente para el nuevo destino
    if (onSelectLocation) {
      setActiveStopId(newStop.id);
      onSelectLocation(newStop.id);
    }
  };

  const removeStop = (id) => {
    setAdditionalStops(additionalStops.filter(s => s.id !== id));
  };

  const handleSelectLocation = (stopId) => {
    setActiveStopId(stopId);
    if (onSelectLocation) {
      onSelectLocation(stopId);
    }
  };

  const getBasePrice = (type) => {
    switch(type) {
      case 'economy': return 334;
      case 'comfort': return 434;
      case 'premium': return 601;
      case 'xl': return 534;
      case 'moto': return 200;
      default: return 334;
    }
  };

  const getVehicleLabel = (type) => {
    switch(type) {
      case 'economy': return 'Económico';
      case 'comfort': return 'Confort';
      case 'premium': return 'Premium';
      case 'xl': return 'XL';
      case 'moto': return 'Moto';
      default: return 'Económico';
    }
  };

  const calculateTotalPrice = () => {
    const basePrice = getBasePrice(vehicleType);
    const extraCost = additionalStops.length * 50;
    return basePrice + extraCost;
  };

  const handleConfirm = () => {
    if (!currentDestination || currentDestination.trim() === '') {
      Alert.alert('Error', 'No hay destino seleccionado');
      return;
    }

    const validAdditionalStops = additionalStops
      .filter(s => s.address && s.address.trim() !== '')
      .map(s => s.address);

    const destinationsData = {
      main: currentDestination,
      additional: validAdditionalStops,
      total: 1 + validAdditionalStops.length,
      estimatedPrice: calculateTotalPrice()
    };

    console.log('Destinos confirmados:', destinationsData);

    if (onConfirm) {
      onConfirm(destinationsData);
    }
    
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        {/* Overlay oscuro */}
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
          <TouchableOpacity 
            style={StyleSheet.absoluteFill} 
            activeOpacity={1} 
            onPress={onClose}
          />
        </Animated.View>

        {/* Modal Content - CENTRADO */}
        <Animated.View 
          style={[
            styles.modalContainer,
            { 
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }] 
            }
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Planifica tu ruta</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* 1. PUNTO DE RECOGIDA */}
            <View style={styles.routeItem}>
              <View style={styles.routeIconContainer}>
                <View style={styles.originIcon}>
                  <View style={styles.originDot} />
                </View>
                <View style={styles.routeLine} />
              </View>
              <View style={styles.routeContent}>
                <Text style={styles.routeLabel}>PUNTO DE RECOGIDA</Text>
                <View style={styles.routeBox}>
                  <Icon name="location" size={20} color="#4CAF50" />
                  <Text style={styles.routeText} numberOfLines={2}>
                    {userLocation?.address || 'Obteniendo ubicación...'}
                  </Text>
                </View>
              </View>
            </View>

            {/* 2. DESTINO PRINCIPAL */}
            <View style={styles.routeItem}>
              <View style={styles.routeIconContainer}>
                <View style={[styles.destIcon, additionalStops.length === 0 && styles.finalIcon]}>
                  <Icon name="flag" size={14} color="#fff" />
                </View>
                {additionalStops.length > 0 && <View style={styles.routeLine} />}
              </View>
              <View style={styles.routeContent}>
                <Text style={styles.routeLabel}>DESTINO</Text>
                <View style={[styles.routeBox, styles.destBox]}>
                  <Icon name="flag" size={20} color="#FF3B30" />
                  <Text style={styles.routeText} numberOfLines={2}>
                    {currentDestination || 'Sin destino seleccionado'}
                  </Text>
                </View>
              </View>
            </View>

            {/* 3. DESTINOS ADICIONALES */}
            {additionalStops.map((stop, index) => (
              <View key={stop.id} style={styles.routeItem}>
                <View style={styles.routeIconContainer}>
                  <View style={[styles.stopIcon, index === additionalStops.length - 1 && styles.finalIcon]}>
                    <Text style={styles.stopNumber}>{index + 2}</Text>
                  </View>
                  {index < additionalStops.length - 1 && <View style={styles.routeLine} />}
                </View>
                <View style={styles.routeContent}>
                  <Text style={styles.routeLabel}>DESTINO {index + 2}</Text>
                  {/* TouchableOpacity para abrir selector */}
                  <TouchableOpacity 
                    style={[styles.inputBox, stop.address && styles.inputBoxFilled]}
                    onPress={() => handleSelectLocation(stop.id)}
                    activeOpacity={0.7}
                  >
                    <Icon name="navigate" size={18} color={stop.address ? "#4CAF50" : "#007AFF"} />
                    <Text 
                      style={[
                        styles.inputText, 
                        !stop.address && styles.inputPlaceholder
                      ]}
                      numberOfLines={1}
                    >
                      {stop.address || 'Ingresa la dirección'}
                    </Text>
                    <TouchableOpacity 
                      onPress={() => removeStop(stop.id)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Icon name="close-circle" size={24} color="#FF3B30" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {/* BOTÓN AGREGAR DESTINO */}
            {additionalStops.length < 3 && (
              <TouchableOpacity style={styles.addBtn} onPress={addStop}>
                <View style={styles.addBtnIcon}>
                  <Icon name="add" size={22} color="#fff" />
                </View>
                <Text style={styles.addBtnText}>Agregar Destino</Text>
              </TouchableOpacity>
            )}

            {/* RESUMEN */}
            <View style={styles.summary}>
              <View style={styles.summaryHeader}>
                <Icon name="receipt-outline" size={20} color="#333" />
                <Text style={styles.summaryTitle}>Resumen del viaje</Text>
              </View>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tarifa base ({getVehicleLabel(vehicleType)})</Text>
                <Text style={styles.summaryValue}>RD$ {getBasePrice(vehicleType)}</Text>
              </View>

              {additionalStops.length > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>
                    {additionalStops.length} destino{additionalStops.length > 1 ? 's' : ''} extra (×RD$50)
                  </Text>
                  <Text style={styles.summaryValue}>RD$ {additionalStops.length * 50}</Text>
                </View>
              )}

              <View style={styles.summaryDivider} />

              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>Total estimado</Text>
                <Text style={styles.totalValue}>RD$ {calculateTotalPrice()}</Text>
              </View>
            </View>

            {/* Info */}
            {additionalStops.length > 0 && (
              <View style={styles.infoBox}>
                <Icon name="information-circle" size={20} color="#FF9500" />
                <Text style={styles.infoText}>
                  Espera máxima: 3 min por destino. El precio puede variar según el tráfico.
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity 
              style={[styles.confirmBtn, !currentDestination && styles.confirmBtnDisabled]}
              onPress={handleConfirm}
              disabled={!currentDestination}
            >
              <Icon name="checkmark-circle" size={22} color="#fff" />
              <Text style={styles.confirmBtnText}>Confirmar ruta</Text>
              <View style={styles.confirmBtnBadge}>
                <Text style={styles.confirmBtnBadgeText}>RD$ {calculateTotalPrice()}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxHeight: screenHeight * 0.80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 25,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  closeBtn: {
    position: 'absolute',
    right: 16,
    padding: 4,
  },
  scrollView: {
    maxHeight: screenHeight * 0.50,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 10,
  },
  
  // Route Item
  routeItem: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  routeIconContainer: {
    width: 36,
    alignItems: 'center',
  },
  originIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  originDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
  },
  destIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  finalIcon: {
    backgroundColor: '#FF3B30',
  },
  stopNumber: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  routeLine: {
    width: 3,
    flex: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 4,
    minHeight: 16,
    borderRadius: 2,
  },
  routeContent: {
    flex: 1,
    marginLeft: 10,
    marginBottom: 6,
  },
  routeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888',
    marginBottom: 5,
    letterSpacing: 0.5,
  },
  routeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E8ECF0',
  },
  destBox: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FFE0E0',
  },
  routeText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 10,
    fontWeight: '500',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  inputBoxFilled: {
    borderColor: '#4CAF50',
    backgroundColor: '#F0FFF0',
  },
  inputText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 10,
  },
  inputPlaceholder: {
    color: '#999',
  },
  
  // Add Button
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
  },
  addBtnIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 10,
  },
  
  // Summary
  summary: {
    padding: 14,
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    marginBottom: 10,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginLeft: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 3,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#666',
  },
  summaryValue: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#4CAF50',
  },
  
  // Info
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#FFF8E1',
    borderRadius: 10,
    marginBottom: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
    marginLeft: 10,
  },
  
  // Footer
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#fff',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 12,
  },
  confirmBtnDisabled: {
    backgroundColor: '#CCC',
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 8,
  },
  confirmBtnBadge: {
    marginLeft: 10,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  confirmBtnBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});

export default MultipleDestinationsModal;