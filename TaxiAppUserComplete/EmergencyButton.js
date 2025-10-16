import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  Vibration,
  Modal,
  ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import EmergencyService from './EmergencyService';

/**
 * Componente de Botón de Pánico
 * Muestra un botón SOS durante el viaje
 */
const EmergencyButton = ({ tripData, visible = true, onEmergencyActivated }) => {
  const [isPressed, setIsPressed] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const countdownTimer = useRef(null);

  // Animación de pulso para el botón
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  /**
   * Manejar presión del botón
   */
  const handlePressIn = () => {
    setIsPressed(true);
    setCountdown(3);
    Vibration.vibrate(100);

    // Iniciar countdown de 3 segundos
    let count = 3;
    countdownTimer.current = setInterval(() => {
      count -= 1;
      setCountdown(count);
      
      if (count === 0) {
        clearInterval(countdownTimer.current);
        activateEmergency();
      } else {
        Vibration.vibrate(100);
      }
    }, 1000);
  };

  /**
   * Cancelar activación si se suelta el botón
   */
  const handlePressOut = () => {
    if (countdown > 0) {
      clearInterval(countdownTimer.current);
      setIsPressed(false);
      setCountdown(0);
    }
  };

  /**
   * Activar emergencia
   */
  const activateEmergency = async () => {
    setShowModal(true);
    setIsActivating(true);
    setIsPressed(false);
    setCountdown(0);

    // Vibración de emergencia
    Vibration.vibrate([0, 500, 200, 500, 200, 500]);

    try {
      // Activar servicio de emergencia
      const result = await EmergencyService.activateEmergency(tripData);
      
      if (result.success) {
        Alert.alert(
          '🚨 Emergencia Activada',
          'Se ha enviado tu ubicación a tus contactos de emergencia y se está llamando al 911',
          [
            {
              text: 'Entendido',
              onPress: () => {
                setShowModal(false);
                if (onEmergencyActivated) {
                  onEmergencyActivated(result);
                }
              }
            }
          ]
        );
      } else {
        Alert.alert(
          'Alerta Parcial',
          'No se pudieron completar todas las acciones pero se intentará llamar al 911',
          [
            { 
              text: 'OK', 
              onPress: () => {
                setShowModal(false);
                EmergencyService.callEmergencyNumber();
              }
            }
          ]
        );
      }
    } catch (error) {
      Alert.alert(
        'Error',
        'Hubo un problema. Llama al 911 manualmente',
        [{ text: 'OK', onPress: () => setShowModal(false) }]
      );
    } finally {
      setIsActivating(false);
    }
  };

  /**
   * Confirmar antes de activar (alternativa al hold)
   */
  const handleQuickPress = () => {
    Alert.alert(
      '🚨 ¿Activar Emergencia?',
      '¿Estás seguro que quieres activar el botón de pánico?',
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'SÍ, ACTIVAR',
          style: 'destructive',
          onPress: activateEmergency
        }
      ]
    );
  };

  if (!visible) return null;

  return (
    <>
      {/* Botón de Pánico */}
      <Animated.View 
        style={[
          styles.container,
          { transform: [{ scale: pulseAnim }] }
        ]}
      >
        <TouchableOpacity
          style={[
            styles.emergencyButton,
            isPressed && styles.emergencyButtonPressed
          ]}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={handleQuickPress}
          activeOpacity={0.8}
        >
          <View style={styles.buttonContent}>
            {countdown > 0 ? (
              <Text style={styles.countdownText}>{countdown}</Text>
            ) : (
              <>
                <Icon name="warning" size={24} color="#FFF" />
                <Text style={styles.sosText}> 911 </Text>
              </>
            )}
          </View>
          
          {isPressed && (
            <View style={styles.holdIndicator}>
              <Text style={styles.holdText}>MANTÉN PRESIONADO</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Texto informativo */}
        <Text style={styles.infoText}>
          Mantén presionado 3 seg o toca para emergencia
        </Text>
      </Animated.View>

      {/* Modal de Activación */}
      <Modal
        visible={showModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowModal(false)}
        >
          <View style={styles.modalContent}>
            <Icon name="alert-circle" size={60} color="#FF3B30" />
            
            {isActivating ? (
              <>
                <Text style={styles.modalTitle}>Activando Emergencia...</Text>
                <ActivityIndicator size="large" color="#FF3B30" style={styles.loader} />
                <Text style={styles.modalText}>
                  Enviando tu ubicación y contactando ayuda
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>Emergencia Activada</Text>
                <Text style={styles.modalText}>
                  Se ha notificado a tus contactos de emergencia
                </Text>
                
                {/* BOTÓN PARA CERRAR */}
                <TouchableOpacity 
                  style={{
                    backgroundColor: '#FF3B30',
                    paddingHorizontal: 30,
                    paddingVertical: 12,
                    borderRadius: 10,
                    marginTop: 20
                  }}
                  onPress={() => setShowModal(false)}
                >
                  <Text style={{ color: '#FFF', fontWeight: 'bold' }}>
                    Cerrar
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    right: 20,
    alignItems: 'center',
    zIndex: 1000,
  },
  emergencyButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#FFF',
  },
  emergencyButtonPressed: {
    backgroundColor: '#CC0000',
    transform: [{ scale: 0.95 }],
  },
  buttonContent: {
    alignItems: 'center',
  },
  sosText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 2,
  },
  countdownText: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: 'bold',
  },
  holdIndicator: {
    position: 'absolute',
    bottom: -25,
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  holdText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  infoText: {
    marginTop: 8,
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    width: 100,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    width: '80%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  modalText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
  loader: {
    marginVertical: 20,
  },
});

export default EmergencyButton;