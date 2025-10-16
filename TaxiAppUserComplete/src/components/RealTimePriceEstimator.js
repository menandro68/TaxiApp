import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  ScrollView,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

// Configuración de tarifas base (en RD$)
const PRICING_CONFIG = {
  economy: {
    base: 100,           // Tarifa base
    perKm: 25,          // Por kilómetro
    perMinute: 5,       // Por minuto
    minimum: 150,       // Tarifa mínima
    icon: '🚗',
    name: 'Económico',
    maxDistance: 50,    // Distancia máxima en km
  },
  comfort: {
    base: 130,
    perKm: 35,
    perMinute: 7,
    minimum: 200,
    icon: '🚙',
    name: 'Confort',
    maxDistance: 50,
  },
  premium: {
    base: 180,
    perKm: 50,
    perMinute: 10,
    minimum: 300,
    icon: '🚘',
    name: 'Premium',
    maxDistance: 100,
  },
};

// Multiplicadores dinámicos
const SURGE_PRICING = {
  // Por hora del día
  timeMultipliers: {
    '6-9': 1.3,    // Hora pico mañana
    '9-12': 1.0,   // Normal
    '12-14': 1.2,  // Almuerzo
    '14-17': 1.0,  // Normal
    '17-20': 1.4,  // Hora pico tarde
    '20-22': 1.2,  // Noche
    '22-6': 1.5,   // Madrugada
  },
  // Por día de la semana
  dayMultipliers: {
    0: 1.1,  // Domingo
    1: 1.0,  // Lunes
    2: 1.0,  // Martes
    3: 1.0,  // Miércoles
    4: 1.0,  // Jueves
    5: 1.3,  // Viernes
    6: 1.2,  // Sábado
  },
  // Por clima
  weatherMultipliers: {
    sunny: 1.0,
    cloudy: 1.0,
    rainy: 1.5,
    storm: 2.0,
  },
  // Por demanda
  demandMultipliers: {
    low: 0.9,
    normal: 1.0,
    high: 1.5,
    extreme: 2.0,
  },
};

// Zonas con tarifas especiales
const SPECIAL_ZONES = {
  airport: {
    name: 'Aeropuerto',
    surcharge: 200,
    coordinates: { lat: 18.4297, lng: -69.6689 },
    radius: 2, // km
  },
  colonial: {
    name: 'Zona Colonial',
    surcharge: 50,
    coordinates: { lat: 18.4761, lng: -69.8827 },
    radius: 1,
  },
  piantini: {
    name: 'Piantini',
    surcharge: 75,
    coordinates: { lat: 18.4670, lng: -69.9410 },
    radius: 1.5,
  },
};

const RealTimePriceEstimator = ({ 
  origin,
  destination,
  vehicleType = 'economy',
  onPriceUpdate,
  visible = true,
}) => {
  const [isCalculating, setIsCalculating] = useState(false);
  const [priceBreakdown, setPriceBreakdown] = useState(null);
  const [finalPrice, setFinalPrice] = useState(0);
  const [surgeActive, setSurgeActive] = useState(false);
  const [surgeMultiplier, setSurgeMultiplier] = useState(1);
  const [trafficLevel, setTrafficLevel] = useState('normal');
  const [estimatedTime, setEstimatedTime] = useState(0);
  const [estimatedDistance, setEstimatedDistance] = useState(0);
  const [weather, setWeather] = useState('sunny');
  const [demand, setDemand] = useState('normal');
  
  const animatedPrice = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const updateInterval = useRef(null);

  useEffect(() => {
    if (origin && destination) {
      startRealTimeCalculation();
    }
    
    return () => {
      if (updateInterval.current) {
        clearInterval(updateInterval.current);
      }
    };
  }, [origin, destination, vehicleType]);

  // Iniciar cálculo en tiempo real
  const startRealTimeCalculation = () => {
    // Cálculo inicial
    calculatePrice();
    
    // Actualizar cada 10 segundos
    updateInterval.current = setInterval(() => {
      updateDynamicFactors();
      calculatePrice();
    }, 10000);
  };

  // Actualizar factores dinámicos
  const updateDynamicFactors = () => {
    // Simular cambios de tráfico
    const trafficLevels = ['light', 'normal', 'heavy', 'severe'];
    const randomTraffic = trafficLevels[Math.floor(Math.random() * trafficLevels.length)];
    setTrafficLevel(randomTraffic);
    
    // Simular cambios de demanda
    const demandLevels = ['low', 'normal', 'high'];
    const randomDemand = demandLevels[Math.floor(Math.random() * demandLevels.length)];
    setDemand(randomDemand);
    
    // Simular clima (con menos frecuencia de lluvia)
    const weatherConditions = ['sunny', 'sunny', 'cloudy', 'rainy'];
    const randomWeather = weatherConditions[Math.floor(Math.random() * weatherConditions.length)];
    setWeather(randomWeather);
  };

  // Calcular distancia entre dos puntos
  const calculateDistance = (origin, destination) => {
    const R = 6371; // Radio de la Tierra en km
    const dLat = toRad(destination.latitude - origin.latitude);
    const dLon = toRad(destination.longitude - origin.longitude);
    const lat1 = toRad(origin.latitude);
    const lat2 = toRad(destination.latitude);

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return distance;
  };

  const toRad = (value) => {
    return value * Math.PI / 180;
  };

  // Calcular tiempo estimado basado en tráfico
  const calculateEstimatedTime = (distance, traffic) => {
    let avgSpeed = 30; // km/h velocidad promedio base
    
    switch(traffic) {
      case 'light':
        avgSpeed = 40;
        break;
      case 'normal':
        avgSpeed = 30;
        break;
      case 'heavy':
        avgSpeed = 20;
        break;
      case 'severe':
        avgSpeed = 10;
        break;
    }
    
    return (distance / avgSpeed) * 60; // Tiempo en minutos
  };

  // Verificar si está en zona especial
  const checkSpecialZone = (location) => {
    for (const [key, zone] of Object.entries(SPECIAL_ZONES)) {
      const distance = calculateDistance(location, zone.coordinates);
      if (distance <= zone.radius) {
        return zone;
      }
    }
    return null;
  };

  // Obtener multiplicador por hora
  const getTimeMultiplier = () => {
    const hour = new Date().getHours();
    
    for (const [range, multiplier] of Object.entries(SURGE_PRICING.timeMultipliers)) {
      const [start, end] = range.split('-').map(Number);
      if (end < start) { // Maneja rangos que cruzan medianoche
        if (hour >= start || hour < end) return multiplier;
      } else {
        if (hour >= start && hour < end) return multiplier;
      }
    }
    return 1;
  };

  // Calcular precio con todos los factores
  const calculatePrice = async () => {
    setIsCalculating(true);
    
    try {
      // Calcular distancia
      const distance = calculateDistance(origin, destination);
      setEstimatedDistance(distance);
      
      // Calcular tiempo basado en tráfico
      const time = calculateEstimatedTime(distance, trafficLevel);
      setEstimatedTime(time);
      
      // Obtener configuración del vehículo
      const vehicleConfig = PRICING_CONFIG[vehicleType];
      
      // Cálculo base
      let basePrice = vehicleConfig.base;
      let distancePrice = distance * vehicleConfig.perKm;
      let timePrice = time * vehicleConfig.perMinute;
      
      // Precio subtotal
      let subtotal = basePrice + distancePrice + timePrice;
      
      // Aplicar mínimo
      subtotal = Math.max(subtotal, vehicleConfig.minimum);
      
      // Verificar zonas especiales
      let zoneSurcharge = 0;
      const originZone = checkSpecialZone(origin);
      const destZone = checkSpecialZone(destination);
      
      if (originZone) zoneSurcharge += originZone.surcharge;
      if (destZone) zoneSurcharge += destZone.surcharge;
      
      // Multiplicadores
      const timeMultiplier = getTimeMultiplier();
      const dayMultiplier = SURGE_PRICING.dayMultipliers[new Date().getDay()];
      const weatherMultiplier = SURGE_PRICING.weatherMultipliers[weather];
      const demandMultiplier = SURGE_PRICING.demandMultipliers[demand];
      
      // Multiplicador total
      const totalMultiplier = timeMultiplier * dayMultiplier * weatherMultiplier * demandMultiplier;
      setSurgeMultiplier(totalMultiplier);
      setSurgeActive(totalMultiplier > 1.2);
      
      // Precio con multiplicadores
      let adjustedPrice = subtotal * totalMultiplier;
      
      // Agregar recargos de zona
      adjustedPrice += zoneSurcharge;
      
      // Factor de tráfico adicional
      let trafficSurcharge = 0;
      switch(trafficLevel) {
        case 'heavy':
          trafficSurcharge = adjustedPrice * 0.1;
          break;
        case 'severe':
          trafficSurcharge = adjustedPrice * 0.2;
          break;
      }
      
      adjustedPrice += trafficSurcharge;
      
      // Redondear al múltiplo de 5 más cercano
      const final = Math.round(adjustedPrice / 5) * 5;
      
      // Crear desglose
      const breakdown = {
        base: basePrice,
        distance: distancePrice,
        time: timePrice,
        subtotal: subtotal,
        surgeMultiplier: totalMultiplier,
        surgeAmount: (subtotal * totalMultiplier) - subtotal,
        zoneSurcharge: zoneSurcharge,
        trafficSurcharge: trafficSurcharge,
        total: final,
        factors: {
          time: timeMultiplier > 1 ? `Hora pico (${(timeMultiplier * 100).toFixed(0)}%)` : null,
          day: dayMultiplier > 1 ? `Fin de semana (${(dayMultiplier * 100).toFixed(0)}%)` : null,
          weather: weatherMultiplier > 1 ? `Clima (${(weatherMultiplier * 100).toFixed(0)}%)` : null,
          demand: demandMultiplier > 1 ? `Alta demanda (${(demandMultiplier * 100).toFixed(0)}%)` : null,
          traffic: trafficSurcharge > 0 ? `Tráfico ${trafficLevel}` : null,
          originZone: originZone ? `Zona ${originZone.name}` : null,
          destZone: destZone ? `Zona ${destZone.name}` : null,
        }
      };
      
      setPriceBreakdown(breakdown);
      setFinalPrice(final);
      
      // Animar precio
      Animated.parallel([
        Animated.timing(animatedPrice, {
          toValue: final,
          duration: 500,
          useNativeDriver: false,
        }),
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.2,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
      
      // Callback con el precio actualizado
      if (onPriceUpdate) {
        onPriceUpdate({
          price: final,
          breakdown: breakdown,
          distance: distance,
          time: time,
          surge: totalMultiplier > 1.2,
          surgeMultiplier: totalMultiplier,
        });
      }
      
    } catch (error) {
      console.error('Error calculando precio:', error);
      Alert.alert('Error', 'No se pudo calcular el precio');
    } finally {
      setIsCalculating(false);
    }
  };

  // Explicar tarifa dinámica
  const explainSurgePricing = () => {
    Alert.alert(
      '⚡ Tarifa Dinámica Activa',
      `El precio actual tiene un multiplicador de ${surgeMultiplier.toFixed(1)}x debido a:\n\n` +
      Object.entries(priceBreakdown.factors)
        .filter(([key, value]) => value)
        .map(([key, value]) => `• ${value}`)
        .join('\n') +
      '\n\nLos precios se ajustan en tiempo real según la demanda y condiciones.',
      [{ text: 'Entendido' }]
    );
  };

  // Renderizar indicador de tráfico
  const renderTrafficIndicator = () => {
    const trafficColors = {
      light: '#4CAF50',
      normal: '#FFC107',
      heavy: '#FF9800',
      severe: '#F44336',
    };
    
    const trafficIcons = {
      light: 'speedometer',
      normal: 'time',
      heavy: 'warning',
      severe: 'alert-circle',
    };
    
    return (
      <View style={styles.trafficContainer}>
        <Icon 
          name={trafficIcons[trafficLevel]} 
          size={20} 
          color={trafficColors[trafficLevel]} 
        />
        <Text style={[styles.trafficText, { color: trafficColors[trafficLevel] }]}>
          Tráfico {
            trafficLevel === 'light' ? 'Ligero' :
            trafficLevel === 'normal' ? 'Normal' :
            trafficLevel === 'heavy' ? 'Pesado' : 'Severo'
          }
        </Text>
      </View>
    );
  };

  // Renderizar factores activos
  const renderActiveFactors = () => {
    if (!priceBreakdown) return null;
    
    const activeFactors = Object.entries(priceBreakdown.factors)
      .filter(([key, value]) => value)
      .map(([key, value]) => value);
    
    if (activeFactors.length === 0) return null;
    
    return (
      <View style={styles.factorsContainer}>
        <Text style={styles.factorsTitle}>Factores aplicados:</Text>
        {activeFactors.map((factor, index) => (
          <View key={index} style={styles.factorItem}>
            <Icon name="checkmark-circle" size={16} color="#FF9800" />
            <Text style={styles.factorText}>{factor}</Text>
          </View>
        ))}
      </View>
    );
  };

  if (!visible || !origin || !destination) return null;

  return (
    <View style={styles.container}>
      {/* Header con precio principal */}
      <View style={styles.priceHeader}>
        <View style={styles.priceMain}>
          <Text style={styles.priceLabel}>Precio estimado</Text>
          <Animated.View style={{ transform: [{ scale: pulseAnimation }] }}>
            <Text style={styles.priceValue}>
              RD$ {finalPrice.toFixed(0)}
            </Text>
          </Animated.View>
          {surgeActive && (
            <TouchableOpacity 
              style={styles.surgeIndicator}
              onPress={explainSurgePricing}
            >
              <Icon name="flash" size={16} color="#FFF" />
              <Text style={styles.surgeText}>{surgeMultiplier.toFixed(1)}x</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Información de distancia y tiempo */}
        <View style={styles.tripInfo}>
          <View style={styles.infoItem}>
            <Icon name="navigate" size={16} color="#666" />
            <Text style={styles.infoText}>{estimatedDistance.toFixed(1)} km</Text>
          </View>
          <View style={styles.infoItem}>
            <Icon name="time" size={16} color="#666" />
            <Text style={styles.infoText}>{Math.round(estimatedTime)} min</Text>
          </View>
        </View>
      </View>

      {/* Indicador de tráfico */}
      {renderTrafficIndicator()}

      {/* Clima y demanda */}
      <View style={styles.conditionsContainer}>
        <View style={styles.conditionItem}>
          <Icon 
            name={weather === 'sunny' ? 'sunny' : weather === 'cloudy' ? 'cloud' : 'rainy'} 
            size={20} 
            color={weather === 'rainy' ? '#2196F3' : '#FFC107'} 
          />
          <Text style={styles.conditionText}>
            {weather === 'sunny' ? 'Soleado' : 
             weather === 'cloudy' ? 'Nublado' : 'Lluvioso'}
          </Text>
        </View>
        
        <View style={styles.conditionItem}>
          <Icon 
            name="people" 
            size={20} 
            color={demand === 'high' ? '#F44336' : demand === 'low' ? '#4CAF50' : '#FFC107'} 
          />
          <Text style={styles.conditionText}>
            Demanda {
              demand === 'low' ? 'Baja' :
              demand === 'normal' ? 'Normal' : 'Alta'
            }
          </Text>
        </View>
      </View>

      {/* Desglose de precio */}
      {priceBreakdown && (
        <TouchableOpacity 
          style={styles.breakdownContainer}
          onPress={() => {
            Alert.alert(
              '📊 Desglose del Precio',
              `Tarifa base: RD$${priceBreakdown.base}\n` +
              `Distancia (${estimatedDistance.toFixed(1)}km): RD$${priceBreakdown.distance.toFixed(0)}\n` +
              `Tiempo (${Math.round(estimatedTime)}min): RD$${priceBreakdown.time.toFixed(0)}\n` +
              `Subtotal: RD$${priceBreakdown.subtotal.toFixed(0)}\n` +
              (priceBreakdown.surgeAmount > 0 ? `Tarifa dinámica: +RD$${priceBreakdown.surgeAmount.toFixed(0)}\n` : '') +
              (priceBreakdown.zoneSurcharge > 0 ? `Zona especial: +RD$${priceBreakdown.zoneSurcharge}\n` : '') +
              (priceBreakdown.trafficSurcharge > 0 ? `Recargo tráfico: +RD$${priceBreakdown.trafficSurcharge.toFixed(0)}\n` : '') +
              `\nTOTAL: RD$${priceBreakdown.total}`,
              [{ text: 'OK' }]
            );
          }}
        >
          <Text style={styles.breakdownText}>Ver desglose detallado</Text>
          <Icon name="chevron-forward" size={16} color="#007AFF" />
        </TouchableOpacity>
      )}

      {/* Factores activos */}
      {renderActiveFactors()}

      {/* Indicador de actualización */}
      <View style={styles.updateIndicator}>
        <View style={styles.liveIndicator}>
          <Animated.View style={[
            styles.liveDot,
            { opacity: isCalculating ? 1 : 0.3 }
          ]} />
          <Text style={styles.liveText}>
            {isCalculating ? 'Actualizando...' : 'Precio en tiempo real'}
          </Text>
        </View>
        <Text style={styles.updateText}>
          Se actualiza cada 10 segundos
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  priceHeader: {
    marginBottom: 15,
  },
  priceMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
  },
  priceValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  surgeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9800',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  surgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  tripInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#666',
  },
  trafficContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  trafficText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  conditionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
    paddingVertical: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
  },
  conditionItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  conditionText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  breakdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#e3f2fd',
    borderRadius: 10,
    marginBottom: 10,
  },
  breakdownText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  factorsContainer: {
    backgroundColor: '#fff3e0',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  factorsTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    fontWeight: '600',
  },
  factorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  factorText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#666',
  },
  updateIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 8,
  },
  liveText: {
    fontSize: 12,
    color: '#666',
  },
  updateText: {
    fontSize: 11,
    color: '#999',
  },
});

export default RealTimePriceEstimator;