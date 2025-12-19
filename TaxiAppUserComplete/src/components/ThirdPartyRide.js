import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const ThirdPartyRide = ({ visible, onClose, onConfirm }) => {
  const [isForOther, setIsForOther] = useState(true);
  const [passengerName, setPassengerName] = useState('');
  const [passengerPhone, setPassengerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});

  const validatePhone = (phone) => {
    const phoneRegex = /^[0-9]{10}$/;
    return phoneRegex.test(phone.replace(/\D/g, ''));
  };

  const handleConfirm = () => {
    const newErrors = {};
    
    if (isForOther) {
      if (!passengerName.trim()) {
        newErrors.name = 'El nombre es requerido';
      }
      
      if (!passengerPhone.trim()) {
        newErrors.phone = 'El teléfono es requerido';
      } else if (!validatePhone(passengerPhone)) {
        newErrors.phone = 'Teléfono inválido (10 dígitos)';
      }
      
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
    }
    
    const rideData = {
      isForOther,
      passengerInfo: isForOther ? {
        name: passengerName,
        phone: passengerPhone,
        notes: notes
      } : null
    };
    
    onConfirm(rideData);
    resetForm();
  };

  const resetForm = () => {
    setIsForOther(true);
    setPassengerName('');
    setPassengerPhone('');
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
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>¿Para quién es el viaje?</Text>
            <TouchableOpacity onPress={handleClose}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Opciones */}
            <View style={styles.optionsContainer}>
              <TouchableOpacity
                style={[
                  styles.option,
                  isForOther && styles.optionSelected
                ]}
                onPress={() => setIsForOther(true)}
              >
                <Icon 
                  name="people" 
                  size={24} 
                  color={isForOther ? '#007AFF' : '#666'} 
                />
                <Text style={[
                  styles.optionText,
                  isForOther && styles.optionTextSelected
                ]}>
                  Para otra persona
                </Text>
                {isForOther && (
                  <Icon name="checkmark-circle" size={20} color="#007AFF" />
                )}
              </TouchableOpacity>
            </View>

            {/* Formulario para terceros */}
            {isForOther && (
              <View style={styles.formContainer}>
                <Text style={styles.sectionTitle}>Datos del pasajero</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Nombre completo *</Text>
                  <TextInput
                    style={[styles.input, errors.name && styles.inputError]}
                    placeholder="Ej: Juan Pérez"
                    value={passengerName}
                    onChangeText={(text) => {
                      setPassengerName(text);
                      setErrors({...errors, name: ''});
                    }}
                  />
                  {errors.name && (
                    <Text style={styles.errorText}>{errors.name}</Text>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Teléfono *</Text>
                  <TextInput
                    style={[styles.input, errors.phone && styles.inputError]}
                    placeholder="809-555-0123"
                    value={passengerPhone}
                    onChangeText={(text) => {
                      setPassengerPhone(text);
                      setErrors({...errors, phone: ''});
                    }}
                    keyboardType="phone-pad"
                    maxLength={12}
                  />
                  {errors.phone && (
                    <Text style={styles.errorText}>{errors.phone}</Text>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Notas adicionales (opcional)</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Ej: Persona mayor, necesita ayuda con el equipaje"
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    numberOfLines={3}
                    maxLength={200}
                  />
                </View>

                <View style={styles.infoBox}>
                  <Icon name="information-circle" size={20} color="#007AFF" />
                  <Text style={styles.infoText}>
                    El conductor recibirá estos datos y podrá contactar directamente al pasajero
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Botones de acción */}
          <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={handleClose}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.confirmButton}
              onPress={handleConfirm}
            >
              <Text style={styles.confirmButtonText}>
                {isForOther ? 'Confirmar pasajero' : 'Continuar'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  optionsContainer: {
    padding: 20,
    gap: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  optionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  optionText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#666',
  },
  optionTextSelected: {
    color: '#007AFF',
    fontWeight: '500',
  },
  formContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 4,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#f0f8ff',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  infoText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
  },
  confirmButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});

export default ThirdPartyRide;