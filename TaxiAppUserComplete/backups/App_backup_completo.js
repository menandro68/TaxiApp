import PushNotificationService from './PushNotificationService';

import { addTripToHistory } from './src/history/TripHistoryStorage';


import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  FlatList,
  TextInput,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { Platform } from 'react-native';
import MapComponent from './MapComponent';
import SharedStorage, { TRIP_STATES } from './SharedStorage';
//import AddressSearchComponent from './AddressSearchComponent'; // 
import RouteService from './RouteService';
import DriverTrackingService from './DriverTrackingService';
import LocationFallbackService, { POPULAR_LOCATIONS } from './LocationFallbackService';
import ApiService from './ApiService_Simulado';
import UserProfile from './UserProfile';
import Icon from 'react-native-vector-icons/Ionicons';

// Configuración del drawer
const { width: screenWidth } = Dimensions.get('window');
const DRAWER_WIDTH = screenWidth * 0.75;

const App = () => {
  const [destination, setDestination] = useState('');
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [rideStatus, setRideStatus] = useState(TRIP_STATES.IDLE);
  const [driverInfo, setDriverInfo] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [estimatedPrice, setEstimatedPrice] = useState(0);
  const [tripRequest, setTripRequest] = useState(null);
  
  // ✅ ESTADOS PARA RUTAS
  const [routeInfo, setRouteInfo] = useState(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [selectedVehicleType, setSelectedVehicleType] = useState('economy');

  // ✅ NUEVOS ESTADOS PARA TRACKING DEL CONDUCTOR
  const [driverLocation, setDriverLocation] = useState(null);
  const [trackingProgress, setTrackingProgress] = useState(0);
  const [driverETA, setDriverETA] = useState('');
  const [isDriverMoving, setIsDriverMoving] = useState(false);
  const [trackingActive, setTrackingActive] = useState(false);

  // ✅ ESTADOS PARA MANEJO DE GPS Y FALLBACK
  const [locationPermissionStatus, setLocationPermissionStatus] = useState('unknown');
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showPopularLocations, setShowPopularLocations] = useState(false);
  const [locationSource, setLocationSource] = useState(null); // 'gps', 'fallback', 'manual', 'popular'

  // ✅ ESTADOS PARA AUTENTICACIÓN
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' o 'register'
  const [authForm, setAuthForm] = useState({
    email: '',
    password: '',
    name: '',
    phone: ''
  });

  // ✅ ESTADOS PARA PERFIL DE USUARIO
  const [showUserProfile, setShowUserProfile] = useState(false);

  // 🍔 NUEVOS ESTADOS PARA EL MENÚ HAMBURGUESA
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const drawerAnimation = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    initializeApp();
    setupNotificationHandlers();
    
    // Cleanup tracking al desmontar el componente
    return () => {
      DriverTrackingService.stopTracking();
    };
  }, []);

  // 🍔 FUNCIONES DEL DRAWER MENU
  const toggleDrawer = () => {
    const toValue = isDrawerOpen ? -DRAWER_WIDTH : 0;
    const overlayToValue = isDrawerOpen ? 0 : 0.5;

    Animated.parallel([
      Animated.timing(drawerAnimation, {
        toValue,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: overlayToValue,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();

    setIsDrawerOpen(!isDrawerOpen);
  };

  const closeDrawer = () => {
    if (isDrawerOpen) {
      toggleDrawer();
    }
  };

  // 🍔 FUNCIÓN: Manejar opciones del menú
  const handleMenuOption = (option) => {
    closeDrawer();
    
    switch(option) {
      case 'profile':
        setTimeout(() => setShowUserProfile(true), 300);
        break;
      case 'trips':
        Alert.alert('Mis Viajes', 'Historial de viajes (próximamente)');
        break;
      case 'payments':
        Alert.alert('Pagos', 'Métodos de pago (próximamente)');
        break;
      case 'addresses':
        Alert.alert('Direcciones', 'Direcciones favoritas (próximamente)');
        break;
      case 'help':
        Alert.alert('Ayuda', 'Centro de ayuda\nTeléfono: 809-123-4567\nEmail: soporte@taxiapp.com');
        break;
      case 'settings':
        Alert.alert('Configuración', 'Ajustes de la app (próximamente)');
        break;
      case 'logout':
        handleLogout();
        break;
    }
  };

  // 🔐 FUNCIÓN MEJORADA: Inicializar app con verificación de autenticación
  const initializeApp = async () => {
    try {
      console.log('🚀 Inicializando TaxiApp Usuario...');
      setIsLoading(true);
      
      // 1. Verificar si el usuario está autenticado
      const authToken = await SharedStorage.getAuthToken();
      if (authToken) {
        try {
          // Verificar token con el servidor
          const user = await ApiService.verifyToken(authToken);
          if (user) {
            setIsAuthenticated(true);
            console.log('✅ Usuario autenticado:', user.name);
            
            // Continuar con la inicialización normal
            await loadUserState();
            await initializeUserProfile();
            await initializeLocationService();
          } else {
            // Token inválido, mostrar login
            await SharedStorage.clearAuth();
            setIsAuthenticated(false);
            setShowAuthModal(true);
          }
        } catch (error) {
          console.error('❌ Error verificando token:', error);
          // Si falla la verificación, usar datos locales si existen
          const localUser = await SharedStorage.getUserProfile();
          if (localUser && localUser.email) {
            setIsAuthenticated(true);
            console.log('✅ Usando autenticación local:', localUser.name);
            await loadUserState();
            await initializeUserProfile();
            await initializeLocationService();
          } else {
            setIsAuthenticated(false);
            setShowAuthModal(true);
          }
        }
      } else {
        // No hay token, mostrar login
        setIsAuthenticated(false);
        setShowAuthModal(true);
        console.log('❓ Usuario no autenticado, mostrando login');
      }
      
      setupNotificationHandlers();
      console.log('✅ TaxiApp Usuario inicializada correctamente');
      
    } catch (error) {
      console.error('❌ Error inicializando la app:', error);
      Alert.alert('Error', 'Error al inicializar la aplicación');
      setIsAuthenticated(false);
      setShowAuthModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  // 🔐 FUNCIONES DE AUTENTICACIÓN

  // Función para manejar login
  const handleLogin = async () => {
    try {
      setIsLoading(true);
      console.log('🔑 Intentando login para:', authForm.email);
      
      const loginResponse = await ApiService.login(authForm.email, authForm.password);
      
      if (loginResponse.success) {
        // Guardar token y datos del usuario
        await SharedStorage.saveAuthToken(loginResponse.token);
        await SharedStorage.saveUserProfile(loginResponse.user);
        
        setIsAuthenticated(true);
        setShowAuthModal(false);
        
        console.log('✅ Login exitoso:', loginResponse.user.name);
        Alert.alert('¡Bienvenido!', `Hola ${loginResponse.user.name}`);
        
        // Continuar con la inicialización de la app
        await loadUserState();
        await initializeUserProfile();
        await initializeLocationService();
        
      } else {
        Alert.alert('Error de login', loginResponse.message || 'Credenciales incorrectas');
      }
      
    } catch (error) {
      console.error('❌ Error en login:', error);
      Alert.alert('Error', 'No se pudo conectar con el servidor. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  // Función para manejar registro
  const handleRegister = async () => {
    try {
      setIsLoading(true);
      console.log('📝 Intentando registro para:', authForm.email);
      
      // Validar campos
      if (!authForm.name.trim() || !authForm.email.trim() || !authForm.password.trim() || !authForm.phone.trim()) {
        Alert.alert('Error', 'Todos los campos son obligatorios');
        return;
      }
      
      if (authForm.password.length < 6) {
        Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
        return;
      }
      
      const registerResponse = await ApiService.register({
        name: authForm.name.trim(),
        email: authForm.email.trim().toLowerCase(),
        password: authForm.password,
        phone: authForm.phone.trim()
      });
      
      if (registerResponse.success) {
        // Guardar token y datos del usuario
        await SharedStorage.saveAuthToken(registerResponse.token);
        await SharedStorage.saveUserProfile(registerResponse.user);
        
        setIsAuthenticated(true);
        setShowAuthModal(false);
        
        console.log('✅ Registro exitoso:', registerResponse.user.name);
        Alert.alert('¡Registro exitoso!', `Bienvenido a TaxiApp, ${registerResponse.user.name}`);
        
        // Continuar con la inicialización de la app
        await loadUserState();
        await initializeUserProfile();
        await initializeLocationService();
        
      } else {
        Alert.alert('Error de registro', registerResponse.message || 'No se pudo crear la cuenta');
      }
      
    } catch (error) {
      console.error('❌ Error en registro:', error);
      Alert.alert('Error', 'No se pudo conectar con el servidor. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  // Función para logout
  const handleLogout = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            try {
              await SharedStorage.clearAuth();
              await resetAppState();
              setIsAuthenticated(false);
              setShowAuthModal(true);
              
              // Limpiar formulario
              setAuthForm({
                email: '',
                password: '',
                name: '',
                phone: ''
              });
              
              console.log('👋 Logout exitoso');
            } catch (error) {
              console.error('❌ Error en logout:', error);
            }
          }
        }
      ]
    );
  };

  // 🔐 FUNCIÓN: Limpiar formulario de autenticación
  const resetAuthForm = () => {
    setAuthForm({
      email: '',
      password: '',
      name: '',
      phone: ''
    });
  };

  const initializeUserProfile = async () => {
    try {
      let userProfile = await SharedStorage.getUserProfile();
      if (!userProfile) {
        userProfile = {
          id: `user_${Date.now()}`,
          name: 'Usuario TaxiApp',
          phone: '',
          email: '',
          createdAt: new Date().toISOString(),
          totalTrips: 0,
          rating: 5.0,
        };
        await SharedStorage.saveUserProfile(userProfile);
        console.log('👤 Nuevo perfil de usuario creado');
      } else {
        console.log('👤 Perfil de usuario cargado:', userProfile.name);
      }
    } catch (error) {
      console.error('❌ Error inicializando perfil:', error);
    }
  };

  // ✅ NUEVA FUNCIÓN: Configurar handlers para notificaciones
  const setupNotificationHandlers = () => {
    // Handler para cuando se asigna un conductor
    global.handleDriverAssigned = (driverData) => {
      console.log('📨 Conductor asignado via notificación:', driverData);
      
      const mockDriverInfo = {
        id: driverData.driverId || 'driver_001',
        name: driverData.driverName || 'Conductor',
        car: driverData.driverCar || 'Vehículo',
        rating: parseFloat(driverData.driverRating) || 4.5,
        eta: driverData.eta || '5 min',
        phone: driverData.driverPhone || '+1-809-555-0123',
        currentLocation: {
          latitude: parseFloat(driverData.driverLat) || 18.4800,
          longitude: parseFloat(driverData.driverLng) || -69.9200,
        },
      };
      
      setDriverInfo(mockDriverInfo);
      setRideStatus(TRIP_STATES.DRIVER_ASSIGNED);
      
      // Iniciar tracking
      startDriverTracking(mockDriverInfo, userLocation);
    };

    // Inicializar PushNotificationService
    // Ya se inicializa automáticamente al importar
    console.log('📱 PushNotificationService inicializado');
  };

  // ✅ NUEVA FUNCIÓN: Inicializar servicio de ubicación con fallback
  const initializeLocationService = async () => {
    try {
      setIsLoadingLocation(true);
      console.log('📍 Inicializando servicio de ubicación...');
      
      // 1. Primero solicitar permisos
      const permissionGranted = await requestLocationPermissions();
      
      if (permissionGranted) {
        // 2. Intentar obtener ubicación con fallback automático
        const locationResult = await LocationFallbackService.getLocationForUser({
          showUserPrompt: false, // No mostrar prompt inicialmente
          timeout: 8000
        });
        
        if (locationResult.success && locationResult.location) {
          setUserLocation(locationResult.location);
          setLocationSource(locationResult.location.source);
          
          console.log('✅ Ubicación obtenida:', locationResult.location.source);
          
          if (locationResult.warning) {
            // Mostrar warning pero no bloquear la app
            setTimeout(() => {
              Alert.alert(
                '⚠️ Ubicación aproximada',
                locationResult.warning + '\n\n¿Quieres seleccionar una ubicación más precisa?',
                [
                  { text: 'No, continuar', style: 'cancel' },
                  { text: 'Sí, seleccionar', onPress: () => setShowLocationModal(true) }
                ]
              );
            }, 2000);
          }
        } else {
          // Si todo falla, mostrar opciones al usuario
          setShowLocationModal(true);
        }
      } else {
        // Sin permisos, usar fallback inmediatamente
        console.log('⚠️ Sin permisos, usando ubicación por defecto');
        const defaultLocation = await LocationFallbackService.getCurrentLocationWithFallback();
        setUserLocation(defaultLocation.location);
        setLocationSource('fallback');
        setShowLocationModal(true);
      }
      
    } catch (error) {
      console.error('❌ Error inicializando ubicación:', error);
      // Usar ubicación por defecto como último recurso
      const defaultLocation = {
        latitude: 18.4861,
        longitude: -69.9312,
        address: 'Santo Domingo Este, República Dominicana',
        source: 'emergency_fallback'
      };
      setUserLocation(defaultLocation);
      setLocationSource('emergency_fallback');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const loadUserState = async () => {
    try {
      const currentStatus = await SharedStorage.getTripStatus();
      const currentTripRequest = await SharedStorage.getTripRequest();
      const currentDriverInfo = await SharedStorage.getDriverInfo();
      const currentUserLocation = await SharedStorage.getUserLocation();

      if (currentStatus !== TRIP_STATES.IDLE) {
        setRideStatus(currentStatus);
        setTripRequest(currentTripRequest);
        setDriverInfo(currentDriverInfo);
        if (currentUserLocation) {
          setUserLocation(currentUserLocation);
          setLocationSource(currentUserLocation.source || 'restored');
        }
        console.log('🔄 Estado del usuario restaurado:', currentStatus);

        // ✅ Si hay un conductor asignado, iniciar tracking
        if (currentStatus === TRIP_STATES.DRIVER_ASSIGNED && currentDriverInfo) {
          startDriverTracking(currentDriverInfo, currentUserLocation);
        }
      }
    } catch (error) {
      console.error('❌ Error cargando estado del usuario:', error);
    }
  };

  // ✅ FUNCIÓN MEJORADA: Solicitar permisos de ubicación
  const requestLocationPermissions = async () => {
    try {
      console.log('📍 Solicitando permisos de ubicación...');
      setLocationPermissionStatus('requesting');
      
      const fine = await request(
        Platform.OS === 'android'
          ? PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION
          : PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
      );
      
      console.log('📍 Resultado de permisos:', fine);
      
      if (fine === RESULTS.GRANTED) {
        console.log('✅ Permisos de ubicación concedidos');
        setLocationPermissionStatus('granted');
        return true;
      } else if (fine === RESULTS.DENIED) {
        console.log('❌ Permisos de ubicación denegados');
        setLocationPermissionStatus('denied');
        return false;
      } else if (fine === RESULTS.BLOCKED) {
        console.log('🚫 Permisos de ubicación bloqueados');
        setLocationPermissionStatus('blocked');
        return false;
      } else {
        console.log('❓ Estado de permiso desconocido:', fine);
        setLocationPermissionStatus('unknown');
        return false;
      }
    } catch (error) {
      console.error('❌ Error solicitando permisos:', error);
      setLocationPermissionStatus('error');
      return false;
    }
  };

  // ✅ NUEVA FUNCIÓN: Manejar selección de ubicación manual
  const handleLocationSelected = async (location) => {
    try {
      console.log('📍 Nueva ubicación seleccionada:', location);
      
      // Validar coordenadas
      const validation = LocationFallbackService.validateCoordinates(
        location.latitude, 
        location.longitude
      );
      
      if (!validation.valid) {
        Alert.alert('Error', 'Las coordenadas seleccionadas no son válidas');
        return;
      }
      
      if (!validation.inDominicanRepublic) {
        Alert.alert(
          'Ubicación fuera de servicio',
          'TaxiApp actualmente solo opera en República Dominicana'
        );
        return;
      }
      
      // Actualizar ubicación del usuario
      const newLocation = {
        ...location,
        source: location.source || 'manual'
      };
      
      setUserLocation(newLocation);
      setLocationSource(newLocation.source);
      await SharedStorage.saveUserLocation(newLocation);
      
      // Cerrar modales
      setShowLocationModal(false);
      setShowPopularLocations(false);
      
      console.log('✅ Ubicación actualizada exitosamente');
      
    } catch (error) {
      console.error('❌ Error actualizando ubicación:', error);
      Alert.alert('Error', 'No se pudo actualizar la ubicación');
    }
  };

  // ✅ NUEVA FUNCIÓN: Reintentar obtener GPS
  const retryGPSLocation = async () => {
    try {
      setIsLoadingLocation(true);
      console.log('🔄 Reintentando obtener ubicación GPS...');
      
      const locationResult = await LocationFallbackService.getLocationForUser({
        showUserPrompt: false,
        timeout: 10000
      });
      
      if (locationResult.success && locationResult.location) {
        await handleLocationSelected(locationResult.location);
        
        if (locationResult.location.source === 'gps') {
          Alert.alert('✅ ¡Éxito!', 'Ubicación GPS obtenida correctamente');
        } else {
          Alert.alert(
            '⚠️ GPS no disponible', 
            'Se usó ubicación aproximada. ' + (locationResult.warning || '')
          );
        }
      } else {
        Alert.alert('Error', 'No se pudo obtener la ubicación');
      }
      
    } catch (error) {
      console.error('❌ Error reintentando GPS:', error);
      Alert.alert('Error', 'Error al reintentar GPS');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  // 🌐 FUNCIÓN: Calcular ruta y precio usando API real
  const calculateRouteAndPrice = async (origin, destination, vehicleType = 'economy') => {
    try {
      setIsCalculatingRoute(true);
      console.log('🗺️ Calculando ruta y precio con API real...', { origin, destination, vehicleType });

      // Primero obtener estimación rápida del API
      const priceEstimate = await ApiService.estimatePrice(origin, destination, vehicleType);
      if (priceEstimate) {
        setEstimatedPrice(priceEstimate.estimated_price);
        console.log('⚡ Estimación del API:', priceEstimate.estimated_price);
      }

      // Luego calcular ruta completa con API real
      const routeData = await ApiService.calculateRoute(origin, destination, vehicleType);
      
      setRouteInfo(routeData);
      setEstimatedPrice(routeData.pricing.final_price);
      
      console.log('✅ Ruta calculada con API real:', {
        distance: routeData.distance,
        duration: routeData.duration,
        price: routeData.pricing.final_price
      });

      return routeData;

    } catch (error) {
      console.error('❌ Error con API real, usando fallback:', error);
      
      // Si falla el API real, usar estimación local como fallback
      const fallbackEstimate = RouteService.estimateQuickPrice(origin, destination, vehicleType);
      if (fallbackEstimate) {
        setEstimatedPrice(fallbackEstimate.pricing.finalPrice);
        setRouteInfo(fallbackEstimate);
      }
      
      Alert.alert(
        'Conexión limitada',
        'Usando estimación aproximada. Los precios se actualizarán al conectarse al servidor.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  // ✅ FUNCIÓN: Manejar selección de destino
  const handleDestinationSelected = async (place) => {
    try {
      console.log('🎯 Destino seleccionado:', place);
      setSelectedDestination(place);
      setDestination(place.name);

      // Usar la ubicación actual del usuario (GPS o fallback)
      if (userLocation) {
        await calculateRouteAndPrice(userLocation, place.location, selectedVehicleType);
      } else {
        Alert.alert(
          'Ubicación no disponible',
          'Selecciona tu ubicación de origen primero',
          [
            { text: 'Seleccionar ubicación', onPress: () => setShowLocationModal(true) }
          ]
        );
      }

    } catch (error) {
      console.error('❌ Error manejando selección de destino:', error);
    }
  };

  // ✅ FUNCIÓN: Cambiar tipo de vehículo
  const handleVehicleTypeChange = async (vehicleType) => {
    try {
      setSelectedVehicleType(vehicleType);
      
      if (selectedDestination && userLocation) {
        await calculateRouteAndPrice(userLocation, selectedDestination.location, vehicleType);
      }
    } catch (error) {
      console.error('❌ Error cambiando tipo de vehículo:', error);
    }
  };

  // ✅ NUEVA FUNCIÓN: Iniciar tracking del conductor
  const startDriverTracking = async (driver, userLoc) => {
    try {
      console.log('🎯 Iniciando tracking del conductor:', driver.name);
      
      const driverStartLocation = driver.currentLocation || {
        latitude: 18.4800,
        longitude: -69.9200,
      };

      setDriverLocation(driverStartLocation);
      setTrackingActive(true);
      setIsDriverMoving(true);

      // Configurar callbacks para el tracking
      const trackingCallbacks = {
        onLocationUpdate: (driverUpdate) => {
          console.log('📍 Actualización de ubicación del conductor:', driverUpdate);
          
          setDriverLocation(driverUpdate.location);
          setTrackingProgress(driverUpdate.progress);
          setDriverETA(`${driverUpdate.estimatedTimeRemaining} min`);
          setIsDriverMoving(driverUpdate.isMoving);
          
          // Actualizar info del conductor con nueva ubicación
          setDriverInfo(prevInfo => ({
            ...prevInfo,
            currentLocation: driverUpdate.location,
            eta: `${driverUpdate.estimatedTimeRemaining} min`
          }));
        },
        
        onArrival: (arrivalInfo) => {
          console.log('🎯 ¡Conductor ha llegado!', arrivalInfo);
          
          setIsDriverMoving(false);
          setTrackingActive(false);
          setDriverETA('Ha llegado');
          setTrackingProgress(100);
          
          Alert.alert(
            '🚗 ¡Conductor ha llegado!',
            `${driverInfo.name} está en tu ubicación. Tiempo total: ${arrivalInfo.totalTime} min`,
            [
              {
                text: 'Subir al vehículo',
                onPress: () => startRide()
              }
            ]
          );
        },
        
        onRouteProgress: (progressInfo) => {
          console.log('📊 Progreso de ruta:', progressInfo);
          setTrackingProgress(progressInfo.progress);
        }
      };

      // Iniciar el tracking
      const trackingResult = await DriverTrackingService.startTracking(
        driverStartLocation,
        userLoc,
        trackingCallbacks
      );

      if (trackingResult.success) {
        console.log('✅ Tracking iniciado exitosamente');
      } else {
        console.log('⚠️ Tracking iniciado en modo fallback');
      }

    } catch (error) {
      console.error('❌ Error iniciando tracking del conductor:', error);
      Alert.alert('Error', 'No se pudo iniciar el seguimiento del conductor');
    }
  };

  // ✅ NUEVA FUNCIÓN: Detener tracking del conductor
  const stopDriverTracking = () => {
    console.log('🛑 Deteniendo tracking del conductor');
    
    DriverTrackingService.stopTracking();
    setTrackingActive(false);
    setIsDriverMoving(false);
    setTrackingProgress(0);
    setDriverETA('');
    setDriverLocation(null);
  };

  // 🌐 FUNCIÓN: Solicitar viaje usando API real
  const requestRide = async () => {
    if (!destination.trim()) {
      Alert.alert('Error', 'Por favor ingresa un destino');
      return;
    }

    if (!userLocation) {
      Alert.alert(
        'Ubicación requerida',
        'Necesitamos tu ubicación para solicitar el viaje',
        [
          { text: 'Seleccionar ubicación', onPress: () => setShowLocationModal(true) }
        ]
      );
      return;
    }

    if (!routeInfo && !estimatedPrice) {
      Alert.alert('Error', 'Esperando cálculo de precio...');
      return;
    }

    try {
      const destinationData = selectedDestination
        ? {
            latitude: selectedDestination.location.latitude,
            longitude: selectedDestination.location.longitude,
            address: selectedDestination.name,
          }
        : {
            latitude: 18.4765,
            longitude: -69.8933,
            address: destination,
          };

      // Guardar ubicación del usuario en API
      await ApiService.updateUserLocation(userLocation);

      // Usar precio calculado o estimado
      const finalPrice = routeInfo ? routeInfo.pricing.final_price : estimatedPrice;

      // 🌐 CREAR SOLICITUD DE VIAJE EN API REAL
      const tripResponse = await ApiService.createTripRequest(
        userLocation,
        destinationData,
        selectedVehicleType,
        finalPrice
      );

      setTripRequest(tripResponse);
      setRideStatus(TRIP_STATES.REQUESTING_RIDE);
      setEstimatedPrice(finalPrice);

      console.log('🚗 Solicitud de viaje creada en API:', tripResponse);

      // 🌐 BUSCAR CONDUCTORES REALES
      await searchAvailableDrivers();
      
    } catch (error) {
      console.error('❌ Error con API real, usando fallback:', error);
      
      // Si falla el API, usar método local como backup
      await fallbackRequestRide();
    }
  };

  // Función de fallback si falla el API
  const fallbackRequestRide = async () => {
    try {
      const mockDestination = selectedDestination
        ? {
            latitude: selectedDestination.location.latitude,
            longitude: selectedDestination.location.longitude,
            address: selectedDestination.name,
          }
        : {
            latitude: 18.4765,
            longitude: -69.8933,
            address: destination,
          };

      await SharedStorage.saveUserLocation(userLocation);
      const finalPrice = routeInfo ? routeInfo.pricing.finalPrice : estimatedPrice;

      const tripRequestData = await SharedStorage.startRideRequest(
        userLocation,
        mockDestination,
        selectedVehicleType,
        finalPrice
      );

      setTripRequest(tripRequestData);
      setRideStatus(TRIP_STATES.REQUESTING_RIDE);
      setEstimatedPrice(finalPrice);

      console.log('🚗 Solicitud de viaje creada (fallback):', tripRequestData);
      simulateDriverSearch();
    } catch (error) {
      console.error('❌ Error en fallback:', error);
      Alert.alert('Error', 'No se pudo solicitar el viaje');
    }
  };

  // 🌐 FUNCIÓN: Buscar conductores disponibles usando API real
  const searchAvailableDrivers = async () => {
    try {
      console.log('🔍 Buscando conductores disponibles en API...');
      
      // Buscar conductores cerca de la ubicación del usuario
      const availableDrivers = await ApiService.searchAvailableDrivers(
        userLocation, 
        5000 // Radio de 5km
      );
      
      if (availableDrivers && availableDrivers.length > 0) {
        // Seleccionar el conductor más cercano
        const selectedDriver = availableDrivers[0];
        
        // Asignar conductor usando API
        const assignmentResponse = await ApiService.assignDriver(
          tripRequest.id, 
          selectedDriver.id
        );
        
        if (assignmentResponse.success) {
          const driverInfo = {
            id: selectedDriver.id,
            name: selectedDriver.name,
            car: `${selectedDriver.vehicle.make} ${selectedDriver.vehicle.model} - ${selectedDriver.vehicle.plate}`,
            rating: selectedDriver.rating,
            eta: selectedDriver.eta || '5 min',
            phone: selectedDriver.phone,
            currentLocation: selectedDriver.current_location,
          };
          
          setDriverInfo(driverInfo);
          setRideStatus(TRIP_STATES.DRIVER_ASSIGNED);
          
          Alert.alert('¡Conductor encontrado!', `${driverInfo.name} llegará en ${driverInfo.eta}`);
          
          // Iniciar tracking del conductor
          await startDriverTracking(driverInfo, userLocation);
          
          console.log('✅ Conductor asignado via API:', driverInfo);
        }
      } else {
        // No hay conductores disponibles
        Alert.alert(
          'Sin conductores disponibles',
          'No hay conductores cerca en este momento. Inténtalo de nuevo.',
          [
            { text: 'Cancelar', onPress: () => resetAppState() },
            { text: 'Reintentar', onPress: () => searchAvailableDrivers() }
          ]
        );
      }
      
    } catch (error) {
      console.error('❌ Error buscando conductores en API:', error);
      
      // Si falla el API, usar simulación como fallback
      console.log('🔄 Usando simulación de conductores como fallback');
      simulateDriverSearch();
    }
  };

  const simulateDriverSearch = () => {
    setTimeout(async () => {
      try {
        const mockDriverInfo = {
          id: 'driver_001',
          name: 'Carlos Mendoza',
          car: 'Honda Civic - XYZ789',
          rating: 4.7,
          eta: '4 min',
          phone: '+1-809-555-0123',
          currentLocation: {
            latitude: 18.4800,
            longitude: -69.9200,
          },
        };
        
        await SharedStorage.acceptDriver(mockDriverInfo);
        setDriverInfo(mockDriverInfo);
        setRideStatus(TRIP_STATES.DRIVER_ASSIGNED);
        
        Alert.alert('¡Conductor encontrado!', `${mockDriverInfo.name} llegará en ${mockDriverInfo.eta}`);
        
        // ✅ INICIAR TRACKING DEL CONDUCTOR
        await startDriverTracking(mockDriverInfo, userLocation);
        
      } catch (error) {
        console.error('❌ Error asignando conductor:', error);
        Alert.alert('Error', 'No se pudo asignar un conductor');
      }
    }, 2000);
  };

  const cancelRide = () => {
    Alert.alert('Cancelar viaje', '¿Estás seguro que deseas cancelar?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Sí',
        onPress: async () => {
          try {
            // ✅ DETENER TRACKING AL CANCELAR
            stopDriverTracking();
            
            await SharedStorage.cancelRide('Cancelado por el usuario');
            await resetAppState();
          } catch (error) {
            console.error('❌ Error cancelando viaje:', error);
          }
        },
      },
    ]);
  };

  const completeRide = async () => {
    try {
      // ✅ DETENER TRACKING AL COMPLETAR
      stopDriverTracking();
      
      const completionData = {
        actualPrice: estimatedPrice,
        distance: routeInfo ? routeInfo.distance.text : '8.5 km',
        duration: routeInfo ? routeInfo.duration.text : '25 min',
        rating: 5,
        tip: 0,
      };
      
      await SharedStorage.completeRide(completionData);
      Alert.alert('¡Viaje completado!', `Gracias por usar TaxiApp\nPrecio: RD${completionData.actualPrice}`);
      
      const userProfile = await SharedStorage.getUserProfile();
      if (userProfile) {
        await SharedStorage.updateUserProfile({
          totalTrips: (userProfile.totalTrips || 0) + 1,
        });
      }
      
      await resetAppState();
    } catch (error) {
      console.error('❌ Error completando viaje:', error);
      Alert.alert('Error', 'Error al completar el viaje');
    }
  };

  const startRide = async () => {
    try {
      // ✅ DETENER TRACKING AL INICIAR VIAJE
      stopDriverTracking();
      
      await SharedStorage.startRide();
      setRideStatus(TRIP_STATES.IN_RIDE);
      Alert.alert('¡Viaje iniciado!', 'Disfruta tu viaje');
    } catch (error) {
      console.error('❌ Error iniciando viaje:', error);
    }
  };

  const resetAppState = async () => {
    try {
      // ✅ DETENER TRACKING AL RESETEAR
      stopDriverTracking();
      
      await SharedStorage.resetToIdle();
      setRideStatus(TRIP_STATES.IDLE);
      setDriverInfo(null);
      setDestination('');
      setSelectedDestination(null);
      setTripRequest(null);
      setEstimatedPrice(0);
      setRouteInfo(null);
    } catch (error) {
      console.error('❌ Error reseteando estado:', error);
    }
  };

  // ✅ COMPONENTE: Selector de tipo de vehículo
  const renderVehicleSelector = () => {
    if (rideStatus !== TRIP_STATES.IDLE) return null;

    const vehicleTypes = [
      { key: 'economy', name: 'Económico', icon: '🚗', multiplier: 1.0 },
      { key: 'comfort', name: 'Confort', icon: '🚙', multiplier: 1.3 },
      { key: 'premium', name: 'Premium', icon: '🚘', multiplier: 1.8 }
    ];

    return (
      <View style={styles.vehicleSelectorContainer}>
        <Text style={styles.vehicleSelectorTitle}>Tipo de vehículo</Text>
        <View style={styles.vehicleOptions}>
          {vehicleTypes.map((vehicle) => (
            <TouchableOpacity
              key={vehicle.key}
              style={[
                styles.vehicleOption,
                selectedVehicleType === vehicle.key && styles.vehicleOptionSelected
              ]}
              onPress={() => handleVehicleTypeChange(vehicle.key)}
            >
              <Text style={styles.vehicleIcon}>{vehicle.icon}</Text>
              <Text style={[
                styles.vehicleName,
                selectedVehicleType === vehicle.key && styles.vehicleNameSelected
              ]}>
                {vehicle.name}
              </Text>
              {estimatedPrice > 0 && (
                <Text style={[
                  styles.vehiclePrice,
                  selectedVehicleType === vehicle.key && styles.vehiclePriceSelected
                ]}>
                  RD${Math.round(estimatedPrice * vehicle.multiplier)}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  // ✅ COMPONENTE: Información de ruta
  const renderRouteInfo = () => {
    if (!routeInfo && !isCalculatingRoute) return null;

    return (
      <View style={styles.routeInfoContainer}>
        {isCalculatingRoute ? (
          <View style={styles.calculatingContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.calculatingText}>Calculando ruta...</Text>
          </View>
        ) : routeInfo ? (
          <View style={styles.routeDetails}>
            <Text style={styles.routeDetailText}>
              📍 Distancia: {routeInfo.distance.text}
            </Text>
            <Text style={styles.routeDetailText}>
              ⏱️ Tiempo estimado: {routeInfo.duration.text}
            </Text>
            <Text style={styles.routeDetailText}>
              💰 Precio: RD${routeInfo.pricing.final_price}
            </Text>
          </View>
        ) : null}
      </View>
    );
  };

  // ✅ NUEVO COMPONENTE: Información del tracking del conductor
  const renderDriverTracking = () => {
    if (!trackingActive || !driverInfo) return null;

    return (
      <View style={styles.trackingContainer}>
        <Text style={styles.trackingTitle}>🚗 Seguimiento del conductor</Text>
        
        <View style={styles.trackingInfoRow}>
          <Text style={styles.trackingLabel}>Conductor:</Text>
          <Text style={styles.trackingValue}>{driverInfo.name}</Text>
        </View>
        
        <View style={styles.trackingInfoRow}>
          <Text style={styles.trackingLabel}>ETA:</Text>
          <Text style={styles.trackingValue}>{driverETA}</Text>
        </View>
        
        <View style={styles.trackingInfoRow}>
          <Text style={styles.trackingLabel}>Progreso:</Text>
          <Text style={styles.trackingValue}>{trackingProgress.toFixed(1)}%</Text>
        </View>
        
        {/* Barra de progreso */}
        <View style={styles.progressBarContainer}>
          <View 
            style={[
              styles.progressBar, 
              { width: `${trackingProgress}%` }
            ]} 
          />
        </View>
        
        <View style={styles.trackingStatusContainer}>
          <View style={[
            styles.statusIndicator,
            { backgroundColor: isDriverMoving ? '#34C759' : '#FF9500' }
          ]} />
          <Text style={styles.statusText}>
            {isDriverMoving ? 'Conductor en movimiento' : 'Conductor detenido'}
          </Text>
        </View>
        
        {driverLocation && (
          <View style={styles.locationContainer}>
            <Text style={styles.locationText}>
              📍 Ubicación: {driverLocation.latitude.toFixed(4)}, {driverLocation.longitude.toFixed(4)}
            </Text>
          </View>
        )}
      </View>
    );
  };

  // ✅ NUEVO COMPONENTE: Estado de ubicación y fallback
  const renderLocationStatus = () => {
    if (isLoadingLocation) {
      return (
        <View style={styles.locationStatusContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.locationStatusText}>Obteniendo ubicación...</Text>
        </View>
      );
    }

    if (!userLocation) {
      return (
        <View style={styles.locationStatusContainer}>
          <Text style={styles.locationStatusIcon}>📍</Text>
          <Text style={styles.locationStatusTitle}>Ubicación requerida</Text>
          <Text style={styles.locationStatusMessage}>
            Necesitamos tu ubicación para calcular rutas y precios
          </Text>
          <TouchableOpacity 
            style={styles.selectLocationButton} 
            onPress={() => setShowLocationModal(true)}
          >
            <Text style={styles.selectLocationButtonText}>Seleccionar ubicación</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Mostrar información de la ubicación actual
    const getLocationSourceInfo = () => {
      switch (locationSource) {
        case 'gps':
          return { icon: '🎯', text: 'Ubicación GPS', color: '#34C759' };
        case 'fallback':
          return { icon: '📍', text: 'Ubicación aproximada', color: '#FF9500' };
        case 'manual':
          return { icon: '🗺️', text: 'Seleccionada manualmente', color: '#007AFF' };
        case 'popular':
          return { icon: '🏢', text: 'Ubicación popular', color: '#007AFF' };
        default:
          return { icon: '❓', text: 'Ubicación desconocida', color: '#666' };
      }
    };

    const sourceInfo = getLocationSourceInfo();

    return (
      <View style={styles.locationStatusContainer}>
        <View style={styles.locationStatusHeader}>
          <Text style={styles.locationSourceIcon}>{sourceInfo.icon}</Text>
          <View style={styles.locationStatusInfo}>
            <Text style={[styles.locationSourceText, { color: sourceInfo.color }]}>
              {sourceInfo.text}
            </Text>
            <Text style={styles.locationAddressText}>
              {LocationFallbackService.formatAddressForDisplay(userLocation)}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.changeLocationButton}
            onPress={() => setShowLocationModal(true)}
          >
            <Text style={styles.changeLocationButtonText}>Cambiar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ✅ NUEVO COMPONENTE: Modal de selección de ubicación
  const renderLocationModal = () => {
    return (
      <Modal
        visible={showLocationModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLocationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.locationModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📍 Seleccionar ubicación</Text>
              <TouchableOpacity 
                onPress={() => setShowLocationModal(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Opción 1: Reintentar GPS */}
              <TouchableOpacity 
                style={styles.locationOption}
                onPress={retryGPSLocation}
                disabled={isLoadingLocation}
              >
                <Text style={styles.locationOptionIcon}>🎯</Text>
                <View style={styles.locationOptionContent}>
                  <Text style={styles.locationOptionTitle}>Usar mi ubicación GPS</Text>
                  <Text style={styles.locationOptionDescription}>
                    Más precisa para calcular rutas y precios
                  </Text>
                </View>
                {isLoadingLocation && <ActivityIndicator size="small" />}
              </TouchableOpacity>

              {/* Opción 2: Ubicaciones populares */}
              <TouchableOpacity 
                style={styles.locationOption}
                onPress={() => setShowPopularLocations(true)}
              >
                <Text style={styles.locationOptionIcon}>🏢</Text>
                <View style={styles.locationOptionContent}>
                  <Text style={styles.locationOptionTitle}>Ubicaciones populares</Text>
                  <Text style={styles.locationOptionDescription}>
                    Centros comerciales, hospitales, aeropuerto
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Opción 3: Usar ubicación por defecto */}
              <TouchableOpacity 
                style={styles.locationOption}
                onPress={() => handleLocationSelected({
                  latitude: 18.4861,
                  longitude: -69.9312,
                  address: 'Santo Domingo Este, República Dominicana',
                  source: 'default'
                })}
              >
                <Text style={styles.locationOptionIcon}>📍</Text>
                <View style={styles.locationOptionContent}>
                  <Text style={styles.locationOptionTitle}>Santo Domingo Este</Text>
                  <Text style={styles.locationOptionDescription}>
                    Ubicación por defecto (aproximada)
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Información sobre permisos */}
              {locationPermissionStatus !== 'granted' && (
                <View style={styles.permissionInfo}>
                  <Text style={styles.permissionInfoTitle}>💡 Consejo</Text>
                  <Text style={styles.permissionInfoText}>
                    Para obtener tu ubicación exacta, permite el acceso a la ubicación en la configuración de la app.
                  </Text>
                  <TouchableOpacity 
                    style={styles.permissionRetryButton}
                    onPress={requestLocationPermissions}
                  >
                    <Text style={styles.permissionRetryText}>Solicitar permisos</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  // ✅ NUEVO COMPONENTE: Modal de ubicaciones populares
  const renderPopularLocationsModal = () => {
    const renderLocationItem = ({ item }) => (
      <TouchableOpacity 
        style={styles.popularLocationItem}
        onPress={() => handleLocationSelected({
          ...item,
          source: 'popular'
        })}
      >
        <Text style={styles.popularLocationIcon}>
          {item.category === 'shopping' ? '🛍️' : 
           item.category === 'transport' ? '✈️' : 
           item.category === 'medical' ? '🏥' : '📍'}
        </Text>
        <View style={styles.popularLocationContent}>
          <Text style={styles.popularLocationName}>{item.name}</Text>
          <Text style={styles.popularLocationAddress}>{item.address}</Text>
        </View>
      </TouchableOpacity>
    );

    return (
      <Modal
        visible={showPopularLocations}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPopularLocations(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.popularLocationsModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🏢 Ubicaciones populares</Text>
              <TouchableOpacity 
                onPress={() => setShowPopularLocations(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={POPULAR_LOCATIONS}
              renderItem={renderLocationItem}
              keyExtractor={(item) => item.id}
              style={styles.popularLocationsList}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
    );
  };

  // 🔐 COMPONENTE: Modal de autenticación (Login/Registro)
  const renderAuthModal = () => {
    return (
      <Modal
        visible={showAuthModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {}} // No permitir cerrar sin autenticarse
      >
        <View style={styles.authModalOverlay}>
          <View style={styles.authModal}>
            <View style={styles.authHeader}>
              <Text style={styles.authTitle}>
                🚖 TaxiApp
              </Text>
              <Text style={styles.authSubtitle}>
                {authMode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
              </Text>
            </View>

            <ScrollView style={styles.authContent} showsVerticalScrollIndicator={false}>
              {/* Campos para registro */}
              {authMode === 'register' && (
                <>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>📝 Nombre completo</Text>
                    <TextInput
                      style={styles.authInput}
                      placeholder="Tu nombre completo"
                      value={authForm.name}
                      onChangeText={(text) => setAuthForm(prev => ({...prev, name: text}))}
                      autoCapitalize="words"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>📱 Teléfono</Text>
                    <TextInput
                      style={styles.authInput}
                      placeholder="Tu número de teléfono"
                      value={authForm.phone}
                      onChangeText={(text) => setAuthForm(prev => ({...prev, phone: text}))}
                      keyboardType="phone-pad"
                    />
                  </View>
                </>
              )}

              {/* Campos comunes */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>📧 Email</Text>
                <TextInput
                  style={styles.authInput}
                  placeholder="tu@email.com"
                  value={authForm.email}
                  onChangeText={(text) => setAuthForm(prev => ({...prev, email: text}))}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>🔒 Contraseña</Text>
                <TextInput
                  style={styles.authInput}
                  placeholder="Tu contraseña"
                  value={authForm.password}
                  onChangeText={(text) => setAuthForm(prev => ({...prev, password: text}))}
                  secureTextEntry={true}
                  autoCapitalize="none"
                />
                {authMode === 'register' && (
                  <Text style={styles.passwordHint}>Mínimo 6 caracteres</Text>
                )}
              </View>

              {/* Botón principal */}
              <TouchableOpacity 
                style={[
                  styles.authButton,
                  isLoading && styles.authButtonDisabled
                ]}
                onPress={authMode === 'login' ? handleLogin : handleRegister}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.authButtonText}>
                    {authMode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Cambiar entre login y registro */}
              <View style={styles.authSwitchContainer}>
                <Text style={styles.authSwitchText}>
                  {authMode === 'login' 
                    ? '¿No tienes cuenta?' 
                    : '¿Ya tienes cuenta?'
                  }
                </Text>
                <TouchableOpacity 
                  onPress={() => {
                    setAuthMode(authMode === 'login' ? 'register' : 'login');
                    resetAuthForm();
                  }}
                  disabled={isLoading}
                >
                  <Text style={styles.authSwitchLink}>
                    {authMode === 'login' ? 'Regístrate' : 'Inicia sesión'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  // 🔐 COMPONENTE: Pantalla de carga inicial
  const renderLoadingScreen = () => {
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.loadingTitle}>🚖 TaxiApp</Text>
        <ActivityIndicator size="large" color="#007AFF" style={styles.loadingSpinner} />
        <Text style={styles.loadingText}>Inicializando...</Text>
      </View>
    );
  };

  // 🍔 NUEVO COMPONENTE: Drawer Menu
  const renderDrawerMenu = () => {
    return (
      <>
        {/* Overlay oscuro cuando el drawer está abierto */}
        {isDrawerOpen && (
          <TouchableWithoutFeedback onPress={closeDrawer}>
            <Animated.View 
              style={[
                styles.overlay,
                { opacity: overlayOpacity }
              ]} 
            />
          </TouchableWithoutFeedback>
        )}

        {/* Drawer Menu */}
        <Animated.View 
          style={[
            styles.drawer,
            { transform: [{ translateX: drawerAnimation }] }
          ]}
        >
          {/* Header del drawer */}
          <View style={styles.drawerHeader}>
            <Icon name="person-circle" size={80} color="#fff" />
            <Text style={styles.drawerUserName}>Usuario TaxiApp</Text>
            <Text style={styles.drawerUserEmail}>usuario@taxiapp.com</Text>
          </View>

          {/* Opciones del menú */}
          <ScrollView style={styles.drawerContent}>
            <TouchableOpacity 
              style={styles.drawerItem}
              onPress={() => handleMenuOption('profile')}
            >
              <Icon name="person-outline" size={24} color="#333" />
              <Text style={styles.drawerItemText}>Mi Perfil</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.drawerItem}
              onPress={() => handleMenuOption('trips')}
            >
              <Icon name="car-outline" size={24} color="#333" />
              <Text style={styles.drawerItemText}>Mis Viajes</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.drawerItem}
              onPress={() => handleMenuOption('payments')}
            >
              <Icon name="card-outline" size={24} color="#333" />
              <Text style={styles.drawerItemText}>Métodos de Pago</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.drawerItem}
              onPress={() => handleMenuOption('addresses')}
            >
              <Icon name="location-outline" size={24} color="#333" />
              <Text style={styles.drawerItemText}>Direcciones Favoritas</Text>
            </TouchableOpacity>

            <View style={styles.drawerDivider} />

            <TouchableOpacity 
              style={styles.drawerItem}
              onPress={() => handleMenuOption('help')}
            >
              <Icon name="help-circle-outline" size={24} color="#333" />
              <Text style={styles.drawerItemText}>Ayuda</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.drawerItem}
              onPress={() => handleMenuOption('settings')}
            >
              <Icon name="settings-outline" size={24} color="#333" />
              <Text style={styles.drawerItemText}>Configuración</Text>
            </TouchableOpacity>

            <View style={styles.drawerDivider} />

            <TouchableOpacity 
              style={[styles.drawerItem, styles.logoutItem]}
              onPress={() => handleMenuOption('logout')}
            >
              <Icon name="log-out-outline" size={24} color="#FF3B30" />
              <Text style={[styles.drawerItemText, styles.logoutText]}>Cerrar Sesión</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Footer del drawer */}
          <View style={styles.drawerFooter}>
            <Text style={styles.drawerFooterText}>TaxiApp v1.0.0</Text>
          </View>
        </Animated.View>
      </>
    );
  };

  // 🍔 COMPONENTE MODIFICADO: Header con menú hamburguesa
  const renderAuthenticatedHeader = () => {
    return (
      <View style={styles.authenticatedHeader}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={toggleDrawer} style={styles.menuButton}>
            <Icon name="menu" size={30} color="#333" />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Text style={styles.title}>🚖 TaxiApp Usuario</Text>
            <Text style={styles.subtitle}>Tu viaje seguro y rápido</Text>
          </View>
          
          <View style={styles.headerSpacer} />
        </View>
      </View>
    );
  };

  const renderContent = () => {
    if (rideStatus === TRIP_STATES.REQUESTING_RIDE) {
      return (
        <View style={styles.statusContainer}>
          <Text style={styles.statusTitle}>🔍 Buscando conductor...</Text>
          <Text style={styles.statusText}>Por favor espera un momento</Text>
          {estimatedPrice > 0 && (
            <Text style={styles.priceText}>Precio estimado: RD${estimatedPrice}</Text>
          )}
          <TouchableOpacity style={styles.cancelButton} onPress={cancelRide}>
            <Text style={styles.cancelButtonText}>Cancelar búsqueda</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (rideStatus === TRIP_STATES.DRIVER_ASSIGNED && driverInfo) {
      return (
        <View style={styles.driverContainer}>
          <Text style={styles.statusTitle}>🚗 Conductor asignado</Text>
          <Text style={styles.driverName}>{driverInfo.name}</Text>
          <Text style={styles.driverDetails}>{driverInfo.car}</Text>
          <Text style={styles.driverDetails}>⭐ {driverInfo.rating}</Text>
          <Text style={styles.etaText}>Llegará en: {driverETA || driverInfo.eta}</Text>
          {estimatedPrice > 0 && (
            <Text style={styles.priceText}>Precio: RD${estimatedPrice}</Text>
          )}
          
          {/* ✅ MOSTRAR INFORMACIÓN DE TRACKING */}
          {renderDriverTracking()}
          
          <View style={styles.rideActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={cancelRide}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.startButton} onPress={startRide}>
              <Text style={styles.startButtonText}>Iniciar</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (rideStatus === TRIP_STATES.IN_RIDE && driverInfo) {
      return (
        <View style={styles.driverContainer}>
          <Text style={styles.statusTitle}>🚙 Viaje en progreso</Text>
          <Text style={styles.driverName}>{driverInfo.name}</Text>
          <Text style={styles.driverDetails}>{driverInfo.car}</Text>
          <Text style={styles.statusText}>Dirígete a tu destino</Text>
          <TouchableOpacity style={styles.completeButton} onPress={completeRide}>
            <Text style={styles.completeButtonText}>Completar viaje</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.requestContainer}>
        <View style={styles.mapContainer}>
          <MapComponent 
            userLocation={userLocation || { latitude: 18.5204, longitude: -69.8340 }} 
          />
        </View>
        <View style={styles.controlsContainer}>
          {/* ✅ NUEVO: Estado de ubicación */}
          {renderLocationStatus()}
          
          <TextInput
            style={styles.destinationInput}
            placeholder="¿A dónde quieres ir?"
            value={destination}
            onChangeText={setDestination}
          />
          
          {renderRouteInfo()}
          {renderVehicleSelector()}
          
          <TouchableOpacity 
            style={[
              styles.requestButton,
              (!destination.trim() || !userLocation || isCalculatingRoute) && styles.requestButtonDisabled
            ]} 
            onPress={requestRide}
            disabled={!destination.trim() || !userLocation || isCalculatingRoute}
          >
            <Text style={styles.requestButtonText}>
              {isCalculatingRoute ? 'Calculando...' : 
               !userLocation ? 'Selecciona ubicación' :
               'Solicitar viaje'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Mostrar pantalla de carga si está inicializando
  if (isLoading) {
    return renderLoadingScreen();
  }

  // Mostrar modal de autenticación si no está autenticado
  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.unauthenticatedContainer}>
          <Text style={styles.unauthenticatedTitle}>🚖 TaxiApp</Text>
          <Text style={styles.unauthenticatedSubtitle}>Tu aplicación de transporte</Text>
          <Text style={styles.unauthenticatedMessage}>
            Inicia sesión para continuar
          </Text>
        </View>
        {renderAuthModal()}
      </View>
    );
  }

  // Usuario autenticado - mostrar app normal
  return (
    <View style={styles.container}>
      {renderAuthenticatedHeader()}
      {renderContent()}
      
      {/* ✅ NUEVO: Modal de perfil de usuario */}
      <UserProfile 
        visible={showUserProfile}
        onClose={() => setShowUserProfile(false)}
      />
      
      {/* Modales existentes */}
      {renderLocationModal()}
      {renderPopularLocationsModal()}
      {renderAuthModal()}
      
      {/* 🍔 NUEVO: Drawer Menu */}
      {renderDrawerMenu()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
  },
  requestContainer: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
    margin: 10,
    borderRadius: 10,
    overflow: 'hidden',
  },
  controlsContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  destinationInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 15,
  },
  
  // ✅ ESTILOS PARA ESTADO DE UBICACIÓN
  locationStatusContainer: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  locationStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationSourceIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  locationStatusInfo: {
    flex: 1,
  },
  locationSourceText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  locationAddressText: {
    fontSize: 12,
    color: '#666',
  },
  changeLocationButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  changeLocationButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  locationStatusText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
  },
  locationStatusIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  locationStatusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  locationStatusMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
  },
  selectLocationButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectLocationButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },

  // ✅ ESTILOS PARA MODALES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  locationModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  popularLocationsModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#666',
  },
  modalContent: {
    padding: 20,
  },
  locationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  locationOptionIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  locationOptionContent: {
    flex: 1,
  },
  locationOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  locationOptionDescription: {
    fontSize: 14,
    color: '#666',
  },
  permissionInfo: {
    backgroundColor: '#e8f4fd',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#bee5eb',
  },
  permissionInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0c5460',
    marginBottom: 8,
  },
  permissionInfoText: {
    fontSize: 14,
    color: '#0c5460',
    marginBottom: 12,
    lineHeight: 20,
  },
  permissionRetryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  permissionRetryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },

  // ✅ ESTILOS PARA UBICACIONES POPULARES
  popularLocationsList: {
    padding: 20,
  },
  popularLocationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  popularLocationIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  popularLocationContent: {
    flex: 1,
  },
  popularLocationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  popularLocationAddress: {
    fontSize: 14,
    color: '#666',
  },
  
  // ✅ ESTILOS PARA INFORMACIÓN DE RUTA
  routeInfoContainer: {
    marginBottom: 15,
  },
  calculatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  calculatingText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
  },
  routeDetails: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  routeDetailText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  
  // ✅ ESTILOS PARA SELECTOR DE VEHÍCULO
  vehicleSelectorContainer: {
    marginBottom: 20,
  },
  vehicleSelectorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  vehicleOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  vehicleOption: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  vehicleOptionSelected: {
    backgroundColor: '#e3f2fd',
    borderColor: '#007AFF',
  },
  vehicleIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  vehicleName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    marginBottom: 2,
  },
  vehicleNameSelected: {
    color: '#007AFF',
  },
  vehiclePrice: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#333',
  },
  vehiclePriceSelected: {
    color: '#007AFF',
  },

  // ✅ ESTILOS PARA TRACKING DEL CONDUCTOR
  trackingContainer: {
    backgroundColor: '#f0f8ff',
    padding: 15,
    borderRadius: 10,
    marginVertical: 15,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  trackingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  trackingInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  trackingLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  trackingValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginVertical: 10,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  trackingStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
  },
  locationContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  locationText: {
    fontSize: 11,
    color: '#888',
    fontFamily: 'monospace',
  },
  
  requestButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  requestButtonDisabled: {
    backgroundColor: '#ccc',
  },
  requestButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  statusText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    color: '#666',
  },
  priceText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 20,
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    minWidth: 120,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  driverContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  driverName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  driverDetails: {
    fontSize: 16,
    marginBottom: 5,
    color: '#666',
  },
  etaText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 20,
  },
  rideActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 20,
  },
  startButton: {
    backgroundColor: '#34C759',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    minWidth: 120,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  completeButton: {
    backgroundColor: '#34C759',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },

  // 🔐 ESTILOS PARA AUTENTICACIÓN
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 30,
  },
  loadingSpinner: {
    marginVertical: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },

  // Header autenticado
  authenticatedHeader: {
    backgroundColor: '#fff',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  // 🍔 NUEVOS ESTILOS PARA MENÚ HAMBURGUESA
  menuButton: {
    padding: 5,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerSpacer: {
    width: 40, // Para balancear el espacio del menú hamburguesa
  },

  // Estilos del Drawer
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'black',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: 'white',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  drawerHeader: {
    backgroundColor: '#007AFF',
    padding: 20,
    paddingTop: 50,
    alignItems: 'center',
  },
  drawerUserName: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
  },
  drawerUserEmail: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 5,
  },
  drawerContent: {
    flex: 1,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  drawerItemText: {
    marginLeft: 20,
    fontSize: 16,
    color: '#333',
  },
  drawerDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 10,
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
  logoutText: {
    color: '#FF3B30',
  },
  drawerFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    alignItems: 'center',
  },
  drawerFooterText: {
    color: '#999',
    fontSize: 12,
  },

  // Pantalla no autenticada
  unauthenticatedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  unauthenticatedTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  unauthenticatedSubtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  unauthenticatedMessage: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
  },

  // Modal de autenticación
  authModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  authModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  authHeader: {
    backgroundColor: '#007AFF',
    padding: 30,
    alignItems: 'center',
  },
  authTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  authSubtitle: {
    fontSize: 18,
    color: '#fff',
    opacity: 0.9,
  },
  authContent: {
    padding: 30,
  },

  // Inputs de autenticación
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  authInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  passwordHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    fontStyle: 'italic',
  },

  // Botones de auth
  authButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  authButtonDisabled: {
    backgroundColor: '#ccc',
  },
  authButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },

  // Switch entre login/registro
  authSwitchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  authSwitchText: {
    fontSize: 16,
    color: '#666',
    marginRight: 5,
  },
  authSwitchLink: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
});

export default App;