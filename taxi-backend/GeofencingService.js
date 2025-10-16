// GeofencingService.js - Servicio de Geofencing para React Native
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';

class GeofencingService {
    constructor() {
        this.isMonitoring = false;
        this.lastPosition = null;
        this.activeZones = [];
        this.locationSubscription = null;
        this.checkInterval = null;
        this.userId = null;
        this.userType = 'driver'; // 'driver' o 'passenger'
        this.serverUrl = 'http://192.168.1.100:3001'; // CAMBIA A TU IP
    }

    // Inicializar el servicio
    async initialize(userId, userType = 'driver') {
        this.userId = userId;
        this.userType = userType;

        // Solicitar permisos
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Error', 'Necesitamos permisos de ubicación para el geofencing');
            return false;
        }

        // Configurar notificaciones
        await this.setupNotifications();

        return true;
    }

    // Configurar notificaciones
    async setupNotifications() {
        await Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: false,
            }),
        });

        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
            console.log('Permisos de notificación denegados');
        }
    }

    // Iniciar monitoreo
    async startMonitoring() {
        if (this.isMonitoring) return;

        this.isMonitoring = true;

        // Monitoreo en tiempo real para conductor
        if (this.userType === 'driver') {
            // Actualización continua cada 5 segundos
            this.locationSubscription = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    timeInterval: 5000,
                    distanceInterval: 10, // metros
                },
                (location) => {
                    this.checkGeofences(location.coords);
                }
            );
        } else {
            // Para pasajeros, verificar menos frecuentemente
            this.checkInterval = setInterval(async () => {
                const location = await Location.getCurrentPositionAsync({});
                this.checkGeofences(location.coords);
            }, 10000); // cada 10 segundos
        }

        console.log('Geofencing iniciado para:', this.userType);
    }

    // Detener monitoreo
    stopMonitoring() {
        this.isMonitoring = false;

        if (this.locationSubscription) {
            this.locationSubscription.remove();
            this.locationSubscription = null;
        }

        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }

        console.log('Geofencing detenido');
    }

    // Verificar geofences con el servidor
    async checkGeofences(coords) {
        try {
            const response = await fetch(`${this.serverUrl}/api/geofencing/check`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: this.userId,
                    userType: this.userType,
                    lat: coords.latitude,
                    lng: coords.longitude
                })
            });

            const data = await response.json();

            // Procesar eventos (entradas/salidas)
            if (data.events && data.events.length > 0) {
                for (const event of data.events) {
                    await this.processGeofenceEvent(event);
                }
            }

            // Actualizar zonas activas
            this.activeZones = data.activeZones || [];

            // Guardar información para la app
            await this.saveGeofenceData(data);

            // Retornar información útil
            return {
                activeZones: data.activeZones,
                totalSurcharge: data.totalSurcharge,
                priceMultiplier: data.priceMultiplier,
                restrictions: data.restrictions
            };

        } catch (error) {
            console.error('Error verificando geofences:', error);
            return null;
        }
    }

    // Procesar evento de geofence
    async processGeofenceEvent(event) {
        const { action, geofenceName, actions } = event;

        // Mostrar notificación
        if (actions.notification) {
            await this.showNotification(
                action === 'ENTER' ? '📍 Entrada a zona' : '📤 Salida de zona',
                actions.notification
            );
        }

        // Alertas especiales
        if (actions.alert) {
            Alert.alert(
                action === 'ENTER' ? 'Entrando a zona especial' : 'Saliendo de zona',
                actions.notification,
                [{ text: 'OK' }]
            );
        }

        // Restricciones
        if (event.restricted) {
            Alert.alert(
                '⛔ Zona Restringida',
                'Esta zona tiene restricciones horarias. No se permiten pickups.',
                [{ text: 'Entendido' }]
            );
        }

        // Callback para la app principal
        if (this.onGeofenceEvent) {
            this.onGeofenceEvent(event);
        }
    }

    // Mostrar notificación local
    async showNotification(title, body) {
        await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                data: { type: 'geofence' },
                sound: true,
            },
            trigger: null, // Inmediata
        });
    }

    // Guardar datos de geofence
    async saveGeofenceData(data) {
        try {
            await AsyncStorage.setItem(
                '@geofence_data',
                JSON.stringify({
                    activeZones: data.activeZones,
                    totalSurcharge: data.totalSurcharge,
                    priceMultiplier: data.priceMultiplier,
                    restrictions: data.restrictions,
                    timestamp: new Date().toISOString()
                })
            );
        } catch (error) {
            console.error('Error guardando datos de geofence:', error);
        }
    }

    // Obtener datos guardados
    async getSavedGeofenceData() {
        try {
            const data = await AsyncStorage.getItem('@geofence_data');
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error leyendo datos de geofence:', error);
            return null;
        }
    }

    // Verificar si está en zona especial
    isInSpecialZone() {
        return this.activeZones.length > 0;
    }

    // Obtener recargo total
    getTotalSurcharge() {
        return this.activeZones.reduce((sum, zone) => 
            sum + (zone.actions.surcharge || 0), 0);
    }

    // Obtener multiplicador de precio
    getPriceMultiplier() {
        return Math.max(...this.activeZones.map(zone => 
            zone.actions.multiplier || 1.0));
    }

    // Verificar si puede hacer pickup
    canPickup() {
        return !this.activeZones.some(zone => 
            zone.actions.allowPickup === false);
    }

    // Obtener zonas activas formateadas
    getActiveZonesInfo() {
        return this.activeZones.map(zone => ({
            name: zone.name,
            type: zone.type,
            surcharge: zone.actions.surcharge || 0,
            multiplier: zone.actions.multiplier || 1.0
        }));
    }

    // Configurar callback para eventos
    setEventCallback(callback) {
        this.onGeofenceEvent = callback;
    }

    // Método para conductor: verificar zona de pickup
    async checkPickupZone(pickupLat, pickupLng) {
        try {
            const response = await fetch(`${this.serverUrl}/api/geofencing/check`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: `pickup_check_${this.userId}`,
                    userType: 'pickup',
                    lat: pickupLat,
                    lng: pickupLng
                })
            });

            const data = await response.json();
            
            return {
                allowed: !data.restrictions,
                zones: data.activeZones,
                surcharge: data.totalSurcharge,
                multiplier: data.priceMultiplier
            };

        } catch (error) {
            console.error('Error verificando zona de pickup:', error);
            return { allowed: true, zones: [], surcharge: 0, multiplier: 1 };
        }
    }

    // Método para obtener estado actual del servidor
    async getCurrentStatus() {
        try {
            const response = await fetch(
                `${this.serverUrl}/api/geofencing/status/${this.userId}`
            );
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error obteniendo estado:', error);
            return null;
        }
    }

    // Limpiar servicio
    cleanup() {
        this.stopMonitoring();
        this.activeZones = [];
        this.lastPosition = null;
    }
}

// Crear instancia única
const geofencingService = new GeofencingService();

export default geofencingService;

// Ejemplo de uso en la app del conductor:
/*
import geofencingService from './GeofencingService';

// En el componente principal del conductor
useEffect(() => {
    initializeGeofencing();
    return () => {
        geofencingService.cleanup();
    };
}, []);

const initializeGeofencing = async () => {
    // Inicializar con ID del conductor
    await geofencingService.initialize('driver_123', 'driver');
    
    // Configurar callback para eventos
    geofencingService.setEventCallback((event) => {
        console.log('Evento de geofence:', event);
        // Actualizar UI según el evento
        if (event.actions.surcharge) {
            setCurrentSurcharge(event.actions.surcharge);
        }
    });
    
    // Iniciar monitoreo
    await geofencingService.startMonitoring();
};

// Al aceptar un viaje, verificar zona de pickup
const handleAcceptRide = async (ride) => {
    const pickupCheck = await geofencingService.checkPickupZone(
        ride.pickupLat, 
        ride.pickupLng
    );
    
    if (!pickupCheck.allowed) {
        Alert.alert('Zona no disponible', 'No se permiten pickups en esta zona');
        return;
    }
    
    // Mostrar información de recargos si aplica
    if (pickupCheck.surcharge > 0) {
        Alert.alert(
            'Zona especial',
            `Esta zona tiene un recargo de $${pickupCheck.surcharge}`
        );
    }
    
    // Continuar con aceptación del viaje...
};

// En la pantalla de información
const GeofenceInfo = () => {
    const zones = geofencingService.getActiveZonesInfo();
    const surcharge = geofencingService.getTotalSurcharge();
    const multiplier = geofencingService.getPriceMultiplier();
    
    return (
        <View>
            {zones.length > 0 && (
                <View>
                    <Text>Zonas activas:</Text>
                    {zones.map(zone => (
                        <Text key={zone.name}>
                            {zone.name} - {zone.type}
                            {zone.surcharge > 0 && ` +$${zone.surcharge}`}
                            {zone.multiplier > 1 && ` x${zone.multiplier}`}
                        </Text>
                    ))}
                    <Text>Recargo total: ${surcharge}</Text>
                    <Text>Multiplicador: x{multiplier}</Text>
                </View>
            )}
        </View>
    );
};
*/