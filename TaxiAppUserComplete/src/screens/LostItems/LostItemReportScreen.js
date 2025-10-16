import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LostItemReportScreen = ({ navigation, route }) => {
  // Estados
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [itemDescription, setItemDescription] = useState('');
  const [itemCategory, setItemCategory] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [recentTrips, setRecentTrips] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [reportStatus, setReportStatus] = useState('pending');

  // Categorías de objetos perdidos
  const ITEM_CATEGORIES = [
    { id: 'phone', name: 'Teléfono móvil', icon: 'phone-portrait' },
    { id: 'wallet', name: 'Billetera/Cartera', icon: 'wallet' },
    { id: 'keys', name: 'Llaves', icon: 'key' },
    { id: 'bag', name: 'Bolso/Mochila', icon: 'bag' },
    { id: 'documents', name: 'Documentos', icon: 'document' },
    { id: 'electronics', name: 'Electrónicos', icon: 'laptop' },
    { id: 'clothing', name: 'Ropa', icon: 'shirt' },
    { id: 'jewelry', name: 'Joyas', icon: 'diamond' },
    { id: 'glasses', name: 'Gafas', icon: 'glasses' },
    { id: 'other', name: 'Otro', icon: 'help-circle' },
  ];

  // Cargar viajes recientes
  useEffect(() => {
    loadRecentTrips();
    loadUserPhone();
  }, []);

  const loadRecentTrips = async () => {
    try {
      // Simular carga de viajes recientes
      const mockTrips = [
        {
          id: '1',
          date: '2024-08-27',
          time: '14:30',
          driver: 'Juan Pérez',
          vehiclePlate: 'ABC-123',
          from: 'Megacentro',
          to: 'Zona Colonial',
          fare: 450,
        },
        {
          id: '2',
          date: '2024-08-27',
          time: '10:15',
          driver: 'María García',
          vehiclePlate: 'XYZ-789',
          from: 'Aeropuerto',
          to: 'Blue Mall',
          fare: 850,
        },
        {
          id: '3',
          date: '2024-08-26',
          time: '18:45',
          driver: 'Pedro Rodríguez',
          vehiclePlate: 'DEF-456',
          from: 'INTEC',
          to: 'Ágora Mall',
          fare: 320,
        },
      ];
      setRecentTrips(mockTrips);
    } catch (error) {
      console.error('Error cargando viajes:', error);
    }
  };

  const loadUserPhone = async () => {
    try {
      const userPhone = await AsyncStorage.getItem('userPhone');
      if (userPhone) {
        setContactPhone(userPhone);
      }
    } catch (error) {
      console.error('Error cargando teléfono:', error);
    }
  };

  // Enviar reporte
  const handleSubmitReport = async () => {
    // Validaciones
    if (!selectedTrip) {
      Alert.alert('Error', 'Por favor selecciona el viaje donde perdiste el objeto');
      return;
    }

    if (!itemCategory) {
      Alert.alert('Error', 'Por favor selecciona la categoría del objeto');
      return;
    }

    if (!itemDescription.trim()) {
      Alert.alert('Error', 'Por favor describe el objeto perdido');
      return;
    }

    if (!contactPhone.trim()) {
      Alert.alert('Error', 'Por favor proporciona un teléfono de contacto');
      return;
    }

    setIsLoading(true);

    try {
      // Simular envío del reporte
      await new Promise(resolve => setTimeout(resolve, 2000));

      const report = {
        id: `REPORT-${Date.now()}`,
        tripId: selectedTrip.id,
        category: itemCategory,
        description: itemDescription,
        additionalDetails: additionalDetails,
        contactPhone: contactPhone,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      // Guardar en AsyncStorage
      const existingReports = await AsyncStorage.getItem('lostItemReports');
      const reports = existingReports ? JSON.parse(existingReports) : [];
      reports.push(report);
      await AsyncStorage.setItem('lostItemReports', JSON.stringify(reports));

      setReportStatus('submitted');
      Alert.alert(
        '✅ Reporte Enviado',
        'Tu reporte ha sido enviado exitosamente. El conductor será notificado y te contactaremos si encontramos tu objeto.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'No se pudo enviar el reporte. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Renderizar item de viaje
  const renderTripItem = (trip) => (
    <TouchableOpacity
      key={trip.id}
      style={[
        styles.tripCard,
        selectedTrip?.id === trip.id && styles.tripCardSelected
      ]}
      onPress={() => setSelectedTrip(trip)}
    >
      <View style={styles.tripHeader}>
        <Icon name="car" size={24} color="#007AFF" />
        <Text style={styles.tripDate}>
          {trip.date} - {trip.time}
        </Text>
        {selectedTrip?.id === trip.id && (
          <Icon name="checkmark-circle" size={24} color="#4CAF50" />
        )}
      </View>
      
      <View style={styles.tripInfo}>
        <Text style={styles.tripDriver}>
          <Text style={styles.label}>Conductor:</Text> {trip.driver}
        </Text>
        <Text style={styles.tripPlate}>
          <Text style={styles.label}>Placa:</Text> {trip.vehiclePlate}
        </Text>
      </View>

      <View style={styles.tripRoute}>
        <View style={styles.routePoint}>
          <Icon name="location" size={16} color="#4CAF50" />
          <Text style={styles.routeText}>{trip.from}</Text>
        </View>
        <Icon name="arrow-forward" size={16} color="#999" />
        <View style={styles.routePoint}>
          <Icon name="location" size={16} color="#FF5722" />
          <Text style={styles.routeText}>{trip.to}</Text>
        </View>
      </View>

      <Text style={styles.tripFare}>RD$ {trip.fare}</Text>
    </TouchableOpacity>
  );

  // Renderizar modal de categorías
  const renderCategoryModal = () => (
    <Modal
      visible={showCategoryModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowCategoryModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Selecciona la categoría</Text>
          
          <ScrollView style={styles.categoryList}>
            {ITEM_CATEGORIES.map(category => (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryItem}
                onPress={() => {
                  setItemCategory(category.id);
                  setShowCategoryModal(false);
                }}
              >
                <Icon name={category.icon} size={24} color="#007AFF" />
                <Text style={styles.categoryName}>{category.name}</Text>
                {itemCategory === category.id && (
                  <Icon name="checkmark" size={24} color="#4CAF50" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowCategoryModal(false)}
          >
            <Text style={styles.modalCloseText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reportar Objeto Perdido</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Instrucciones */}
        <View style={styles.instructions}>
          <Icon name="information-circle" size={20} color="#007AFF" />
          <Text style={styles.instructionText}>
            Completa este formulario para reportar un objeto perdido durante tu viaje
          </Text>
        </View>

        {/* Sección: Seleccionar viaje */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Icon name="calendar" size={20} color="#333" /> Selecciona el viaje
          </Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.tripsContainer}
          >
            {recentTrips.map(trip => renderTripItem(trip))}
          </ScrollView>
        </View>

        {/* Sección: Detalles del objeto */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Icon name="cube" size={20} color="#333" /> Detalles del objeto perdido
          </Text>

          {/* Categoría */}
          <TouchableOpacity
            style={styles.inputContainer}
            onPress={() => setShowCategoryModal(true)}
          >
            <Icon name="apps" size={20} color="#666" />
            <Text style={[
              styles.inputText,
              !itemCategory && styles.placeholder
            ]}>
              {itemCategory 
                ? ITEM_CATEGORIES.find(c => c.id === itemCategory)?.name
                : 'Seleccionar categoría'}
            </Text>
            <Icon name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>

          {/* Descripción */}
          <View style={styles.textAreaContainer}>
            <Text style={styles.inputLabel}>Descripción del objeto *</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Describe el objeto: color, marca, tamaño, contenido, etc."
              value={itemDescription}
              onChangeText={setItemDescription}
              multiline
              numberOfLines={4}
              placeholderTextColor="#999"
            />
          </View>

          {/* Detalles adicionales */}
          <View style={styles.textAreaContainer}>
            <Text style={styles.inputLabel}>Detalles adicionales (opcional)</Text>
            <TextInput
              style={[styles.textArea, { height: 80 }]}
              placeholder="¿Dónde crees que lo dejaste? ¿Algún detalle importante?"
              value={additionalDetails}
              onChangeText={setAdditionalDetails}
              multiline
              numberOfLines={3}
              placeholderTextColor="#999"
            />
          </View>
        </View>

        {/* Sección: Contacto */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Icon name="call" size={20} color="#333" /> Información de contacto
          </Text>
          
          <View style={styles.inputContainer}>
            <Icon name="phone-portrait" size={20} color="#666" />
            <TextInput
              style={styles.input}
              placeholder="Teléfono de contacto"
              value={contactPhone}
              onChangeText={setContactPhone}
              keyboardType="phone-pad"
              placeholderTextColor="#999"
            />
          </View>
        </View>

        {/* Botón de enviar */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            isLoading && styles.submitButtonDisabled
          ]}
          onPress={handleSubmitReport}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Icon name="send" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Enviar Reporte</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Información adicional */}
        <View style={styles.infoBox}>
          <Icon name="shield-checkmark" size={20} color="#4CAF50" />
          <Text style={styles.infoText}>
            Tu información está segura. Solo compartiremos tu contacto con el conductor del viaje seleccionado.
          </Text>
        </View>
      </ScrollView>

      {/* Modal de categorías */}
      {renderCategoryModal()}
    </KeyboardAvoidingView>
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
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  instructions: {
    flexDirection: 'row',
    backgroundColor: '#e3f2fd',
    padding: 15,
    margin: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  instructionText: {
    flex: 1,
    marginLeft: 10,
    color: '#1976D2',
    fontSize: 14,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 10,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  tripsContainer: {
    marginTop: 10,
  },
  tripCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 15,
    marginRight: 10,
    width: 280,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  tripCardSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#e8f5e9',
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tripDate: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  tripInfo: {
    marginBottom: 10,
  },
  tripDriver: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  tripPlate: {
    fontSize: 14,
    color: '#666',
  },
  label: {
    fontWeight: 'bold',
    color: '#333',
  },
  tripRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  routePoint: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeText: {
    marginLeft: 5,
    fontSize: 12,
    color: '#666',
  },
  tripFare: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    textAlign: 'right',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  inputText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  placeholder: {
    color: '#999',
  },
  textAreaContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  textArea: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: '#333',
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 10,
    padding: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#f0f9ff',
    marginHorizontal: 15,
    marginBottom: 30,
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    marginLeft: 10,
    color: '#666',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  categoryList: {
    maxHeight: 400,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoryName: {
    flex: 1,
    marginLeft: 15,
    fontSize: 16,
    color: '#333',
  },
  modalCloseButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    padding: 15,
    marginTop: 20,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
});

export default LostItemReportScreen;