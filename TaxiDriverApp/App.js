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
  ActivityIndicator,
} from 'react-native';
import SharedStorage, { TRIP_STATES } from './SharedStorage';
import BackgroundService from 'react-native-background-actions';
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
import Geolocation from '@react-native-community/geolocation';
import Sound from 'react-native-sound';
import { NativeModules, AppState } from 'react-native';
const { BringToForeground, OverlayPermission, TripIntent } = NativeModules;

// Variable global para el sonido (accesible desde cualquier lugar)
let globalSoundInstance = null;
let globalSoundCancelled = false;
let globalTripCancelled = false;
let globalCancelledTripId = null;
let globalSetShowRequestModal = null;
let globalSetPendingRequest = null;
let globalSetActiveTab = null;
let globalSetCurrentTrip = null;
let globalSetDriverStatus = null;
let globalTimerRef = null;
//import MultipleStopsManager from './components/MultipleStopsManager';

const { width, height } = Dimensions.get('window');

import { LogBox } from 'react-native';
LogBox.ignoreAllLogs(true);
// NORMALIZACIÓN DE DATOS DEL VIAJE (snake_case → camelCase)
const normalizeTrip = (trip, fcmData = {}) => {
  if (!trip) return null;
  
  return {
    id: trip.id || fcmData.id,
    user: fcmData.user || trip.user_name || 'Pasajero',
    phone: fcmData.phone || trip.user_phone || '',
    pickup: trip.pickup_location || fcmData.pickup || '',
    destination: trip.destination || fcmData.destination || '',
    // Coordenadas de pickup (prioridad: BD > FCM)
    pickupLat: parseFloat(trip.pickup_lat) || parseFloat(fcmData.pickupLat) || null,
    pickupLng: parseFloat(trip.pickup_lng) || parseFloat(fcmData.pickupLng) || null,
    // Coordenadas de destino (prioridad: BD > FCM)
    destinationLat: parseFloat(trip.destination_lat) || parseFloat(fcmData.destinationLat) || null,
    destinationLng: parseFloat(trip.destination_lng) || parseFloat(fcmData.destinationLng) || null,
    // Otros datos
    price: parseFloat(trip.price) || parseFloat(fcmData.estimatedPrice) || 0,
    status: trip.status || 'assigned',
    vehicleType: fcmData.vehicleType || 'economy',
    paymentMethod: fcmData.paymentMethod || 'cash',
    distance: fcmData.distance || '',
// Para terceros y paquetes
    isForOther: fcmData.isForOther || false,
    passengerInfo: fcmData.passengerInfo || null,
    tripCode: trip.trip_code || fcmData.tripCode || null,
    thirdPartyName: trip.third_party_name || fcmData.thirdPartyName || null,
    thirdPartyPhone: trip.third_party_phone || fcmData.thirdPartyPhone || null,
  };
};

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
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [codeError, setCodeError] = useState('');

  // Exponer setters globalmente para acceso desde FCM
 globalSetShowRequestModal = setShowRequestModal;
  globalSetPendingRequest = setPendingRequest;
  globalSetActiveTab = setActiveTab;
  globalSetCurrentTrip = setCurrentTrip;
  globalSetDriverStatus = setDriverStatus;
  const [isOffline, setIsOffline] = useState(false);
  const [tripPhase, setTripPhase] = useState(''); // AGREGADO: '', 'arrived', 'started'
  const [isNavigatingToPickup, setIsNavigatingToPickup] = useState(false); // NUEVO: Solo detectar llegada despu�s de presionar 'Al pasajero'
  const [showDashcam, setShowDashcam] = useState(false);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [tripStops, setTripStops] = useState(null);
  const [userLocation, setUserLocation] = useState(null); // NUEVO: Estado para ubicación del usuario
  const [locationInterval, setLocationInterval] = useState(null); // Para controlar el intervalo de ubicación
  const [showEarningsDetail, setShowEarningsDetail] = useState(false);
  const [earningsDetailData, setEarningsDetailData] = useState({ period: '', trips: [], total: 0 });
  const [loadingEarnings, setLoadingEarnings] = useState(false);  
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

  const statsLoadedRef = useRef(false);  

  const driverStatsRef = useRef({
    tripsOffered: 0,
    tripsAccepted: 0,
    tripsRejected: 0,
    tripsCancelled: 0,
    acceptanceRate: 100,
    cancellationRate: 0
  });

// Sincronizar ref con state y persistir
  React.useEffect(() => {
    driverStatsRef.current = driverStats;
    if (statsLoadedRef.current) {
      AsyncStorage.setItem('@driver_stats', JSON.stringify(driverStats)).catch(() => {});
    }
  }, [driverStats]);
  
  const timerRef = useRef(null);
  const soundRef = useRef(null);
 const soundCancelledRef = useRef(false);
  const clearTripFnRef = useRef(null);
const appStateRef = useRef(AppState.currentState);
const gpsAlertShownRef = useRef(false);
const currentTripRef = useRef(null);
const userLocationRef = useRef(null);

// Mantener refs sincronizados con estados (para acceso en listeners)
currentTripRef.current = currentTrip;
userLocationRef.current = userLocation;

// Función de limpieza actualizada en cada render (evita stale closure)
clearTripFnRef.current = () => {
    console.log('🧹 Ejecutando limpieza con refs actualizadas');
    
    // Marcar como cancelado en AMBAS variables
    soundCancelledRef.current = true;
    globalSoundCancelled = true;
    
    // Intentar detener usando ref
    if (soundRef.current) {
      console.log('🔇 Deteniendo sonido (soundRef)...');
      soundRef.current.stop();
      soundRef.current.release();
      soundRef.current = null;
      console.log('✅ Sonido detenido via soundRef');
    }
    
    // Intentar detener usando variable global
    if (globalSoundInstance) {
      console.log('🔇 Deteniendo sonido (globalSoundInstance)...');
      globalSoundInstance.stop();
      globalSoundInstance.release();
      globalSoundInstance = null;
      console.log('✅ Sonido detenido via globalSoundInstance');
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setCurrentTrip(null);
    setTripPhase('');
    setPendingRequest(null);
    setShowRequestModal(false);
    setCurrentStopIndex(0);
    setTripStops(null);
    setDriverStatus('online');
  setActiveTab('dashboard');
  };

  // FUNCIÓN PARA CARGAR GANANCIAS REALES DESDE EL SERVIDOR
  const loadRealEarnings = async (driverId) => {
    if (!driverId) return;
    try {
      console.log('📊 Cargando ganancias reales del servidor...');
      
      const [todayRes, weekRes, monthRes] = await Promise.all([
        fetch(`https://web-production-99844.up.railway.app/api/trips/driver-history/${driverId}?period=today`),
        fetch(`https://web-production-99844.up.railway.app/api/trips/driver-history/${driverId}?period=week`),
        fetch(`https://web-production-99844.up.railway.app/api/trips/driver-history/${driverId}?period=month`)
      ]);
      
      const [todayData, weekData, monthData] = await Promise.all([
        todayRes.json(),
        weekRes.json(),
        monthRes.json()
      ]);
      
      const newEarnings = {
        today: todayData.success ? (todayData.totalEarnings || 0) : 0,
        week: weekData.success ? (weekData.totalEarnings || 0) : 0,
        month: monthData.success ? (monthData.totalEarnings || 0) : 0
      };
      
      setEarnings(newEarnings);
      console.log('✅ Ganancias actualizadas:', newEarnings);
    } catch (error) {
      console.error('❌ Error cargando ganancias:', error);
    }
  };

useEffect(() => {
    // Cargar conductor guardado
    const loadSavedDriver = async () => {
 
      try {
        const savedDriver = await AsyncStorage.getItem('loggedDriver');
    if (savedDriver) {
          const driver = JSON.parse(savedDriver);
          setLoggedDriver(driver);
          console.log('✅ Conductor cargado desde almacenamiento');
          // Cargar ganancias reales del servidor
          loadRealEarnings(driver.id);
        }
      } catch (error) {
        console.error('Error cargando conductor:', error);
      }
    };
    loadSavedDriver();
    // Verificar si hay viaje pendiente de notificación en background
 const checkPendingTripFromBackground = async () => {
      try {
        const pendingTripStr = await AsyncStorage.getItem('pending_trip_request');
        if (pendingTripStr) {
          const tripData = JSON.parse(pendingTripStr);
          console.log('🚕 Viaje pendiente de background encontrado:', tripData);

          // VERIFICAR si este viaje ya fue cancelado
          if (global.cancelledTripId && global.cancelledTripId === tripData.id) {
            console.log('🚫 Viaje pendiente ya fue cancelado, ignorando');
            await AsyncStorage.removeItem('pending_trip_request');
            global.cancelledTripId = null; // Limpiar
            return;
          }

          // Verificar que no sea muy antiguo (máximo 2 minutos)
          const age = Date.now() - (tripData.timestamp || 0);
          if (age < 120000) {
        // Mostrar la solicitud como si llegara de FCM
            setTimeout(() => {
              // Verificar si el viaje fue cancelado mientras esperábamos
              if (globalTripCancelled || (global.cancelledTripId && global.cancelledTripId === tripData.id)) {
                console.log('🚫 Viaje cancelado durante espera, no mostrar modal');
                return;
              }
              if (global.handleNewTripRequest) {
                global.handleNewTripRequest(tripData);
              }
            }, 1500);
          } else {
            console.log('⏰ Viaje pendiente expirado, ignorando');
          }
          
          // Limpiar el viaje pendiente
          await AsyncStorage.removeItem('pending_trip_request');
        }
      } catch (error) {
        console.log('Error verificando viaje pendiente de background:', error);
      }
    };
    checkPendingTripFromBackground();
    // Verificar si hay viaje pendiente de TripRequestActivity
    const checkPendingTrip = async () => {
      try {
        if (TripIntent) {
          const pendingTrip = await TripIntent.getPendingTrip();
          if (pendingTrip && pendingTrip.tripId) {
            console.log('🚕 Viaje pendiente encontrado:', pendingTrip);
            // Simular la solicitud como si viniera de FCM
            const tripData = {
              id: pendingTrip.tripId,
              user: pendingTrip.user || 'Pasajero',
              phone: pendingTrip.phone || '',
              pickup: pendingTrip.pickup || '',
              destination: pendingTrip.destination || '',
              estimatedPrice: parseFloat(pendingTrip.estimatedPrice) || 0,
              distance: pendingTrip.distance || '',
              paymentMethod: pendingTrip.paymentMethod || 'cash',
              pickupLat: parseFloat(pendingTrip.pickupLat) || null,
              pickupLng: parseFloat(pendingTrip.pickupLng) || null,
              destinationLat: parseFloat(pendingTrip.destinationLat) || null,
              destinationLng: parseFloat(pendingTrip.destinationLng) || null,
              additionalStops: JSON.parse(pendingTrip.additionalStops || '[]'),
              type: 'NEW_TRIP_REQUEST',
            };
        // Auto-aceptar el viaje (ya fue aceptado en pantalla nativa)
            setTimeout(() => {
              if (global.autoAcceptTrip) {
                global.autoAcceptTrip(tripData);
              }
            }, 1000);
          }
        }
      } catch (error) {
        console.log('Error verificando viaje pendiente:', error);
      }
    };
   checkPendingTrip();
    
  // Listener para verificar viaje pendiente cuando app vuelve al foreground DESDE BACKGROUND
    const appStateListener = AppState.addEventListener('change', (nextAppState) => {
      // Solo ejecutar si viene de background/inactive a active
      if (nextAppState === 'active' && appStateRef.current.match(/inactive|background/)) {
        console.log('📱 App volvió al foreground desde background, verificando viaje pendiente...');
        checkPendingTrip();
      }
      appStateRef.current = nextAppState;
    });
    
    // Inicializar FCM cuando la app carga
    fcmService.initialize();

    // Consultar comunicados pendientes al abrir la app
    const checkUnreadCommunications = async () => {
      try {
        const savedDriver = await AsyncStorage.getItem('loggedDriver');
        if (savedDriver) {
          const driver = JSON.parse(savedDriver);
          const response = await fetch(`https://web-production-99844.up.railway.app/api/communications/unread/${driver.id}`);
          const data = await response.json();
          
          if (data.success && data.count > 0) {
            // Mostrar cada comunicado no leído
            for (const comm of data.unread) {
              Alert.alert(
                `📢 ${comm.subject}`,
                comm.message,
                [{
                  text: 'OK',
                  onPress: async () => {
                    // Marcar como leído
                    await fetch('https://web-production-99844.up.railway.app/api/communications/mark-read', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ communicationId: comm.id, driverId: driver.id })
                    });
                  }
                }]
              );
            }
          }
        }
      } catch (error) {
        console.log('Error verificando comunicados:', error);
      }
    };
    
    // Ejecutar después de 2 segundos para que la app cargue primero
    setTimeout(checkUnreadCommunications, 2000);
    
    // Cargar estadísticas persistidas
    const loadStats = async () => {
      try {
        const saved = await AsyncStorage.getItem('@driver_stats');
        if (saved) {
          const parsed = JSON.parse(saved);
    setDriverStats(parsed);
          console.log('📊 Stats cargados:', JSON.stringify(parsed));
          statsLoadedRef.current = true;
        } else {
         statsLoadedRef.current = true;
        }
      } catch (e) {}
    };
    loadStats();

// Verificar si el conductor está suspendido (BACKEND)
    const checkDriverStatus = async () => {
      try {
        const suspRes = await fetch(`https://web-production-99844.up.railway.app/api/drivers/check-suspension/${loggedDriver?.id || 1}`);
        const suspData = await suspRes.json();
        if (suspData.isSuspended) {
          const expiraHora = suspData.expiresAt 
            ? new Date(suspData.expiresAt).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })
            : '';
          if (suspData.type === 'PERMANENT') {
            Alert.alert(
              '❌ Cuenta Suspendida',
              `Tu cuenta está suspendida permanentemente.\nRazón: ${suspData.reason}\n\nContacta soporte para apelar.`,
              [{ text: 'OK' }]
            );
          } else {
            Alert.alert(
              '🔒 Suspensión Temporal',
              `Suspendido por ${suspData.hoursRemaining?.toFixed(1)} hora(s) más.\nRazón: ${suspData.reason}\n\nPodrás trabajar después de las ${expiraHora}.`,
              [{ text: 'OK' }]
            );
          }
          setDriverStatus('suspended');
          return;
        }
      } catch (error) {
        console.log('⚠️ Error verificando suspensión backend, usando local');
        const suspensionStatus = await PenaltyService.checkSuspensionStatus();
        if (suspensionStatus.isSuspended) {
          setDriverStatus('suspended');
          Alert.alert('🔒 Cuenta Suspendida', 'Tu cuenta está suspendida temporalmente.', [{ text: 'OK' }]);
          return;
        }
      }
    };
    
    checkDriverStatus();

   // Configurar callbacks de SmartSyncService para recálculo de ruta
    SmartSyncService.setCallbacks({
      onTripSynced: (tripData) => {
        console.log('📡 Viaje sincronizado desde servidor:', tripData);
        if (tripData.status === 'cancelled') {
          Alert.alert(
            '❌ Viaje Cancelado',
            'El viaje fue cancelado mientras estabas sin conexión.',
            [{ text: 'OK' }]
          );
          setCurrentTrip(null);
          setTripPhase('');
          setDriverStatus('online');
        }
      },
      onRouteRecalculateNeeded: (location) => {
        console.log('🔄 Recalculando ruta desde ubicación actual...');
        // Forzar actualización de ubicación para que MapComponent recalcule
        setUserLocation({ ...location, forceRecalculate: true });
      }
    });

  // Configurar monitoreo de conexión offline
    let wasOffline = false;
    const unsubscribe = OfflineService.addConnectionListener((isOnline) => {
      const previouslyOffline = wasOffline;
      wasOffline = !isOnline;
      setIsOffline(!isOnline);
      if (!isOnline) {
        // Guardar viaje activo cuando se pierde conexión
   if (currentTripRef.current) {
          SmartSyncService.saveActiveTrip(currentTripRef.current);
          console.log('💾 Viaje guardado localmente por pérdida de conexión');
        }
        if (userLocationRef.current) {
          SmartSyncService.saveLastLocation(userLocationRef.current);
        }
        Alert.alert(
          '📡 Sin Conexión a Internet',
          'Estás trabajando en modo offline. Los viajes se sincronizarán cuando vuelvas a tener conexión.',
          [{ text: 'OK' }]
        );
} else if (previouslyOffline && isOnline) {
        console.log('✅ Conexión restaurada - iniciando sincronización');
        console.log('🔍 DEBUG refs: currentTripRef=', !!currentTripRef.current, 'userLocationRef=', !!userLocationRef.current);
        
       // Si hay viaje activo, reproducir voz y recalcular ruta (SIN ALERT)
        if (currentTripRef.current && userLocationRef.current) {
          console.log('🔄 Recalculando ruta tras reconexión...');
          
      // Mensaje de voz
          const Speech = require('react-native-tts').default;
          Speech.setDefaultLanguage('es-MX');
          Speech.setDefaultRate(0.5);
          Speech.speak('Sincronizando ruta');
          
          // Forzar recálculo de ruta
          setUserLocation(prev => ({
            ...prev,
            forceRecalculate: true,
            reconnected: true
          }));
        }
        
      // Reenviar estado al servidor
        if ((driverStatus === 'online' || currentTripRef.current) && loggedDriver) {
          console.log('🔄 Reenviando estado al servidor...');
          fetch(`${API_URL}/drivers/update-status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              driverId: loggedDriver.id,
              status: 'online',
              isOnline: true
            })
          }).then(response => {
            if (response.ok) {
              console.log('✅ Estado restaurado en servidor');
              if (userLocation) {
                fetch(`${API_URL}/drivers/update-location`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    driverId: loggedDriver.id,
                    latitude: userLocation.latitude,
                    longitude: userLocation.longitude
                  })
                }).then(() => console.log('✅ Ubicación actualizada tras reconexión'));
              }
            }
          }).catch(err => console.error('❌ Error restaurando estado:', err));
        }
        
        // Sincronizar sin mostrar alert
        SmartSyncService.syncOnReconnect(userLocation, currentTrip);
      }
    });
    
    // Verificar conexión inicial
    OfflineService.checkConnection().then(isOnline => {
      setIsOffline(!isOnline);
    });
    
// Configurar función global para manejar solicitudes de viaje
global.handleNewTripRequest = (tripData) => {
  console.log('🚗 Nueva solicitud recibida via FCM:', tripData);

  // Solo ignorar si es el MISMO viaje que fue cancelado recientemente
  if (globalCancelledTripId && String(globalCancelledTripId) === String(tripData.id)) {
    console.log('🚫 Este viaje específico fue cancelado, ignorando:', tripData.id);
    return;
  }

  // Resetear banderas para viaje nuevo (diferente al cancelado)
  globalTripCancelled = false;
  
soundCancelledRef.current = false; // Reset para nueva solicitud
  globalSoundCancelled = false; // Reset variable global también
  // 🔔 TRAER APP AL FRENTE (como inDrive)
  if (BringToForeground) {
    BringToForeground.bringAppToForeground();
  }

  setPendingRequest(tripData);
      setShowRequestModal(true);
      startRequestTimer(); // Iniciar el timer cuando llega una solicitud

    // 🔊 NUEVO: Reproducir voz "Nuevo Servicio" 5 veces
Sound.setCategory('Playback');
      const moneySound = new Sound('money_sound.mp3', Sound.MAIN_BUNDLE, (error) => {
        if (!error) {
          soundRef.current = moneySound; // Guardar referencia
          globalSoundInstance = moneySound; // Guardar en variable global
          let playCount = 0;
      const playSound = () => {
            if (playCount < 7 && soundRef.current && !soundCancelledRef.current && !globalSoundCancelled) {
              playCount++;
              moneySound.play((success) => {
                if (success && soundRef.current && !soundCancelledRef.current && !globalSoundCancelled) {
                  playSound();
                }
              });
            }
          };
          playSound();
        }
      });
    };
    // Función para auto-aceptar viaje (desde TripRequestActivity nativa)
     // Función para limpiar viaje cuando el usuario cancela
global.clearCurrentTrip = async () => {
  console.log('🗑️ Limpiando viaje cancelado por el usuario');

  // MARCAR VIAJE COMO CANCELADO (guardar ID específico)
  globalTripCancelled = true;
  const cancelledId = globalSetPendingRequest ? pendingRequest?.id : null;
  if (cancelledId) {
    globalCancelledTripId = cancelledId;
    console.log('🚫 Trip cancelado guardado:', globalCancelledTripId);
    // Limpiar después de 30 segundos para permitir viajes nuevos
    setTimeout(() => {
      if (globalCancelledTripId === cancelledId) {
        globalCancelledTripId = null;
        globalTripCancelled = false;
        console.log('✅ Banderas de cancelación limpiadas automáticamente');
      }
    }, 30000);
  }

  // DETENER SONIDO INMEDIATAMENTE usando variables globales
  globalSoundCancelled = true;
  if (globalSoundInstance) {
    console.log('🔇 Deteniendo sonido via globalSoundInstance...');
    try {
      globalSoundInstance.stop();
      globalSoundInstance.release();
    } catch (e) {
      console.log('⚠️ Error deteniendo sonido:', e);
    }
    globalSoundInstance = null;
    console.log('✅ Sonido detenido');
  }

// IMPORTANTE: Eliminar viaje pendiente de AsyncStorage para evitar que se reproduzca sonido al volver al foreground
  try {
    await AsyncStorage.removeItem('pending_trip_request');
    console.log('🗑️ Viaje pendiente eliminado de AsyncStorage');
  } catch (e) {
    console.log('⚠️ Error eliminando viaje pendiente:', e);
  }

// DETENER TIMER INMEDIATAMENTE (ambas referencias)
  console.log('🔍 DEBUG: globalTimerRef =', globalTimerRef);
  console.log('🔍 DEBUG: timerRef exists =', !!timerRef, 'timerRef.current =', timerRef?.current);
  if (globalTimerRef) {
    clearInterval(globalTimerRef);
    globalTimerRef = null;
    console.log('✅ Timer detenido via globalTimerRef');
  }
  if (timerRef && timerRef.current) {
    clearInterval(timerRef.current);
    timerRef.current = null;
    console.log('✅ Timer detenido via timerRef');
  }

// CERRAR MODAL Y LIMPIAR ESTADO usando setters globales
  if (globalSetShowRequestModal) {
    globalSetShowRequestModal(false);
    console.log('✅ Modal cerrado via setter global');
  }
  if (globalSetPendingRequest) {
    globalSetPendingRequest(null);
  }
if (globalSetCurrentTrip) {
    globalSetCurrentTrip(null);
    console.log('✅ Viaje activo limpiado via setter global');
  }
  if (globalSetDriverStatus) {
    globalSetDriverStatus('online');
    console.log('✅ Estado cambiado a ONLINE via setter global');
  }
  if (globalSetActiveTab) {
    globalSetActiveTab('dashboard');
  }

  // Mostrar Alert en el centro después de cerrar modal
  setTimeout(() => {
    Alert.alert(
      '❌ VIAJE CANCELADO',
      'El usuario ha cancelado el viaje.\n\nMotivo: Cancelado por el usuario',
      [{ text: 'ENTENDIDO', style: 'default' }],
      { cancelable: false }
    );
  }, 400);

  // IMPORTANTE: Notificar al servidor que el conductor está disponible
  try {
    const driverId = loggedDriver?.id || 1;
    const response = await fetch('https://web-production-99844.up.railway.app/api/drivers/status', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driverId: driverId, status: 'online', isOnline: true })
    });
    if (response.ok) {
      console.log('✅ Estado actualizado en servidor: ONLINE (después de cancelación)');
    }
  } catch (error) {
    console.log('⚠️ Error actualizando estado en servidor:', error.message);
  }
};
global.autoAcceptTrip = async (tripData) => {
      console.log('🚗 Auto-aceptando viaje desde pantalla nativa:', tripData);
      
      try {
        const tripId = tripData.id;
        
        // Obtener driver de AsyncStorage si loggedDriver no está disponible
        let driverId = loggedDriver?.id;
        if (!driverId) {
          const savedDriver = await AsyncStorage.getItem('loggedDriver');
          if (savedDriver) {
            const driver = JSON.parse(savedDriver);
            driverId = driver.id;
            console.log('📦 Driver ID obtenido de AsyncStorage:', driverId);
          }
        }
        
        if (!driverId) {
          console.error('❌ No se pudo obtener driver ID');
          Alert.alert('Error', 'No se pudo identificar al conductor');
          return;
        }
        console.log(`✅ Auto-aceptando viaje ${tripId}...`);
        
        const response = await fetch(`https://web-production-99844.up.railway.app/api/trips/accept/${tripId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            driver_id: driverId,
            driverLat: userLocation?.latitude || null,
            driverLng: userLocation?.longitude || null
          })
        });

        const data = await response.json();
        
        if (!response.ok || !data.success) {
          Alert.alert('Error', data.error || 'No se pudo aceptar el viaje.');
          return;
        }

        console.log('✅ Viaje auto-aceptado en el servidor:', data);
        
        // Normalizar datos
        const normalizedTrip = normalizeTrip(data.trip, tripData);
        setCurrentTrip(normalizedTrip);
        
        // Configurar paradas
        const stops = {
          pickup: {
            address: normalizedTrip.pickup || 'Punto de recogida',
            coordinates: normalizedTrip.pickupLat ? {
              latitude: normalizedTrip.pickupLat,
              longitude: normalizedTrip.pickupLng
            } : null
          },
          destination: {
            address: normalizedTrip.destination || 'Destino final',
            coordinates: normalizedTrip.destinationLat ? {
              latitude: normalizedTrip.destinationLat,
              longitude: normalizedTrip.destinationLng
            } : null
          },
         additionalStops: tripData.additionalStops || []
        };
        setTripStops(stops);
        setCurrentStopIndex(0);
        
        setDriverStatus('busy');
        setActiveTab('map');
        setTripPhase('');
        
        Alert.alert('✅ Viaje Aceptado', `Te diriges hacia ${tripData.user}`);
        
      } catch (error) {
        console.error('❌ Error auto-aceptando viaje:', error);
        Alert.alert('Error', 'No se pudo conectar con el servidor');
      }
    };
    // Solicitar permisos de ubicación
    requestLocationPermissions();
    
 // Cleanup del timer cuando el componente se desmonta
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      stopLocationTracking(); // Detener tracking al desmontar
      stopBackgroundTracking(); // Detener background tracking al desmontar
      unsubscribe(); // Limpiar listener de conexión
      appStateListener.remove(); // Limpiar listener de AppState
    };
}, []);

 // useEffect para actualizar ganancias periódicamente (cada 60 segundos)
  useEffect(() => {
    if (!loggedDriver?.id || driverStatus === 'offline') return;

    const interval = setInterval(() => {
      console.log('🔄 Actualizando ganancias periódicamente...');
      loadRealEarnings(loggedDriver.id);
    }, 60000); // Cada 60 segundos

    return () => clearInterval(interval);
  }, [loggedDriver?.id, driverStatus]);

  // useEffect para POLLING de viajes pendientes (respaldo de FCM)
  useEffect(() => {
    if (!loggedDriver?.id || driverStatus !== 'online') return;
    
    console.log('🔄 Iniciando polling de viajes pendientes...');
    
    const pollPendingTrips = async () => {
      try {
        // No hacer polling si ya hay un viaje activo o modal abierto
        if (currentTrip || showRequestModal || pendingRequest) {
          return;
        }
        
        const response = await fetch(
          `https://web-production-99844.up.railway.app/api/trips/pending-for-driver/${loggedDriver.id}`
        );
        const data = await response.json();
        
        if (data.success && data.trip) {
          const tripData = {
            id: String(data.trip.id),
            user: data.trip.user_name || 'Pasajero',
            phone: data.trip.user_phone || '',
            pickup: data.trip.pickup_location || '',
            destination: data.trip.destination || '',
            estimatedPrice: parseFloat(data.trip.price) || 0,
            distance: data.trip.distance || '',
            paymentMethod: data.trip.payment_method || 'cash',
            vehicleType: data.trip.vehicle_type || 'economy',
            pickupLat: parseFloat(data.trip.pickup_lat) || null,
            pickupLng: parseFloat(data.trip.pickup_lng) || null,
            destinationLat: parseFloat(data.trip.destination_lat) || null,
            destinationLng: parseFloat(data.trip.destination_lng) || null,
          tripCode: data.trip.trip_code || null,
            thirdPartyName: data.trip.third_party_name || null,
            thirdPartyPhone: data.trip.third_party_phone || null,
            type: 'NEW_TRIP_REQUEST',
          };
          
          console.log('📡 POLLING: Viaje pendiente encontrado:', tripData.id);
          
          // Verificar que no sea el viaje cancelado recientemente
          if (globalCancelledTripId && String(globalCancelledTripId) === String(tripData.id)) {
            console.log('🚫 POLLING: Viaje cancelado, ignorando');
            return;
          }
          
          // Procesar como si llegara de FCM
          if (global.handleNewTripRequest) {
            global.handleNewTripRequest(tripData);
          }
        }
      } catch (error) {
        // Silencioso - no mostrar errores de polling
        console.log('📡 Polling silencioso:', error.message);
      }
    };
    
    // Ejecutar inmediatamente y luego cada 10 segundos
    pollPendingTrips();
    const interval = setInterval(pollPendingTrips, 10000);
    
    return () => {
      console.log('⏹️ Deteniendo polling de viajes');
      clearInterval(interval);
    };
  }, [loggedDriver?.id, driverStatus, currentTrip, showRequestModal, pendingRequest]);

 // useEffect para verificar automáticamente la llegada al PICKUP y al DESTI
    

useEffect(() => {
  const interval = setInterval(() => {
    // Verificar llegada al PUNTO DE RECOGIDA (cuando tripPhase está vacío)
    if (currentTrip && tripPhase === '' && userLocation && isNavigatingToPickup) {
      const pickupLat = currentTrip.pickupLat;
      const pickupLng = currentTrip.pickupLng;
      
      if (pickupLat && pickupLng) {
        const distance = getDistance(
          { latitude: userLocation.latitude, longitude: userLocation.longitude },
          { latitude: pickupLat, longitude: pickupLng }
        );
        
        console.log(`📍 Distancia al pickup: ${distance.toFixed(0)} metros`);
        
        // Si está a menos de 50 metros del punto de recogida
        if (distance < 50) {
          console.log('✅ Llegada al punto de recogida detectada automáticamente');
          handleArrivedAtPickup();
        }
      }
    }
    
    // Verificar llegada al DESTINO (cuando tripPhase es 'started')
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

// Configuración para Background Service
const backgroundOptions = {
  taskName: 'LocationTracking',
  taskTitle: 'TaxiApp Conductor',
  taskDesc: 'Navegando hacia el pasajero...',
  taskIcon: {
    name: 'ic_launcher',
    type: 'mipmap',
  },
  color: '#3b82f6',
  linkingURI: 'taxidriverapp://',
};

// Tarea de background para verificar llegada
const backgroundTask = async (taskData) => {
  console.log('🔄 BACKGROUND TASK EJECUTANDO...');
  console.log('🔍 taskData recibido:', JSON.stringify(taskData));
  const { pickupLat, pickupLng, tripId } = taskData.parameters || taskData;
  
  while (BackgroundService.isRunning()) {
    // SOLO pedir GPS si la app está en BACKGROUND
    // Cuando está en foreground, MapComponent ya maneja el GPS
    const appState = AppState.currentState;
    
    if (appState !== 'active') {
      try {
        // Obtener ubicación actual (solo en background)
        const position = await new Promise((resolve, reject) => {
        Geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000,
        });
      });

      const { latitude, longitude } = position.coords;
      console.log(`📍 Background: ${latitude}, ${longitude}`);

      // Calcular distancia al pickup
      const R = 6371e3;
      const φ1 = latitude * Math.PI / 180;
      const φ2 = pickupLat * Math.PI / 180;
      const Δφ = (pickupLat - latitude) * Math.PI / 180;
      const Δλ = (pickupLng - longitude) * Math.PI / 180;
      const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;

      console.log(`📍 Distancia al pickup: ${distance.toFixed(0)} metros`);

      // Si está a menos de 50 metros
      if (distance < 50) {
        console.log('✅ Llegada detectada en background!');
        
        // Notificar al backend
        await fetch(`https://web-production-99844.up.railway.app/api/trips/status/${tripId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'arrived' })
        });

        // Detener el servicio
        await BackgroundService.stop();
        break;
      }
} catch (error) {
        console.error('Error en background task:', error);
      }
    } else {
      // App en foreground - MapComponent maneja el GPS
      console.log('📱 App en foreground - saltando GPS en background task');
    }

    // Esperar 5 segundos antes de la siguiente verificación
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
};

// Iniciar tracking en background
const startBackgroundTracking = async (tripId, pickupLat, pickupLng) => {
  try {
    if (BackgroundService.isRunning()) {
      await BackgroundService.stop();
    }
    
    await BackgroundService.start(backgroundTask, {
      ...backgroundOptions,
      parameters: { tripId, pickupLat, pickupLng },
    });
    setIsNavigatingToPickup(true); // ACTIVAR detecci�n de llegada
    console.log('? Background tracking iniciado');
  } catch (error) {
    console.error('Error iniciando background tracking:', error);
  }
};

// Detener tracking en background
const stopBackgroundTracking = async () => {
  try {
    if (BackgroundService.isRunning()) {
      await BackgroundService.stop();
      console.log('⏹️ Background tracking detenido');
    }
  } catch (error) {
    console.error('Error deteniendo background tracking:', error);
  }
};

  // NUEVA FUNCIÓN: Manejar llegada automática al punto de recogida
const handleArrivedAtPickup = async () => {
  if (!currentTrip || tripPhase !== '') return;
  
  try {
    const response = await fetch(`https://web-production-99844.up.railway.app/api/trips/status/${currentTrip.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'arrived' })
    });
    const data = await response.json();
if (data.success) {
      setTripPhase('arrived');
      await stopBackgroundTracking(); // Detener background tracking al llegar
      Alert.alert('✅ Llegaste', 'Has llegado al punto de recogida del pasajero', [
        {
          text: 'OK',
          onPress: () => setActiveTab('dashboard')
        }
      ]);
    }
  } catch (error) {
    console.error('Error notificando llegada:', error);
    setTripPhase('arrived');
    setActiveTab('dashboard'); // Regresar al Dashboard automáticamente
    await stopBackgroundTracking(); // Detener background tracking al llegar
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
    if (!location) return;
    
    try {
      console.log('📤 Enviando ubicación al backend:', location.latitude, location.longitude, 'speed:', location.speed);
      const response = await fetch('https://web-production-99844.up.railway.app/api/drivers/location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          driverId: loggedDriver?.id || 3,
          latitude: location.latitude,
          longitude: location.longitude,
          heading: location.heading || 0,
          speed: location.speed || 0,  // ✅ VELOCIDAD REAL DEL GPS
          accuracy: location.accuracy || 10,
          status: 'online'
        })
      });
      
      if (response.ok) {
        console.log('✅ Ubicación enviada al backend');
      } else {
        console.log('❌ Error respuesta backend:', response.status);
      }
    } catch (error) {
      console.error('❌ Error enviando ubicación:', error);
    }
  };

// NUEVA FUNCIÓN: Iniciar tracking de ubicación con watchPosition
const startLocationTracking = () => {
  // Limpiar watch anterior si existe
  if (locationInterval) {
    Geolocation.clearWatch(locationInterval);
  }

  // Reset del alert para nueva sesión
  gpsAlertShownRef.current = false;

  // Usar watchPosition para actualizaciones en tiempo real
  const watchId = Geolocation.watchPosition(
    (position) => {
      const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        speed: position.coords.speed || 0,
        heading: position.coords.heading || 0,
        accuracy: position.coords.accuracy || 10,
      };
      console.log('📍 GPS REAL:', location.latitude, location.longitude, 'speed:', location.speed);
      setUserLocation(location);
      sendLocationToBackend(location);
    },
    (error) => {
      console.log('❌ Error GPS:', error.message, 'code:', error.code);
      
      // Mostrar alerta de GPS desactivado (solo una vez)
      if (!gpsAlertShownRef.current) {
        gpsAlertShownRef.current = true;
        setTimeout(() => {
          Alert.alert(
            '📍 GPS Desactivado',
            'No se puede obtener tu ubicación porque el GPS del teléfono está desactivado.\n\nPor favor activa la ubicación en la configuración de tu teléfono.',
            [
              {
                text: 'Ir a Configuración',
                onPress: () => Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS'),
                style: 'default'
              }
            ],
            { cancelable: false }
          );
        }, 500);
      }
    },
    {
      enableHighAccuracy: true,
      distanceFilter: 5,
      interval: 3000,
      fastestInterval: 2000,
      timeout: 15000,
    }
  );

  setLocationInterval(watchId);
  console.log('✅ Tracking GPS iniciado con watchPosition');
};
  // NUEVA FUNCIÓN: Detener tracking de ubicación
const stopLocationTracking = () => {
  if (locationInterval) {
    Geolocation.clearWatch(locationInterval);
    setLocationInterval(null);
    console.log('⏹️ Tracking GPS detenido');
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
      // Verificar si el viaje fue cancelado por el usuario
      if (globalTripCancelled) {
        console.log('🚫 Viaje cancelado detectado en timer, cerrando modal');
        clearInterval(timerRef.current);
        timerRef.current = null;
        setShowRequestModal(false);
        setPendingRequest(null);
        setActiveTab('dashboard');
        return;
      }
      
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          rejectTrip(); // Rechazar automáticamente
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
     globalTimerRef = timerRef.current;
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
    
  // Verificar permiso de overlay para mostrar app sobre otras (solo primera vez)
    try {
      const hasOverlay = await OverlayPermission.hasPermission();
      const permissionAsked = await AsyncStorage.getItem('overlayPermissionAsked');
      
      if (!hasOverlay && !permissionAsked) {
        await AsyncStorage.setItem('overlayPermissionAsked', 'true');
        Alert.alert(
          '⚠️ Permiso Requerido',
          'Para recibir solicitudes de viaje, necesitas activar "Mostrar sobre otras apps".\n\nEsto solo se pide una vez.',
          [
            { text: 'Después', style: 'cancel' },
            { 
              text: 'Activar Ahora', 
              onPress: async () => {
                await OverlayPermission.requestPermission();
              }
            }
          ]
        );
        return;
      }
    } catch (error) {
      console.log('Error verificando permiso overlay:', error);
    }
    
    try {
  // Verificar suspensión desde el BACKEND (no evitable)
      try {
        const suspRes = await fetch(`https://web-production-99844.up.railway.app/api/drivers/check-suspension/${loggedDriver?.id || 1}`);
        const suspData = await suspRes.json();
        if (suspData.isSuspended) {
          const expiraHora = suspData.expiresAt 
            ? new Date(suspData.expiresAt).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })
            : '';
          const mensaje = suspData.type === 'PERMANENT'
            ? `Tu cuenta está suspendida permanentemente.\nRazón: ${suspData.reason}\n\nContacta soporte para apelar.`
            : `Suspendido por ${suspData.hoursRemaining?.toFixed(1)} hora(s) más.\nRazón: ${suspData.reason}\n\nPodrás trabajar después de las ${expiraHora}.`;
          Alert.alert('🔒 No Puedes Conectarte', mensaje, [{ text: 'OK' }]);
          setDriverStatus('suspended');
          return;
        }
      } catch (suspError) {
        console.log('⚠️ Error verificando suspensión, continuando con verificación local');
        const suspensionStatus = await PenaltyService.checkSuspensionStatus();
        if (suspensionStatus.isSuspended) {
          Alert.alert('🔒 No Puedes Conectarte', 'Tu cuenta está suspendida.', [{ text: 'OK' }]);
          return;
        }
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
    
   // Detener el sonido cuando se acepta el viaje
    if (soundRef.current) {
      soundRef.current.stop();
      soundRef.current.release();
      soundRef.current = null;
    }
    
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
          driver_id: driverId,
          driverLat: userLocation?.latitude || null,
          driverLng: userLocation?.longitude || null
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
      const penaltyResult = await PenaltyService.checkAndApplyPenalties({
        ...driverStats,
        tripsAccepted: driverStats.tripsAccepted + 1,
        acceptanceRate: Math.round(((driverStats.tripsAccepted + 1) / driverStats.tripsOffered) * 100),
        rating: 4.8
      });
      
      // Resetear estadísticas después de evaluar bloque de 10
      if (penaltyResult.resetStats || driverStats.tripsOffered === 10) {
        setDriverStats({
          tripsOffered: 0,
          tripsAccepted: 0,
          tripsRejected: 0,
          tripsCancelled: 0,
          acceptanceRate: 100,
          cancellationRate: 0
        });
      }
      
// NORMALIZAR datos combinando servidor + FCM
      const normalizedTrip = normalizeTrip(data.trip, pendingRequest);
      console.log('📦 Trip normalizado:', normalizedTrip);
      setCurrentTrip(normalizedTrip);
      
      // Configurar las paradas del viaje con coordenadas normalizadas
      const stops = {
        pickup: {
          address: normalizedTrip.pickup || 'Punto de recogida',
          coordinates: normalizedTrip.pickupLat ? {
            latitude: normalizedTrip.pickupLat,
            longitude: normalizedTrip.pickupLng
          } : null
        },
        destination: {
          address: normalizedTrip.destination || 'Destino final',
          coordinates: normalizedTrip.destinationLat ? {
            latitude: normalizedTrip.destinationLat,
            longitude: normalizedTrip.destinationLng
          } : null
        },
        additionalStops: pendingRequest.additionalStops || []
           };
      setTripStops(stops);
      setCurrentStopIndex(0);
      
      setDriverStatus('busy');
      
      // Cambiar automáticamente a la pestaña del mapa
      setActiveTab('map');
      
      // Mostrar info de tercero si aplica (ANTES de limpiar pendingRequest)
      if (pendingRequest.isForOther && pendingRequest.passengerInfo) {
        Alert.alert(
          '✅ Viaje Aceptado',
          `Te diriges hacia ${pendingRequest.user}\n\n👤 Pasajero real: ${pendingRequest.passengerInfo.name}\n📱 Tel: ${pendingRequest.passengerInfo.phone}\n🔑 Clave: ${pendingRequest.tripCode}\n\n⚠️ Confirma la clave con el pasajero`
        );
      } else {
        Alert.alert('✅ Viaje Aceptado', `Te diriges hacia ${pendingRequest.user}`);
      }
      
      // Limpiar DESPUÉS del Alert
      setShowRequestModal(false);
      setPendingRequest(null);
      setTripPhase('');
      
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
    
  let penaltyResult = null;
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
            driver_id: driverId,
            pickupLat: pendingRequest?.pickupLat || '',
            pickupLng: pendingRequest?.pickupLng || ''
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
        ...driverStatsRef.current,
        tripsRejected: driverStatsRef.current.tripsRejected + 1,
        acceptanceRate: driverStatsRef.current.tripsOffered > 0
          ? Math.round((driverStatsRef.current.tripsAccepted / driverStatsRef.current.tripsOffered) * 100)
          : 0,
        cancellationRate: driverStatsRef.current.tripsOffered > 0
          ? Math.round(((driverStatsRef.current.tripsRejected + 1) / driverStatsRef.current.tripsOffered) * 100)
          : 0,
        rating: 4.8
      };
      
    console.log('📊 PENALTY CHECK - Stats enviados:', JSON.stringify(updatedStats));
   penaltyResult = await PenaltyService.checkAndApplyPenalties(updatedStats);
    console.log('📊 PENALTY CHECK - Resultado:', JSON.stringify(penaltyResult));
      
      // Resetear estadísticas después de evaluar bloque de 10
      if (penaltyResult.resetStats || updatedStats.tripsOffered === 10) {
        setDriverStats({
          tripsOffered: 0,
          tripsAccepted: 0,
          tripsRejected: 0,
          tripsCancelled: 0,
          acceptanceRate: 100,
          cancellationRate: 0
        });
      }
      
    } catch (error) {
      console.error('❌ Error rechazando viaje:', error);
    }
    
    setShowRequestModal(false);
    setPendingRequest(null);
   if (!penaltyResult?.penaltyApplied) {
      Alert.alert('Viaje Rechazado', 'La solicitud fue rechazada');
    }
  };

 const completeTrip = async () => {
    if (!currentTrip) return;

    try {
      // Actualizar estado en el backend
  await fetch(`https://web-production-99844.up.railway.app/api/trips/status/${currentTrip.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' })
      });
      console.log('✅ Viaje marcado como completado en el backend');

      await SharedStorage.completeTrip();
      await SharedStorage.clearTripData();
      
   const tripEarning = currentTrip.estimatedPrice || 180;
      
      // Recargar ganancias reales del servidor (más preciso que sumar localmente)
      if (loggedDriver?.id) {
        await loadRealEarnings(loggedDriver.id);
      }
      setCurrentTrip(null);
      setDriverStatus('online');
      setTripPhase(''); // Resetear la fase del viaje
      setIsNavigatingToPickup(false); // RESETEAR flag de navegaci�n
      setUserLocation(null); // Limpiar ubicación
      await stopBackgroundTracking(); // Detener background tracking
      
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

  // FUNCIÓN PARA CARGAR HISTORIAL DE GANANCIAS
  const loadEarningsDetail = async (period) => {
    if (!loggedDriver?.id) {
      Alert.alert('Error', 'Debes iniciar sesión');
      return;
    }
    
    setLoadingEarnings(true);
    try {
      const response = await fetch(
    `https://web-production-99844.up.railway.app/api/trips/driver-history/${loggedDriver.id}?period=${period}`
      );
      const data = await response.json();
      
      if (data.success) {
        const periodNames = { today: 'Hoy', week: 'Esta Semana', month: 'Este Mes' };
        setEarningsDetailData({
          period: periodNames[period] || period,
          trips: data.trips || [],
          total: data.totalEarnings || 0,
          count: data.totalTrips || 0,
          average: data.averagePerTrip || 0
        });
        setShowEarningsDetail(true);
      } else {
        Alert.alert('Error', 'No se pudo cargar el historial');
      }
    } catch (error) {
      console.error('Error cargando historial:', error);
      Alert.alert('Error', 'Error de conexión');
    } finally {
      setLoadingEarnings(false);
    }
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
    onPress={async () => {
      try {
        const response = await fetch(`https://web-production-99844.up.railway.app/api/trips/status/${currentTrip.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'arrived' })
        });
        const data = await response.json();
     if (data.success) {
          setTripPhase('arrived');
          await stopBackgroundTracking(); // Detener background tracking
        }
      } catch (error) {
        console.error('Error notificando llegada:', error);
        setTripPhase('arrived');
        await stopBackgroundTracking(); // Detener background tracking
      }
    }}
  >
    <Text style={styles.buttonText}>📍 Ya Llegué</Text>
  </TouchableOpacity>
)}
          
     {tripPhase === 'arrived' && (
            <TouchableOpacity 
              style={[styles.completeButton, { backgroundColor: '#3b82f6' }]} 
        onPress={() => {
                setVerificationCode('');
                setCodeError('');
                setShowCodeModal(true);
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
  userLocation={userLocation}
  currentStopIndex={currentStopIndex}
  tripStops={tripStops}
  onStartBackgroundTracking={startBackgroundTracking}
        onLocationUpdate={(location) => {
          console.log('📍 Ubicación actualizada:', location);
          setUserLocation(location);
        }}
        onArrivedAtPickup={() => {
          setTripPhase('arrived');
          setActiveTab('dashboard');
        }}
  onArrivedAtDestination={() => {
            const additionalStops = tripStops?.additionalStops || [];
            const totalStops = additionalStops.length;
            
            console.log('🎯 Llegada destino - stopIndex:', currentStopIndex, 'total:', totalStops);
            
            if (currentStopIndex < totalStops) {
              const nextIndex = currentStopIndex + 1;
              setCurrentStopIndex(nextIndex);
              Alert.alert(
                '✅ Destino ' + (currentStopIndex + 1) + ' Completado',
                'Continúa al siguiente destino.',
                [{ text: 'Ir al Siguiente', onPress: () => setActiveTab('map') }]
              );
    } else {
              if (currentTrip?.vehicleType?.includes('paquete') && currentTrip?.thirdPartyName) {
                Alert.alert(
                  '📦 Entrega de Paquete',
                  `Entregar paquete a: ${currentTrip.thirdPartyName}\n📱 Teléfono: ${currentTrip.thirdPartyPhone || 'N/A'}\n\n🔑 Clave del envío: ${currentTrip.tripCode || 'N/A'}\n\nVerifique la clave con el receptor antes de entregar.`,
                  [{ text: 'OK', onPress: () => setActiveTab('dashboard') }]
                );
              } else {
                setActiveTab('dashboard');
              }
            }
          }}
        onCancelTrip={() => {
          Alert.alert(
            '❌ Cancelar Viaje',
            '¿Estás seguro que deseas cancelar este viaje?',
            [
              { text: 'No', style: 'cancel' },
              { 
                text: 'Sí, Cancelar', 
                style: 'destructive',
onPress: async () => {
                  try {
                 const response = await fetch(`https://web-production-99844.up.railway.app/api/trips/${currentTrip.id}/driver-cancel`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ driver_id: loggedDriver?.id, reason: 'Cancelado por conductor' })
                    });
                    const data = await response.json();
                    
                    setCurrentTrip(null);
                    setTripPhase('');
                    setCurrentStopIndex(0);
                    setTripStops(null);
                    setActiveTab('dashboard');

                    // Mostrar suspensión si aplica
                    if (data.penalty) {
                      const { cancellationNumber, suspensionHours, expiresAt } = data.penalty;
                    const expiraHora = new Date(expiresAt).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: true });
                      
                      setDriverStatus('suspended');
                      Alert.alert(
                        '🔒 Cuenta Suspendida',
                    `Cancelación #${cancellationNumber}.\n\nSuspendido por ${suspensionHours} hora(s).\nPodrás trabajar después de las ${expiraHora}.`,
                        [{ text: 'Entendido' }]
                      );
                    } else {
                      setDriverStatus('online');
                      Alert.alert('Viaje Cancelado', 'El viaje ha sido cancelado');
                    }
                  } catch (error) {
                    console.error('Error cancelando viaje:', error);
                    Alert.alert('Error', 'No se pudo cancelar el viaje');
                  }
                }
              }
            ]
          );
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
      
 {/* DASHCAM - OCULTO
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
      */}
      
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
        <Text style={{fontSize: 12, color: '#666', marginBottom: 10}}>Toca cualquier campo para ver detalles</Text>

        <TouchableOpacity style={styles.statRowTouchable} onPress={() => loadEarningsDetail('today')}>
          <Text style={styles.statLabel}>Ganancias de hoy:</Text>
          <Text style={styles.statValueLink}>RD${earnings.today} ›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.statRowTouchable} onPress={() => loadEarningsDetail('week')}>
          <Text style={styles.statLabel}>Esta semana:</Text>
          <Text style={styles.statValueLink}>RD${earnings.week} ›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.statRowTouchable} onPress={() => loadEarningsDetail('month')}>
          <Text style={styles.statLabel}>Este mes:</Text>
          <Text style={styles.statValueLink}>RD${earnings.month} ›</Text>
        </TouchableOpacity>

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

 // Si no hay conductor logueado, mostrar pantalla de bienvenida
  if (!loggedDriver) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor="#3b82f6" barStyle="light-content" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#3b82f6', padding: 20 }}>
          <Text style={{ fontSize: 60, marginBottom: 20 }}>🚕</Text>
          <Text style={{ fontSize: 28, fontWeight: 'bold', color: 'white', marginBottom: 10 }}>TaxiApp Conductor</Text>
          <Text style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: 40 }}>
            Gana dinero conduciendo con nosotros
          </Text>
          
          <TouchableOpacity
            style={{ backgroundColor: 'white', paddingVertical: 15, paddingHorizontal: 50, borderRadius: 10, marginBottom: 15, width: '100%' }}
            onPress={() => setShowLogin(true)}
          >
            <Text style={{ color: '#3b82f6', fontWeight: 'bold', fontSize: 18, textAlign: 'center' }}>Iniciar Sesión</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={{ backgroundColor: 'transparent', borderWidth: 2, borderColor: 'white', paddingVertical: 15, paddingHorizontal: 50, borderRadius: 10, width: '100%' }}
            onPress={() => setShowPreRegister(true)}
          >
            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18, textAlign: 'center' }}>Registrarse</Text>
          </TouchableOpacity>
        </View>
        
        {/* Modal de Pre-Registro */}
        <Modal visible={showPreRegister} animationType="slide" onRequestClose={() => setShowPreRegister(false)}>
          <PreRegisterScreen
            navigation={{
              navigate: () => {},
              goBack: async () => {
                setShowPreRegister(false);
                const savedDriver = await AsyncStorage.getItem('loggedDriver');
                if (savedDriver) {
                  setLoggedDriver(JSON.parse(savedDriver));
                }
              },
              openLogin: () => {
                setShowPreRegister(false);
                setShowLogin(true);
              }
            }}
          />
        </Modal>
        
        {/* Modal de Login */}
        <Modal visible={showLogin} animationType="slide" onRequestClose={() => setShowLogin(false)}>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#3b82f6' }}>
            <StatusBar backgroundColor="#3b82f6" barStyle="light-content" />
            <View style={{ padding: 20, paddingTop: 40 }}>
              <TouchableOpacity onPress={() => setShowLogin(false)}>
                <Text style={{ fontSize: 18, color: 'white', fontWeight: 'bold' }}>← Volver</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1, backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30 }}>
              <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#1e3a5f', marginBottom: 10 }}>Bienvenido</Text>
              <Text style={{ fontSize: 16, color: '#64748b', marginBottom: 30 }}>Ingresa tus credenciales</Text>
              <TextInput
                style={{ backgroundColor: '#f1f5f9', padding: 15, borderRadius: 10, marginBottom: 15, fontSize: 16 }}
                placeholder="Email"
                value={loginEmail}
                onChangeText={setLoginEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextInput
                style={{ backgroundColor: '#f1f5f9', padding: 15, borderRadius: 10, marginBottom: 20, fontSize: 16 }}
                placeholder="Contraseña"
                value={loginPassword}
                onChangeText={setLoginPassword}
                secureTextEntry
              />
              <TouchableOpacity
                style={{ backgroundColor: '#3b82f6', padding: 15, borderRadius: 10, alignItems: 'center' }}
                onPress={handleLogin}
                disabled={loginLoading}
              >
                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>
                  {loginLoading ? 'Ingresando...' : 'Iniciar Sesión'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ marginTop: 20, alignItems: 'center' }}
                onPress={() => { setShowLogin(false); setShowPreRegister(true); }}
              >
                <Text style={{ color: '#3b82f6', fontWeight: 'bold', fontSize: 16 }}>¿No tienes cuenta? Regístrate</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Modal>
      </View>
    );
  }

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
            <Text style={styles.requestText}>👤 Pasajero: {pendingRequest.thirdPartyName || pendingRequest.user}</Text>
                <Text style={styles.requestText}>📍 Origen: {pendingRequest.pickup}</Text>
                <Text style={styles.requestText}>🎯 Destino: {pendingRequest.destination}</Text>
                <Text style={styles.requestText}>💰 Precio: RD${pendingRequest.estimatedPrice}</Text>
                <Text style={styles.requestText}>📏 Distancia: {pendingRequest.distance || '5.2 km'}</Text>
                <Text style={styles.requestText}>⏱️ Tiempo: {pendingRequest.estimatedTime}</Text>
                <Text style={styles.requestText}>📱 Teléfono: {pendingRequest.thirdPartyPhone || pendingRequest.phone || '+1-809-555-0199'}</Text>
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
                   Preguntar: "¿Viaje para {pendingRequest.thirdPartyName || pendingRequest.user}?"
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
            goBack: async () => {
              setShowPreRegister(false);
              // Recargar conductor del AsyncStorage
              const savedDriver = await AsyncStorage.getItem('loggedDriver');
              if (savedDriver) {
                const driver = JSON.parse(savedDriver);
                setLoggedDriver(driver);
                console.log('✅ Conductor cargado después del registro');
              }
            },
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

   {/* Modal de Verificación de Clave */}
      <Modal
        visible={showCodeModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCodeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.requestModal}>
            <Text style={styles.modalTitle}>🔑 Clave de Verificación</Text>
            <Text style={{ fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 }}>
              Solicita la clave de 4 dígitos al pasajero
            </Text>
            <TextInput
              style={{
                borderWidth: 2,
                borderColor: codeError ? '#ef4444' : '#3b82f6',
                borderRadius: 10,
                padding: 15,
                fontSize: 32,
                textAlign: 'center',
                letterSpacing: 10,
                fontWeight: 'bold',
                marginBottom: 10,
              }}
              placeholder="0000"
              placeholderTextColor="#ccc"
              keyboardType="numeric"
              maxLength={4}
              value={verificationCode}
              onChangeText={(text) => {
                setVerificationCode(text);
                setCodeError('');
              }}
              autoFocus={true}
            />
            {codeError ? (
              <Text style={{ color: '#ef4444', textAlign: 'center', marginBottom: 10, fontWeight: 'bold' }}>
                {codeError}
              </Text>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: '#6b7280', padding: 15, borderRadius: 10, alignItems: 'center' }}
                onPress={() => setShowCodeModal(false)}
              >
                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: '#22c55e', padding: 15, borderRadius: 10, alignItems: 'center' }}
                onPress={async () => {
                  if (verificationCode.length !== 4) {
                    setCodeError('Ingresa los 4 dígitos');
                    return;
                  }
                  try {
                    const response = await fetch(`https://web-production-99844.up.railway.app/api/trips/verify-code/${currentTrip.id}`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ trip_code: verificationCode })
                    });
                    const data = await response.json();
                    if (data.success) {
                      setShowCodeModal(false);
                      setTripPhase('started');
                      setActiveTab('map');
                      Alert.alert('✅ Verificado', 'Clave correcta. ¡Viaje iniciado!');
                    } else {
                      setCodeError('❌ Clave incorrecta. Intenta de nuevo.');
                    }
                  } catch (error) {
                    setCodeError('Error de conexión. Intenta de nuevo.');
                  }
                }}
              >
                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Verificar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Desglose de Ganancias */}
      <Modal
        visible={showEarningsDetail}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEarningsDetail(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.requestModal, {maxHeight: '80%'}]}>
            <Text style={styles.modalTitle}>📊 {earningsDetailData.period}</Text>
            
            {loadingEarnings ? (
              <ActivityIndicator size="large" color="#3b82f6" />
            ) : (
              <>
                <View style={{flexDirection: 'row', justifyContent: 'space-around', marginBottom: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#eee'}}>
                  <View style={{alignItems: 'center'}}>
                    <Text style={{fontSize: 24, fontWeight: 'bold', color: '#22c55e'}}>RD${earningsDetailData.total}</Text>
                    <Text style={{color: '#666'}}>Total</Text>
                  </View>
                  <View style={{alignItems: 'center'}}>
                    <Text style={{fontSize: 24, fontWeight: 'bold', color: '#3b82f6'}}>{earningsDetailData.count}</Text>
                    <Text style={{color: '#666'}}>Viajes</Text>
                  </View>
                  <View style={{alignItems: 'center'}}>
                    <Text style={{fontSize: 24, fontWeight: 'bold', color: '#f59e0b'}}>RD${earningsDetailData.average}</Text>
                    <Text style={{color: '#666'}}>Promedio</Text>
                  </View>
                </View>

                <ScrollView style={{maxHeight: 300}}>
                  {earningsDetailData.trips.length === 0 ? (
                    <Text style={{textAlign: 'center', color: '#999', padding: 20}}>No hay viajes en este período</Text>
                  ) : (
                    earningsDetailData.trips.map((trip, index) => (
                      <View key={trip.id || index} style={{
                        backgroundColor: '#f8f9fa',
                        padding: 12,
                        borderRadius: 8,
                        marginBottom: 10
                      }}>
                        <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5}}>
                          <Text style={{fontWeight: 'bold', color: '#333'}}>Viaje #{trip.id}</Text>
                          <Text style={{fontWeight: 'bold', color: '#22c55e'}}>RD${trip.price || 0}</Text>
                        </View>
                        <Text style={{color: '#666', fontSize: 12}}>📍 {trip.pickup_location || 'N/A'}</Text>
                        <Text style={{color: '#666', fontSize: 12}}>🎯 {trip.destination || 'N/A'}</Text>
                        <Text style={{color: '#666', fontSize: 12}}>👤 {trip.user_name || 'Pasajero'}</Text>
                        <Text style={{color: '#999', fontSize: 11, marginTop: 5}}>
                          {trip.created_at ? new Date(trip.created_at).toLocaleString('es-DO') : ''}
                        </Text>
                      </View>
                    ))
                  )}
                </ScrollView>
              </>
            )}

            <TouchableOpacity
              style={{
                backgroundColor: '#6b7280',
                padding: 15,
                borderRadius: 10,
                marginTop: 15,
                alignItems: 'center'
              }}
              onPress={() => setShowEarningsDetail(false)}
            >
              <Text style={{color: 'white', fontWeight: 'bold', fontSize: 16}}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  statRowTouchable: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#f0f9ff',
    marginHorizontal: -10,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 5,
  },
  statValueLink: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3b82f6',
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