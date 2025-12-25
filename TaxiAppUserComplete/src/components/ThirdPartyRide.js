import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const ThirdPartyRide = ({ visible, onClose, onConfirm, onSelectLocation, selectedOrigin, selectedDestination }) => {
  const [passengerName, setPassengerName] = useState('');
  const [passengerPhone, setPassengerPhone] = useState('');
  const [puntoOrigen, setPuntoOrigen] = useState('');
  const [destinoViaje, setDestinoViaje] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});

  // Actualizar cuando se seleccione ubicación externa
  useEffect(() => {
    if (selectedOrigin) {
      setPuntoOrigen(selectedOrigin);
    }
  }, [selectedOrigin]);

  useEffect(() => {
    if (selectedDestination) {
      setDestinoViaje(selectedDestination);
    }
  }, [selectedDestination]);

  const validatePhone = (phone) => {
    const phoneRegex = /^[0-9]{10}$/;
    return phoneRegex.test(phone.replace(/\D/g, ''));
  };

  const handleConfirm = () => {
    const newErrors = {};
    
    if (!passengerName.trim()) newErrors.name = true;
    if (!passengerPhone.trim() || !validatePhone(passengerPhone)) newErrors.phone = true;
    if (!puntoOrigen.trim()) newErrors.origen = true;
    if (!destinoViaje.trim()) newErrors.destino = true;
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    onConfirm({
      isForOther: true,
      passengerInfo: {
        name: passengerName,
        phone: passengerPhone,
        origen: puntoOrigen,
        destino: destinoViaje,
        notes: notes
      }
    });
    resetForm();
  };

  const resetForm = () => {
    setPassengerName('');
    setPassengerPhone('');
    setPuntoOrigen('');
    setDestinoViaje('');
    setNotes('');
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView 
        style={styles.overlay} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Icon name="people" size={20} color="#fff" />
            </View>
            <Text style={styles.title}>Viaje para tercero</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Icon name="close" size={22} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.row}>
              <View style={styles.inputWrapper}>
                <Icon name="person-outline" size={18} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, errors.name && styles.inputError]}
                  placeholder="Nombre del pasajero *"
                  value={passengerName}
                  onChangeText={(t) => { setPassengerName(t); setErrors({...errors, name: false}); }}
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.inputWrapper}>
                <Icon name="call-outline" size={18} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, errors.phone && styles.inputError]}
                  placeholder="Teléfono (10 dígitos) *"
                  value={passengerPhone}
                  onChangeText={(t) => { setPassengerPhone(t); setErrors({...errors, phone: false}); }}
                  keyboardType="phone-pad"
                  maxLength={12}
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.row}>
              <TouchableOpacity 
                style={[styles.inputWrapper, errors.origen && styles.inputError]}
                onPress={() => onSelectLocation && onSelectLocation('origen')}
              >
                <Icon name="location-outline" size={18} color="#007AFF" style={styles.inputIcon} />
                <Text style={[styles.input, !puntoOrigen && {color: '#999'}]}>
                  {puntoOrigen || 'Punto de origen *'}
                </Text>
                <Icon name="chevron-forward" size={18} color="#999" style={{paddingRight: 12}} />
              </TouchableOpacity>
            </View>

            <View style={styles.row}>
              <TouchableOpacity 
                style={[styles.inputWrapper, errors.destino && styles.inputError]}
                onPress={() => onSelectLocation && onSelectLocation('destino')}
              >
                <Icon name="flag-outline" size={18} color="#007AFF" style={styles.inputIcon} />
                <Text style={[styles.input, !destinoViaje && {color: '#999'}]}>
                  {destinoViaje || 'Destino *'}
                </Text>
                <Icon name="chevron-forward" size={18} color="#999" style={{paddingRight: 12}} />
              </TouchableOpacity>
            </View>

            <View style={styles.row}>
              <View style={styles.inputWrapper}>
                <Icon name="chatbubble-outline" size={18} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Notas (opcional)"
                  value={notes}
                  onChangeText={setNotes}
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.infoRow}>
              <Icon name="information-circle" size={16} color="#007AFF" />
              <Text style={styles.infoText}>El conductor recibirá estos datos</Text>
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
              <Icon name="checkmark" size={18} color="#fff" />
              <Text style={styles.confirmText}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerIcon: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    padding: 8,
    marginRight: 12,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  closeBtn: {
    padding: 4,
  },
  form: {
    padding: 16,
  },
  row: {
    marginBottom: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    backgroundColor: '#fafafa',
  },
  inputIcon: {
    paddingLeft: 12,
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 15,
    color: '#333',
  },
  inputError: {
    borderColor: '#FF3B30',
    backgroundColor: '#fff5f5',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  confirmBtn: {
    flex: 1,
    flexDirection: 'row',
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  confirmText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
});

export default ThirdPartyRide;