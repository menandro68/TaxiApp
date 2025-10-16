import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const { width: screenWidth } = Dimensions.get('window');

const VehicleSelector = ({ 
  visible, 
  onClose, 
  onSelectVehicle,
  currentVehicle = 'economy',
  estimatedDistance = 5,
  userLocation 
}) => {
  const [selectedType, setSelectedType] = useState(currentVehicle);
  const [estimatedPrices, setEstimatedPrices] = useState({});

  // Definición completa de vehículos con características
  const vehicleTypes = [
    {
      id: 'economy',
      name: 'Económico',
      icon: '🚗',
      //image: require('../assets/economy-car.png'), // Opcional
      description: 'La opción más económica para viajes diarios',
      capacity: '4 pasajeros',
      luggage: '2 maletas pequeñas',
      basePrice: 150,
      pricePerKm: 12,
      pricePerMin: 5,
      eta: '2-5 min',
      features: [
        { icon: 'snow-outline', text: 'Aire acondicionado' },
        { icon: 'musical-notes-outline', text: 'Radio FM' },
        { icon: 'shield-checkmark-outline', text: 'Seguro básico' },
      ],
      popular: true,
      savings: 'Ahorra 25%',
    },
    {
      id: 'comfort',
      name: 'Confort',
      icon: '🚙',
      //image: require('../assets/comfort-car.png'), // Opcional
      description: 'Más espacio y comodidad para tu viaje',
      capacity: '4 pasajeros',
      luggage: '3 maletas medianas',
      basePrice: 195,
      pricePerKm: 16,
      pricePerMin: 7,
      eta: '3-7 min',
      features: [
        { icon: 'snow-outline', text: 'Aire acondicionado premium' },
        { icon: 'wifi-outline', text: 'WiFi gratis' },
        { icon: 'phone-portrait-outline', text: 'Cargador USB' },
        { icon: 'water-outline', text: 'Agua gratis' },
        { icon: 'shield-checkmark-outline', text: 'Seguro completo' },
      ],
      recommended: true,
    },
    {
      id: 'premium',
      name: 'Premium',
      icon: '🏎️',
      //image: require('../assets/premium-car.png'), // Opcional
      description: 'Viaja con lujo y estilo',
      capacity: '4 pasajeros',
      luggage: '3 maletas grandes',
      basePrice: 270,
      pricePerKm: 22,
      pricePerMin: 10,
      eta: '5-10 min',
      features: [
        { icon: 'snow-outline', text: 'Climatización dual' },
        { icon: 'wifi-outline', text: 'WiFi de alta velocidad' },
        { icon: 'phone-portrait-outline', text: 'Cargadores múltiples' },
        { icon: 'water-outline', text: 'Bebidas premium' },
        { icon: 'newspaper-outline', text: 'Prensa del día' },
        { icon: 'shield-checkmark-outline', text: 'Seguro VIP' },
        { icon: 'star-outline', text: 'Conductor elite' },
      ],
      luxury: true,
    },
    {
      id: 'xl',
      name: 'XL',
      icon: '🚐',
    // image: require('../assets/xl-van.png'), // Opcional
      description: 'Perfecto para grupos o mucho equipaje',
      capacity: '6-7 pasajeros',
      luggage: '5 maletas grandes',
      basePrice: 280,
      pricePerKm: 20,
      pricePerMin: 8,
      eta: '5-12 min',
      features: [
        { icon: 'people-outline', text: 'Hasta 7 personas' },
        { icon: 'briefcase-outline', text: 'Gran capacidad' },
        { icon: 'snow-outline', text: 'Aire acondicionado' },
        { icon: 'wifi-outline', text: 'WiFi incluido' },
        { icon: 'shield-checkmark-outline', text: 'Seguro grupal' },
      ],
      group: true,
    },
    {
      id: 'moto',
      name: 'Moto',
      icon: '🏍️',
     // image: require('../assets/moto.png'), // Opcional
      description: 'Rápido y económico en el tráfico',
      capacity: '1 pasajero',
      luggage: '1 mochila',
      basePrice: 80,
      pricePerKm: 8,
      pricePerMin: 3,
      eta: '1-3 min',
      features: [
        { icon: 'speedometer-outline', text: 'Más rápido en tráfico' },
        { icon: 'body-outline', text: 'Casco incluido' },
        { icon: 'shield-checkmark-outline', text: 'Seguro incluido' },
        { icon: 'cash-outline', text: 'Súper económico' },
      ],
      fast: true,
      savings: 'Ahorra 50%',
    },
  ];

  useEffect(() => {
    calculatePrices();
  }, [estimatedDistance]);

  const calculatePrices = () => {
    const prices = {};
    vehicleTypes.forEach(vehicle => {
      const distancePrice = vehicle.pricePerKm * estimatedDistance;
      const timePrice = vehicle.pricePerMin * (estimatedDistance * 2); // Estimado
      const total = vehicle.basePrice + distancePrice + timePrice;
      
      // Aplicar surge pricing si es hora pico
      const hour = new Date().getHours();
      const isPeakHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 20);
      const surgeMultiplier = isPeakHour ? 1.3 : 1;
      
      prices[vehicle.id] = Math.round(total * surgeMultiplier);
    });
    setEstimatedPrices(prices);
  };

  const selectVehicle = (vehicle) => {
    setSelectedType(vehicle.id);
    setTimeout(() => {
      onSelectVehicle({
        type: vehicle.id,
        name: vehicle.name,
        price: estimatedPrices[vehicle.id],
        eta: vehicle.eta,
        features: vehicle.features,
      });
      onClose();
    }, 300);
  };

  const renderVehicleOption = (vehicle) => {
    const isSelected = selectedType === vehicle.id;
    const price = estimatedPrices[vehicle.id] || vehicle.basePrice;

    return (
      <TouchableOpacity
        key={vehicle.id}
        style={[styles.vehicleCard, isSelected && styles.vehicleCardSelected]}
        onPress={() => selectVehicle(vehicle)}
        activeOpacity={0.7}
      >
        {/* Badge si aplica */}
        {vehicle.popular && (
          <View style={[styles.badge, { backgroundColor: '#FF6B6B' }]}>
            <Text style={styles.badgeText}>POPULAR</Text>
          </View>
        )}
        {vehicle.recommended && (
          <View style={[styles.badge, { backgroundColor: '#4CAF50' }]}>
            <Text style={styles.badgeText}>RECOMENDADO</Text>
          </View>
        )}
        {vehicle.savings && (
          <View style={[styles.badge, { backgroundColor: '#FF9800' }]}>
            <Text style={styles.badgeText}>{vehicle.savings}</Text>
          </View>
        )}

        <View style={styles.vehicleHeader}>
          <View style={styles.vehicleBasicInfo}>
            <Text style={styles.vehicleIcon}>{vehicle.icon}</Text>
            <View style={styles.vehicleNameContainer}>
              <Text style={styles.vehicleName}>{vehicle.name}</Text>
              <Text style={styles.vehicleEta}>{vehicle.eta}</Text>
            </View>
          </View>
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>RD$</Text>
            <Text style={styles.priceAmount}>{price}</Text>
          </View>
        </View>

        <Text style={styles.vehicleDescription}>{vehicle.description}</Text>

        <View style={styles.vehicleSpecs}>
          <View style={styles.specItem}>
            <Icon name="people" size={16} color="#666" />
            <Text style={styles.specText}>{vehicle.capacity}</Text>
          </View>
          <View style={styles.specItem}>
            <Icon name="briefcase" size={16} color="#666" />
            <Text style={styles.specText}>{vehicle.luggage}</Text>
          </View>
        </View>

        {/* Features expandidas si está seleccionado */}
        {isSelected && (
          <View style={styles.featuresContainer}>
            <Text style={styles.featuresTitle}>Incluye:</Text>
            <View style={styles.featuresList}>
              {vehicle.features.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <Icon name={feature.icon} size={16} color="#007AFF" />
                  <Text style={styles.featureText}>{feature.text}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Indicador de selección */}
        <View style={[styles.selectionIndicator, isSelected && styles.selectionIndicatorActive]}>
          {isSelected && <Icon name="checkmark-circle" size={24} color="#007AFF" />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.title}>Selecciona tu vehículo</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Info de distancia */}
          <View style={styles.tripInfo}>
            <Icon name="navigate" size={16} color="#666" />
            <Text style={styles.tripInfoText}>
              Distancia estimada: {estimatedDistance} km
            </Text>
          </View>

          {/* Lista de vehículos */}
          <ScrollView 
            style={styles.vehiclesList}
            showsVerticalScrollIndicator={false}
          >
            {vehicleTypes.map(renderVehicleOption)}
            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Footer con información */}
          <View style={styles.footer}>
            <Icon name="information-circle-outline" size={16} color="#666" />
            <Text style={styles.footerText}>
              Los precios pueden variar según demanda y tráfico
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  content: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: 40, // Pequeño margen superior para la barra de estado
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  tripInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f8f8',
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 8,
  },
  tripInfoText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
  },
  vehiclesList: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  vehicleCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    position: 'relative',
    minHeight: 60,
  },
  vehicleCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    zIndex: 1,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  vehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  vehicleBasicInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleIcon: {
    fontSize: 28, // Reducido de 32
    marginRight: 10,
  },
  vehicleNameContainer: {
    justifyContent: 'center',
  },
  vehicleName: {
    fontSize: 16, // Reducido de 18
    fontWeight: '600',
    color: '#333',
  },
  vehicleEta: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 2,
  },
  priceAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  vehicleDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  vehicleSpecs: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  specText: {
    marginLeft: 4,
    fontSize: 13,
    color: '#666',
  },
  featuresContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  featuresTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  featuresList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: 8,
  },
  featureText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#666',
  },
  selectionIndicator: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionIndicatorActive: {
    borderColor: '#007AFF',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  footerText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
});

export default VehicleSelector;