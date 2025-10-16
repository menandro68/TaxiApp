import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Switch,
  Alert,
  ActivityIndicator
} from 'react-native';
import FareCalculator from '../services/FareCalculator';

const FareEstimator = ({ 
  tripDetails = null, 
  onConfirm = null,
  visible = false,
  onClose = null,
  isEstimateMode = true 
}) => {
  // Estados principales
  const [selectedVehicle, setSelectedVehicle] = useState('standard');
  const [distance, setDistance] = useState(5);
  const [duration, setDuration] = useState(15);
  const [pickupZone, setPickupZone] = useState('Santo Domingo Este');
  const [dropoffZone, setDropoffZone] = useState('Distrito Nacional');
  const [discountCode, setDiscountCode] = useState('');
  const [selectedTip, setSelectedTip] = useState(15);
  const [fareResult, setFareResult] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  
  // Estados de opciones adicionales
  const [hasLuggage, setHasLuggage] = useState(false);
  const [hasPet, setHasPet] = useState(false);
  const [isAirportPickup, setIsAirportPickup] = useState(false);
  const [numberOfStops, setNumberOfStops] = useState(0);

  // Tipos de vehículos disponibles
  const vehicleTypes = [
    { id: 'standard', name: 'Estándar', icon: '🚗', time: '5 min' },
    { id: 'comfort', name: 'Confort', icon: '🚙', time: '7 min' },
    { id: 'premium', name: 'Premium', icon: '🚘', time: '10 min' },
    { id: 'xl', name: 'XL', icon: '🚐', time: '12 min' }
  ];

  // Zonas disponibles
  const zones = [
    'Distrito Nacional',
    'Santo Domingo Este',
    'Santo Domingo Norte',
    'Santo Domingo Oeste',
    'Boca Chica',
    'Aeropuerto Las Américas',
    'Zona Colonial',
    'Piantini',
    'Naco'
  ];

  // Efecto para actualizar cuando llegan detalles del viaje
  useEffect(() => {
    if (tripDetails) {
      setDistance(tripDetails.distance || 5);
      setDuration(tripDetails.duration || 15);
      setPickupZone(tripDetails.pickupZone || 'Santo Domingo Este');
      setDropoffZone(tripDetails.dropoffZone || 'Distrito Nacional');
      calculateFare();
    }
  }, [tripDetails]);

  // Función para calcular tarifa
  const calculateFare = () => {
    setIsCalculating(true);
    
    setTimeout(() => {
      const stops = Array(numberOfStops).fill('Parada');
      
      const result = FareCalculator.calculateFare({
        vehicleType: selectedVehicle,
        distance: parseFloat(distance),
        duration: parseFloat(duration),
        pickupZone,
        dropoffZone,
        stops,
        hasLuggage,
        hasPet,
        isAirportPickup,
        discountCode,
        loyaltyLevel: null,
        tipPercentage: selectedTip
      });
      
      setFareResult(result);
      setIsCalculating(false);
    }, 500);
  };

  // Función para aplicar código de descuento
  const applyDiscount = () => {
    if (!discountCode.trim()) {
      Alert.alert('Error', 'Por favor ingresa un código de descuento');
      return;
    }
    calculateFare();
  };

  // Función para confirmar la tarifa
  const handleConfirm = () => {
    if (onConfirm && fareResult) {
      onConfirm(fareResult);
      if (onClose) onClose();
    }
  };

  // Función para obtener sugerencias de propina
  const getTipOptions = () => {
    if (fareResult) {
      return FareCalculator.getTipSuggestions(fareResult.breakdown.finalTotal);
    }
    return [
      { percentage: 10, label: '10%', amount: 0 },
      { percentage: 15, label: '15%', amount: 0 },
      { percentage: 20, label: '20%', amount: 0 },
      { percentage: 0, label: 'Sin propina', amount: 0 }
    ];
  };

  // Renderizar selector de vehículo
  const renderVehicleSelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Tipo de Vehículo</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {vehicleTypes.map((vehicle) => (
          <TouchableOpacity
            key={vehicle.id}
            style={[
              styles.vehicleCard,
              selectedVehicle === vehicle.id && styles.vehicleCardSelected
            ]}
            onPress={() => {
              setSelectedVehicle(vehicle.id);
              if (fareResult) calculateFare();
            }}
          >
            <Text style={styles.vehicleIcon}>{vehicle.icon}</Text>
            <Text style={styles.vehicleName}>{vehicle.name}</Text>
            <Text style={styles.vehicleTime}>{vehicle.time}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  // Renderizar opciones adicionales
  const renderAdditionalOptions = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Opciones Adicionales</Text>
      
      <View style={styles.optionRow}>
        <Text style={styles.optionLabel}>🧳 Equipaje</Text>
        <Switch
          value={hasLuggage}
          onValueChange={setHasLuggage}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={hasLuggage ? '#2196F3' : '#f4f3f4'}
        />
      </View>

      <View style={styles.optionRow}>
        <Text style={styles.optionLabel}>🐕 Mascota</Text>
        <Switch
          value={hasPet}
          onValueChange={setHasPet}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={hasPet ? '#2196F3' : '#f4f3f4'}
        />
      </View>

      <View style={styles.optionRow}>
        <Text style={styles.optionLabel}>✈️ Recogida en Aeropuerto</Text>
        <Switch
          value={isAirportPickup}
          onValueChange={setIsAirportPickup}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={isAirportPickup ? '#2196F3' : '#f4f3f4'}
        />
      </View>

      <View style={styles.optionRow}>
        <Text style={styles.optionLabel}>📍 Paradas adicionales</Text>
        <View style={styles.stopsCounter}>
          <TouchableOpacity 
            style={styles.counterButton}
            onPress={() => setNumberOfStops(Math.max(0, numberOfStops - 1))}
          >
            <Text style={styles.counterText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.stopsCount}>{numberOfStops}</Text>
          <TouchableOpacity 
            style={styles.counterButton}
            onPress={() => setNumberOfStops(Math.min(5, numberOfStops + 1))}
          >
            <Text style={styles.counterText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // Renderizar código de descuento
  const renderDiscountSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Código de Descuento</Text>
      <View style={styles.discountContainer}>
        <TextInput
          style={styles.discountInput}
          placeholder="Ingresa tu código"
          value={discountCode}
          onChangeText={setDiscountCode}
          autoCapitalize="characters"
        />
        <TouchableOpacity 
          style={styles.applyButton}
          onPress={applyDiscount}
        >
          <Text style={styles.applyButtonText}>Aplicar</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.discountHint}>
        Prueba: PRIMERA, ESTUDIANTE, SENIOR
      </Text>
    </View>
  );

  // Renderizar desglose de tarifa
  const renderFareBreakdown = () => {
    if (!fareResult) return null;

    const { breakdown, summary } = fareResult;

    return (
      <View style={styles.section}>
        <TouchableOpacity 
          style={styles.detailsHeader}
          onPress={() => setShowDetails(!showDetails)}
        >
          <Text style={styles.sectionTitle}>Desglose de Tarifa</Text>
          <Text style={styles.toggleIcon}>{showDetails ? '▼' : '▶'}</Text>
        </TouchableOpacity>

        {showDetails && (
          <View style={styles.breakdownContainer}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Tarifa Base:</Text>
              <Text style={styles.breakdownValue}>RD$ {breakdown.baseFare}</Text>
            </View>
            
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Distancia ({summary.distance}):</Text>
              <Text style={styles.breakdownValue}>RD$ {breakdown.distanceFare}</Text>
            </View>
            
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Tiempo ({summary.duration}):</Text>
              <Text style={styles.breakdownValue}>RD$ {breakdown.timeFare}</Text>
            </View>

            {breakdown.timeMultiplier.multiplier > 1 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>{breakdown.timeMultiplier.name}:</Text>
                <Text style={styles.breakdownValue}>x{breakdown.timeMultiplier.multiplier}</Text>
              </View>
            )}

            {breakdown.additionalCharges > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Cargos Adicionales:</Text>
                <Text style={styles.breakdownValue}>RD$ {breakdown.additionalCharges}</Text>
              </View>
            )}

            {breakdown.discountAmount > 0 && (
              <View style={[styles.breakdownRow, styles.discountRow]}>
                <Text style={styles.discountLabel}>{breakdown.discountApplied}:</Text>
                <Text style={styles.discountValue}>-RD$ {breakdown.discountAmount}</Text>
              </View>
            )}

            <View style={styles.separator} />

            <View style={styles.breakdownRow}>
              <Text style={styles.subtotalLabel}>Subtotal:</Text>
              <Text style={styles.subtotalValue}>RD$ {breakdown.finalTotal}</Text>
            </View>

            {breakdown.tipAmount > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Propina ({selectedTip}%):</Text>
                <Text style={styles.breakdownValue}>RD$ {breakdown.tipAmount}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  // Renderizar selector de propina
  const renderTipSelector = () => {
    if (!fareResult) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Propina para el Conductor</Text>
        <View style={styles.tipContainer}>
          {getTipOptions().map((tip) => (
            <TouchableOpacity
              key={tip.percentage}
              style={[
                styles.tipButton,
                selectedTip === tip.percentage && styles.tipButtonSelected
              ]}
              onPress={() => {
                setSelectedTip(tip.percentage);
                calculateFare();
              }}
            >
              <Text style={[
                styles.tipButtonText,
                selectedTip === tip.percentage && styles.tipButtonTextSelected
              ]}>
                {tip.label}
              </Text>
              <Text style={[
                styles.tipAmount,
                selectedTip === tip.percentage && styles.tipAmountSelected
              ]}>
                RD$ {tip.amount}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  // Renderizar total final
  const renderFinalTotal = () => {
    if (!fareResult) return null;

    return (
      <View style={styles.totalContainer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total a Pagar:</Text>
          <Text style={styles.totalAmount}>
            {fareResult.summary.totalWithTip}
          </Text>
        </View>
        {fareResult.summary.savings && (
          <Text style={styles.savingsText}>
            ¡Ahorraste {fareResult.summary.savings}!
          </Text>
        )}
      </View>
    );
  };

  // Renderizar contenido principal
  const renderContent = () => (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      {renderVehicleSelector()}
      
      {isEstimateMode && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalles del Viaje</Text>
          <View style={styles.inputRow}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Distancia (km)</Text>
              <TextInput
                style={styles.input}
                value={distance.toString()}
                onChangeText={(text) => setDistance(text)}
                keyboardType="numeric"
                placeholder="5"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Duración (min)</Text>
              <TextInput
                style={styles.input}
                value={duration.toString()}
                onChangeText={(text) => setDuration(text)}
                keyboardType="numeric"
                placeholder="15"
              />
            </View>
          </View>
        </View>
      )}

      {renderAdditionalOptions()}
      {renderDiscountSection()}
      
      <TouchableOpacity 
        style={styles.calculateButton}
        onPress={calculateFare}
        disabled={isCalculating}
      >
        {isCalculating ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.calculateButtonText}>
            {fareResult ? 'Recalcular Tarifa' : 'Calcular Tarifa'}
          </Text>
        )}
      </TouchableOpacity>

      {fareResult && (
        <>
          {renderFareBreakdown()}
          {renderTipSelector()}
          {renderFinalTotal()}
          
          {onConfirm && (
            <TouchableOpacity 
              style={styles.confirmButton}
              onPress={handleConfirm}
            >
              <Text style={styles.confirmButtonText}>
                Confirmar y Solicitar Viaje
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </ScrollView>
  );

  // Si es un modal
  if (visible !== undefined) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Calculadora de Tarifas</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            {renderContent()}
          </View>
        </View>
      </Modal>
    );
  }

  // Si es un componente standalone
  return (
    <View style={styles.container}>
      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
  },
  section: {
    padding: 20,
    backgroundColor: '#fff',
    marginVertical: 5,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  vehicleCard: {
    alignItems: 'center',
    padding: 15,
    marginRight: 10,
    borderRadius: 10,
    backgroundColor: '#f8f8f8',
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 80,
  },
  vehicleCardSelected: {
    borderColor: '#2196F3',
    backgroundColor: '#e3f2fd',
  },
  vehicleIcon: {
    fontSize: 30,
    marginBottom: 5,
  },
  vehicleName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  vehicleTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inputGroup: {
    flex: 1,
    marginHorizontal: 5,
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#f8f8f8',
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  optionLabel: {
    fontSize: 16,
    color: '#333',
  },
  stopsCounter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  counterButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  stopsCount: {
    marginHorizontal: 15,
    fontSize: 16,
    fontWeight: '500',
  },
  discountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  discountInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#f8f8f8',
    marginRight: 10,
  },
  applyButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  applyButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  discountHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    fontStyle: 'italic',
  },
  calculateButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 10,
  },
  calculateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleIcon: {
    fontSize: 12,
    color: '#666',
  },
  breakdownContainer: {
    marginTop: 15,
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#666',
  },
  breakdownValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  discountRow: {
    backgroundColor: '#e8f5e9',
    padding: 5,
    borderRadius: 4,
    marginVertical: 5,
  },
  discountLabel: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  discountValue: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 10,
  },
  subtotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  subtotalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  tipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  tipButton: {
    width: '23%',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: '#f8f8f8',
  },
  tipButtonSelected: {
    borderColor: '#2196F3',
    backgroundColor: '#e3f2fd',
  },
  tipButtonText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  tipButtonTextSelected: {
    color: '#2196F3',
    fontWeight: '600',
  },
  tipAmount: {
    fontSize: 12,
    color: '#999',
  },
  tipAmountSelected: {
    color: '#2196F3',
  },
  totalContainer: {
    backgroundColor: '#333',
    padding: 20,
    marginTop: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 18,
    color: '#fff',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  savingsText: {
    color: '#4CAF50',
    fontSize: 14,
    marginTop: 5,
    textAlign: 'center',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 10,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default FareEstimator;