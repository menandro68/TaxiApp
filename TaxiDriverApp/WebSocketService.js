// WebSocketService.js - Sistema de Triple Redundancia
import { io } from 'socket.io-client';
import { Alert } from 'react-native';

const SOCKET_URL = 'wss://web-production-99844.up.railway.app';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.driverId = null;
    this.isConnected = false;
    this.onTripRequestCallback = null;
    this.heartbeatInterval = null;
  }

  // Conectar al WebSocket
  connect(driverId) {
    if (this.socket && this.isConnected) {
      console.log('📡 WebSocket ya conectado');
      return;
    }

    this.driverId = driverId;
    console.log(`📡 Conectando WebSocket para conductor ${driverId}...`);

    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000
    });

    // Conexión establecida
    this.socket.on('connect', () => {
      console.log('✅ WebSocket conectado:', this.socket.id);
      this.isConnected = true;
      
      // Registrar conductor
      this.socket.emit('driver_connect', { driverId: this.driverId });
      
      // Iniciar heartbeat cada 30 segundos
      this.startHeartbeat();
    });

    // Confirmación de conexión
    this.socket.on('connection_confirmed', (data) => {
      console.log('✅ Conexión confirmada por servidor:', data);
    });

    // Nueva solicitud de viaje via WebSocket
    this.socket.on('new_trip_request', (tripData) => {
      console.log('🚕 Nueva solicitud via WebSocket:', tripData);
      
      // Enviar ACK al servidor
      this.socket.emit('trip_request_ack', {
        tripId: tripData.tripId,
        driverId: this.driverId
      });

      // Llamar callback si existe
      if (this.onTripRequestCallback) {
        this.onTripRequestCallback(tripData);
      }
    });

    // Heartbeat ACK
    this.socket.on('heartbeat_ack', (data) => {
      console.log('💓 Heartbeat ACK recibido');
    });

    // Desconexión
    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket desconectado:', reason);
      this.isConnected = false;
      this.stopHeartbeat();
    });

    // Error de conexión
    this.socket.on('connect_error', (error) => {
      console.log('❌ Error de conexión WebSocket:', error.message);
      this.isConnected = false;
    });

    // Reconexión exitosa
    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Reconectado al intento ${attemptNumber}`);
      this.socket.emit('driver_connect', { driverId: this.driverId });
    });
  }

  // Heartbeat para mantener conexión activa
  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.isConnected) {
        this.socket.emit('heartbeat', { driverId: this.driverId });
      }
    }, 30000);
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Registrar callback para nuevas solicitudes
  onTripRequest(callback) {
    this.onTripRequestCallback = callback;
  }

  // Desconectar
  disconnect() {
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    console.log('📡 WebSocket desconectado manualmente');
  }

  // Obtener estado
  getStatus() {
    return {
      isConnected: this.isConnected,
      socketId: this.socket?.id || null,
      driverId: this.driverId
    };
  }
}

const webSocketService = new WebSocketService();
export default webSocketService;