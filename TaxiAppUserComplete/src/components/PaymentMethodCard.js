// PaymentMethodCard.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import PaymentStorage from '../services/PaymentStorage';

const PaymentMethodCard = ({ 
  paymentMethod, 
  onDelete, 
  onSetDefault, 
  onEdit,
  showActions = true 
}) => {
  
  const getCardIcon = (type) => {
    switch(type) {
      case 'visa':
        return { name: 'card', color: '#1A1F71' };
      case 'mastercard':
        return { name: 'card', color: '#EB001B' };
      case 'amex':
        return { name: 'card', color: '#006FCF' };
      case 'cash':
        return { name: 'cash', color: '#34C759' };
      default:
        return { name: 'card-outline', color: '#666' };
    }
  };

  const getPaymentTypeLabel = (type) => {
    switch(type) {
      case 'card':
        return 'Tarjeta de Crédito/Débito';
      case 'cash':
        return 'Efectivo';
      case 'paypal':
        return 'PayPal';
      default:
        return 'Método de pago';
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Eliminar método de pago',
      '¿Estás seguro que deseas eliminar este método de pago?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: () => onDelete(paymentMethod.id)
        }
      ]
    );
  };

  const handleSetDefault = () => {
    if (!paymentMethod.isDefault) {
      onSetDefault(paymentMethod.id);
    }
  };

  const cardIcon = getCardIcon(paymentMethod.cardType || paymentMethod.type);

  return (
    <TouchableOpacity 
      style={[
        styles.container,
        paymentMethod.isDefault && styles.defaultContainer
      ]}
      onPress={handleSetDefault}
      activeOpacity={0.7}
    >
      <View style={styles.leftSection}>
        <Icon 
          name={cardIcon.name} 
          size={32} 
          color={cardIcon.color} 
        />
        
        <View style={styles.cardInfo}>
          {paymentMethod.type === 'card' ? (
            <>
              <Text style={styles.cardNumber}>
                {PaymentStorage.formatCardDisplay(paymentMethod.last4)}
              </Text>
              <Text style={styles.cardType}>
                {paymentMethod.cardholderName || 'Titular'}
              </Text>
              {paymentMethod.expiryDate && (
                <Text style={styles.expiryDate}>
                  Vence: {paymentMethod.expiryDate}
                </Text>
              )}
            </>
          ) : (
            <>
              <Text style={styles.cardNumber}>
                {getPaymentTypeLabel(paymentMethod.type)}
              </Text>
              {paymentMethod.description && (
                <Text style={styles.cardType}>
                  {paymentMethod.description}
                </Text>
              )}
            </>
          )}
        </View>
      </View>

      <View style={styles.rightSection}>
        {paymentMethod.isDefault && (
          <View style={styles.defaultBadge}>
            <Text style={styles.defaultText}>Predeterminado</Text>
          </View>
        )}
        
        {showActions && (
          <View style={styles.actions}>
            {paymentMethod.type === 'card' && (
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => onEdit(paymentMethod)}
              >
                <Icon name="pencil" size={20} color="#007AFF" />
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleDelete}
            >
              <Icon name="trash-outline" size={20} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  defaultContainer: {
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardInfo: {
    marginLeft: 12,
    flex: 1,
  },
  cardNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  cardType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  expiryDate: {
    fontSize: 12,
    color: '#999',
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  defaultBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 8,
  },
  defaultText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
});

export default PaymentMethodCard;
