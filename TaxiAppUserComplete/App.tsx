import 'react-native-get-random-values';
import PushNotificationService from './src/services/PushNotificationService';
import Tts from 'react-native-tts';
import SecureStorage from './src/services/SecureStorage';
import AnalyticsService from './src/services/analytics';
import { addTripToHistory } from './src/history/TripHistoryStorage';
import PaymentHistoryScreen from './src/screens/PaymentHistoryScreen';
import SmartDestinationSelector from './src/components/SmartDestinationSelector';
import RealTimePriceEstimator from './src/components/RealTimePriceEstimator';
import FareEstimator from './src/components/FareEstimator';
import './src/locales/i18n';
import { LostItemReportScreen } from './src/screens/LostItems';
import EmergencyService from './EmergencyService';
import EmergencyButton from './EmergencyButton';
import AddressHistoryService from './src/services/AddressHistoryService';
import ThirdPartyRide from './src/components/ThirdPartyRide';
import PickupLocationSelector from './src/components/PickupLocationSelector';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import OnboardingScreen from './src/screens/Onboarding';
import ShareLocationModal from './src/components/ShareLocationModal';
import ShareLocationService from './src/services/ShareLocationService';
import ForgotPasswordScreen from './src/screens/Auth/ForgotPasswordScreen';
import { useTranslation } from 'react-i18next';
import RatingSystem from './src/components/RatingSystem';
import VehicleSelector from './src/components/VehicleSelector';
import SplashScreen from './src/screens/SplashScreen';
import { ErrorBoundary, GlobalErrorHandler } from './src/utils/errorHandling';
import TestEncryption from './src/utils/TestEncryption';
import StorageDiagnostic from './src/utils/StorageDiagnostic';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RatingHistoryScreen from './src/screens/RatingHistoryScreen';
import DriverSearchService from './src/services/DriverSearchService';
import DriverSearchModal from './src/components/DriverSearchModal';
import TripHistoryScreen from './src/screens/TripHistoryScreen';
import TripDetailsScreen from './src/screens/TripDetailsScreen';
import PaymentMethodsScreen from './src/screens/PaymentMethodsScreen';
import MultipleDestinationsModal from './src/components/MultipleDestinationsModal';
import Icon from 'react-native-vector-icons/Ionicons';
import { ValidationUtils } from './src/utils/ValidationUtils';
import { getBackendUrl } from './src/config/config.js';
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
  Linking,  
} from 'react-native';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { Platform } from 'react-native';
import MapComponent from './src/components/MapComponent';
import SharedStorage, { TRIP_STATES } from './src/services/SharedStorage';
import RouteService from './src/services/RouteService';
import DriverTrackingService from './src/services/DriverTrackingService';
import LocationFallbackService, { POPULAR_LOCATIONS } from './src/services/LocationFallbackService';
import ApiService from './src/services/ApiService';
import UserProfile from './src/screens/UserProfile';

// Configuración del drawer
const { width: screenWidth } = Dimensions.get('window');
const DRAWER_WIDTH = screenWidth * 0.75;

  const App = ({ navigation, route }) =>  {
  const [destination, setDestination] = useState('');
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [rideStatus, setRideStatus] = useState(TRIP_STATES.IDLE);
  const [showSplash, setShowSplash] = useState(true);
  const [showShareLocation, setShowShareLocation] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showPickupSelector, setShowPickupSelector] = useState(false);
  const [pickupLocation, setPickupLocation] = useState(null);
  const gpsObtainedRef = useRef(false);

  const Stack = createStackNavigator();

  // Agregar después de todos los useState


  const [pickupLocationConfirmed, setPickupLocationConfirmed] = useState(false);
  const { t, i18n } = useTranslation(); 
  const [showTestI18n, setShowTestI18n] = useState(false);
  const [driverInfo, setDriverInfo] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [estimatedPrice, setEstimatedPrice] = useState(0);
  const [tripRequest, setTripRequest] = useState(null);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [showVehicleSelector, setShowVehicleSelector] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('cash');
  const [routeInfo, setRouteInfo] = useState(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [selectedVehicleType, setSelectedVehicleType] = useState('economy');
  const [driverLocation, setDriverLocation] = useState(null);
  const [trackingProgress, setTrackingProgress] = useState(0);
  const [driverETA, setDriverETA] = useState('');
  const [isDriverMoving, setIsDriverMoving] = useState(false);
  const [trackingActive, setTrackingActive] = useState(false);
 const [showThirdPartyModal, setShowThirdPartyModal] = useState(false);
  const [thirdPartyInfo, setThirdPartyInfo] = useState(null);
  const [thirdPartyOrigin, setThirdPartyOrigin] = useState('');
  const [thirdPartyDestination, setThirdPartyDestination] = useState('');
  const [thirdPartyLocationField, setThirdPartyLocationField] = useState(null);
  const [locationPermissionStatus, setLocationPermissionStatus] = useState('unknown');
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showPopularLocations, setShowPopularLocations] = useState(false);
  const [locationSource, setLocationSource] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showFareCalculator, setShowFareCalculator] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [mapPickerLocation, setMapPickerLocation] = useState(null);
  const [mapPickerAddress, setMapPickerAddress] = useState('');
  const [isGeocodingMapPicker, setIsGeocodingMapPicker] = useState(false);
  const multiDestModalRef = useRef(null);
  const [activeMultiDestinationStopId, setActiveMultiDestinationStopId] = useState(null);
  const [mapPickerMode, setMapPickerMode] = useState('destination'); // 'origin' o 'destination'
  const [authForm, setAuthForm] = useState({
    email: '',
    password: '',
    name: '',
    phone: ''
  });
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const drawerAnimation = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [pendingRatingTrip, setPendingRatingTrip] = useState(null);
  const [showDestinationSelector, setShowDestinationSelector] = useState(false);
  const [showDestinationSelectorForAdd, setShowDestinationSelectorForAdd] = useState(false);
  const [showPriceEstimator, setShowPriceEstimator] = useState(false);
  const [realTimePrice, setRealTimePrice] = useState(0);
  const [priceDetails, setPriceDetails] = useState(null);
  const [searchProgress, setSearchProgress] = useState(null);
  const [isSearchingDriver, setIsSearchingDriver] = useState(false);
  const [searchAttempts, setSearchAttempts] = useState(0);
  const [additionalDestinations, setAdditionalDestinations] = useState([]);
  const [showAddDestinationModal, setShowAddDestinationModal] = useState(false);
  const [inputErrors, setInputErrors] = useState({
    email: '',
    password: '',
    name: '',
    phone: ''
  });
  const [passwordStrength, setPasswordStrength] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [newDestination, setNewDestination] = useState('');
    useEffect(() => {
    // Configurar manejador global de errores
    GlobalErrorHandler.setup();
    // Inicializar Analytics
    AnalyticsService.initialize();
    
    console.log('Iniciando diagnostico de storage...');
    StorageDiagnostic.runDiagnostic().then(() => {
      console.log('Diagnostico completado');
      // Inicializar servicio de emergencia
      EmergencyService.initialize();
    });
  }, []); // Solo se ejecuta una vez al montar el componente


useEffect(() => {
    initializeApp();
    setupNotificationHandlers();
    // Forzar envío de token FCM al iniciar
    PushNotificationService.getToken();
    // Cleanup tracking al desmontar el componente
    return () => {
      DriverTrackingService.stopTracking();
    };
  }, []);


// Recibir dirección favorita seleccionada desde AsyncStorage
  useEffect(() => {
    const checkPendingFavoriteAddress = async () => {
      try {
        const pendingAddress = await AsyncStorage.getItem('pendingFavoriteAddress');
        if (pendingAddress) {
          const favoriteAddress = JSON.parse(pendingAddress);
          console.log(' Direcion favorita recibida:', favoriteAddress);
          // Limpiar inmediatamente para evitar duplicados
          await AsyncStorage.removeItem('pendingFavoriteAddress');
          
          // Si estamos editando un destino adicional del modal múltiples destinos
          if (activeMultiDestinationStopId && multiDestModalRef.current) {
            console.log(' Actualizando destino adicional con favorita:', activeMultiDestinationStopId);
            multiDestModalRef.current.updateStopAddress(activeMultiDestinationStopId, favoriteAddress.address);
            setActiveMultiDestinationStopId(null);
            return;
       }

          // Si es para modal de terceros
          if (thirdPartyLocationField) {
            if (thirdPartyLocationField === 'origen') {
              setThirdPartyOrigin(favoriteAddress.address);
            } else if (thirdPartyLocationField === 'destino') {
              setThirdPartyDestination(favoriteAddress.address);
            }
            setThirdPartyLocationField(null);
            setTimeout(() => setShowThirdPartyModal(true), 300);
            return;
          }

          // Establecer como destino principal (comportamiento original)
          setDestination(favoriteAddress.address);
          setSelectedDestination({
            name: favoriteAddress.name,
            address: favoriteAddress.address,
            location: favoriteAddress.coordinates ? {
              latitude: favoriteAddress.coordinates.lat,
              longitude: favoriteAddress.coordinates.lng
            } : null
          });
          // Calcular ruta si tenemos coordenadas
          if (favoriteAddress.coordinates && userLocation) {
            const destLocation = {
              latitude: favoriteAddress.coordinates.lat,
              longitude: favoriteAddress.coordinates.lng
            };
            calculateRouteAndPrice(userLocation, destLocation, selectedVehicleType);
          }
        }
      } catch (error) {
        console.error('Error leyendo dirección favorita:', error);
      }
    };
    // Verificar cuando la pantalla obtiene foco
    const unsubscribe = navigation.addListener('focus', checkPendingFavoriteAddress);
    return unsubscribe;
 }, [navigation, userLocation, selectedVehicleType, activeMultiDestinationStopId, thirdPartyLocationField]);

  // Verificar si el usuario ya vio el onboarding
  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const hasSeenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');
      if (hasSeenOnboarding === 'true') {
        setHasSeenOnboarding(true);
      }
    } catch (error) {
      console.error('Error verificando onboarding:', error);
    } finally {
      setCheckingOnboarding(false);
    }
  };

  // FUNCIONES DEL DRAWER MENU
  const toggleDrawer = () => {
    console.log('BOTON TOCADO - Estado actual:', isDrawerOpen);
    
    const toValue = isDrawerOpen ? -DRAWER_WIDTH : 0;
    const overlayToValue = isDrawerOpen ? 0 : 0.5;

    console.log('Animando drawer a:', toValue);

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
    ]).start(() => {
      console.log('Animacion completada');
    });

    setIsDrawerOpen(!isDrawerOpen);
    console.log('Nuevo estado drawer:', !isDrawerOpen);
  };

  // AGREGAR ESTA FUNCIÓN QUE FALTA:
  const closeDrawer = () => {
    if (isDrawerOpen) {
      toggleDrawer();
    }
  };

  // FUNCIÓN ACTUALIZADA: Manejar opciones del menú
  const handleMenuOption = (option) => {
    closeDrawer();
    
    switch(option) {
      case 'profile':
        setTimeout(() => setShowUserProfile(true), 300);
        break;
      case 'trips':
        setTimeout(() => {
          if (navigation && navigation.navigate) {
            navigation.navigate('TripHistory');
          } else {
            console.log('Navigation no disponible');
            Alert.alert('Error', 'No se puede navegar a esta pantalla');
          }
        }, 300);
        break;
      case 'payments':
        setTimeout(() => {
          if (navigation && navigation.navigate) {
            navigation.navigate('PaymentMethods');
          } else {
            console.log('Navigation no disponible');
            Alert.alert('Error', 'No se puede navegar a esta pantalla');
          }
        }, 300);
        break;
      case 'paymentHistory':
        setTimeout(() => {
          if (navigation && navigation.navigate) {
            navigation.navigate('PaymentHistory');
          } else {
            console.log('Navigation no disponible');
            Alert.alert('Error', 'No se puede navegar a esta pantalla');
          }
        }, 300);
        break;
      case 'lostItems':
        setTimeout(() => {
          if (navigation && navigation.navigate) {
            navigation.navigate('LostItemReport');
          } else {
            console.log('Navigation no disponible');
            Alert.alert('Error', 'No se puede navegar a esta pantalla');
          }
        }, 300);
        break;
      case 'addresses':
       setTimeout(() => {
      if (navigation && navigation.navigate) {
        navigation.navigate('FavoriteAddresses', { thirdPartyField: thirdPartyLocationField });
          } else {
            console.log('Navigation no disponible');
            Alert.alert('Error', 'No se puede navegar a esta pantalla');
          }
        }, 300);
        break;
      case 'addressHistory':
        setTimeout(() => {
          if (navigation && navigation.navigate) {
            navigation.navigate('AddressHistory');
          } else {
            console.log('Navigation no disponible');
            Alert.alert('Error', 'No se puede navegar a esta pantalla');
          }
        }, 300);
        break;
      case 'help':
        setTimeout(() => {
          if (navigation && navigation.navigate) {
            navigation.navigate('Support');
          } else {
            console.log('Navigation no disponible');
            Alert.alert('Error', 'No se puede navegar a esta pantalla');
          }
        }, 300);
        break;
      case 'settings':
        setTimeout(() => {
          if (navigation && navigation.navigate) {
            navigation.navigate('Settings');
          } else {
            console.log('Navigation no disponible');
            Alert.alert('Error', 'No se puede navegar a esta pantalla');
          }
        }, 300);
        break;
      case 'back':
        console.log('Cerrando drawer');
        closeDrawer();
        break;
    }
  };

const initializeApp = async () => {
  try {
    console.log('Inicializando TaxiApp Usuario...');
    setIsLoading(true);

// 1. Obtener ubicacion con geocoding (esto actualizará la dirección correctamente)
    initializeLocationService();
  
  // 2. Verificar si el usuario está autenticado
  const authToken = await SharedStorage.getAuthToken();
  if (authToken) {
    try {
      //  NO verificar con el servidor, solo usar el token local
      const localUser = await SharedStorage.getUserProfile();
      if (localUser && localUser.email) {
        setIsAuthenticated(true);
        console.log('Usuario autenticado (local):', localUser.name);
        
        // Continuar con la inicialización normal
        await loadUserState();
        await initializeUserProfile();
      } else {
        // No hay perfil local, mostrar login
        setIsAuthenticated(false);
        setShowAuthModal(true);
      }
    } catch (error) {
      console.error('Error obteniendo perfil local:', error);
      setIsAuthenticated(false);
      setShowAuthModal(true);
    }
  } else {
    // No hay token, mostrar login
    setIsAuthenticated(false);
    setShowAuthModal(true);
    console.log('Usuario no autenticado, mostrando login');
  }
    
    setupNotificationHandlers();
    console.log('TaxiApp Usuario inicializada correctamente');
    
  } catch (error) {
    console.error('Error inicializando la app:', error);
    setIsAuthenticated(false);
    setShowAuthModal(true);
  } finally {
    setIsLoading(false);  //  CAMBIO 2: Mover aquí al FINAL (en finally)
  }
};

  // FUNCIONES DE AUTENTICACION

  // Funciones de validación
  const validateEmail = (email) => {
    if (!email) {
      setInputErrors(prev => ({...prev, email: 'El email es requerido'}));
      return false;
    }
    if (!ValidationUtils.isValidEmail(email)) {
      setInputErrors(prev => ({...prev, email: 'Email inválido'}));
      return false;
    }
    setInputErrors(prev => ({...prev, email: ''}));
    return true;
  };

  const validatePassword = (password) => {
    const validation = ValidationUtils.isValidPassword(password);
    if (!password) {
      setInputErrors(prev => ({...prev, password: 'La contraseña es requerida'}));
      return false;
    }
    if (!validation.isValid) {
      setInputErrors(prev => ({...prev, password: 'Mínimo 6 caracteres'}));
      return false;
    }
    setPasswordStrength(validation.strength);
    setInputErrors(prev => ({...prev, password: ''}));
    return true;
  };

  const validateName = (name) => {
    if (!name) {
      setInputErrors(prev => ({...prev, name: 'El nombre es requerido'}));
      return false;
    }
    if (!ValidationUtils.isValidName(name)) {
      setInputErrors(prev => ({...prev, name: 'Nombre inválido (solo letras)'}));
      return false;
    }
    setInputErrors(prev => ({...prev, name: ''}));
    return true;
  };

  const validatePhone = (phone) => {
    if (!phone) {
      setInputErrors(prev => ({...prev, phone: 'El teléfono es requerido'}));
      return false;
    }
    if (!ValidationUtils.isValidPhone(phone)) {
      setInputErrors(prev => ({...prev, phone: 'Teléfono inválido (809/829/849)'}));
      return false;
    }
    setInputErrors(prev => ({...prev, phone: ''}));
    return true;
  };

  // Función para manejar login
  const handleLogin = async () => {
    try {
      // Validar campos antes de enviar
      const emailValid = validateEmail(authForm.email);
      const passwordValid = validatePassword(authForm.password);
      
      if (!emailValid || !passwordValid) {
        Alert.alert('Error', 'Por favor corrige los errores en el formulario');
        return;
      }
      
      setIsLoading(true);
      console.log('Intentando login para:', authForm.email);
      
      const loginResponse = await ApiService.login(authForm.email, authForm.password);
      
      if (loginResponse.success) {
        // Guardar token y datos del usuario
        await SharedStorage.saveAuthToken(loginResponse.token);
        console.log(' TOKEN GUARDADO:', loginResponse.token);
        // Guardar credenciales encriptadas
        await SecureStorage.saveCredentials(authForm.email, authForm.password);
        await SharedStorage.saveUserProfile(loginResponse.user);
        // Guardar el ID real del usuario
        await SharedStorage.saveUserId(loginResponse.user.id.toString());
        console.log(' User ID guardado en login:', loginResponse.user.id);
        
        setIsAuthenticated(true);
        setShowAuthModal(false);
        
        console.log('Login exitoso:', loginResponse.user.name);
        // Registrar login en analytics
        AnalyticsService.logLogin('email');
        AnalyticsService.setUserId(loginResponse.user.id || authForm.email);
        AnalyticsService.setUserProperties({
          user_type: 'passenger',
          name: loginResponse.user.name
        });
        
        Alert.alert('¡Bienvenido!', `Hola ${loginResponse.user.name}`);
        
        // Limpiar errores
        setInputErrors({
          email: '',
          password: '',
          name: '',
          phone: ''
        });
        
        // Continuar con la inicialización de la app
        await loadUserState();
        await initializeUserProfile();
        await initializeLocationService();
        
      } else {
        Alert.alert('Error de login', loginResponse.message || 'Credenciales incorrectas');
      }
      
    } catch (error) {
      console.error('Error en login:', error);
      Alert.alert('Error', 'No se pudo conectar con el servidor. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  // Función para manejar registro
  const handleRegister = async () => {
    try {
      setIsLoading(true);
      console.log('Intentando registro para:', authForm.email);
      
      // Validar todos los campos
      const nameValid = validateName(authForm.name);
      const emailValid = validateEmail(authForm.email);
      const passwordValid = validatePassword(authForm.password);
      const phoneValid = validatePhone(authForm.phone);
      
      if (!nameValid || !emailValid || !passwordValid || !phoneValid) {
        Alert.alert('Error', 'Por favor corrige los errores en el formulario');
        setIsLoading(false);
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
        // Guardar credenciales encriptadas
        await SecureStorage.saveCredentials(authForm.email, authForm.password);
        await SharedStorage.saveUserProfile(registerResponse.user);
        // Guardar el ID real del usuario
       await SharedStorage.saveUserId(registerResponse.user.id.toString());
       console.log(' User ID guardado en registro:', registerResponse.user.id);
        
        setIsAuthenticated(true);
        setShowAuthModal(false);
        
        console.log('Registro exitoso:', registerResponse.user.name);
        // Registrar nuevo usuario en analytics
        AnalyticsService.logSignUp('email');
        AnalyticsService.setUserId(registerResponse.user.id || authForm.email);
        AnalyticsService.setUserProperties({
          user_type: 'passenger',
          name: registerResponse.user.name
        });
        Alert.alert('¡Registro exitoso!', `Bienvenido a TaxiApp, ${registerResponse.user.name}`);
        
        // Limpiar errores
        setInputErrors({
          email: '',
          password: '',
          name: '',
          phone: ''
        });
        setPasswordStrength('');
        
        // Continuar con la inicialización de la app
        await loadUserState();
        await initializeUserProfile();
        await initializeLocationService();
        
      } else {
        Alert.alert('Error de registro', registerResponse.message || 'No se pudo crear la cuenta');
      }
      
    } catch (error) {
      console.error('Error en registro:', error);
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
              
              console.log('Logout exitoso');
            } catch (error) {
              console.error('Error en logout:', error);
            }
          }
        }
      ]
    );
  };

  // FUNCIÓN: Limpiar formulario de autenticación
  const resetAuthForm = () => {
    setAuthForm({
      email: '',
      password: '',
      name: '',
      phone: ''
    });
    setInputErrors({
      email: '',
      password: '',
      name: '',
      phone: ''
    });
    setPasswordStrength('');
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
        console.log('Nuevo perfil de usuario creado');
      } else {
        console.log('Perfil de usuario cargado:', userProfile.name);
      }
    } catch (error) {
      console.error('Error inicializando perfil:', error);
    }
  };

const setupNotificationHandlers = () => {
    // Handler para cuando se asigna un conductor
    global.handleDriverAssigned = async (driverData) => {
      console.log('Conductor asignado via notificacion:', driverData);
      
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
      
      // Cerrar modal de búsqueda
      setSearchModalVisible(false);
      setIsSearchingDriver(false);
      
      // Obtener ubicacion actual del usuario desde SharedStorage
      const currentUserLocation = await SharedStorage.getUserLocation();
      console.log('Ubicación del usuario para tracking:', currentUserLocation);
      
      // Iniciar tracking solo si tenemos la ubicacion
      if (currentUserLocation && currentUserLocation.latitude) {
        startDriverTracking(mockDriverInfo, currentUserLocation);
      } else {
        console.log('�️ No hay ubicacion del usuario, tracking omitido');
      }
    };
    
    // Inicializar PushNotificationService
    // Ya se inicializa automáticamente al importar
    console.log('PushNotificationService inicializado');
  };
// NUEVA FUNCIÓN: Inicializar servicio de ubicacion con fallback mejorado
const initializeLocationService = async () => {
  try {
    // Si ya obtuvimos ubicacion GPS, no continuar
    if (gpsObtainedRef.current) {
      console.log(' Ya obtuvimos ubicacion GPS, ignorando llamada duplicada');
      return;
    }
    
    setIsLoadingLocation(true);
    console.log('Inicializando servicio de ubicacion...');

    // Coordenadas por defecto
    const defaultLat = 18.4861;
    const defaultLng = -69.9312;

    // Función helper para obtener dirección via Mapbox
    const getAddressFromCoords = async (lat, lng) => {
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=pk.eyJ1IjoibWVuYW5kcm82OCIsImEiOiJjbWlmY2hiMHcwY29sM2VuNGk2dnlzMzliIn0.PqOOzFKFJA7Q5jPbGwOG8Q&language=es`
        );
        const data = await response.json();
        if (data.features && data.features.length > 0) {
          let address = data.features[0].place_name;
          if (address.length > 60) {
            address = address.replace(', República Dominicana', '').replace(', Dominican Republic', '');
          }
          return address;
        }
      } catch (e) {
        console.error('Error en geocoding:', e);
      }
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    };

    // ? PASO 0: Intentar carga INSTANT�NEA desde cach� (< 100ms)
    const cachedLocation = await LocationFallbackService.getInstantCachedLocation();
    if (cachedLocation && cachedLocation.success) {
      console.log('? Mostrando ubicaci�n cacheada INMEDIATAMENTE');
      setUserLocation(cachedLocation.location);
      setLocationSource('cached_instant');
      setIsLoadingLocation(false);
      console.log('?? Actualizando GPS en background...');
    }

    // 1. Primero solicitar permisos
    const permissionGranted = await requestLocationPermissions();

    if (permissionGranted) {
      // 2. Intentar obtener ubicacion con fallback automático
      const locationResult = await LocationFallbackService.getLocationForUser({
        showUserPrompt: false,
        timeout: 20000
      });

     if (locationResult.success && locationResult.location) {
        // Si es fallback, verificar si ya tenemos ubicacion GPS guardada
      if (locationResult.location.source === 'fallback') {
          const savedLocation = await SharedStorage.getUserLocation();
         if (savedLocation && savedLocation.latitude && savedLocation.source !== 'fallback') {
            console.log(' Ignorando fallback, usando ubicacion GPS guardada:', savedLocation.address);
            setUserLocation(savedLocation);
            setLocationSource('gps');
            setIsLoadingLocation(false);
            return;
          } else {
            // NO usar fallback genérico - exigir GPS real
            console.log(' GPS falló y no hay cache valido - requiere GPS real');
            setIsLoadingLocation(false);
          // Reintentar automáticamente sin mostrar alerta
            setTimeout(() => initializeLocationService(), 3000);
            return; // NO usar fallback genérico
          }
        }
        
        // ✅ UBICACIÓN OBTENIDA CORRECTAMENTE
        setUserLocation(locationResult.location);
        setLocationSource(locationResult.location.source);

        console.log('Ubicacion obtenida:', locationResult.location.source);
        console.log(' Coordenadas:', {
          lat: locationResult.location.latitude,
          lng: locationResult.location.longitude
        });

   } else {
        //  FALLO OBTENIENDO UBICACIÓN - VERIFICAR SI HAY CACHÉ VÁLIDO
        console.log('Fallo obteniendo ubicacion GPS...');
        
    // Verificar si ya hay ubicacion guardada en storage
        const savedLocation = await SharedStorage.getUserLocation();
        if (savedLocation && savedLocation.latitude && savedLocation.longitude) {
          console.log('✅ Usando ubicacion guardada en storage:', savedLocation.address);
          setUserLocation(savedLocation);
          setLocationSource(savedLocation.source || 'storage');
          return; // NO sobreescribir con fallback
        }
        // Sin cache válido - usar fallback
        console.log('Sin valido, usando fallback...');
        const fallbackAddress = await getAddressFromCoords(defaultLat, defaultLng);
        const fallbackLocation = {
          latitude: defaultLat,
          longitude: defaultLng,
          address: fallbackAddress,
          source: 'fallback'
        };

        setUserLocation(fallbackLocation);
        setLocationSource('fallback');

        setTimeout(() => {
          Alert.alert(
            'Ubicación no disponible',
            'No se pudo obtener tu ubicacion GPS. Estamos usando ubicacion por defecto.',
            [
              { text: 'Usar esta', style: 'cancel' },
              { text: 'Seleccionar otra', onPress: () => setShowLocationModal(true) }
            ]
          );
        }, 500);
      }
    } else {
      // SIN PERMISOS - USAR FALLBACK CON GEOCODING
      console.log('⚠️ Sin permisos de ubicacion, usando fallback con geocoding');

      const defaultAddress = await getAddressFromCoords(defaultLat, defaultLng);
      const defaultLocation = {
        latitude: defaultLat,
        longitude: defaultLng,
        address: defaultAddress,
        source: 'default'
      };

      setUserLocation(defaultLocation);
      setLocationSource('default');
      setLocationPermissionStatus('denied');

      setTimeout(() => {
        setShowLocationModal(true);
      }, 500);
    }

  } catch (error) {
    console.error('❌ Error inicializando ubicacion:', error);

    // ÚLTIMO RECURSO: Emergency fallback con geocoding
    const emergencyLat = 18.4861;
    const emergencyLng = -69.9312;
    
    let emergencyAddress = `${emergencyLat.toFixed(4)}, ${emergencyLng.toFixed(4)}`;
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${emergencyLng},${emergencyLat}.json?access_token=pk.eyJ1IjoibWVuYW5kcm82OCIsImEiOiJjbWlmY2hiMHcwY29sM2VuNGk2dnlzMzliIn0.PqOOzFKFJA7Q5jPbGwOG8Q&language=es`
      );
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        emergencyAddress = data.features[0].place_name;
      }
    } catch (e) {}

    const emergencyLocation = {
      latitude: emergencyLat,
      longitude: emergencyLng,
      address: emergencyAddress,
      source: 'emergency_fallback'
    };

    setUserLocation(emergencyLocation);
    setLocationSource('emergency_fallback');

    console.log(' Usando ubicacion de emergencia:', emergencyLocation);

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
        // VALIDAR CON BACKEND si el viaje realmente existe
        try {
          const tripId = currentTripRequest?.id;
          if (tripId) {
            const response = await ApiService.getTripStatus(tripId);
            if (!response.success || response.status === 'completed' || response.status === 'cancelled') {
              // Viaje no existe o ya terminó - resetear a IDLE
              console.log('Viaje local no existe en servidor, reseteando a IDLE');
              await SharedStorage.resetToIdle();
              setRideStatus(TRIP_STATES.IDLE);
              return;
            }
          } else {
            // No hay tripId válido - resetear a IDLE
            console.log('No hay tripId válido, reseteando a IDLE');
            await SharedStorage.resetToIdle();
            setRideStatus(TRIP_STATES.IDLE);
            return;
          }
        } catch (apiError) {
          // Error de red - mantener estado local por ahora
          console.log('No se pudo verificar viaje con servidor, usando estado local');
        }

        setRideStatus(currentStatus);
        setTripRequest(currentTripRequest);
        setDriverInfo(currentDriverInfo);
        console.log('Estado del usuario restaurado:', currentStatus);

        if (currentStatus === TRIP_STATES.DRIVER_ASSIGNED && currentDriverInfo) {
          startDriverTracking(currentDriverInfo, currentUserLocation);
        }
      }
    } catch (error) {
      console.error('Error cargando estado del usuario:', error);
    }
  };

  // FUNCIÓN MEJORADA: Solicitar permisos de ubicacion
  const requestLocationPermissions = async () => {
    try {
      console.log('Solicitando permisos de ubicacion...');
      setLocationPermissionStatus('requesting');
      
      const fine = await request(
        Platform.OS === 'android'
          ? PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION
          : PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
      );
      
      console.log('Resultado de permisos:', fine);
      
      if (fine === RESULTS.GRANTED) {
        console.log('Permisos de ubicacion concedidos');
        setLocationPermissionStatus('granted');
        return true;
      } else if (fine === RESULTS.DENIED) {
        console.log('Permisos de ubicacion denegados');
        setLocationPermissionStatus('denied');
        return false;
      } else if (fine === RESULTS.BLOCKED) {
        console.log('Permisos de ubicacion bloqueados');
        setLocationPermissionStatus('blocked');
        return false;
      } else {
        console.log('Estado de permiso desconocido:', fine);
        setLocationPermissionStatus('unknown');
        return false;
      }
    } catch (error) {
      console.error('Error solicitando permisos:', error);
      setLocationPermissionStatus('error');
      return false;
    }
  };

  // NUEVA FUNCIÓN: Manejar selección de ubicacion manual
 const handleLocationSelected = async (location) => {
    try {
      console.log('Nueva ubicacion seleccionada:', location);

      // Si es para modal de terceros, actualizar y regresar
      if (thirdPartyLocationField) {
        const address = location.address || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
        if (thirdPartyLocationField === 'origen') {
          setThirdPartyOrigin(address);
        } else if (thirdPartyLocationField === 'destino') {
          setThirdPartyDestination(address);
        }
        setThirdPartyLocationField(null);
        setShowLocationModal(false);
        setTimeout(() => setShowThirdPartyModal(true), 300);
        return;
      }
      
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
      
      // Actualizar ubicacion del usuario
      const newLocation = {
        ...location,
        source: location.source || 'manual'
      };
      
      setUserLocation(newLocation);
      setLocationSource(newLocation.source);
      // Guardar ubicacion de forma segura
      await SecureStorage.saveLocation(newLocation);
      await SharedStorage.saveUserLocation(newLocation); // Mantener para compatibilidad
      
      // Cerrar modales
      setShowLocationModal(false);
      setShowPopularLocations(false);
      
      console.log('Ubicacion actualizada exitosamente');
      
    } catch (error) {
      console.error('Error actualizando ubicacion:', error);
      Alert.alert('Error', 'No se pudo actualizar la ubicacion');
    }
  };


// NUEVA FUNCIÓN: Reintentar obtener GPS
  const retryGPSLocation = async () => {
    try {
      setIsLoadingLocation(true);
      console.log('Reintentando obtener ubicacion GPS...');
      
      const locationResult = await LocationFallbackService.getLocationForUser({
        showUserPrompt: false,
        timeout: 10000
      });
      
      if (locationResult.success && locationResult.location) {
        // ✅ Marcar que ya obtuvimos ubicacion si es GPS
        if (locationResult.location.source === 'gps') {
          gpsObtainedRef.current = true;
        }
        
        // ✅ UBICACIÓN OBTENIDA CORRECTAMENTE
        setUserLocation(locationResult.location);
        await handleLocationSelected(locationResult.location);
        
        if (locationResult.location.source === 'gps') {
          Alert.alert(
            '¡Éxito!', 
            'Ubicación GPS obtenida correctamente',
            [{ text: 'OK', onPress: () => setPickupLocationConfirmed(true) }]
          );
        } else {
          Alert.alert(
            'GPS no disponible', 
            'Se usó ubicacion aproximada. ' + (locationResult.warning || '')
          );
        }
      } else {
        Alert.alert('Error', 'No se pudo obtener la ubicacion');
      }
      
    } catch (error) {
      console.error('Error reintentando GPS:', error);
      Alert.alert('Error', 'Error al reintentar GPS');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  // FUNCIÓN: Calcular ruta y precio usando API real
  const calculateRouteAndPrice = async (origin, destination, vehicleType = 'economy') => {
    try {
      setIsCalculatingRoute(true);
      console.log('Calculando ruta y precio con API real...', { origin, destination, vehicleType });

      // Primero obtener estimación rápida del API
      const priceEstimate = await ApiService.estimatePrice(origin, destination, vehicleType);
      if (priceEstimate) {
        setEstimatedPrice(priceEstimate.estimated_price);
        console.log('Estimacion del API:', priceEstimate.estimated_price);
      }

      // Luego calcular ruta completa con API real
      const routeData = await ApiService.calculateRoute(origin, destination, vehicleType);
      
      setRouteInfo(routeData);
      setEstimatedPrice(routeData.pricing.final_price);
      
      console.log('Ruta calculada con API real:', {
        distance: routeData.distance,
        duration: routeData.duration,
        price: routeData.pricing.final_price
      });

      return routeData;

    } catch (error) {
      console.error('Error con API real, usando fallback:', error);
      
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

  // FUNCIÓN: Manejar selección de destino
  const handleDestinationSelected = async (place) => {
    try {
      console.log('Destino seleccionado:', place);
      setSelectedDestination(place);
      setDestination(place.name);

      // Usar la ubicacion actual del usuario (GPS o fallback)
      if (userLocation) {
        await calculateRouteAndPrice(userLocation, place.location, selectedVehicleType);
      } else {
        Alert.alert(
          'Ubicación no disponible',
          'Selecciona tu ubicacion de origen primero',
          [
            { text: 'Seleccionar ubicacion', onPress: () => setShowLocationModal(true) }
          ]
        );
      }

    } catch (error) {
      console.error('Error manejando seleccion de destino:', error);
    }
  };

  // FUNCIÓN: Cambiar tipo de vehículo
  const handleVehicleTypeChange = async (vehicleType) => {
    try {
      setSelectedVehicleType(vehicleType);
      
      if (selectedDestination && userLocation) {
        // Mostrar estimador con el nuevo tipo de vehículo
        setShowPriceEstimator(false);
        setTimeout(() => {
          setShowPriceEstimator(true);
        }, 100);
        
        await calculateRouteAndPrice(userLocation, selectedDestination.location, vehicleType);
      }
    } catch (error) {
      console.error('Error cambiando tipo de vehiculo:', error);
    }
  };

const startDriverTracking = async (driver, userLoc) => {
    try {
      console.log('🚗 Iniciando tracking REAL del conductor:', driver.name);
      console.log('🆔 Driver ID:', driver.id);

      // Obtener el driverId - puede venir como string o número
      const driverId = driver.id || driver.driverId;
      
      if (!driverId || driverId === 'unknown') {
        console.log('⚠️ No hay driverId válido, usando ID 3 por defecto');
      }

      // Usar el ID numérico del conductor
      const numericDriverId = parseInt(driverId) || 3;

      setTrackingActive(true);
      setIsDriverMoving(true);

      // Configurar callbacks para el tracking REAL
      const trackingCallbacks = {
        onLocationUpdate: (driverUpdate) => {
          console.log('📍 Ubicación REAL del conductor:', driverUpdate);

          setDriverLocation(driverUpdate.location);
          
          // El nuevo servicio calcula ETA basado en distancia real
          if (driverUpdate.estimatedTimeRemaining) {
            setDriverETA(`${driverUpdate.estimatedTimeRemaining} min`);
          }
          
          setIsDriverMoving(driverUpdate.isMoving);

          // Actualizar info del conductor con nueva ubicación
          setDriverInfo(prevInfo => ({
            ...prevInfo,
            currentLocation: driverUpdate.location,
            eta: driverUpdate.estimatedTimeRemaining ? `${driverUpdate.estimatedTimeRemaining} min` : prevInfo?.eta
          }));
        },

  onArrival: (arrivalInfo) => {
          console.log('🎯 ¡Conductor ha llegado!', arrivalInfo);

          setIsDriverMoving(false);
          setTrackingActive(false);
          setDriverETA('Ha llegado');

          // Mensaje de voz: "Tu conductor ha llegado" 5 veces
          const speakArrival = async () => {
            try {
              await Tts.setDefaultLanguage('es-ES');
              await Tts.setDefaultRate(0.5);
              for (let i = 0; i < 5; i++) {
                await Tts.speak('Tu conductor ha llegado');
                await new Promise(resolve => setTimeout(resolve, 2000));
              }
            } catch (error) {
              console.log('Error TTS:', error);
            }
          };
          speakArrival();

          Alert.alert(
            '¡Conductor ha llegado!',
            `${driver.name} está en tu ubicación.`,
            [
              {
                text: 'Subir al vehículo',
                onPress: () => startRide()
              }
            ]
          );
        }
      };

      // Iniciar el tracking con ubicación REAL
      const trackingResult = await DriverTrackingService.startTracking(
        numericDriverId,
        userLoc,
        trackingCallbacks
      );

      if (trackingResult.success) {
        console.log('✅ Tracking REAL iniciado exitosamente');
      } else {
        console.log('❌ Error iniciando tracking:', trackingResult.error);
      }

    } catch (error) {
      console.error('❌ Error iniciando tracking del conductor:', error);
      Alert.alert('Error', 'No se pudo iniciar el seguimiento del conductor');
    }
  };
  // NUEVA FUNCIÓN: Detener tracking del conductor
  const stopDriverTracking = () => {
    console.log('Deteniendo tracking del conductor');
    
    DriverTrackingService.stopTracking();
    setTrackingActive(false);
    setIsDriverMoving(false);
    setTrackingProgress(0);
    setDriverETA('');
    setDriverLocation(null);
  };

  // FUNCIÓN: Llamar al conductor
  const handleCallDriver = () => {
    if (driverInfo && driverInfo.phone) {
      const phoneNumber = driverInfo.phone;
      const url = `tel:${phoneNumber}`;
      
      Linking.openURL(url).catch((err) => {
        console.error('Error al intentar llamar:', err);
        Alert.alert('Error', 'No se pudo realizar la llamada');
      });
    } else {
      Alert.alert('Error', 'No hay número de teléfono disponible');
    }
  };

// FUNCIÓN: Chat con el conductor via WhatsApp
  const handleChatDriver = () => {
    const phone = driverInfo?.phone?.replace(/[^0-9]/g, '') || '';
    if (!phone) {
      Alert.alert('Error', 'No hay número de teléfono disponible');
      return;
    }
    const message = `Hola ${driverInfo.name}, soy tu pasajero. Estoy esperando mi viaje.`;
    const whatsappUrl = `https://wa.me/1${phone}?text=${encodeURIComponent(message)}`;
    
    Linking.openURL(whatsappUrl).catch(() => {
      Alert.alert('Error', 'No se pudo abrir WhatsApp');
    });
  };
  // FUNCIÓN: Solicitar viaje usando API real
  const requestRide = async () => {
    if (!destination || (typeof destination === 'string' && !destination.trim())) {
      Alert.alert('Error', 'Por favor ingresa un destino');
      return;
    }

    if (!userLocation) {
      Alert.alert(
        'Ubicación requerida',
        'Necesitamos tu ubicacion para solicitar el viaje',
        [
          { text: 'Seleccionar ubicacion', onPress: () => setShowLocationModal(true) }
        ]
      );
      return;
    }

    // NUEVA LÍNEA: Mostrar modal de métodos de pago
    setShowPaymentModal(true);
    return; // Detener aquí y continuar cuando el usuario seleccione método de pago
  };

const processRideRequest = async () => {
  setShowPaymentModal(false);
  
  // ✅ GUARDAR UBICACIÓN INMEDIATAMENTE ANTES DE CUALQUIER CAMBIO DE ESTADO
  if (userLocation) {
    await SharedStorage.saveUserLocation(userLocation);
    console.log('✅ Ubicación guardada en SharedStorage:', userLocation);
  }

  if (!estimatedPrice && !routeInfo) {
    console.log('Continuando con precio base');
    setEstimatedPrice(150);
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

    const finalPrice = routeInfo ? 
      parseFloat(routeInfo.price) : 
      (estimatedPrice || 150);

      // Validar que userLocation tiene coordenadas
if (!userLocation || !userLocation.latitude || !userLocation.longitude) {
  Alert.alert('Error', 'No se puede obtener tu ubicacion. Intenta de nuevo.');
  return;
}

   const storedUserId = await SharedStorage.getUserId();
   console.log('DEBUG: storedUserId =', storedUserId);
     console.log(' DEBUG: tipo de storedUserId =', typeof storedUserId);
    const request = {
     userId: storedUserId || 123,
      origin: {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        address: userLocation?.address || pickupLocation?.address || 'Mi ubicacion',
      },
      destination: destinationData,
      price: finalPrice,
      paymentMethod: selectedPaymentMethod,
      vehicleType: selectedVehicleType,
      status: 'searching',
      requestTime: new Date().toISOString(),
    };

    console.log('Enviando solicitud de viaje con metodo de pago:', selectedPaymentMethod);
    
    setTripRequest(request);
    setRideStatus('searching');

    await sendTripRequestToBackend(request);
    
  } catch (error) {
    console.error('Error:', error);
    Alert.alert('Error', 'No se pudo procesar la solicitud');
    fallbackRequestRide();
  }
};
const sendTripRequestToBackend = async (tripData) => {
  try {
    console.log('Enviando solicitud al backend:', tripData);
    console.log('URL:', `${getBackendUrl()}/trips/create`);

    // DEBUG: User ID
    console.log('��� DEBUG: Enviando user_id =', tripData.userId);
    console.log('��� DEBUG: tipo =', typeof tripData.userId);
    
    // DEBUG: Coordenadas
    console.log('��� DEBUG: origin.latitude =', tripData.origin.latitude);
    console.log('��� DEBUG: origin.longitude =', tripData.origin.longitude);
    
    // DEBUG: Precio ANTES de transformación
    console.log('��� DEBUG: Precio ANTES =', tripData.price);
    console.log('��� DEBUG: ¿Es NaN?', isNaN(tripData.price));
    
    // Transformar precio
    const finalEstimatedPrice = isNaN(tripData.price) ? 150 : tripData.price;
    console.log('��� DEBUG: Precio TRANSFORMADO =', finalEstimatedPrice);
    console.log('��� DEBUG: Tipo de precio final =', typeof finalEstimatedPrice);
    
    // Construir JSON
    const requestBody = {
      user_id: tripData.userId,
      pickup_location: tripData.origin.address,
      destination: tripData.destination.address,
      vehicle_type: tripData.vehicleType,
      payment_method: tripData.paymentMethod,
      estimated_price: finalEstimatedPrice,
      pickup_coords: {
        latitude: tripData.origin.latitude,
        longitude: tripData.origin.longitude
      }
    };
    
    // DEBUG: JSON completo que se envía
    console.log('��� DEBUG: JSON COMPLETO a enviar:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(`${getBackendUrl()}/trips/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('✅ Response recibido:', response.status);
    
    if (!response.ok) {
      // DEBUG: Intentar leer el error del servidor
      const errorText = await response.text();
      console.log('��� Respuesta del servidor:', errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Datos parseados:', data);
    
    if (data.success) {
      console.log('✅ Viaje creado:', data.tripId);
      setDriverInfo(data.driver || null);
      setRideStatus(TRIP_STATES.DRIVER_ASSIGNED);
     setSearchModalVisible(true);
    } else {
      throw new Error(data.message || 'Error desconocido');
    }
    
  } catch (error) {
    console.error('❌ Error completo:', error);
    console.error('Mensaje:', error.message);
    console.error('Stack:', error.stack);
    
    Alert.alert('Error de conexión', error.message || 'No se pudo conectar');
    fallbackRequestRide();
  }
};
  // Función de fallback si falla el API (SOLO UNA VEZ)
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
      const finalPrice = routeInfo ? 
        parseFloat(routeInfo.price) : 
        (estimatedPrice || 150);

      const tripRequestData = {
        userId: 'user_123',
        origin: {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          address: userLocation?.address || pickupLocation?.address || 'Mi ubicacion',
        },
        destination: mockDestination,
        price: finalPrice,
        paymentMethod: selectedPaymentMethod,
        vehicleType: selectedVehicleType,
        status: 'searching',
        requestTime: new Date().toISOString(),
      };
      // FRAGMENTO CORREGIDO (no es el código completo)
      await SharedStorage.startRideRequest(
        userLocation,
        mockDestination,
        selectedVehicleType,
        finalPrice
      );

      setTripRequest(tripRequestData);
      setRideStatus('searching');

      console.log('Solicitud de viaje creada (fallback):', tripRequestData);
      searchForDriver();

    } catch (error) {
      console.error('Error en fallback:', error);
      Alert.alert('Error', 'No se pudo solicitar el viaje');
    }
  };

  // Función para buscar conductor
const searchForDriver = () => {
  // SIEMPRE usar búsqueda real
  searchAvailableDrivers();
};
  // FUNCIÓN MEJORADA: Buscar conductores con radio incremental
  const searchAvailableDrivers = async () => {
    try {
      console.log('Iniciando busqueda incremental de conductores...');
      
      // Mostrar el modal de búsqueda
      setSearchModalVisible(true);
      setIsSearchingDriver(true);
      setSearchProgress(null);
      setSearchAttempts(0);
      
      // El modal manejará la búsqueda y llamará a handleDriverFound cuando encuentre un conductor
      
    } catch (error) {
      console.error('Error en busqueda de conductores:', error);
      setSearchModalVisible(false);
      Alert.alert('Error', 'No se pudo iniciar la búsqueda de conductores');
    }
  };

  // Nueva función para manejar cuando se encuentra un conductor
  const handleDriverFound = async (selectedDriver) => {
    try {
      // Formatear información del conductor
      const driverInfo = {
        id: selectedDriver.id,
        name: selectedDriver.name,
        car: `${selectedDriver.vehicle.make} ${selectedDriver.vehicle.model} - ${selectedDriver.vehicle.plate}`,
        rating: selectedDriver.rating,
        trips: selectedDriver.trips,
        eta: `${selectedDriver.eta} minutos`,
        phone: selectedDriver.phone || '+1-809-555-0123',
        currentLocation: selectedDriver.location,
        distance: selectedDriver.distance
      };

      setDriverInfo(driverInfo);
      setRideStatus(TRIP_STATES.DRIVER_ASSIGNED);
      
      

       setDriverInfo(mockDriverInfo);
      setRideStatus(TRIP_STATES.DRIVER_ASSIGNED);
      // Cerrar el modal
      setSearchModalVisible(false);
      setIsSearchingDriver(false);
      
      // Iniciar tracking del conductor
      await startDriverTracking(driverInfo, userLocation);
      console.log('Conductor asignado:', driverInfo);
      
    } catch (error) {
      console.error('Error asignando conductor:', error);
      Alert.alert('Error', 'No se pudo asignar el conductor');
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
        
        // INICIAR TRACKING DEL CONDUCTOR
        await startDriverTracking(mockDriverInfo, userLocation);
        
      } catch (error) {
        console.error('Error asignando conductor:', error);
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
            // DETENER TRACKING AL CANCELAR
            stopDriverTracking();
            
            // Registrar cancelación en analytics
            AnalyticsService.logRideCancel('user_cancelled', rideStatus);

            await SharedStorage.cancelRide('Cancelado por el usuario');
            await resetAppState();
          } catch (error) {
            console.error('Error cancelando viaje:', error);
          }
        },
      },
    ]);
  };

  // FUNCIÓN PRINCIPAL ACTUALIZADA CON BLOQUEO
  const completeRide = async () => {
    try {
      // DETENER TRACKING AL COMPLETAR
      stopDriverTracking();
      
      // Detener compartir ubicacion
      await ShareLocationService.stopSharing();

      const completionData = {
        actualPrice: estimatedPrice,
        distance: routeInfo ? routeInfo.distance.text : '8.5 km',
        duration: routeInfo ? routeInfo.duration.text : '25 min',
        rating: 5,
        tip: 0,
      };
    
      await SharedStorage.completeRide(completionData);
      
      // Guardar destino en el historial
      await AddressHistoryService.addToHistory({
        address: destination || 'Destino',
        name: selectedDestination?.name || destination,
        coordinates: selectedDestination?.location,
        type: 'completed_trip'
      });
      
      // Registrar viaje completado en analytics
      AnalyticsService.logRideComplete({
        rideId: tripRequest?.id || 'ride_' + Date.now(),
        duration: completionData.duration,
        distance: completionData.distance,
        price: completionData.actualPrice,
        paymentMethod: 'cash'
      });
      
      // ACTUALIZADO: Preguntar si desea calificar o bloquear
      Alert.alert(
        '¡Viaje completado!',
        '¿Qué deseas hacer?',
        [
          {
            text: 'Nada',
            style: 'cancel',
            onPress: async () => {
              const userProfile = await SharedStorage.getUserProfile();
              if (userProfile) {
                await SharedStorage.updateUserProfile({
                  totalTrips: (userProfile.totalTrips || 0) + 1,
                });
              }
              await resetAppState();
              console.log('Usuario eligio no hacer nada');
            }
          },
          {
            text: 'Calificar',
            onPress: async () => {
              const tripData = {
                id: tripRequest?.id || `trip_${Date.now()}`,
                pickup: userLocation?.address || 'Origen',
                dropoff: destination || 'Destino',
                date: new Date().toISOString(),
                price: estimatedPrice,
                distance: completionData.distance,
                duration: completionData.duration
              };
              
              setPendingRatingTrip(tripData);
              setShowRatingModal(true);
              
              const userProfile = await SharedStorage.getUserProfile();
              if (userProfile) {
                await SharedStorage.updateUserProfile({
                  totalTrips: (userProfile.totalTrips || 0) + 1,
                });
              }
              
              await resetAppState();
            }
          },
          {
            text: 'Bloquear',
            style: 'destructive',
            onPress: async () => {
              Alert.alert(
                'Bloquear Conductor',
                `¿Estás seguro de que quieres bloquear a ${driverInfo?.name}?\n\nNo volverá a ser asignado para tus viajes.`,
                [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'Bloquear',
                    style: 'destructive',
                    onPress: async () => {
                      if (driverInfo) {
                        await SharedStorage.blockDriver({
                          id: driverInfo.id,
                          name: driverInfo.name,
                          reason: 'Bloqueado por el usuario'
                        });
                        Alert.alert(
                          'Conductor Bloqueado',
                          `${driverInfo.name} no será asignado en futuros viajes.`,
                          [{ text: 'OK' }]
                        );
                      }
                      const userProfile = await SharedStorage.getUserProfile();
                      if (userProfile) {
                        await SharedStorage.updateUserProfile({
                          totalTrips: (userProfile.totalTrips || 0) + 1,
                        });
                      }
                      await resetAppState();
                    }
                  }
                ]
              );
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('Error completando viaje:', error);
      Alert.alert('Error', 'Error al completar el viaje');
    }
  };

  const startRide = async () => {
  try {
    // DETENER TRACKING AL INICIAR VIAJE
    stopDriverTracking();
   
    // Detener compartir ubicacion
    await SharedStorage.startRide();
    setRideStatus(TRIP_STATES.IN_RIDE);

    // Iniciar compartir ubicacion automáticamente
    await ShareLocationService.startSharing(
      {
        id: tripRequest?.id,
        pickup: userLocation?.address,
        destination: destination,
        driverName: driverInfo?.name,
        vehiclePlate: driverInfo?.car
      },
      userLocation
    );
     
    Alert.alert('¡Viaje iniciado!', 'Disfruta tu viaje');
  } catch (error) {
    console.error('Error iniciando viaje:', error);
  }
};

/**
 * ✅ HANDLER ROBUSTO PARA MAP PICKER
 */
const handleMapPickerPress = async (event) => {
  try {
 const { latitude, longitude } = event;

    console.log('��� DEBUG: handleMapPickerPress iniciado', {
      latitude: latitude.toFixed(6),
      longitude: longitude.toFixed(6),
      timestamp: new Date().toISOString(),
    });

    if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
      console.error('❌ Coordenadas inválidas:', { latitude, longitude });
      Alert.alert(
        'Error',
        'Las coordenadas no son válidas. Por favor intenta de nuevo.'
      );
      return;
    }

    const validation = LocationFallbackService.validateCoordinates(latitude, longitude);
    
    if (!validation.valid) {
      console.error('❌ Coordenadas fuera de rango:', { latitude, longitude });
      Alert.alert(
        'Ubicación no válida',
        validation.message || 'Las coordenadas están fuera de rango válido.'
      );
      return;
    }

    if (!validation.inDominicanRepublic) {
      console.warn('⚠️ Ubicación fuera de República Dominicana:', { latitude, longitude });
      Alert.alert(
        'Fuera de servicio',
        'TaxiApp actualmente solo opera en República Dominicana.\n\nPor favor selecciona una ubicacion dentro del país.'
      );
      return;
    }

    console.log('✅ Coordenadas válidas. Actualizando estado...');
    
    setMapPickerLocation({
      latitude,
      longitude
    });

    console.log('��� Iniciando geocoding inverso...');
    
    try {
      await Promise.race([
        reverseGeocodeMapLocation(latitude, longitude),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Geocoding timeout (5s)')), 5000)
        )
      ]);
      
      console.log('✅ Geocoding completado exitosamente');
      
    } catch (geocodingError) {
      console.warn('⚠️ Error en geocoding:', geocodingError.message);
      setMapPickerAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
    }

  } catch (error) {
    console.error('❌ Error CRÍTICO en handleMapPickerPress:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
    
    Alert.alert(
      'Error',
      'No se pudo procesar la ubicacion. Por favor intenta de nuevo.'
    );
  }
};

const reverseGeocodeMapLocation = async (latitude, longitude) => {
  try {
    setIsGeocodingMapPicker(true);

    console.log('��� Iniciando reverse geocoding:', { latitude, longitude });

    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=pk.eyJ1IjoibWVuYW5kcm82OCIsImEiOiJjbWlmY2hiMHcwY29sM2VuNGk2dnlzMzliIn0.PqOOzFKFJA7Q5jPbGwOG8Q&language=es`
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    console.log(' Respuesta de geocoding:', data);

    let address = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

    if (data.features && data.features.length > 0) {
      address = data.features[0].place_name;
      
      // Limpiar si es muy largo
      if (address.length > 60) {
        address = address.replace(', República Dominicana', '').replace(', Dominican Republic', '');
      }
    }

    setMapPickerAddress(address);
    setMapPickerLocation({ latitude, longitude, address });

    console.log(' Direccion establecida:', address);

    return address;

  } catch (error) {
    console.error(' Error en reverse geocoding:', {
      message: error.message,
      latitude,
      longitude,
      timestamp: new Date().toISOString(),
    });

    const fallbackAddress = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    setMapPickerAddress(fallbackAddress);
    setMapPickerLocation({ latitude, longitude });

    return fallbackAddress;

  } finally {
    setIsGeocodingMapPicker(false);
  }
};

const resetAppState = async () => {
  try {
    // DETENER TRACKING AL RESETEAR
    stopDriverTracking();
    
    await SharedStorage.resetToIdle();
    setRideStatus(TRIP_STATES.IDLE);
    setDriverInfo(null);
    setDestination('');
    setSelectedDestination(null);
    setPickupLocation(null);  
    setTripRequest(null);
    setEstimatedPrice(0);
    setRouteInfo(null);
    
    // Limpiar destinos adicionales
    setAdditionalDestinations([]);
    
    // Resetear estados del precio en tiempo real
    setShowPriceEstimator(false);
    setRealTimePrice(0);
    setPriceDetails(null);
  } catch (error) {
    console.error('Error reseteando estado:', error);
  }
};

   const renderVehicleSelector = () => {
    
    if (rideStatus !== TRIP_STATES.IDLE) return null;

    return (
      <TouchableOpacity
        style={styles.vehicleSelectorButton}
        onPress={() => setShowVehicleSelector(true)}
      >
        <View style={styles.vehicleSelectorContent}>
          <Text style={styles.vehicleSelectorIcon}>
            {selectedVehicleType === 'economy' ? '🚗' :
             selectedVehicleType === 'comfort' ? '🚙' :
             selectedVehicleType === 'premium' ? '🏎️' :
             selectedVehicleType === 'xl' ? '🚐' : '🏍️'}
          </Text>
          <View style={styles.vehicleSelectorInfo}>
            <Text style={styles.vehicleSelectorLabel}>Tipo de vehiculo</Text>
            <Text style={styles.vehicleSelectorValue}>
              {selectedVehicleType === 'economy' ? 'Economico' :
               selectedVehicleType === 'comfort' ? 'Confort' :
               selectedVehicleType === 'premium' ? 'Premium' :
               selectedVehicleType === 'xl' ? 'XL (6-7 personas)' :
               selectedVehicleType === 'moto' ? 'Moto Rapido' : 'Economico'}
              - RD${estimatedPrice || '---'}
            </Text>
          </View>
          <Icon name="chevron-down" size={20} color="#666" />
        </View>
      </TouchableOpacity>
    );
  };

// COMPONENTE: Pantalla de carga inicial
const renderLoadingScreen = () => {
  return (
    <View style={styles.loadingScreen}>
      <Text style={styles.loadingTitle}>TaxiApp</Text>
      <ActivityIndicator size="large" color="#007AFF" style={styles.loadingSpinner} />
      <Text style={styles.loadingText}>Inicializando...</Text>
    </View>
  );
};

  // COMPONENTE: Información de ruta con precio en tiempo real
  const renderRouteInfo = () => {
    if (!routeInfo && !isCalculatingRoute && !showPriceEstimator) return null;

    return (
      <View style={styles.routeInfoCompact}>
        {isCalculatingRoute ? (
          <ActivityIndicator size="small" color="#007AFF" />
        ) : (
          <>
            {showPriceEstimator && userLocation && selectedDestination && (
              <View style={styles.priceInfoRow}>
                <View style={styles.priceMainInfo}>
                  <Text style={styles.priceLarge}>RD$ {realTimePrice || estimatedPrice || 520}</Text>
                  <View style={styles.priceFactors}>
                    <Text style={styles.priceFactorText}>
                       {routeInfo?.distance?.text || '7.0 km'} • ⏱ {routeInfo?.duration?.text || '14 min'}
                    </Text>
                    {priceDetails?.surge && (
                      <Text style={styles.surgeText}>� 1.5x</Text>
                    )}
                  </View>
                </View>
              </View>
            )}
            
  {!showPriceEstimator && routeInfo && (
              <View style={styles.routeDetailsCompact}>
               <Text style={styles.routeDetailCompact}>
  📍 {routeInfo.distance.text} • ⏱️ {routeInfo.duration.text} • 💰 RD${routeInfo.pricing.final_price}
</Text>
              </View>
            )}
          </>
        )}
      </View>
    );
  };

  // COMPONENTE: Mapa de tracking del conductor en tiempo real
  const renderDriverTracking = () => {
    if (!trackingActive || !driverInfo) return null;
    return (
      <View style={styles.trackingContainer}>
        <Text style={styles.trackingTitle}>?? Seguimiento en tiempo real</Text>
        {/* MAPA DE TRACKING */}
        <View style={styles.trackingMapContainer}>
          <MapComponent
            userLocation={tripRequest?.origin || userLocation}
            driverLocation={driverLocation}
            driverInfo={driverInfo}
            destination={selectedDestination}
            trackingMode={true}
          />
        </View>
        {/* INFO RESUMIDA */}
        <View style={styles.trackingInfoCompact}>
          <View style={styles.trackingInfoItem}>
            <Text style={styles.trackingLabel}>ETA:</Text>
            <Text style={styles.trackingValue}>{driverETA}</Text>
          </View>
          <View style={styles.trackingInfoItem}>
            <View style={[
              styles.statusIndicator,
              { backgroundColor: isDriverMoving ? '#34C759' : '#FF9500' }
            ]} />
            <Text style={styles.statusText}>
              {isDriverMoving ? 'En movimiento' : 'Detenido'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // NUEVO COMPONENTE: Estado de ubicaci�n y fallback
  const renderLocationStatus = () => {
    if (isLoadingLocation) {
      return (
        <View style={styles.locationStatusContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.locationStatusText}>Obteniendo ubicaci�n...</Text>
        </View>
      );
    }

    if (!userLocation) {
      return (
        <View style={styles.locationStatusContainer}>
          <Text style={styles.locationStatusIcon}>??</Text>
          <Text style={styles.locationStatusTitle}>Ubicaci�n requerida</Text>
          <Text style={styles.locationStatusMessage}>
            Necesitamos tu ubicaci�n para calcular rutas y precios
          </Text>
          <TouchableOpacity 
            style={styles.selectLocationButton} 
            onPress={() => setShowLocationModal(true)}
          >
            <Text style={styles.selectLocationButtonText}>Seleccionar ubicaci�n</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Mostrar información de la ubicacion actual
    const getLocationSourceInfo = () => {
      switch (locationSource) {
        case 'gps':
          return { icon: '', text: 'Ubicación GPS', color: '#34C759' };
        case 'fallback':
          return { icon: '', text: 'Ubicación aproximada', color: '#FF9500' };
        case 'manual':
          return { icon: '', text: 'Seleccionada manualmente', color: '#007AFF' };
        case 'popular':
          return { icon: '', text: 'Ubicación popular', color: '#007AFF' };
        default:
          return { icon: '', text: 'Ubicación desconocida', color: '#666' };
      }
    };

    const sourceInfo = getLocationSourceInfo();

    return null; // NOTA: Había un error de sintaxis aquí, corregido
  };

  // NUEVO COMPONENTE: Modal de selección de ubicacion
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
              <Text style={styles.modalTitle}> Seleccionar ubicacion</Text>
              <TouchableOpacity 
                onPress={() => setShowLocationModal(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}></Text>
              </TouchableOpacity>
            </View>

          <ScrollView style={styles.modalContent}>
      {/* Opción 1: Direcciones Favoritas */}
   <TouchableOpacity 
  style={styles.locationOption}
onPress={() => {
    console.log('🔍 Navegando a FavoriteAddresses con thirdPartyField:', thirdPartyLocationField);
    setShowLocationModal(false);
    setTimeout(() => {
      if (navigation && navigation.navigate) {
        navigation.navigate('FavoriteAddresses', { thirdPartyField: thirdPartyLocationField });
      } else {
        Alert.alert('Error', 'No se puede navegar a esta pantalla');
      }
    }, 300);
  }}
>
        <Text style={styles.locationOptionIcon}></Text>
        <View style={styles.locationOptionContent}>
          <Text style={styles.locationOptionTitle}>Direcciones Favoritas</Text>
          <Text style={styles.locationOptionDescription}>
            Mas precisa para calcular rutas y precios
          </Text>
        </View>
        {isLoadingLocation && <ActivityIndicator size="small" />}
      </TouchableOpacity>

      {/* Opción 2: Agregar direccion */}
      <TouchableOpacity 
        style={styles.locationOption}
        onPress={() => setShowDestinationSelectorForAdd(true)}
      >
        <Text style={styles.locationOptionIcon}></Text>
        <View style={styles.locationOptionContent}>
          <Text style={styles.locationOptionTitle}>Agregar direccion</Text>
          <Text style={styles.locationOptionDescription}>
            Ingresa una direccion personalizada
          </Text>
        </View>
      </TouchableOpacity>
{/* Opci�n 3: Fijar en el mapa */}
<TouchableOpacity 
  style={styles.locationOption}
  onPress={() => {
    setShowLocationModal(false);
    setTimeout(() => {
      // DEBUG
      console.log('?? userLocation al abrir picker:', userLocation);
      
      // Inicializar pin rojo con ubicaci�n actual o Santo Domingo
      const initialLocation = userLocation && userLocation.latitude ? {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        address: userLocation.address || 'Ubicaci�n actual'
      } : {
        latitude: 18.4861,
        longitude: -69.9312,
        address: 'Santo Domingo, Rep�blica Dominicana'
      };
      
      console.log('?? initialLocation:', initialLocation);
      
      setMapPickerLocation(initialLocation);
      setMapPickerAddress(initialLocation.address);
      setShowMapPicker(true);
    }, 300);
  }}
>
  <Text style={styles.locationOptionIcon}></Text>
  <View style={styles.locationOptionContent}>
    <Text style={styles.locationOptionTitle}>Fijar en el mapa</Text>
    <Text style={styles.locationOptionDescription}>
      Selecciona una ubicacion en el mapa
    </Text>
  </View>
</TouchableOpacity>


              {/* Información sobre permisos */}
              {locationPermissionStatus !== 'granted' && (
                <View style={styles.permissionInfo}>
                  <Text style={styles.permissionInfoTitle}> Consejo</Text>
                  <Text style={styles.permissionInfoText}>
                    Para obtener tu ubicacion exacta, permite el acceso a la ubicacion en la configuración de la app.
                  </Text>
                  <TouchableOpacity 
                    style={styles.permissionRetryButton}
                    onPress={requestLocationPermissions}
                  >
                    <Text style={styles.permissionRetryText}>Solicitar permisos</Text>
                  </TouchableOpacity>
                </View>
              )}
{/* Nota informativa - OCULTA */}
     {false && (
     <View style={modalStyles.infoBox}>
     <Icon name="information-circle" size={20} color="#007AFF" />
     <Text style={modalStyles.infoText}>
      Cada parada adicional agrega RD$50 al precio base.
      El conductor seguirá el orden de las paradas.
     </Text>
    </View>
       )}
            </ScrollView>
            {/* Botones de acción - COMENTARIO DENTRO DE JSX */}
            <View style={modalStyles.footer}>
              <TouchableOpacity 
                style={modalStyles.cancelButton}
                onPress={() => setShowLocationModal(false)}
              >
                <Text style={modalStyles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={modalStyles.confirmButton}
                onPress={() => setShowLocationModal(false)}
              >
                <Text style={modalStyles.confirmButtonText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        {/* Selector de destinos para agregar paradas */}
  <SmartDestinationSelector
          visible={showDestinationSelectorForAdd}
          onClose={() => setShowDestinationSelectorForAdd(false)}
       onSelectDestination={(place) => {
            // Cerrar modales
            setShowDestinationSelectorForAdd(false);
            setShowLocationModal(false);

            // Si es para modal de terceros
            if (thirdPartyLocationField) {
              const address = place.name || place.address;
              if (thirdPartyLocationField === 'origen') {
                setThirdPartyOrigin(address);
              } else if (thirdPartyLocationField === 'destino') {
                setThirdPartyDestination(address);
              }
              setThirdPartyLocationField(null);
              setTimeout(() => setShowThirdPartyModal(true), 300);
              return;
            }

            // Establecer como destino principal
            setDestination(place.name);
            setSelectedDestination({
              name: place.name,
              address: place.address || place.name,
              location: {
                latitude: place.coordinates?.lat || place.location?.latitude,
                longitude: place.coordinates?.lng || place.location?.longitude,
              }
            });
            
            // Calcular ruta si hay ubicación
            if (userLocation && place.coordinates) {
              calculateRouteAndPrice(userLocation, {
                latitude: place.coordinates.lat,
                longitude: place.coordinates.lng
              }, selectedVehicleType);
            }
          }}
          currentLocation={userLocation}
          mode="destination"
        />
      </Modal>
    );
  };

  // Estilos para el modal
  const modalStyles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    container: {
      backgroundColor: '#fff',
      borderTopLeftRadius: 25,
      borderTopRightRadius: 25,
      maxHeight: '85%',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: '#E8E8E8',
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#333',
    },
    closeButton: {
      padding: 5,
    },
    closeText: {
      fontSize: 24,
      color: '#666',
    },
    content: {
      padding: 20,
    },
    mainDestination: {
      backgroundColor: '#F0F8FF',
      padding: 15,
      borderRadius: 10,
      marginBottom: 20,
    },
    label: {
      fontSize: 14,
      color: '#666',
      marginBottom: 5,
    },
    mainText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#333',
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 15,
      color: '#333',
    },
    destinationItem: {
      flexDirection: 'row',
      backgroundColor: '#F8F8F8',
      padding: 15,
      borderRadius: 10,
      marginBottom: 10,
      alignItems: 'center',
    },
    destinationInfo: {
      flex: 1,
    },
    stopNumber: {
      fontSize: 12,
      color: '#007AFF',
      fontWeight: '600',
      marginBottom: 3,
    },
    destinationText: {
      fontSize: 14,
      color: '#333',
    },
    removeButton: {
      padding: 5,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#E3F2FD',
      padding: 15,
      borderRadius: 10,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: '#007AFF',
      borderStyle: 'dashed',
    },
    addButtonText: {
      marginLeft: 10,
      fontSize: 16,
      color: '#007AFF',
      fontWeight: '600',
    },
    addInputContainer: {
      marginBottom: 20,
    },
    input: {
      borderWidth: 1,
      borderColor: '#DDD',
      borderRadius: 10,
      padding: 15,
      fontSize: 16,
      marginBottom: 10,
      backgroundColor: '#FFF',
    },
    inputText: {
      fontSize: 16,
      color: '#333',
    },
    inputPlaceholder: {
      fontSize: 16,
      color: '#999',
    },
    inputButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    cancelInputButton: {
      flex: 1,
      padding: 12,
      alignItems: 'center',
      marginRight: 10,
    },
    cancelInputText: {
      color: '#666',
      fontSize: 16,
    },
    addInputButton: {
      flex: 1,
      backgroundColor: '#007AFF',
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    addInputText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },
    priceInfo: {
      backgroundColor: '#FFF9E6',
      padding: 15,
      borderRadius: 10,
      marginBottom: 20,
    },
    priceLabel: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 10,
      color: '#333',
    },
    priceBreakdown: {
      marginLeft: 10,
    },
    priceItem: {
      fontSize: 14,
      color: '#666',
      marginBottom: 5,
    },
    totalContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: '#E8E8E8',
    },
    totalLabel: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#333',
    },
    totalPrice: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#FF9500',
    },
    infoBox: {
      flexDirection: 'row',
      backgroundColor: '#E8F4FD',
      padding: 15,
      borderRadius: 10,
      marginBottom: 20,
    },
    infoText: {
      flex: 1,
      marginLeft: 10,
      fontSize: 13,
      color: '#0C5460',
      lineHeight: 18,
    },
    footer: {
      flexDirection: 'row',
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: '#E8E8E8',
    },
    cancelButton: {
      flex: 1,
      padding: 15,
      alignItems: 'center',
      marginRight: 10,
    },
    cancelButtonText: {
      fontSize: 16,
      color: '#666',
    },
    confirmButton: {
      flex: 1,
      backgroundColor: '#007AFF',
      padding: 15,
      borderRadius: 10,
      alignItems: 'center',
    },
    confirmButtonDisabled: {
      backgroundColor: '#CCC',
    },
    confirmButtonText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#fff',
    },
  });

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
            <TouchableOpacity 
              style={styles.drawerCloseButton}
              onPress={() => {
                // Cerrar drawer inmediatamente
                setIsDrawerOpen(false);
                drawerAnimation.setValue(-DRAWER_WIDTH);
                overlayOpacity.setValue(0);
                
                // Si hay pantallas en el stack, volver
                if (navigation && navigation.canGoBack()) {
                  navigation.goBack();
                }
              }}
            >
              <Icon name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
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
             
            {/* Objetos Perdidos */}
            <TouchableOpacity 
              style={styles.drawerItem}
              onPress={() => handleMenuOption('lostItems')}
            >
              <Icon name="search-circle-outline" size={24} color="#333" />
              <Text style={styles.drawerItemText}>Objetos Perdidos</Text>
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
              onPress={() => handleMenuOption('paymentHistory')}
            >
              <Icon name="receipt-outline" size={24} color="#333" />
              <Text style={styles.drawerItemText}>Historial de Pagos</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.drawerItem}
              onPress={() => handleMenuOption('addresses')}
            >
              <Icon name="location-outline" size={24} color="#333" />
              <Text style={styles.drawerItemText}>Direcciones Favoritas</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.drawerItem}
              onPress={() => handleMenuOption('addressHistory')}
            >
              <Icon name="time-outline" size={24} color="#333" />
              <Text style={styles.drawerItemText}>Historial de Destinos</Text>
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
              onPress={handleLogout}
            >
              <Icon name="log-out-outline" size={24} color="#FF3B30" />
              <Text style={[styles.drawerItemText, styles.logoutText]}>
                Cerrar Sesión
              </Text>
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

  // COMPONENTE MODIFICADO: Header con menú hamburguesa
  const renderAuthenticatedHeader = () => {
    return (
      <View style={styles.authenticatedHeader}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={toggleDrawer} style={styles.menuButton}>
            <Icon name="menu" size={30} color="#333" />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Text style={styles.title}>Squid Usuario</Text>
            <Text style={styles.subtitle}>Tu viaje seguro y rapido</Text>
          </View>
          
          <View style={styles.headerSpacer} />
        </View>
      </View>
    );
  };

  const renderContent = () => {
  // ✅ VALIDACIÓN CORRECTA: Si NO hay ubicacion, espera
  if (!userLocation) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Obteniendo tu ubicacion...</Text>
      </View>
    );
  }
    
  if (rideStatus === TRIP_STATES.REQUESTING_RIDE) {
    return (
        <View style={styles.statusContainer}>
          <Text style={styles.statusTitle}> Buscando conductor...</Text>
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
          <Text style={styles.statusTitle}>Conductor asignado</Text>
          <Text style={styles.driverName}>{driverInfo.name}</Text>
          <Text style={styles.driverDetails}>{driverInfo.car}</Text>
          <Text style={styles.driverDetails}> {driverInfo.rating}</Text>
          <Text style={styles.etaText}>Llegará en: {driverETA || driverInfo.eta}</Text>
          {estimatedPrice > 0 && (
            <Text style={styles.priceText}>Precio: RD${estimatedPrice}</Text>
          )}
          {/* BOTONES DE CONTACTO */}
          <View style={styles.contactButtonsContainer}>
            <TouchableOpacity 
              style={styles.contactButton}
              onPress={() => handleCallDriver()}
            >
              <Icon name="call" size={24} color="#fff" />
              <Text style={styles.contactButtonText}>Llamar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.contactButton}
              onPress={() => handleChatDriver()}
            >
              <Icon name="chatbubble" size={24} color="#fff" />
              <Text style={styles.contactButtonText}>Chat</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.contactButton, { backgroundColor: '#25D366' }]}
              onPress={() => setShowShareLocation(true)}
            >
              <Icon name="share-social" size={24} color="#fff" />
              <Text style={styles.contactButtonText}>Compartir</Text>
            </TouchableOpacity>
          </View>
          
          {/* MOSTRAR INFORMACIÓN DE TRACKING */}
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
          <Text style={styles.statusTitle}>Viaje en progreso</Text>
          
          <Text style={styles.driverName}>{driverInfo.name}</Text>
          <Text style={styles.driverDetails}>{driverInfo.car}</Text>
          <Text style={styles.statusText}>Dirígete a tu destino</Text>
   {/* BOTONES DE ACCIÓN - DISEÑO PROFESIONAL */}
          <View style={{ 
            width: '100%', 
            paddingHorizontal: 20,
            marginTop: 20,
            alignItems: 'center'
          }}>
            {/* BOTÓN COMPLETAR VIAJE - ARRIBA */}
            <TouchableOpacity 
              style={{
                backgroundColor: '#4CAF50',
                paddingVertical: 16,
                paddingHorizontal: 40,
                borderRadius: 30,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                elevation: 4,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
                marginBottom: 20,
              }}
              onPress={completeRide}
            >
              <Icon name="checkmark-circle" size={24} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 17, marginLeft: 10 }}>Completar viaje</Text>
            </TouchableOpacity>
            
            {/* BOTONES CIRCULARES - ABAJO */}
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'center', 
              alignItems: 'center',
              gap: 40
            }}>
      {/* BOTÓN COMPARTIR - IZQUIERDA */}
              <TouchableOpacity 
                style={{
                  backgroundColor: '#25D366',
                  width: 70,
                  height: 70,
                  borderRadius: 35,
                  alignItems: 'center',
                  justifyContent: 'center',
                  elevation: 4,
                  shadowColor: '#25D366',
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                }}
                onPress={() => {
                  console.log('Compartir presionado en viaje en progreso');
                  setShowShareLocation(true);
                }}
              >
                <Icon name="share-social" size={28} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 10, marginTop: 2 }}>Compartir</Text>
              </TouchableOpacity>
              
              {/* BOTÓN 911 EMERGENCIA - DERECHA */}
              <TouchableOpacity 
                style={{
                  backgroundColor: '#FF3B30',
                  width: 70,
                  height: 70,
                  borderRadius: 35,
                  alignItems: 'center',
                  justifyContent: 'center',
                  elevation: 5,
                  shadowColor: '#FF3B30',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.4,
                  shadowRadius: 5,
                }}
                onPress={() => {
                  Alert.alert(
                    '🚨 EMERGENCIA',
                    '¿Deseas llamar al 911?',
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      { text: 'Llamar 911', style: 'destructive', onPress: () => Linking.openURL('tel:911') }
                    ]
                  );
                }}
                onLongPress={() => Linking.openURL('tel:911')}
              >
                <Icon name="warning" size={28} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 11 }}>911</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.requestContainer}>
        <View style={styles.mapContainer}>
        <MapComponent 
        userLocation={userLocation || { 
         latitude: 18.4861, 
         longitude: -69.9312,
         address: 'Santo Domingo Este, República Dominicana'
        }} 
     />
        </View>
        {/* CAMBIO PRINCIPAL - DE View A ScrollView */}
<ScrollView style={styles.controlsContainer} showsVerticalScrollIndicator={false}>
          {/* NUEVO: Estado de ubicacion */}
          {renderLocationStatus()}
          {/* Selector de punto de recogida */}
          <View style={styles.formGroup}>
            <View style={styles.pickupInput}>
              <Icon name="location" size={20} color="#007AFF" />
              <View style={styles.pickupTextContainer}>
                <Text style={styles.pickupText}>
                  {userLocation?.address ? userLocation.address : 'Punto de recogida'}
                </Text>
              </View>
              <Icon name="chevron-forward" size={20} color="#999" />
            </View>
          </View>
          <View style={styles.destinationContainer}>
<TouchableOpacity 
  style={styles.destinationInput}
  onPress={() => {
    setMapPickerMode('destination');
    setShowLocationModal(true);
  }}
>
  <Text style={[
    styles.destinationInputText,
    !destination && styles.destinationInputPlaceholder
  ]}>
    {destination || "A donde quieres ir?"}
  </Text>
  <Icon name="search" size={20} color="#999" />
</TouchableOpacity>

   {/* Botón para viajes de terceros */}
            <TouchableOpacity
              style={styles.thirdPartyButton}
              onPress={() => setShowThirdPartyModal(true)}
            >
              <Icon name="people-outline" size={20} color="#007AFF" />
              <Text style={styles.thirdPartyButtonText}>
                {thirdPartyInfo ? `Para: ${thirdPartyInfo.passengerInfo.name}` : 'Para quien es?'}
              </Text>
            </TouchableOpacity>
         

            <TouchableOpacity 
              style={styles.addDestinationButton}
              onPress={() => setShowAddDestinationModal(true)}
            >
              <Icon name="add-circle" size={45} color="#4CAF50" />
              {additionalDestinations.length > 0 && (
                <View style={styles.destinationBadge}>
                  <Text style={styles.badgeText}>
                    {additionalDestinations.length + 1}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
          
          {renderRouteInfo()}
          {renderVehicleSelector()}
          
          <TouchableOpacity 
            style={[
              styles.requestButton,
              (!destination || (typeof destination === 'string' && !destination.trim()) || !userLocation || isCalculatingRoute) && styles.requestButtonDisabled
            ]} 
            onPress={requestRide}
            disabled={!destination || (typeof destination === 'string' && !destination.trim()) || !userLocation || isCalculatingRoute}
          >
            <Text style={styles.requestButtonText}>
            {isCalculatingRoute ? 'Calculando...' : 
              !userLocation ? 'Selecciona ubicacion' :
               realTimePrice > 0 ? `Solicitar Servicio �� RD${realTimePrice}` :
              'Solicitar Servicio'}
            </Text>
          </TouchableOpacity>
       
        </ScrollView>
      </View>
    );
  };

  // Función para renderizar modal de autenticación
  const renderAuthModal = () => {
    return (
      <Modal
        visible={showAuthModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAuthModal(false)}
      >
        <View style={styles.authModalOverlay}>
          <View style={styles.authModal}>
            <View style={styles.authHeader}>
              <Text style={styles.authTitle}>� TaxiApp</Text>
              <Text style={styles.authSubtitle}>
                {authMode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
              </Text>
            </View>

            <ScrollView style={styles.authContent}>
              {authMode === 'register' && (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Nombre completo</Text>
                  <TextInput
                    style={[
                      styles.authInput,
                      inputErrors.name && styles.inputError
                    ]}
                    value={authForm.name}
                    onChangeText={(text) => {
                      setAuthForm(prev => ({...prev, name: text}));
                      validateName(text);
                    }}
                    placeholder="Tu nombre completo"
                    autoCapitalize="words"
                  />
                  {inputErrors.name && (
                    <Text style={styles.errorText}>{inputErrors.name}</Text>
                  )}
                </View>
              )}

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={[
                    styles.authInput,
                    inputErrors.email && styles.inputError
                  ]}
                  value={authForm.email}
                  onChangeText={(text) => {
                    setAuthForm(prev => ({...prev, email: text}));
                    validateEmail(text);
                  }}
                  placeholder="tu@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
                {inputErrors.email && (
                  <Text style={styles.errorText}>{inputErrors.email}</Text>
                )}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Contraseña</Text>
                <TextInput
                  style={[
                    styles.authInput,
                    inputErrors.password && styles.inputError
                  ]}
                  value={authForm.password}
                  onChangeText={(text) => {
                    setAuthForm(prev => ({...prev, password: text}));
                    validatePassword(text);
                  }}
                  placeholder="Mínimo 6 caracteres"
                  secureTextEntry
                  autoComplete="password"
                />
                {inputErrors.password && (
                  <Text style={styles.errorText}>{inputErrors.password}</Text>
                )}
                {passwordStrength && (
                  <View style={[
                    styles.passwordStrengthContainer,
                    passwordStrength === 'weak' && styles.passwordWeak,
                    passwordStrength === 'medium' && styles.passwordMedium,
                    passwordStrength === 'strong' && styles.passwordStrong
                  ]}>
                    <Text style={styles.passwordStrengthText}>
                      {passwordStrength === 'weak' ? 'Débil' :
                       passwordStrength === 'medium' ? 'Media' : 'Fuerte'}
                    </Text>
                  </View>
                )}
              </View>

              {authMode === 'register' && (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Teléfono</Text>
                  <TextInput
                    style={[
                      styles.authInput,
                      inputErrors.phone && styles.inputError
                    ]}
                    value={authForm.phone}
                    onChangeText={(text) => {
                      setAuthForm(prev => ({...prev, phone: text}));
                      validatePhone(text);
                    }}
                    placeholder="809-555-1234"
                    keyboardType="phone-pad"
                    autoComplete="tel"
                  />
                  {inputErrors.phone && (
                    <Text style={styles.errorText}>{inputErrors.phone}</Text>
                  )}
                </View>
              )}

              <TouchableOpacity 
                style={[
                  styles.authButton,
                  isLoading && styles.authButtonDisabled
                ]}
                onPress={authMode === 'login' ? handleLogin : handleRegister}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.authButtonText}>
                    {authMode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
                  </Text>
                )}
              </TouchableOpacity>

              <View style={styles.authSwitchContainer}>
                <Text style={styles.authSwitchText}>
                  {authMode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setAuthMode(authMode === 'login' ? 'register' : 'login');
                    resetAuthForm();
                  }}
                >
                  <Text style={styles.authSwitchLink}>
                    {authMode === 'login' ? 'Crear cuenta' : 'Iniciar sesión'}
                  </Text>
                </TouchableOpacity>
              </View>

              {authMode === 'login' && (
                <TouchableOpacity
                  style={{alignItems: 'center', marginTop: 15}}
                  onPress={() => setShowForgotPassword(true)}
                >
                  <Text style={styles.authSwitchLink}>¿Olvidaste tu contraseña?</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  // Función para renderizar modal de ubicaciones populares
  const renderPopularLocationsModal = () => {
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
              <Text style={styles.modalTitle}> Ubicaciones populares</Text>
              <TouchableOpacity 
                onPress={() => setShowPopularLocations(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>x</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.popularLocationsList}>
              {POPULAR_LOCATIONS.map((location, index) => (
                <TouchableOpacity 
                  key={index}
                  style={styles.popularLocationItem}
                  onPress={() => handleLocationSelected({
                    latitude: location.coordinates.lat,
                    longitude: location.coordinates.lng,
                    address: location.address,
                    source: 'popular'
                  })}
                >
                  <Text style={styles.popularLocationIcon}>{location.icon}</Text>
                  <View style={styles.popularLocationContent}>
                    <Text style={styles.popularLocationName}>{location.name}</Text>
                    <Text style={styles.popularLocationAddress}>{location.address}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
          <Text style={styles.unauthenticatedTitle}> TaxiApp</Text>
          <Text style={styles.unauthenticatedSubtitle}>Tu aplicación de transporte</Text>
          <Text style={styles.unauthenticatedMessage}>
            Inicia sesión para continuar
          </Text>
        </View>
        {renderAuthModal()}
      </View>
    );
  }

  // Mostrar SplashScreen
  if (false) {
    return <SplashScreen onAnimationComplete={() => setShowSplash(false)} />;
  }
  
  // Verificando si mostrar onboarding
  if (checkingOnboarding) {
    return null; // O puedes mostrar un loader
  }

  // Mostrar Onboarding si no lo ha visto
  if (!hasSeenOnboarding) {
    return (
      <OnboardingScreen 
        onComplete={() => {
          setHasSeenOnboarding(true);
        }}
      />
    );
  }
  
  // Usuario autenticado - mostrar app normal
  return (
    <ErrorBoundary>
      <View style={styles.container}>
        {renderAuthenticatedHeader()}
        {renderContent()}
        
        {/* NUEVO: Modal de perfil de usuario */}
        <UserProfile
          visible={showUserProfile}
          onClose={() => setShowUserProfile(false)}
        />
        
        {/* MODAL DE CALCULADORA DE TARIFAS */}
        <FareEstimator
          visible={showFareCalculator}
          onClose={() => setShowFareCalculator(false)}
          currentLocation={userLocation}
        />
        
        {/* Modal de búsqueda de conductores */}
      {searchModalVisible && (
  <DriverSearchModal
    visible={true}
    onClose={() => setSearchModalVisible(false)}
    onDriverFound={handleDriverFound}
  userLocation={tripRequest?.origin || userLocation}
  />
      )}
        {/* Modal de búsqueda de conductores */}
      
        {/* MODAL DE MÉTODOS DE PAGO */}
        {showPaymentModal && (
          <Modal
            visible={showPaymentModal}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowPaymentModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { height: 350 }]}>
                <Text style={styles.modalTitle}>Selecciona método de pago</Text>
                
                {/* Botón de Efectivo */}
                <TouchableOpacity
                  style={[
                    styles.paymentMethodButton,
                    selectedPaymentMethod === 'cash' && styles.paymentMethodSelected
                  ]}
                  onPress={() => setSelectedPaymentMethod('cash')}
                >
                  <Text style={styles.paymentMethodIcon}></Text>
                  <View style={styles.paymentMethodInfo}>
                    <Text style={styles.paymentMethodTitle}>Efectivo</Text>
                    <Text style={styles.paymentMethodSubtitle}>Paga al conductor al finalizar</Text>
                  </View>
                  {selectedPaymentMethod === 'cash' && (
                    <Text style={styles.checkmark}></Text>
                  )}
                </TouchableOpacity>

                {/* Botón de Tarjeta */}
                <TouchableOpacity
                  style={[
                    styles.paymentMethodButton,
                    selectedPaymentMethod === 'card' && styles.paymentMethodSelected
                  ]}
                  onPress={() => setSelectedPaymentMethod('card')}
                >
                  <Text style={styles.paymentMethodIcon}></Text>
                  <View style={styles.paymentMethodInfo}>
                    <Text style={styles.paymentMethodTitle}>Tarjeta de Crédito</Text>
                    <Text style={styles.paymentMethodSubtitle}>Pago automático seguro</Text>
                  </View>
                  {selectedPaymentMethod === 'card' && (
                    <Text style={styles.checkmark}></Text>
                  )}
                </TouchableOpacity>

                {/* Botones de acción */}
                <View style={styles.modalButtonContainer}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setShowPaymentModal(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, styles.confirmButton]}
                    onPress={processRideRequest}
                  >
                    <Text style={styles.confirmButtonText}>Confirmar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}

        {/* NUEVO: Modal de calificación post-viaje */}
        <RatingSystem
          visible={showRatingModal}
          onClose={() => {
            setShowRatingModal(false);
            setPendingRatingTrip(null);
          }}
          tripData={pendingRatingTrip}
          driverInfo={driverInfo}
          onSubmit={async (ratingData) => {
            console.log('Calificacion enviada:', ratingData);
            Alert.alert('¡Gracias!', 'Tu calificación ha sido guardada');
            setShowRatingModal(false);
            setPendingRatingTrip(null);
          }}
          mode="post-trip"
        />
        
        {/* NUEVO: Selector Inteligente de Destinos */}
        <SmartDestinationSelector
          visible={showDestinationSelector}
          onClose={() => setShowDestinationSelector(false)}
          onSelectDestination={(place) => {
            setDestination(place.name);
            setSelectedDestination({
              name: place.name,
              location: {
                latitude: place.coordinates?.lat || 18.4861,
                longitude: place.coordinates?.lng || -69.9312,
              }
            });
            setShowDestinationSelector(false);
            
            // Mostrar estimador de precio en tiempo real
            if (userLocation && place.coordinates) {
              setShowPriceEstimator(true);
              calculateRouteAndPrice(
                userLocation,
                {
                  latitude: place.coordinates.lat,
                  longitude: place.coordinates.lng,
                },
                selectedVehicleType
              );
            }
          }}
          currentLocation={userLocation}
          mode="destination"
        />
        
    {/* Modales existentes */}
    {showLocationModal && renderLocationModal()}
    {showPopularLocations && renderPopularLocationsModal()}
    {showAuthModal && renderAuthModal()}

    {/* NUEVO: Drawer Menu */}
    {renderDrawerMenu()}

    {/* MODAL DE MÚLTIPLES DESTINOS */}
 <MultipleDestinationsModal
   ref={multiDestModalRef}
  visible={showAddDestinationModal}
  onClose={() => setShowAddDestinationModal(false)}
  currentDestination={destination}
  userLocation={userLocation}
  vehicleType={selectedVehicleType}
  onConfirm={(destinationsData) => {
    setDestination(destinationsData.main || currentDestination || '');
    setAdditionalDestinations(destinationsData.additional);
    setEstimatedPrice(destinationsData.estimatedPrice);
    setShowAddDestinationModal(false);
    console.log('Destinos confirmados:', destinationsData);
  }}
  onSelectLocation={(stopId) => {
    // Guardar el stopId para saber cuál destino estamos editando
    setActiveMultiDestinationStopId(stopId);
    // Abrir el modal de selección de ubicacion
    setShowLocationModal(true);
  }}
/>

      </View>
      
      {/* Modal de recuperación de contraseña */}
      <Modal
        visible={showForgotPassword}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowForgotPassword(false)}
      >
        <ForgotPasswordScreen
          onBack={() => setShowForgotPassword(false)}
          onSuccess={() => {
            setShowForgotPassword(false);
            Alert.alert('Éxito', 'Contraseña actualizada');
          }}
        />
      </Modal>

      {/* Modal de Compartir Ubicación */}
      <ShareLocationModal
        visible={showShareLocation}
        onClose={() => setShowShareLocation(false)}
        tripData={{
          id: tripRequest?.id,
          pickup: userLocation?.address || 'Origen',
          destination: destination || 'Destino',
          driverName: driverInfo?.name || 'Conductor',
          vehiclePlate: driverInfo?.car || 'N/A'
        }}
        userLocation={userLocation}
        isInTrip={rideStatus === TRIP_STATES.IN_RIDE}
      />
      
      {/* Modal del selector de punto de recogida */}
      <PickupLocationSelector
        visible={showPickupSelector}
        onClose={() => setShowPickupSelector(false)}
        currentLocation={userLocation}
        onLocationSelected={(location) => {
          setPickupLocation(location);
          setUserLocation({
            ...location,
            source: 'manual_selection'
          });
          setShowPickupSelector(false);
        }}
      />

      {/* Modal del selector de vehículos */}
      <VehicleSelector
        visible={showVehicleSelector}
        onClose={() => setShowVehicleSelector(false)}
        currentVehicle={selectedVehicleType}
        estimatedDistance={routeInfo?.distance?.value ? routeInfo.distance.value / 1000 : 5}
        userLocation={userLocation}
        onSelectVehicle={(vehicle) => {
          setSelectedVehicleType(vehicle.type);
          setEstimatedPrice(vehicle.price);
          setShowVehicleSelector(false);
          
          // Recalcular precio si hay destino
          if (selectedDestination && userLocation) {
            calculateRouteAndPrice(
              userLocation,
              selectedDestination.location,
              vehicle.type
            );
          }
        }}
      />

      {/* Modal de viajes para terceros */}
<ThirdPartyRide
  visible={showThirdPartyModal}
  onClose={() => {
    setShowThirdPartyModal(false);
    setThirdPartyOrigin('');
    setThirdPartyDestination('');
    setThirdPartyLocationField(null);
  }}
  onSelectLocation={(field) => {
    setThirdPartyLocationField(field);
    setShowThirdPartyModal(false);
    setTimeout(() => setShowLocationModal(true), 300);
  }}
  selectedOrigin={thirdPartyOrigin}
  selectedDestination={thirdPartyDestination}
onConfirm={(rideData) => {
    // Generar clave automática para viaje de tercero
  const generateTripCode = () => {
      return Math.floor(1000 + Math.random() * 9000).toString();
    };
    
    if (rideData.isForOther) {
      const tripCode = generateTripCode();
      rideData.tripCode = tripCode;
    }
    
setThirdPartyInfo(rideData);
    setShowThirdPartyModal(false);
    
    if (rideData.isForOther) {
      // Actualizar campos de pantalla principal SOLO para terceros
      if (rideData.passengerInfo?.origen) {
        setUserLocation(prevLocation => ({
          latitude: prevLocation?.latitude || 18.4861,
          longitude: prevLocation?.longitude || -69.9312,
          address: rideData.passengerInfo.origen,
          source: 'third_party'
        }));
      }
      if (rideData.passengerInfo?.destino) {
        setDestination(rideData.passengerInfo.destino);
      }
      
      Alert.alert(
        'Viaje para tercero confirmado',
        `El conductor contactará a ${rideData.passengerInfo.name} al ${rideData.passengerInfo.phone}\n\n🔑 Clave del viaje: ${rideData.tripCode}\n\nComparta esta clave con el pasajero para identificar el viaje.`
      );
    }
  }}
/>
{/* MAP PICKER MODAL - DENTRO DEL COMPONENTE */}
{showMapPicker && (console.log("?? RENDER mapPickerLocation:", mapPickerLocation), true) && (
  <Modal
    visible={showMapPicker}
    transparent={true}
    animationType="slide"
    onRequestClose={() => setShowMapPicker(false)}
  >
    <View style={styles.mapPickerOverlay}>
      {/* Header */}
      <View style={styles.mapPickerHeader}>
        <TouchableOpacity 
          onPress={() => setShowMapPicker(false)}
          style={styles.mapPickerBackButton}
        >
          <Icon name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.mapPickerTitle}>Fijar ubicacion en mapa</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.mapPickerContainer}>
        {/* MapComponent - CON INTERACTIVIDAD COMPLETA */}
    <MapComponent
      userLocation={{
        latitude: 18.4861,
        longitude: -69.9312,
        address: 'Santo Domingo, Rep�blica Dominicana'
      }}
      destination={mapPickerLocation}
      interactive={true}
      onMapPress={handleMapPickerPress}
    />
        {/* Pin visual en el centro */}
      {/* Pin visual en el centro - NO BLOQUEA TAPS */}
        <View style={styles.mapPickerPin} pointerEvents="none">
        <Text style={styles.mapPickerPinIcon}></Text>
      </View>
      </View>

      {/* Información y acciones */}
      <View style={styles.mapPickerInfo}>
        <View style={styles.mapPickerInfoContent}>
          <Text style={styles.mapPickerInfoLabel}>Ubicación seleccionada:</Text>
          
          {isGeocodingMapPicker ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#007AFF" />
              <Text style={styles.loadingText}>Obteniendo dirección...</Text>
            </View>
          ) : (
            <View>
              <Text style={styles.mapPickerInfoAddress}>
                {mapPickerAddress ? mapPickerAddress : 'Toca el mapa para seleccionar'}
              </Text>
              
              {mapPickerLocation && (
                <Text style={styles.mapPickerInfoCoords}>
                  {mapPickerLocation.latitude.toFixed(4) + ', ' + mapPickerLocation.longitude.toFixed(4)}
                </Text>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Botones de acción */}
      <View style={styles.mapPickerActions}>
        <TouchableOpacity 
          style={[styles.mapPickerButton, styles.mapPickerCancelButton]}
          onPress={() => {
            setShowMapPicker(false);
            setMapPickerLocation(null);
            setMapPickerAddress('');
          }}
        >
          <Text style={styles.mapPickerCancelButtonText}>Cancelar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.mapPickerButton, 
            styles.mapPickerConfirmButton,
            (!mapPickerLocation || isGeocodingMapPicker) && styles.mapPickerButtonDisabled
          ]}
onPress={() => {
  if (mapPickerLocation) {
    const address = mapPickerAddress || `${mapPickerLocation.latitude.toFixed(4)}, ${mapPickerLocation.longitude.toFixed(4)}`;
    
    // Si estamos editando un destino adicional del modal múltiples destinos
    if (activeMultiDestinationStopId && multiDestModalRef.current) {
      console.log('Actualizando destino adicional:', activeMultiDestinationStopId);
      multiDestModalRef.current.updateStopAddress(activeMultiDestinationStopId, address);
      setActiveMultiDestinationStopId(null);
      setShowMapPicker(false);
      setMapPickerLocation(null);
      setMapPickerAddress('');
      return;
 }

    // Si es para modal de terceros
    if (thirdPartyLocationField) {
      if (thirdPartyLocationField === 'origen') {
        setThirdPartyOrigin(address);
      } else if (thirdPartyLocationField === 'destino') {
        setThirdPartyDestination(address);
      }
      setThirdPartyLocationField(null);
      setShowMapPicker(false);
      setMapPickerLocation(null);
      setMapPickerAddress('');
      setTimeout(() => setShowThirdPartyModal(true), 300);
      return;
    }

    if (mapPickerMode === 'destination') {
      // Guardar como DESTINO
      setDestination(address);
      setSelectedDestination({
        name: address,
        location: {
          latitude: mapPickerLocation.latitude,
          longitude: mapPickerLocation.longitude,
        }
      });
      // Calcular ruta y precio
      if (userLocation) {
        calculateRouteAndPrice(userLocation, mapPickerLocation, selectedVehicleType);
      }
    } else {
      // Guardar como ORIGEN
      handleLocationSelected(mapPickerLocation);
    }
    setShowMapPicker(false);
    setMapPickerLocation(null);
    setMapPickerAddress('');
  }
}}
          disabled={!mapPickerLocation || isGeocodingMapPicker}
        >
          {isGeocodingMapPicker ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.mapPickerConfirmButtonText}>Confirmar</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
)}
      </ErrorBoundary>
    );
  }
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
  thirdPartyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    padding: 10,
    borderRadius: 8,
    marginLeft: 10,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  thirdPartyButtonText: {
    color: '#007AFF',
    fontSize: 12,
    marginLeft: 5,
    fontWeight: '500',
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
    height: Dimensions.get('window').height * 0.25, // Reducido a 25% de la pantalla
    marginHorizontal: 10,
    marginTop: 10,
    marginBottom: 5,
    borderRadius: 10,
    overflow: 'hidden',
  },
  controlsContainer: {
    flex: 1, // Cambiado para ocupar el resto del espacio
    padding: 12, // Reducido de 20 a 12
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  destinationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  pickupInput: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,  // Reduce esto a 8
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  pickupTextContainer: {
    flex: 1,
    marginLeft: 10,  // Reduce de 10 a 8
  },
  pickupLabel: {
    fontSize: 6,  // Reduce de 12 a 11
    color: '#666',
    marginBottom: 1,  // Reduce de 2 a 1
  },
  pickupText: {
    fontSize: 10,  // Reduce de 14 a 13
    color: '#333',
  },
  formGroup: {
    marginBottom: 12,
  },
  addDestinationButton: {
    marginLeft: 10,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  destinationBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF3B30',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  destinationInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#fff',
    marginRight: 10,
  },
  destinationInputText: {
    flex: 1,
    fontSize: 14,  // Reducido de 16
    color: '#333',
  },
  destinationInputPlaceholder: {
    color: '#4CAF50',
  },
  
  // ESTILOS PARA BOTÓN DE CALCULADORA DE TARIFAS
  fareCalculatorButtonIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  fareCalculatorButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF9800',
  },
  
  // ESTILOS PARA ESTADO DE UBICACIÓN
  locationStatusContainer: {
    backgroundColor: '#f8f9fa',
    padding: 8,  // Reduce de lo que tengas (probablemente 15)
    borderRadius: 6,
    marginBottom: 6,  // Reduce de lo que tengas
  },
  locationStatusText: {
    fontSize: 13,  // Reduce de 14
    color: '#666',
    marginLeft: 8,
  },
  locationStatusTitle: {
    fontSize: 14,  // Reduce de 16
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 3,  // Reduce de 5
  },
  locationAddressText: {
    fontSize: 11,  // Reduce de 12
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
  locationStatusIcon: {
    fontSize: 24,
    marginBottom: 8,
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

  // ESTILOS PARA EL MODAL DE MÉTODOS DE PAGO
  paymentMethodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  paymentMethodSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#e7f3ff',
  },
  paymentMethodIcon: {
    fontSize: 32,
    marginRight: 15,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  paymentMethodSubtitle: {
    fontSize: 14,
    color: '#6c757d',
  },
  checkmark: {
    fontSize: 24,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingHorizontal: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 10,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
  },
  cancelButtonText: {
    color: '#495057',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // ESTILOS PARA MODALES
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
  // ESTILOS PARA UBICACIONES POPULARES
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
  // ESTILOS PARA INFORMACIÓN DE RUTA
  routeInfoContainer: {
    marginBottom: 15,
  },
  calculatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  // Estilos compactos para información de ruta
  routeInfoCompact: {
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 8,
    marginBottom: 5,
  },
  priceInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceMainInfo: {
    flex: 1,
  },
  priceLarge: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  priceFactors: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  priceFactorText: {
    fontSize: 11,
    color: '#666',
  },
  surgeText: {
    fontSize: 11,
    color: '#FF9500',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  routeDetailsCompact: {
    paddingVertical: 4,
  },
  routeDetailCompact: {
    fontSize: 12,
    color: '#666',
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
  // ESTILOS PARA SELECTOR DE VEHÍCULO
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
    padding: 8,        // Reducido de 12
    marginHorizontal: 3,  // Reducido de 4
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
    fontSize: 20,     // Reducido de 24
    marginBottom: 2,  // Reducido de 4
  },
  vehicleName: {
    fontSize: 11,     // Reducido de 12
    fontWeight: '500',
    color: '#666',
    marginBottom: 1,  // Reducido de 2
  },
  vehicleNameSelected: {
    color: '#007AFF',
  },
  vehiclePrice: {
    fontSize: 10,     // Reducido de 11
    fontWeight: 'bold',
    color: '#333',
  },
  vehiclePriceSelected: {
    color: '#007AFF',
  },
vehicleSelectorButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#4CAF50',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  vehicleSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleSelectorIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  vehicleSelectorInfo: {
    flex: 1,
  },
vehicleSelectorLabel: {
    fontSize: 14,
    color: '#4CAF50',
    marginBottom: 4,
  },
  vehicleSelectorValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4CAF50',
  },
  // ESTILOS PARA TRACKING DEL CONDUCTOR
trackingContainer: {
    backgroundColor: '#f0f8ff',
    padding: 10,
    borderRadius: 10,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
trackingTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 6,
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
statusText: {
  fontSize: 12,
  color: '#666',
},
statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  // ESTILOS PARA MAPA DE TRACKING
trackingMapContainer: {
    height: 200,
    borderRadius: 0,
    overflow: 'hidden',
    marginVertical: 5,
    marginHorizontal: -10,
  },
  trackingInfoCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  trackingInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackingStatusText: { 
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
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 15,
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
    fontSize: screenWidth * 0.028,
    fontWeight: '600',
    color: '#666',
    marginBottom: screenWidth * 0.005,
    textAlign: 'center',
  },
  statusText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    color: '#666',
  },
priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
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
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: screenWidth * 0.04,
    paddingTop: screenWidth * 0.02,
    width: '100%',
  },
  // Estilos para botones de contacto
contactButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginVertical: screenWidth * 0.015,
    paddingHorizontal: screenWidth * 0.02,
    width: '100%',
    gap: screenWidth * 0.015,
  },
contactButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingVertical: screenWidth * 0.018,
    paddingHorizontal: screenWidth * 0.025,
    borderRadius: screenWidth * 0.02,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: screenWidth * 0.25,
  },
  contactButtonText: {
    color: '#fff',
    fontSize: screenWidth * 0.032,
    fontWeight: 'bold',
    marginLeft: screenWidth * 0.015,
  },
driverName: {
    fontSize: screenWidth * 0.04,
    fontWeight: 'bold',
    marginBottom: screenWidth * 0.003,
    color: '#333',
    textAlign: 'center',
  },
driverDetails: {
    fontSize: screenWidth * 0.025,
    marginBottom: screenWidth * 0.003,
    color: '#666',
    textAlign: 'center',
  },
etaText: {
    fontSize: screenWidth * 0.028,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: screenWidth * 0.01,
    textAlign: 'center',
  },
rideActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 15,
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

  // ESTILOS PARA AUTENTICACIÓN
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
  
  // NUEVOS ESTILOS PARA MENÚ HAMBURGUESA
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
  drawerCloseButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    padding: 5,
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
  
  // ESTILOS PARA EL BOTÓN ATRÁS
  backItem: {
    backgroundColor: '#f0f8ff',
    borderBottomWidth: 1,
    borderBottomColor: '#007AFF',
  },
  backText: {
    color: '#007AFF',
    fontWeight: '600',
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

  // Estilos para validaciones
  inputError: {
    borderColor: '#FF3B30',
    borderWidth: 2,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 5,
    fontWeight: '500',
  },
  passwordStrengthContainer: {
    marginTop: 5,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  passwordStrengthText: {
    fontSize: 12,
    fontWeight: '600',
  },
  passwordWeak: {
    color: '#FF3B30',
    backgroundColor: '#FFE5E5',
  },
  passwordMedium: {
    color: '#FF9500',
    backgroundColor: '#FFF4E5',
  },
  passwordStrong: {
    color: '#34C759',
    backgroundColor: '#E5F7E5',
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
  
  // ESTILOS PARA MAP PICKER
mapPickerOverlay: {
  flex: 1,
  backgroundColor: '#fff',
},
mapPickerHeader: {
  backgroundColor: '#007AFF',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingHorizontal: 15,
  paddingVertical: 15,
  paddingTop: 10,
},
mapPickerBackButton: {
  padding: 5,
},
mapPickerTitle: {
  fontSize: 18,
  fontWeight: 'bold',
  color: '#fff',
  flex: 1,
  textAlign: 'center',
},
mapPickerContainer: {
  flex: 1,
  position: 'relative',
},
mapPickerPin: {
  position: 'absolute',
  top: '50%',
  left: '50%',
  marginLeft: -20,
  marginTop: -40,
  width: 40,
  height: 40,
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 10,
},
mapPickerPinIcon: {
  fontSize: 40,
  textShadowColor: 'rgba(0, 0, 0, 0.3)',
  textShadowOffset: { width: 1, height: 1 },
  textShadowRadius: 2,
},
mapPickerInfo: {
  backgroundColor: '#f8f9fa',
  borderTopWidth: 1,
  borderTopColor: '#e9ecef',
  padding: 15,
  minHeight: 100,
},
mapPickerInfoContent: {
  flex: 1,
},
mapPickerInfoLabel: {
  fontSize: 14,
  color: '#666',
  marginBottom: 8,
  fontWeight: '600',
},
mapPickerInfoAddress: {
  fontSize: 16,
  color: '#333',
  fontWeight: '500',
  marginBottom: 4,
},
mapPickerInfoCoords: {
  fontSize: 12,
  color: '#999',
  fontFamily: 'monospace',
  marginTop: 4,
},
mapTapOverlay: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 999,
  pointerEvents: 'auto',
},
loadingContainer: {
  flexDirection: 'row',
  alignItems: 'center',
},
loadingText: {
  marginLeft: 10,
  fontSize: 14,
  color: '#007AFF',
},
mapPickerActions: {
  flexDirection: 'row',
  padding: 15,
  borderTopWidth: 1,
  borderTopColor: '#e9ecef',
  gap: 10,
},
mapPickerButton: {
  flex: 1,
  paddingVertical: 15,
  borderRadius: 10,
  alignItems: 'center',
  justifyContent: 'center',
},
mapPickerCancelButton: {
  backgroundColor: '#f8f9fa',
  borderWidth: 1,
  borderColor: '#dee2e6',
},
mapPickerCancelButtonText: {
  fontSize: 16,
  fontWeight: '600',
  color: '#495057',
},
mapPickerConfirmButton: {
  backgroundColor: '#007AFF',
},
mapPickerConfirmButtonText: {
  fontSize: 16,
  fontWeight: '600',
  color: '#fff',
},
mapPickerButtonDisabled: {
  backgroundColor: '#ccc',
  opacity: 0.6,
},

}); // CIERRE CORRECTO DEL StyleSheet.create

// Componente principal de la app
const MainApp = App;

// Componente con navegación
const AppWithNavigation = (props) => {
  return <MainApp {...props} />;
};

export default AppWithNavigation;

