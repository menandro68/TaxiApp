// AddPaymentMethodModal.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import PaymentStorage from '../services/PaymentStorage';

const AddPaymentMethodModal = ({ visible, onClose, onSave }) => {
  const [paymentType, setPaymentType] = useState('card');
  const [cardNumber, setCardNumber] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const resetForm = () => {
    setCardNumber('');
    setCardholderName('');
    setExpiryDate('');
    setCvv('');
    setPaymentType('card');
  };

  const formatCardNumber = (text) => {
    // Eliminar espacios y caracteres no numéricos
    const cleaned = text.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    // Agregar espacios cada 4 dígitos
    const match = cleaned.match(/.{1,4}/g);
    return match ? match.join(' ') : cleaned;
  };

  const formatExpiryDate = (text) => {
    // Eliminar caracteres no numéricos
    const cleaned = text.replace(/[^0-9]/gi, '');
    // Agregar barra después del mes
    if (cleaned.length >= 3) {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
    }
    return cleaned;
  };

  const validateForm = () => {
    if (paymentType === 'cash') {
      return true;
    }

    if (!cardNumber || cardNumber.replace(/\s/g, '').length < 13) {
      Alert.alert('Error', 'Ingresa un número de tarjeta válido');
      return false;
    }

    if (!PaymentStorage.validateCardNumber(cardNumber)) {
      Alert.alert('Error', 'El número de tarjeta no es válido');
      return false;
    }

    if (!cardholderName.trim()) {
      Alert.alert('Error', 'Ingresa el nombre del titular');
      return false;
    }

    if (!expiryDate || expiryDate.length !== 5) {
      Alert.alert('Error', 'Ingresa una fecha de vencimiento válida (MM/YY)');
      return false;
    }

    if (!cvv || cvv.length < 3) {
      Alert.alert('Error', 'Ingresa un CVV válido');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsProcessing(true);

    try {
      const paymentMethod = paymentType === 'cash' 
        ? {
            type: 'cash',
            name: 'Efectivo',
            description: 'Pago en efectivo al conductor',
          }
        : {
            type: 'card',
            cardNumber: cardNumber.replace(/\s/g, ''),
            cardholderName: cardholderName.trim(),
            expiryDate,
            cvv,
            cardType: PaymentStorage.detectCardType(cardNumber),
          };

      const result = await PaymentStorage.savePaymentMethod(paymentMethod);

      if (result.success) {
        Alert.alert('✅ Éxito', 'Método de pago agregado correctamente');
        resetForm();
        onSave(result.paymentMethod);
        onClose();
      } else {
        Alert.alert('Error', 'No se pudo guardar el método de pago');
      }
    } catch (error) {
      console.error('Error guardando método de pago:', error);
      Alert.alert('Error', 'Ocurrió un error al guardar');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Agregar método de pago</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Selector de tipo de pago */}
            <View style={styles.paymentTypeSelector}>
              <TouchableOpacity
                style={[
                  styles.paymentTypeOption,
                  paymentType === 'card' && styles.paymentTypeSelected
                ]}
                onPress={() => setPaymentType('card')}
              >
                <Icon name="card" size={24} color={paymentType === 'card' ? '#007AFF' : '#666'} />
                <Text style={[
                  styles.paymentTypeText,
                  paymentType === 'card' && styles.paymentTypeTextSelected
                ]}>
                  Tarjeta
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.paymentTypeOption,
                  paymentType === 'cash' && styles.paymentTypeSelected
                ]}
                onPress={() => setPaymentType('cash')}
              >
                <Icon name="cash" size={24} color={paymentType === 'cash' ? '#007AFF' : '#666'} />
                <Text style={[
                  styles.paymentTypeText,
                  paymentType === 'cash' && styles.paymentTypeTextSelected
                ]}>
                  Efectivo
                </Text>
              </TouchableOpacity>
            </View>

            {paymentType === 'card' ? (
              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Número de tarjeta</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="1234 5678 9012 3456"
                    value={cardNumber}
                    onChangeText={(text) => setCardNumber(formatCardNumber(text))}
                    keyboardType="numeric"
                    maxLength={19}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Nombre del titular</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Como aparece en la tarjeta"
                    value={cardholderName}
                    onChangeText={setCardholderName}
                    autoCapitalize="characters"
                  />
                </View>

                <View style={styles.row}>
                  <View style={[styles.inputGroup, styles.halfWidth]}>
                    <Text style={styles.label}>Vencimiento</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="MM/YY"
                      value={expiryDate}
                      onChangeText={(text) => setExpiryDate(formatExpiryDate(text))}
                      keyboardType="numeric"
                      maxLength={5}
                    />
                  </View>

                  <View style={[styles.inputGroup, styles.halfWidth]}>
                    <Text style={styles.label}>CVV</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="123"
                      value={cvv}
                      onChangeText={setCvv}
                      keyboardType="numeric"
                      maxLength={4}
                      secureTextEntry={true}
                    />
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.cashInfo}>
                <Icon name="cash-outline" size={64} color="#34C759" />
                <Text style={styles.cashTitle}>Pago en efectivo</Text>
                <Text style={styles.cashDescription}>
                  Pagarás directamente al conductor al finalizar tu viaje
                </Text>
              </View>
            )}
          </ScrollView>

          <TouchableOpacity
            style={[styles.saveButton, isProcessing && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isProcessing}
          >
            <Text style={styles.saveButtonText}>
              {isProcessing ? 'Guardando...' : 'Guardar método de pago'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  paymentTypeSelector: {
    flexDirection: 'row',
    padding: 20,
    justifyContent: 'space-around',
  },
  paymentTypeOption: {
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    width: '45%',
  },
  paymentTypeSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  paymentTypeText: {
    marginTop: 8,
    fontSize: 16,
    color: '#666',
  },
  paymentTypeTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f8f8f8',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  cashInfo: {
    alignItems: 'center',
    padding: 40,
  },
  cashTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  cashDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    margin: 20,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AddPaymentMethodModal;
