import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Share
} from 'react-native';

const TripDetailsScreen = ({ navigation, route }) => {
  const { trip } = route.params;
  const [rating, setRating] = useState(0);

  const handleCallDriver = () => {
    Alert.alert(
      'Llamar al conductor',
      `¿Deseas llamar a ${trip.driverName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Llamar', 
          onPress: () => {
            // Aquí se conectaría con el número real del conductor
            Linking.openURL('tel:+18095551234');
          }
        }
      ]
    );
  };

  const handleReportIssue = () => {
    Alert.alert(
      'Reportar problema',
      'Selecciona el tipo de problema:',
      [
        { text: 'Cobro incorrecto', onPress: () => handleIssueType('payment') },
        { text: 'Problema con el conductor', onPress: () => handleIssueType('driver') },
        { text: 'Artículo perdido', onPress: () => handleIssueType('lost_item') },
        { text: 'Otro', onPress: () => handleIssueType('other') },
        { text: 'Cancelar', style: 'cancel' }
      ]
    );
  };

  const handleIssueType = (type) => {
    Alert.alert(
      'Reporte enviado',
      'Tu reporte ha sido enviado. Nos contactaremos contigo pronto.',
      [{ text: 'OK' }]
    );
  };

  const handleShareTrip = async () => {
    try {
      await Share.share({
        message: `Detalles de mi viaje:\n\nFecha: ${trip.date} ${trip.time}\nDesde: ${trip.pickup}\nHasta: ${trip.dropoff}\nConductor: ${trip.driverName}\nPrecio: ${trip.price}`,
        title: 'Detalles del viaje'
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleRequestReceipt = () => {
    Alert.alert(
      'Recibo enviado',
      'El recibo ha sido enviado a tu correo electrónico',
      [{ text: 'OK' }]
    );
  };

  const handleRateDriver = (stars) => {
    setRating(stars);
    // Aquí se enviaría la calificación al backend
    Alert.alert(
      'Calificación enviada',
      `Has calificado a ${trip.driverName} con ${stars} estrellas`,
      [{ text: 'OK' }]
    );
  };

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => handleRateDriver(i)}
        >
          <Text style={[
            styles.star,
            { color: i <= rating ? '#FFD700' : '#DDD' }
          ]}>
            ★
          </Text>
        </TouchableOpacity>
      );
    }
    return stars;
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed':
        return '#4CAF50';
      case 'cancelled':
        return '#F44336';
      case 'in_progress':
        return '#FF9800';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'completed':
        return 'Viaje completado';
      case 'cancelled':
        return 'Viaje cancelado';
      case 'in_progress':
        return 'Viaje en progreso';
      default:
        return 'Estado desconocido';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalles del Viaje</Text>
        <TouchableOpacity onPress={handleShareTrip}>
          <Text style={styles.shareButton}>⎘</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Estado del viaje */}
        <View style={[styles.statusCard, { backgroundColor: getStatusColor(trip.status) }]}>
          <Text style={styles.statusTitle}>{getStatusText(trip.status)}</Text>
          <Text style={styles.statusDate}>{trip.date} - {trip.time}</Text>
        </View>

        {/* Información del viaje */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Información del Viaje</Text>
          
          <View style={styles.routeContainer}>
            <View style={styles.routePoint}>
              <View style={[styles.routeDot, { backgroundColor: '#4CAF50' }]} />
              <View style={styles.routeInfo}>
                <Text style={styles.routeLabel}>Punto de recogida</Text>
                <Text style={styles.routeAddress}>{trip.pickup}</Text>
              </View>
            </View>

            <View style={styles.routeLine} />

            <View style={styles.routePoint}>
              <View style={[styles.routeDot, { backgroundColor: '#F44336' }]} />
              <View style={styles.routeInfo}>
                <Text style={styles.routeLabel}>Destino</Text>
                <Text style={styles.routeAddress}>{trip.dropoff}</Text>
              </View>
            </View>
          </View>

          <View style={styles.tripStats}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Distancia</Text>
              <Text style={styles.statValue}>{trip.distance}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Duración</Text>
              <Text style={styles.statValue}>{trip.duration}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Precio</Text>
              <Text style={styles.statValuePrice}>{trip.price}</Text>
            </View>
          </View>
        </View>

        {/* Información del conductor */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Conductor</Text>
          
          <View style={styles.driverContainer}>
            <View style={styles.driverAvatar}>
              <Text style={styles.driverInitial}>
                {trip.driverName.charAt(0)}
              </Text>
            </View>
            
            <View style={styles.driverInfo}>
              <Text style={styles.driverName}>{trip.driverName}</Text>
              <View style={styles.driverRatingContainer}>
                <Text style={styles.driverRating}>⭐ {trip.driverRating}</Text>
                <Text style={styles.driverRatingLabel}>Calificación</Text>
              </View>
            </View>

            {trip.status === 'completed' && (
              <TouchableOpacity 
                style={styles.callButton}
                onPress={handleCallDriver}
              >
                <Text style={styles.callButtonText}>📞</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Calificar conductor si el viaje está completado */}
          {trip.status === 'completed' && rating === 0 && (
            <View style={styles.ratingContainer}>
              <Text style={styles.ratingTitle}>Califica tu experiencia</Text>
              <View style={styles.starsContainer}>
                {renderStars()}
              </View>
            </View>
          )}
        </View>

        {/* Acciones */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Acciones</Text>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleRequestReceipt}
          >
            <Text style={styles.actionIcon}>📧</Text>
            <Text style={styles.actionText}>Solicitar recibo</Text>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleReportIssue}
          >
            <Text style={styles.actionIcon}>⚠️</Text>
            <Text style={styles.actionText}>Reportar un problema</Text>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>

          {trip.status === 'completed' && (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => Alert.alert('Repetir viaje', 'Esta función estará disponible pronto')}
            >
              <Text style={styles.actionIcon}>🔄</Text>
              <Text style={styles.actionText}>Repetir este viaje</Text>
              <Text style={styles.actionArrow}>›</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Información de pago */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Detalles del Pago</Text>
          
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Tarifa base</Text>
            <Text style={styles.paymentValue}>RD$ 100</Text>
          </View>
          
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Distancia ({trip.distance})</Text>
            <Text style={styles.paymentValue}>RD$ 200</Text>
          </View>
          
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Tiempo ({trip.duration})</Text>
            <Text style={styles.paymentValue}>RD$ 50</Text>
          </View>
          
          <View style={[styles.paymentRow, styles.paymentTotal]}>
            <Text style={styles.paymentTotalLabel}>Total</Text>
            <Text style={styles.paymentTotalValue}>{trip.price}</Text>
          </View>
          
          <View style={styles.paymentMethod}>
            <Text style={styles.paymentMethodLabel}>Método de pago:</Text>
            <Text style={styles.paymentMethodValue}>💳 Efectivo</Text>
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#007bff',
    paddingTop: 40,
    paddingBottom: 15,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 30,
  },
  backButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  shareButton: {
    color: 'white',
    fontSize: 24,
  },
  scrollView: {
    flex: 1,
  },
  statusCard: {
    margin: 15,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  statusTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  statusDate: {
    color: 'white',
    fontSize: 14,
    opacity: 0.9,
  },
  card: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 15,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  routeContainer: {
    marginBottom: 20,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  routeInfo: {
    marginLeft: 12,
    flex: 1,
  },
  routeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  routeAddress: {
    fontSize: 15,
    color: '#333',
  },
  routeLine: {
    width: 2,
    height: 25,
    backgroundColor: '#ddd',
    marginLeft: 6,
    marginVertical: 5,
  },
  tripStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  statValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  statValuePrice: {
    fontSize: 18,
    color: '#007bff',
    fontWeight: 'bold',
  },
  driverContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverInitial: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  driverInfo: {
    flex: 1,
    marginLeft: 15,
  },
  driverName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  driverRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverRating: {
    fontSize: 14,
    color: '#666',
    marginRight: 5,
  },
  driverRatingLabel: {
    fontSize: 12,
    color: '#999',
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callButtonText: {
    fontSize: 20,
  },
  ratingContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'center',
  },
  ratingTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  starsContainer: {
    flexDirection: 'row',
  },
  star: {
    fontSize: 30,
    marginHorizontal: 5,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionIcon: {
    fontSize: 20,
    marginRight: 15,
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  actionArrow: {
    fontSize: 20,
    color: '#999',
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  paymentLabel: {
    fontSize: 14,
    color: '#666',
  },
  paymentValue: {
    fontSize: 14,
    color: '#333',
  },
  paymentTotal: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  paymentTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  paymentTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007bff',
  },
  paymentMethod: {
    flexDirection: 'row',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  paymentMethodLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 10,
  },
  paymentMethodValue: {
    fontSize: 14,
    color: '#333',
  },
});

export default TripDetailsScreen;