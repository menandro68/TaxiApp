import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  SafeAreaView,
  Alert,
  Dimensions,
  StatusBar,
  Modal,
  Platform,
  Linking,
  BackHandler,
} from 'react-native';
import SharedStorage, { TRIP_STATES } from './SharedStorage';
import ApiService from './src/services/ApiService';
import fcmService from './FCMService';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import MapComponent from './MapComponent';
import PreRegisterScreen from './screens/PreRegisterScreen';
import DocumentUploadScreen from './screens/DocumentUploadScreen';
import DocumentsMenuScreen from './screens/DocumentsMenuScreen';
import OfflineService from './OfflineService';
import SmartSyncService from './SmartSyncService';
import PenaltyService from './PenaltyService';
import DashcamComponent from './DashcamComponent';
import AsyncStorage from '@react-native-async-storage/async-storage';

//import MultipleStopsManager from './components/MultipleStopsManager';

const { width, height } = Dimensions.get('window');

import { LogBox } from 'react-native';
LogBox.ignoreAllLogs(true);

export default function DriverApp({ navigation }) {
  const [driverStatus, setDriverStatus] = useState('offline'); // offline, online, busy, suspended
  const [currentTrip, setCurrentTrip] = useState(null);
  const [pendingRequest, setPendingRequest] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, map, earnings
  const [earnings, setEarnings] = useState({ today: 420, week: 2100, month: 8500 });
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showPreRegister, setShowPreRegister] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(20);
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [showSupportChat, setShowSupportChat] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [tripPhase, setTripPhase] = useState(''); // AGREGADO: '', 'arrived', 'started'
  const [showDashcam, setShowDashcam] = useState(false);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [tripStops, setTripStops] = useState(null);
  const [userLocation, setUserLocation] = useState(null); // NUEVO: Estado para ubicación del usuario
  const [locationInterval, setLocationInterval] = useState(null); // Para controlar el intervalo de ubicación
  
  // Estados para Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loggedDriver, setLoggedDriver] = useState(null);
  
  // Estados para métricas de desempeño
  const [driverStats, setDriverStats] = useState({
    tripsOffered: 0,
    tripsAccepted: 0,
    tripsRejected: 0,
    tripsCancelled: 0,
    acceptanceRate: 100,
    cancellationRate: 0
  });
  
  const timerRef = useRef(null);

 useEffect(() => {
    // Cargar conductor guardado
    const loadSavedDriver = async () => {
      try {
        const savedDriver = await AsyncStorage.getItem('loggedDriver');
        if (savedDriver) {
          setLoggedDriver(JSON.parse(savedDriver));
          console.log('✅ Conductor cargado desde almacenamiento');
        }
      } catch (error) {
        console.error('Error cargando conductor:', error);
      }
    };
    loadSavedDriver();
    
    // Inicializar FCM cuando la app carga
    fcmService.initialize();

    // Verificar si el conductor está suspendido
    const checkDriverStatus = async () => {
      const suspensionStatus = await PenaltyService.checkSuspensionStatus();
      if (suspensionStatus.isSuspended) {
        if (suspensionStatus.type === 'PERMANENT') {
          Alert.alert(
            '❌ Cuenta Suspendida',
            `Tu cuenta está suspendida permanentemente.\nRazón: ${suspensionStatus.reason}\n\nContacta soporte para apelar.`,
            [{ text: 'OK' }]
          );
          setDriverStatus('suspended');
        } else if (suspensionStatus.type === 'TEMPORARY') {
          Alert.alert(
            '🔒 Suspensión Temporal',
            `Tu cuenta está suspendida por ${suspensionStatus.hoursRemaining} horas más.\nRazón: ${suspensionStatus.reason}`,
            [{ text: 'OK' }]
          );
          setDriverStatus('suspended');
        }
      } else if (suspensionStatus.recentlyExpired) {
        Alert.alert(
          '✅ Suspensión Terminada',
          'Tu suspensión temporal ha expirado. Ya puedes trabajar nuevamente.',
          [{ text: 'OK' }]
        );
      }
    };
    
    checkDriverStatus();

    // Configurar monitoreo de conexión offline
    const unsubscribe = OfflineService.addConnectionListener((isOnline) => {
      setIsOffline(!isOnline);
      if (!isOnline) {
        Alert.alert(
          '📡 Sin Conexión',
          'Estás trabajando en modo offline. Los viajes se sincronizarán cuando vuelvas a tener conexión.',
          [{ text: 'OK' }]
        );
      } else if (isOffline && isOnline) {
        // Conexión restaurada - iniciar sincronización inteligente
        console.log('✅ Conexión restaurada - procesando cola de sincronización');
        SmartSyncService.processSyncQueue();
        Alert.alert(
          '🔄 Sincronizando',
          'Conexión restaurada. Sincronizando datos pendientes...',
          [{ text: 'OK' }]
        );
      }
    });
    
    // Verificar conexión inicial
    OfflineService.checkConnection().then(isOnline => {
      setIsOffline(!isOnline);
    });
    
  // Configurar función global para manejar solicitudes de viaje
    global.handleNewTripRequest = (tripData) => {
      console.log('🚗 Nueva solicitud recibida via FCM:', tripData);
      setPendingRequest(tripData);
      setShowRequestModal(true);
      startRequestTimer(); // Iniciar el timer cuando llega una solicitud
      
    // 🔊 NUEVO: Reproducir voz "Nuevo Servicio" 5 veces
      const Speech = require('react-native-tts').default;
      Speech.setDefaultLanguage('es-ES');
      Speech.setDefaultRate(0.5);
      Speech.speak('Nuevo Servicio. Nuevo Servicio. Nuevo Servicio. Nuevo Servicio. Nuevo Servicio.');
    };
    // Solicitar permisos de ubicación
    requestLocationPermissions();
    
    // Cleanup del timer cuando el componente se desmonta
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      stopLocationTracking(); // Detener tracking al desmontar
      unsubscribe(); // Limpiar listener de conexión
    };
  }, []);

  // NUEVO: useEffect para verificar automáticamente la llegada al destino
  useEffect(() => {
    // Obtener ubicación inicial cuando el viaje está activo
    if (currentTrip && tripPhase === 'started') {
      // getCurrentLocation(); // Comentado temporalmente
    }
    
    const interval = setInterval(() => {
      // Actualizar ubicación y verificar llegada
      if (currentTrip && tripPhase === 'started') {
        // getCurrentLocation(); // Comentado temporalmente
      }
      checkAutoCompleteTrip();
    }, 5000); // Verificar cada 5 segundos

    return () => clearInterval(interval);
  }, [currentTrip, userLocation, tripPhase]);

  const requestLocationPermissions = async () => {
    try {
      const fine = await request(
        Platform.OS === 'android'
          ? PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION
          : PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
      );
      
      if (fine === RESULTS.GRANTED) {
        console.log('✅ Permisos de ubicación concedidos');
      }
    } catch (error) {
      console.error('❌ Error solicitando permisos:', error);
    }
  };

  // NUEVA FUNCIÓN: Manejar Login
  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    setLoginLoading(true);
    
    try {
      const response = await fetch('https://web-production-99844.up.railway.app/api/drivers/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Login exitoso
        Alert.alert(
          '✅ Inicio de Sesión Exitoso',
          `Bienvenido ${data.driver.name}`,
          [
            { 
              text: 'OK', 
       onPress: async () => {
                setShowLogin(false);
                setLoginEmail('');
                setLoginPassword('');
                // Guardar datos del conductor logueado
                setLoggedDriver(data.driver);
                // Guardar en AsyncStorage para persistir
                await AsyncStorage.setItem('loggedDriver', JSON.stringify(data.driver));
                console.log('Token:', data.token);
                console.log('Driver ID:', data.driver.id);
              }
          ]
        );
      } else {
        // Error de autenticación
        Alert.alert('Error', data.message || 'Credenciales incorrectas');
      }
    } catch (error) {
      console.error('❌ Error en login:', error);
      Alert.alert('Error', 'No se pudo conectar con el servidor');
    } finally {
      setLoginLoading(false);
    }
  };

  // NUEVA FUNCIÓN: Enviar ubicación al backend
  const sendLocationToBackend = async (location) => {
    if (!location || driverStatus === 'offline') return;
    
    try {
      const response = await fetch('https://web-production-99844.up.railway.app/api/drivers/location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          driverId: loggedDriver?.id || 1,
          latitude: location.latitude,
          longitude: location.longitude,
          heading: 0,
          speed: 0,
          accuracy: 10,
          status: driverStatus === 'busy' ? 'busy' : 'online'
        })
      });
      
      if (response.ok) {
        console.log('📍 Ubicación enviada al backend');
      }
    } catch (error) {
      console.error('Error enviando ubicación:', error);
    }
  };

  // NUEVA FUNCIÓN: Iniciar tracking de ubicación
  const startLocationTracking = () => {
    // Limpiar intervalo anterior si existe
    if (locationInterval) {
      clearInterval(locationInterval);
    }
    
    // Enviar ubicación cada 10 segundos
    const interval = setInterval(() => {
      if (userLocation && driverStatus !== 'offline') {
        sendLocationToBackend(userLocation);
      }
    }, 10000); // 10 segundos
    
    setLocationInterval(interval);
    console.log('✅ Tracking de ubicación iniciado');
  };

  // NUEVA FUNCIÓN: Detener tracking de ubicación
  const stopLocationTracking = () => {
    if (locationInterval) {
      clearInterval(locationInterval);
      setLocationInterval(null);
      console.log('⏹️ Tracking de ubicación detenido');
    }
  };

  // Función para iniciar el timer del modal
  const startRequestTimer = () => {
    setTimeRemaining(20); // Resetear a 20 segundos
    
    // NUEVO: Incrementar contador de viajes ofrecidos
    setDriverStats(prev => ({
      ...prev,
      tripsOffered: prev.tripsOffered + 1
    }));
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          rejectTrip(); // Rechazar automáticamente
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

const toggleDriverStatus = async () => {
  if (driverStatus === 'offline') {
    // Verificar si hay conductor logueado
    if (!loggedDriver) {
      Alert.alert(
        '🔐 Iniciar Sesión',
        'Debes iniciar sesión antes de conectarte',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Iniciar Sesión', onPress: () => setShowLogin(true) }
        ]
      );
      return;
    }
    try {
      // Verificar suspensión antes de conectarse
      const suspensionStatus = await PenaltyService.checkSuspensionStatus();
      if (suspensionStatus.isSuspended) {
        Alert.alert(
          '🔒 No Puedes Conectarte',
          'Tu cuenta está suspendida. No puedes aceptar viajes en este momento.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      // NUEVO: Notificar al backend que el conductor está online
      const response = await fetch('https://web-production-99844.up.railway.app/api/drivers/status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          driverId: loggedDriver?.id || 1,
          status: 'online',
          isOnline: true
        })
      });
      
      if (response.ok) {
        setDriverStatus('online');
        await fcmService.sendTokenToServer((loggedDriver?.id || 1).toString());
        startLocationTracking(); // NUEVO: Iniciar tracking de ubicación
        Alert.alert('¡Conectado!', 'Ahora recibirás notificaciones de viajes');
        console.log('✅ Estado actualizado en el servidor: ONLINE');
      } else {
        throw new Error('Error actualizando estado');
      }
      
    } catch (error) {
      console.error('❌ Error conectando:', error);
      Alert.alert('Error', 'No se pudo conectar al servidor. Verifica tu conexión.');
    }
  } else {
    try {
      // NUEVO: Notificar al backend que el conductor está offline
      const response = await fetch('https://web-production-99844.up.railway.app/api/drivers/status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
        driverId: loggedDriver?.id || 1,
          status: 'offline',
          isOnline: false
        })
      });
      
      if (response.ok) {
        setDriverStatus('offline');
        stopLocationTracking(); // NUEVO: Detener tracking de ubicación
        Alert.alert('Desconectado', 'Ya no recibirás solicitudes de viaje');
        console.log('✅ Estado actualizado en el servidor: OFFLINE');
      }
      
    } catch (error) {
      console.error('❌ Error desconectando:', error);
      // Permitir desconexión local aunque falle el servidor
      setDriverStatus('offline');
      stopLocationTracking(); // NUEVO: Detener tracking de ubicación
      Alert.alert('Desconectado', 'Ya no recibirás solicitudes de viaje');
    }
  }
};

const acceptTrip = async () => {
    if (!pendingRequest) return;
    
    // Detener el timer cuando se acepta el viaje
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    try {
      // NUEVO: Llamar al endpoint del backend para aceptar el viaje
      const tripId = pendingRequest.id;
      const driverId = loggedDriver?.id || 1;
      
      console.log(`✅ Aceptando viaje ${tripId}...`);
      console.log('📡 Enviando request al servidor...');
      
      const response = await fetch(`https://web-production-99844.up.railway.app/api/trips/accept/${tripId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          driver_id: driverId
        })
      });

      console.log('📥 Response recibido, status:', response.status);
      
      const data = await response.json();
      
      console.log('📋 Data parseada:', data);
      
      if (!response.ok || !data.success) {
        Alert.alert('Error', data.error || 'No se pudo aceptar el viaje. Puede que ya fue tomado.');
        setShowRequestModal(false);
        setPendingRequest(null);
        return;
      }

      console.log('✅ Viaje aceptado en el servidor:', data);
      
      // NUEVO: Actualizar estadísticas al aceptar
      setDriverStats(prev => {
        const newAccepted = prev.tripsAccepted + 1;
        const newRate = Math.round((newAccepted / prev.tripsOffered) * 100);
        return {
          ...prev,
          tripsAccepted: newAccepted,
          acceptanceRate: newRate
        };
      });
      
      // Verificar métricas después de aceptar
      PenaltyService.checkAndApplyPenalties({
        ...driverStats,
        tripsAccepted: driverStats.tripsAccepted + 1,
        acceptanceRate: Math.round(((driverStats.tripsAccepted + 1) / driverStats.tripsOffered) * 100),
        rating: 4.8
      });
      
      setCurrentTrip({
        ...pendingRequest,
        phone: pendingRequest.phone || '+1-809-555-0199'
      });
      
      // Configurar las paradas del viaje
      const stops = {
        pickup: {
          address: pendingRequest.pickup || 'Punto de recogida',
          coordinates: pendingRequest.pickupLocation || null
        },
        destination: {
          address: pendingRequest.destination || 'Destino final', 
          coordinates: pendingRequest.destinationLocation || null
        },
        additionalStops: pendingRequest.additionalDestinations || []
      };
      setTripStops(stops);
      setCurrentStopIndex(0);
      
      setDriverStatus('busy');
      setShowRequestModal(false);
      setPendingRequest(null);
      setTripPhase('');
      
      // Cambiar automáticamente a la pestaña del mapa
      setActiveTab('map');
      
      Alert.alert('✅ Viaje Aceptado', `Te diriges hacia ${pendingRequest.user}`);
      
    } catch (error) {
      console.error('❌ Error aceptando viaje:', error);
      Alert.alert('Error', 'No se pudo conectar con el servidor');
    }
  };

  const rejectTrip = async () => {
    // Detener el timer cuando se rechaza el viaje
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    try {
      // NUEVO: Llamar al endpoint del backend para rechazar el viaje
      const tripId = pendingRequest?.id;
      const driverId = loggedDriver?.id || 1;
      
      if (tripId) {
        console.log(`❌ Rechazando viaje ${tripId}...`);
        
        const response = await fetch(`https://web-production-99844.up.railway.app/api/trips/reject/${tripId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            driver_id: driverId
          })
        });

        const data = await response.json();
        console.log('📋 Respuesta de rechazo:', data);
      }
      
      // NUEVO: Actualizar estadísticas al rechazar
      setDriverStats(prev => {
        const newRejected = prev.tripsRejected + 1;
        const newAcceptanceRate = prev.tripsOffered > 0 
          ? Math.round((prev.tripsAccepted / prev.tripsOffered) * 100)
          : 0;
        const newCancellationRate = prev.tripsOffered > 0
          ? Math.round((newRejected / prev.tripsOffered) * 100)
          : 0;
        
        return {
          ...prev,
          tripsRejected: newRejected,
          acceptanceRate: newAcceptanceRate,
          cancellationRate: newCancellationRate
        };
      });
      
      // Verificar si se deben aplicar penalizaciones
      const updatedStats = {
        ...driverStats,
        tripsRejected: driverStats.tripsRejected + 1,
        acceptanceRate: driverStats.tripsOffered > 0 
          ? Math.round((driverStats.tripsAccepted / driverStats.tripsOffered) * 100)
          : 0,
        cancellationRate: driverStats.tripsOffered > 0
          ? Math.round(((driverStats.tripsRejected + 1) / driverStats.tripsOffered) * 100)
          : 0,
        rating: 4.8
      };
      
      PenaltyService.checkAndApplyPenalties(updatedStats);
      
    } catch (error) {
      console.error('❌ Error rechazando viaje:', error);
    }
    
    setShowRequestModal(false);
    setPendingRequest(null);
    Alert.alert('Viaje Rechazado', 'La solicitud fue rechazada');
  };

  const completeTrip = async () => {
    if (!currentTrip) return;
    
    try {
      await SharedStorage.completeTrip();
      await SharedStorage.clearTripData();
      
      const tripEarning = currentTrip.estimatedPrice || 180;
      const newEarnings = {
        today: earnings.today + tripEarning,
        week: earnings.week + tripEarning,
        month: earnings.month + tripEarning
      };
      
      setEarnings(newEarnings);
      setCurrentTrip(null);
      setDriverStatus('online');
      setTripPhase(''); // Resetear la fase del viaje
      setUserLocation(null); // Limpiar ubicación
      
      Alert.alert('¡Viaje Completado!', `Ganancia: RD$${tripEarning}`);
      
    } catch (error) {
      console.error('❌ Error completando viaje:', error);
    }
  };

  // NUEVA FUNCIONALIDAD: Detección automática de llegada al destino
  const checkAutoCompleteTrip = () => {
    if (!currentTrip || !userLocation || tripPhase !== 'started') return;
    
    // Calcular distancia al destino
    const destLat = currentTrip.destinationLocation?.latitude;
    const destLon = currentTrip.destinationLocation?.longitude;
    
    if (!destLat || !destLon) return;
    
    const distance = getDistance(
      { latitude: userLocation.latitude, longitude: userLocation.longitude },
      { latitude: destLat, longitude: destLon }
    );
    
    // Si está a menos de 50 metros del destino
    if (distance < 50) {
      Alert.alert(
        '📍 Llegada al Destino',
        '¿Has llegado al destino? El viaje se completará automáticamente.',
        [
          { text: 'Aún no', style: 'cancel' },
          { 
            text: 'Sí, completar',
            onPress: () => completeTrip()
          }
        ]
      );
    }
  };

  // Función auxiliar para calcular distancia (Fórmula de Haversine)
  const getDistance = (point1, point2) => {
    const R = 6371e3; // Radio de la Tierra en metros
    const φ1 = point1.latitude * Math.PI/180;
    const φ2 = point2.latitude * Math.PI/180;
    const Δφ = (point2.latitude - point1.latitude) * Math.PI/180;
    const Δλ = (point2.longitude - point1.longitude) * Math.PI/180;
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c; // Distancia en metros
  };

  const testFCM = () => {
    fcmService.testNotification();
  };

  const simulateTrip = () => {
    fcmService.simulateTripRequest();
  };

  const renderDashboard = () => (
    <ScrollView style={styles.tabContent}>
      <Text style={styles.title}>🚖 Conductor App</Text>
      
      {/* Estado del Conductor */}
      <View style={styles.statusCard}>
        <Text style={styles.sectionTitle}>Estado del Conductor</Text>
        <Text style={[styles.status, { 
          color: driverStatus === 'online' ? '#22c55e' : 
                 driverStatus === 'suspended' ? '#ef4444' : '#ef4444' 
        }]}>
          {driverStatus === 'online' ? '🟢 En Línea' : 
           driverStatus === 'busy' ? '🟡 Ocupado' : 
           driverStatus === 'suspended' ? '🔒 Suspendido' : '🔴 Desconectado'}
        </Text>
        
        {driverStatus === 'suspended' ? (
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: '#6b7280' }]} 
            onPress={() => Alert.alert('Cuenta Suspendida', 'Contacta soporte para más información')}
          >
            <Text style={styles.buttonText}>📞 Contactar Soporte</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.button, { 
              backgroundColor: driverStatus === 'offline' ? '#22c55e' : '#ef4444' 
            }]} 
            onPress={toggleDriverStatus}
            disabled={driverStatus === 'busy'}
          >
            <Text style={styles.buttonText}>
              {driverStatus === 'offline' ? '⚡ Conectarse' : '⚡ Desconectarse'}
            </Text>
          </TouchableOpacity>
        )}

        {driverStatus === 'online' && (
          <Text style={styles.listeningText}>🔄 Escuchando solicitudes...</Text>
        )}
      </View>

      {/* Viaje Activo */}
      {currentTrip && (
        <View style={styles.tripCard}>
          <Text style={styles.sectionTitle}>🚗 Viaje Activo</Text>
          <Text style={styles.tripText}>Pasajero: {currentTrip.user}</Text>
          <Text style={styles.tripText}>Destino: {currentTrip.destination}</Text>
          <Text style={styles.tripText}>Precio: RD${currentTrip.estimatedPrice}</Text>
          
          {/* BOTONES SEGÚN LA FASE DEL VIAJE */}
          {tripPhase === '' && (
            <TouchableOpacity 
              style={[styles.completeButton, { backgroundColor: '#f59e0b' }]} 
              onPress={() => {
                setTripPhase('arrived');
                Alert.alert('✅ Llegada Confirmada', 'Esperando que el pasajero suba al vehículo');
              }}
            >
              <Text style={styles.buttonText}>📍 Ya Llegué</Text>
            </TouchableOpacity>
          )}
          
          {tripPhase === 'arrived' && (
            <TouchableOpacity 
              style={[styles.completeButton, { backgroundColor: '#3b82f6' }]} 
              onPress={() => {
                setTripPhase('started');
                Alert.alert('🚗 Viaje Iniciado', 'El viaje ha comenzado oficialmente');
              }}
            >
              <Text style={styles.buttonText}>▶️ Iniciar Viaje</Text>
            </TouchableOpacity>
          )}
          
          {tripPhase === 'started' && (
            <TouchableOpacity style={styles.completeButton} onPress={completeTrip}>
              <Text style={styles.buttonText}>✅ Completar Viaje</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Botón de Registro */}
      {!currentTrip && (
        <TouchableOpacity 
          style={styles.registerButton}
          onPress={() => setShowPreRegister(true)}
        >
          <Text style={styles.buttonText}>📝 Completar Registro</Text>
        </TouchableOpacity>
      )}

      {/* Botón de Documentos */}
      {!currentTrip && (
        <TouchableOpacity 
          style={styles.documentsButton}
          onPress={() => setShowDocumentUpload(true)}
        >
          <Text style={styles.buttonText}>📄 Cargar Documentos</Text>
        </TouchableOpacity>
      )}

      {/* Botón de Soporte 24/7 */}
      {!currentTrip && (
        <TouchableOpacity 
          style={styles.supportButton}
          onPress={() => setShowSupportChat(true)}
        >
          <Text style={styles.buttonText}>💬 Soporte 24/7</Text>
        </TouchableOpacity>
      )}

      {/* Ganancias */}
      <View style={styles.earningsCard}>
        <Text style={styles.sectionTitle}>💰 Ganancias</Text>
        <View style={styles.earningsRow}>
          <View style={styles.earningItem}>
            <Text style={styles.earningLabel}>Hoy</Text>
            <Text style={styles.earningAmount}>RD${earnings.today}</Text>
          </View>
          <View style={styles.earningItem}>
            <Text style={styles.earningLabel}>Semana</Text>
            <Text style={styles.earningAmount}>RD${earnings.week}</Text>
          </View>
          <View style={styles.earningItem}>
            <Text style={styles.earningLabel}>Mes</Text>
            <Text style={styles.earningAmount}>RD${earnings.month}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderMap = () => (
    <View style={styles.tabContent}>
      <MapComponent 
        currentTrip={currentTrip} 
        tripPhase={tripPhase}
        onLocationUpdate={(location) => {
          console.log('📍 Ubicación actualizada:', location);
          setUserLocation(location); // NUEVO: Capturar ubicación del usuario
        }}
      />
      
      {/* GESTOR DE PARADAS MÚLTIPLES */}
      {/* {currentTrip && tripStops && (
        <MultipleStopsManager
          stops={tripStops}
          currentStopIndex={currentStopIndex}
          tripStatus={tripPhase}
          onStopCompleted={(stopId) => {
            console.log('✅ Parada completada:', stopId);
            setCurrentStopIndex(currentStopIndex + 1);
          }}
          onNavigateToStop={(stop) => {
            console.log('🗺️ Navegar a:', stop.address);
            // Aquí puedes abrir Google Maps o tu navegación
            Alert.alert(
              'Navegar a parada',
              `¿Abrir navegación a ${stop.address}?`,
              [
                { text: 'Cancelar', style: 'cancel' },
                { 
                  text: 'Navegar', 
                  onPress: () => {
                    // Abrir Google Maps con la dirección
                    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.address)}`;
                    Linking.openURL(url);
                  }
                }
              ]
            );
          }}
        />
      )} */}
      
      {/* DASHCAM - Solo cuando el viaje está iniciado */}
      {currentTrip && tripPhase === 'started' && (
        <View style={{
          position: 'absolute',
          top: 100,
          left: 10,
          right: 10,
          zIndex: 10,
        }}>
          <DashcamComponent 
            isActive={tripPhase === 'started'}
            tripId={currentTrip.id || Date.now().toString()}
            onIncidentSaved={(incident) => {
              console.log('📹 Incidente guardado:', incident);
              Alert.alert(
                '✅ Video Guardado',
                'El incidente ha sido guardado exitosamente'
              );
            }}
          />
        </View>
      )}
      
      {/* Botones de Comunicación */}
      {currentTrip && (
        <View style={{
          position: 'absolute',
          top: 20,
          left: 10,
          right: 10,
          flexDirection: 'row',
          justifyContent: 'space-around',
          backgroundColor: 'white',
          padding: 10,
          borderRadius: 10,
          elevation: 5,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
        }}>
          <TouchableOpacity
            style={{
              backgroundColor: '#25D366',
              padding: 10,
              borderRadius: 8,
              flex: 0.45,
              alignItems: 'center',
            }}
            onPress={() => {
              if (currentTrip?.phone) {
                const message = encodeURIComponent('Ya llegué, estoy esperando');
                Linking.openURL(`whatsapp://send?phone=${currentTrip.phone}&text=${message}`);
              }
            }}
          >
            <Text style={{ color: 'white', fontWeight: 'bold' }}>💬 WhatsApp</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={{
              backgroundColor: '#007AFF',
              padding: 10,
              borderRadius: 8,
              flex: 0.45,
              alignItems: 'center',
            }}
            onPress={() => {
              if (currentTrip?.phone) {
                Linking.openURL(`tel:${currentTrip.phone}`);
              }
            }}
          >
            <Text style={{ color: 'white', fontWeight: 'bold' }}>📞 Llamar</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderEarnings = () => (
    <ScrollView style={styles.tabContent}>
      <Text style={styles.title}>📊 Mis Ganancias</Text>
      
      <View style={styles.earningsDetailCard}>
        <Text style={styles.sectionTitle}>Resumen Detallado</Text>
        
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Ganancias de hoy:</Text>
          <Text style={styles.statValue}>RD${earnings.today}</Text>
        </View>
        
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Esta semana:</Text>
          <Text style={styles.statValue}>RD${earnings.week}</Text>
        </View>
        
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Este mes:</Text>
          <Text style={styles.statValue}>RD${earnings.month}</Text>
        </View>
        
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Viajes completados:</Text>
          <Text style={styles.statValue}>8</Text>
        </View>
        
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Promedio por viaje:</Text>
          <Text style={styles.statValue}>RD${Math.round(earnings.today / 8)}</Text>
        </View>
        
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Calificación:</Text>
          <Text style={styles.statValue}>⭐ 4.8</Text>
        </View>
        
        {/* NUEVO: Métricas de desempeño */}
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Viajes ofrecidos:</Text>
          <Text style={styles.statValue}>{driverStats.tripsOffered}</Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Viajes aceptados:</Text>
          <Text style={styles.statValue}>{driverStats.tripsAccepted}</Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Viajes rechazados:</Text>
          <Text style={styles.statValue}>{driverStats.tripsRejected}</Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Tasa de aceptación:</Text>
          <Text style={[styles.statValue, { 
            color: driverStats.acceptanceRate >= 80 ? '#22c55e' : 
                   driverStats.acceptanceRate >= 60 ? '#f59e0b' : '#ef4444' 
          }]}>
            {driverStats.acceptanceRate}%
          </Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Tasa de cancelación:</Text>
          <Text style={[styles.statValue, { 
            color: driverStats.cancellationRate <= 20 ? '#22c55e' : 
                   driverStats.cancellationRate <= 30 ? '#f59e0b' : '#ef4444' 
          }]}>
            {driverStats.cancellationRate}%
          </Text>
        </View>
      </View>
    </ScrollView>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return renderDashboard();
      case 'map': return renderMap();
      case 'earnings': return renderEarnings();
      default: return renderDashboard();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#3b82f6" barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Conductor App</Text>
        {isOffline && (
          <View style={styles.offlineIndicator}>
            <Text style={styles.offlineText}>📡 Offline</Text>
          </View>
        )}
        <TouchableOpacity onPress={testFCM}>
          <Text style={styles.headerButton}>🔔</Text>
        </TouchableOpacity>
      </View>
      
      {/* Contenido */}
      {renderContent()}
      
      {/* Modal de Solicitud de Viaje */}
      <Modal
        visible={showRequestModal}
        transparent={true}
        animationType="slide"
        onRequestClose={rejectTrip}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.requestModal}>
            <Text style={styles.modalTitle}>🚗 Nueva Solicitud de Viaje</Text>
            
            {/* Contador de tiempo */}
            <View style={styles.timerContainer}>
              <Text style={styles.timerText}>
                ⏱️ Tiempo restante: {timeRemaining}s
              </Text>
              <View style={styles.timerBar}>
                <View 
                  style={[
                    styles.timerProgress, 
                    { 
                      width: `${(timeRemaining / 20) * 100}%`,
                      backgroundColor: timeRemaining > 10 ? '#22c55e' : 
                                       timeRemaining > 5 ? '#f59e0b' : '#ef4444'
                    }
                  ]} 
                />
              </View>
            </View>
            
            {pendingRequest && (
              <View style={styles.requestDetails}>
                <Text style={styles.requestText}>👤 Pasajero: {pendingRequest.user}</Text>
                <Text style={styles.requestText}>📍 Origen: {pendingRequest.pickup}</Text>
                <Text style={styles.requestText}>🎯 Destino: {pendingRequest.destination}</Text>
                <Text style={styles.requestText}>💰 Precio: RD${pendingRequest.estimatedPrice}</Text>
                <Text style={styles.requestText}>📏 Distancia: {pendingRequest.distance || '5.2 km'}</Text>
                <Text style={styles.requestText}>⏱️ Tiempo: {pendingRequest.estimatedTime}</Text>
                <Text style={styles.requestText}>📱 Teléfono: {pendingRequest.phone || '+1-809-555-0199'}</Text>
                <Text style={styles.requestText}>🚗 Vehículo: {pendingRequest.vehicleType || 'Confort'}</Text>
               <Text style={styles.requestTextBig}>💳 Pago: {pendingRequest.paymentMethod === 'card' ? 'Tarjeta de Crédito' : 'Efectivo'}</Text>
                
                {/* NUEVA SECCIÓN: Verificación de Identidad */}
                <View style={{
                  backgroundColor: '#fef3c7',
                  padding: 12,
                  borderRadius: 8,
                  marginTop: 10,
                  borderWidth: 1,
                  borderColor: '#fbbf24'
                }}>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: 'bold',
                    color: '#92400e',
                    marginBottom: 5
                  }}>
                    ⚠️ CONFIRMAR IDENTIDAD:
                  </Text>
                  <Text style={{
                    fontSize: 18,
                    fontWeight: 'bold',
                    color: '#451a03'
                  }}>
                    Preguntar: "¿Viaje para {pendingRequest.user}?"
                  </Text>
                  <Text style={{
                    fontSize: 14,
                    color: '#78350f',
                    marginTop: 5,
                    fontStyle: 'italic'
                  }}>
                    Solo inicia el viaje si confirma su nombre
                  </Text>
                </View>
              </View>
            )}
            
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.rejectButton} onPress={rejectTrip}>
                <Text style={styles.buttonText}>❌ Rechazar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.acceptButton} onPress={acceptTrip}>
                <Text style={styles.buttonText}>✅ Aceptar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Modal de Pre-Registro */}
      <Modal
        visible={showPreRegister}
        animationType="slide"
        onRequestClose={() => setShowPreRegister(false)}
      >
        <PreRegisterScreen 
          navigation={{
            navigate: () => {},
            goBack: () => setShowPreRegister(false),
            openLogin: () => {
              setShowPreRegister(false);
              setShowLogin(true);
            }
          }}
        />
      </Modal>
      
      {/* Modal de Login */}
      <Modal
        visible={showLogin}
        animationType="slide"
        onRequestClose={() => setShowLogin(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#3b82f6' }}>
          <StatusBar backgroundColor="#3b82f6" barStyle="light-content" />
          
          {/* Header */}
          <View style={{ padding: 20, paddingTop: 40 }}>
            <TouchableOpacity onPress={() => setShowLogin(false)}>
              <Text style={{ fontSize: 18, color: 'white', fontWeight: 'bold' }}>← Volver</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
            {/* Logo/Título */}
            <View style={{ alignItems: 'center', marginBottom: 40 }}>
              <Text style={{ fontSize: 32, fontWeight: 'bold', color: 'white', marginBottom: 10 }}>
                🚖 TaxiApp
              </Text>
              <Text style={{ fontSize: 18, color: 'white', opacity: 0.9 }}>
                Iniciar Sesión Conductor
              </Text>
            </View>

            {/* Formulario */}
            <View style={{ backgroundColor: 'white', borderRadius: 20, padding: 20 }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 20, color: '#1f2937' }}>
                Bienvenido de nuevo
              </Text>

              {/* Email */}
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                Correo Electrónico
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#d1d5db',
                  borderRadius: 8,
                  padding: 15,
                  fontSize: 16,
                  marginBottom: 20,
                  backgroundColor: '#f9fafb'
                }}
                placeholder="conductor@taxiapp.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={loginEmail}
                onChangeText={setLoginEmail}
              />

              {/* Password */}
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                Contraseña
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#d1d5db',
                  borderRadius: 8,
                  padding: 15,
                  fontSize: 16,
                  marginBottom: 10,
                  backgroundColor: '#f9fafb'
                }}
                placeholder="••••••••"
                secureTextEntry
                value={loginPassword}
                onChangeText={setLoginPassword}
              />

              {/* Olvidé mi contraseña */}
              <TouchableOpacity onPress={() => Alert.alert('Recuperar Contraseña', 'Contacta soporte en: soporte@taxiapp.com')}>
                <Text style={{ color: '#3b82f6', fontSize: 14, marginBottom: 20, textAlign: 'right' }}>
                  ¿Olvidaste tu contraseña?
                </Text>
              </TouchableOpacity>

              {/* Botón Login */}
              <TouchableOpacity 
                style={{ 
                  backgroundColor: loginLoading ? '#9ca3af' : '#22c55e',
                  padding: 15, 
                  borderRadius: 8, 
                  alignItems: 'center',
                  marginBottom: 15
                }}
                onPress={handleLogin}
                disabled={loginLoading}
              >
                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>
                  {loginLoading ? '⏳ Iniciando sesión...' : '🔐 Iniciar Sesión'}
                </Text>
              </TouchableOpacity>

              {/* Divider */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 20 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: '#e5e7eb' }} />
                <Text style={{ marginHorizontal: 10, color: '#6b7280' }}>o</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: '#e5e7eb' }} />
              </View>

              {/* Registrarse */}
              <TouchableOpacity 
                style={{ 
                  borderWidth: 2,
                  borderColor: '#3b82f6',
                  padding: 15, 
                  borderRadius: 8, 
                  alignItems: 'center'
                }}
                onPress={() => {
                  setShowLogin(false);
                  setShowPreRegister(true);
                }}
              >
                <Text style={{ color: '#3b82f6', fontWeight: 'bold', fontSize: 16 }}>
                  ¿No tienes cuenta? Regístrate
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
      
      {/* Modal de Documentos */}
      <Modal
        visible={showDocumentUpload}
        animationType="slide"
        onRequestClose={() => setShowDocumentUpload(false)}
      >
        <DocumentsMenuScreen 
          navigation={{
            navigate: () => {},
            goBack: () => setShowDocumentUpload(false)
          }}
        />
      </Modal>

      {/* Modal de Chat de Soporte 24/7 */}
      <Modal
        visible={showSupportChat}
        animationType="slide"
        onRequestClose={() => setShowSupportChat(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
          {/* Header del Chat */}
          <View style={{ 
            backgroundColor: '#06b6d4', 
            padding: 20, 
            flexDirection: 'row', 
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <TouchableOpacity onPress={() => setShowSupportChat(false)}>
              <Text style={{ color: 'white', fontSize: 18 }}>← Volver</Text>
            </TouchableOpacity>
            <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>
              Soporte 24/7
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ 
                width: 8, 
                height: 8, 
                borderRadius: 4, 
                backgroundColor: '#22c55e',
                marginRight: 5 
              }} />
              <Text style={{ color: 'white', fontSize: 12 }}>En línea</Text>
            </View>
          </View>

          {/* Mensaje de Bienvenida */}
          <ScrollView style={{ flex: 1, padding: 20 }}>
            <View style={{ 
              backgroundColor: '#e0f2fe', 
              padding: 15, 
              borderRadius: 10,
              marginBottom: 20 
            }}>
              <Text style={{ fontSize: 16, color: '#0c4a6e' }}>
                ¡Hola! 👋 Estamos aquí para ayudarte 24/7
              </Text>
              <Text style={{ fontSize: 14, color: '#0c4a6e', marginTop: 5 }}>
                ¿En qué podemos asistirte hoy?
              </Text>
            </View>

            {/* Opciones Rápidas */}
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 15 }}>
              Opciones Rápidas:
            </Text>
            
            <TouchableOpacity 
              style={{ 
                backgroundColor: '#fee2e2', 
                padding: 15, 
                borderRadius: 10,
                marginBottom: 10 
              }}
              onPress={() => {
                Alert.alert(
                  '🚨 Emergencia',
                  '¿Necesitas ayuda inmediata?',
                  [
                    { text: 'Llamar 911', onPress: () => Linking.openURL('tel:911') },
                    { text: 'Llamar Soporte', onPress: () => Linking.openURL('tel:8095551234') },
                    { text: 'Cancelar', style: 'cancel' }
                  ]
                );
              }}
            >
              <Text style={{ fontSize: 16, color: '#991b1b' }}>
                🚨 Emergencia en el viaje
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={{ 
                backgroundColor: '#fef3c7', 
                padding: 15, 
                borderRadius: 10,
                marginBottom: 10 
              }}
              onPress={() => {
                Alert.alert(
                  '💰 Problema con el pago',
                  'Selecciona el tipo de problema:',
                  [
                    { text: 'No recibí el pago', onPress: () => Alert.alert('Soporte', 'Un agente revisará tu caso en breve') },
                    { text: 'Pago incorrecto', onPress: () => Alert.alert('Soporte', 'Verificaremos el monto del viaje') },
                    { text: 'Cancelar', style: 'cancel' }
                  ]
                );
              }}
            >
              <Text style={{ fontSize: 16, color: '#92400e' }}>
                💰 Problema con el pago
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={{ 
                backgroundColor: '#dbeafe', 
                padding: 15, 
                borderRadius: 10,
                marginBottom: 10 
              }}
              onPress={() => {
                Alert.alert(
                  '📱 Error en la aplicación',
                  '¿Qué problema estás experimentando?',
                  [
                    { text: 'App se congela', onPress: () => Alert.alert('Tip', 'Intenta reiniciar la aplicación') },
                    { text: 'GPS no funciona', onPress: () => Alert.alert('Tip', 'Verifica los permisos de ubicación') },
                    { text: 'Otro problema', onPress: () => Alert.alert('Soporte', 'Describe el problema en el chat') }
                  ]
                );
              }}
            >
              <Text style={{ fontSize: 16, color: '#1e40af' }}>
                📱 Error en la aplicación
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={{ 
                backgroundColor: '#e9d5ff', 
                padding: 15, 
                borderRadius: 10,
                marginBottom: 10 
              }}
              onPress={() => {
                Alert.alert(
                  '🚗 Problema con el vehículo',
                  '¿Qué sucedió con tu vehículo?',
                  [
                    { text: 'Avería mecánica', onPress: () => Alert.alert('Asistencia', 'Enviando grúa a tu ubicación') },
                    { text: 'Sin combustible', onPress: () => Alert.alert('Tip', 'Ubicando gasolinera más cercana') },
                    { text: 'Accidente', onPress: () => Linking.openURL('tel:911') }
                  ]
                );
              }}
            >
              <Text style={{ fontSize: 16, color: '#6b21a8' }}>
                🚗 Problema con el vehículo
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Input para escribir mensaje */}
          <View style={{ 
            flexDirection: 'row', 
            padding: 15, 
            backgroundColor: 'white',
            borderTopWidth: 1,
            borderTopColor: '#e5e7eb'
          }}>
            <TextInput
              style={{ 
                flex: 1, 
                borderWidth: 1, 
                borderColor: '#e5e7eb',
                borderRadius: 25,
                paddingHorizontal: 15,
                paddingVertical: 10,
                marginRight: 10
              }}
              placeholder="Escribe tu mensaje..."
              placeholderTextColor="#9ca3af"
            />
            <TouchableOpacity style={{ 
              backgroundColor: '#06b6d4',
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 25,
              justifyContent: 'center'
            }}>
              <Text style={{ color: 'white', fontWeight: 'bold' }}>
                Enviar
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
      
      {/* Navegación Inferior */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          onPress={() => setActiveTab('dashboard')} 
          style={[styles.tabButton, activeTab === 'dashboard' && styles.tabButtonActive]}
        >
          <Text style={[styles.tabText, activeTab === 'dashboard' && styles.tabTextActive]}>
            📊 Dashboard
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => setActiveTab('map')} 
          style={[styles.tabButton, activeTab === 'map' && styles.tabButtonActive]}
        >
          <Text style={[styles.tabText, activeTab === 'map' && styles.tabTextActive]}>
            🗺️ Mapa
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => setActiveTab('earnings')} 
          style={[styles.tabButton, activeTab === 'earnings' && styles.tabButtonActive]}
        >
          <Text style={[styles.tabText, activeTab === 'earnings' && styles.tabTextActive]}>
            💰 Ganancias
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#3b82f6',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerButton: {
    color: 'white',
    fontSize: 24,
  },
  offlineIndicator: {
    backgroundColor: '#fbbf24',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  offlineText: {
    color: '#92400e',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingVertical: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  tabButtonActive: {
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    marginHorizontal: 5,
  },
  tabText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  tabContent: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 20,
  },
  statusCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 10,
  },
  status: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#22c55e',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  listeningText: {
    textAlign: 'center',
    color: '#6b7280',
    marginTop: 10,
    fontStyle: 'italic',
  },
  tripCard: {
    backgroundColor: '#dbeafe',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  tripText: {
    fontSize: 14,
    color: '#1f2937',
    marginBottom: 5,
  },
  completeButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  registerButton: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  documentsButton: {
    backgroundColor: '#f59e0b',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  supportButton: {
    backgroundColor: '#06b6d4',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  earningsCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  earningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  earningItem: {
    alignItems: 'center',
  },
  earningLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 5,
  },
  earningAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  testSection: {
    backgroundColor: '#f3f4f6',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  testButton: {
    backgroundColor: '#6b7280',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  mapOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -100 }, { translateY: -50 }],
    alignItems: 'center',
  },
  mapText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  mapSubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 5,
  },
  earningsDetailCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  statLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestModal: {
    backgroundColor: 'white',
    margin: 20,
    padding: 25,
    borderRadius: 15,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#1f2937',
  },
  timerContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  timerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 10,
  },
  timerBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  timerProgress: {
    height: '100%',
    borderRadius: 4,
    transition: 'width 1s ease',
  },
  requestDetails: {
    marginBottom: 20,
  },
  requestText: {
    fontSize: 16,
    marginBottom: 8,
    color: '#374151',
  },
  requestTextBig: {
    fontSize: 24,
    marginBottom: 10,
    color: '#374151',
    fontWeight: 'bold',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#22c55e',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
});
