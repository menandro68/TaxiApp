import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform
} from 'react-native';
import PermissionService from '../services/PermissionService';
import LocationFallbackService from '../services/LocationFallbackService';

const TestPermissionScreen = () => {
  const [permissionStatus, setPermissionStatus] = useState('No verificado');
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);

  // Verificar permisos al cargar la pantalla
  useEffect(() => {
    checkPermissions();
  }, []);

  // Función para verificar estado de permisos
  const checkPermissions = async () => {
    try {
      const result = await PermissionService.checkLocationPermission();
      
      if (result.granted) {
        setPermissionStatus('✅ Permisos concedidos');
      } else if (result.canAsk) {
        setPermissionStatus('⚠️ Permisos no solicitados');
      } else {
        setPermissionStatus('❌ Permisos denegados/bloqueados');
      }
    } catch (error) {
      setPermissionStatus('❌ Error verificando permisos');
    }
  };

  // Función para solicitar permisos
  const requestPermissions = async () => {
    setLoading(true);
    try {
      const result = await PermissionService.requestLocationPermission();
      
      if (result.success) {
        Alert.alert('✅ Éxito', 'Permisos de ubicación concedidos');
        setPermissionStatus('✅ Permisos concedidos');
      } else {
        Alert.alert('⚠️ Atención', `Estado: ${result.status}`);
        setPermissionStatus(`❌ Estado: ${result.status}`);
      }
    } catch (error) {
      Alert.alert('❌ Error', 'Error solicitando permisos');
    }
    setLoading(false);
  };

  // Función para obtener ubicación actual
  const getLocation = async () => {
    setLoading(true);
    try {
      const result = await PermissionService.getCurrentLocationWithPermission();
      
      if (result.success) {
        setLocation(result.location);
        Alert.alert(
          '✅ Ubicación obtenida',
          `Lat: ${result.location.latitude.toFixed(6)}\n` +
          `Lon: ${result.location.longitude.toFixed(6)}\n` +
          `Precisión: ${result.location.accuracy?.toFixed(0) || 'N/A'} metros`
        );
      } else {
        Alert.alert('❌ Error', result.error || 'No se pudo obtener la ubicación');
      }
    } catch (error) {
      Alert.alert('❌ Error', 'Error obteniendo ubicación');
    }
    setLoading(false);
  };

  // Función para obtener ubicación con fallback
  const getLocationWithFallback = async () => {
    setLoading(true);
    try {
      const result = await LocationFallbackService.getLocationForUser({
        showUserPrompt: true,
        timeout: 15000
      });
      
      if (result.success && result.location) {
        setLocation(result.location);
        Alert.alert(
          '📍 Ubicación',
          `Fuente: ${result.location.source}\n` +
          `Lat: ${result.location.latitude.toFixed(6)}\n` +
          `Lon: ${result.location.longitude.toFixed(6)}\n` +
          (result.warning ? `\n⚠️ ${result.warning}` : '')
        );
      } else if (result.action) {
        Alert.alert('ℹ️ Acción requerida', `Acción: ${result.action}`);
      }
    } catch (error) {
      Alert.alert('❌ Error', 'Error obteniendo ubicación');
    }
    setLoading(false);
  };

  // Función para inicializar permisos
  const initializePermissions = async () => {
    setLoading(true);
    try {
      const result = await PermissionService.initializeLocationPermissions();
      
      if (result) {
        Alert.alert('✅ Éxito', 'Permisos inicializados correctamente');
        checkPermissions();
      } else {
        Alert.alert('⚠️ Atención', 'No se pudieron inicializar los permisos');
      }
    } catch (error) {
      Alert.alert('❌ Error', 'Error inicializando permisos');
    }
    setLoading(false);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>🧪 Prueba de Permisos de Ubicación</Text>
        
        {/* Estado actual */}
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Estado Actual</Text>
          <Text style={styles.statusText}>{permissionStatus}</Text>
          <Text style={styles.platform}>Plataforma: {Platform.OS}</Text>
        </View>

        {/* Ubicación actual */}
        {location && (
          <View style={styles.locationCard}>
            <Text style={styles.locationTitle}>📍 Última Ubicación</Text>
            <Text style={styles.locationText}>Lat: {location.latitude?.toFixed(6)}</Text>
            <Text style={styles.locationText}>Lon: {location.longitude?.toFixed(6)}</Text>
            {location.source && (
              <Text style={styles.locationText}>Fuente: {location.source}</Text>
            )}
            {location.accuracy && (
              <Text style={styles.locationText}>Precisión: {location.accuracy.toFixed(0)}m</Text>
            )}
          </View>
        )}

        {/* Botones de prueba */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.checkButton]}
            onPress={checkPermissions}
            disabled={loading}
          >
            <Text style={styles.buttonText}>🔍 Verificar Permisos</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.requestButton]}
            onPress={requestPermissions}
            disabled={loading}
          >
            <Text style={styles.buttonText}>📱 Solicitar Permisos</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.locationButton]}
            onPress={getLocation}
            disabled={loading}
          >
            <Text style={styles.buttonText}>📍 Obtener Ubicación</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.fallbackButton]}
            onPress={getLocationWithFallback}
            disabled={loading}
          >
            <Text style={styles.buttonText}>🔄 Ubicación con Fallback</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.initButton]}
            onPress={initializePermissions}
            disabled={loading}
          >
            <Text style={styles.buttonText}>🚀 Inicializar Todo</Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <Text style={styles.loading}>⏳ Procesando...</Text>
        )}

        {/* Información de ayuda */}
        <View style={styles.helpCard}>
          <Text style={styles.helpTitle}>ℹ️ Información</Text>
          <Text style={styles.helpText}>
            1. Primero verifica el estado de los permisos{'\n'}
            2. Si no están concedidos, solicítalos{'\n'}
            3. Prueba obtener la ubicación{'\n'}
            4. Prueba el sistema de fallback{'\n'}
            5. El botón "Inicializar" hace todo automáticamente
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  statusCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#666',
  },
  statusText: {
    fontSize: 18,
    marginVertical: 5,
    color: '#333',
  },
  platform: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
  },
  locationCard: {
    backgroundColor: '#e8f5e9',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#4caf50',
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#2e7d32',
  },
  locationText: {
    fontSize: 14,
    color: '#1b5e20',
    marginVertical: 2,
  },
  buttonsContainer: {
    marginVertical: 10,
  },
  button: {
    padding: 15,
    borderRadius: 10,
    marginVertical: 5,
    alignItems: 'center',
  },
  checkButton: {
    backgroundColor: '#2196F3',
  },
  requestButton: {
    backgroundColor: '#4CAF50',
  },
  locationButton: {
    backgroundColor: '#FF9800',
  },
  fallbackButton: {
    backgroundColor: '#9C27B0',
  },
  initButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loading: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  helpCard: {
    backgroundColor: '#fff3e0',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#ffb74d',
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#e65100',
  },
  helpText: {
    fontSize: 14,
    color: '#bf360c',
    lineHeight: 20,
  },
});

export default TestPermissionScreen;