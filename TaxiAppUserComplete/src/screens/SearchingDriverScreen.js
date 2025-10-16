// src/screens/SearchingDriverScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Animated
} from 'react-native';
import DriverMatchingAlgorithm from '../services/DriverMatchingAlgorithm';

const SearchingDriverScreen = ({ visible, userLocation, tripDetails, onDriverFound, onCancel }) => {
  const [searchStatus, setSearchStatus] = useState('Iniciando búsqueda...');
  const [currentRadius, setCurrentRadius] = useState(1);
  const [attempts, setAttempts] = useState(0);
  const [rejections, setRejections] = useState(0);
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (visible) {
      startSearch();
      startPulseAnimation();
    }
  }, [visible]);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const startSearch = async () => {
    try {
      setSearchStatus('Buscando conductores cercanos...');
      
      const result = await DriverMatchingAlgorithm.findDriver(
        userLocation,
        tripDetails
      );

      if (result.success) {
        setSearchStatus('¡Conductor encontrado!');
        setTimeout(() => {
          onDriverFound(result.driver);
        }, 1500);
      } else {
        setSearchStatus('No hay conductores disponibles');
        setTimeout(() => {
          onCancel();
        }, 2000);
      }
    } catch (error) {
      console.error('Error en búsqueda:', error);
      setSearchStatus('Error en la búsqueda');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
    >
      <View style={styles.container}>
        <View style={styles.searchBox}>
          <Animated.View 
            style={[
              styles.pulseCircle,
              { transform: [{ scale: pulseAnim }] }
            ]}
          >
            <ActivityIndicator size="large" color="#4A90E2" />
          </Animated.View>
          
          <Text style={styles.title}>Buscando Conductor</Text>
          <Text style={styles.status}>{searchStatus}</Text>
          
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>Radio: {currentRadius} km</Text>
            <Text style={styles.infoText}>Intento: {attempts + 1}/6</Text>
            {rejections > 0 && (
              <Text style={styles.infoText}>Rechazos: {rejections}</Text>
            )}
          </View>
          
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={onCancel}
          >
            <Text style={styles.cancelText}>Cancelar Búsqueda</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBox: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    width: '85%',
    alignItems: 'center',
  },
  pulseCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E8F4FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  status: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#999',
  },
  cancelButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  cancelText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SearchingDriverScreen;