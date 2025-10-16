// src/screens/HomeScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import SearchingDriverScreen from './SearchingDriverScreen';
import DriverMatchingAlgorithm from '../services/DriverMatchingAlgorithm'

const HomeScreen = () => {
  const [isSearchingDriver, setIsSearchingDriver] = useState(false);
  const [assignedDriver, setAssignedDriver] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    // Obtener ubicación actual
    Geolocation.getCurrentPosition(
      position => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      error => console.log(error),
      { enableHighAccuracy: true }
    );
  }, []);

  const handleRequestRide = () => {
    if (!userLocation) {
      Alert.alert('Error', 'No se pudo obtener tu ubicación');
      return;
    }

    const tripDetails = {
      passengerId: 'user123', // Aquí deberías usar el ID real del usuario
      pickup: {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        address: 'Mi ubicación actual'
      },
      destination: {
        latitude: userLocation.latitude + 0.01,
        longitude: userLocation.longitude + 0.01,
        address: 'Mi destino'
      }
    };

    setIsSearchingDriver(true);
  };

  const handleDriverFound = (driver) => {
    setAssignedDriver(driver);
    setIsSearchingDriver(false);
    Alert.alert('¡Éxito!', `Conductor ${driver.name} asignado`);
  };

  const handleCancelSearch = () => {
    setIsSearchingDriver(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Solicitar Viaje</Text>
      
      {assignedDriver ? (
        <View style={styles.driverInfo}>
          <Text style={styles.driverText}>
            Conductor Asignado: {assignedDriver.name}
          </Text>
          <Text style={styles.driverText}>
            Distancia: {assignedDriver.distance} km
          </Text>
        </View>
      ) : (
        <TouchableOpacity 
          style={styles.requestButton}
          onPress={handleRequestRide}
        >
          <Text style={styles.buttonText}>Buscar Conductor</Text>
        </TouchableOpacity>
      )}

      <SearchingDriverScreen
        visible={isSearchingDriver}
        userLocation={userLocation}
        tripDetails={{}}
        onDriverFound={handleDriverFound}
        onCancel={handleCancelSearch}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
  },
  requestButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  driverInfo: {
    padding: 20,
    backgroundColor: '#E8F4FD',
    borderRadius: 10,
  },
  driverText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
});

export default HomeScreen;