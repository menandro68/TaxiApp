import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import ShareLocationService from '../services/ShareLocationService';

const ShareLocationModal = ({ 
  visible, 
  onClose, 
  tripData, 
  userLocation,
  isInTrip 
}) => {
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact, setNewContact] = useState({
    name: '',
    phone: '',
    relationship: ''
  });
  const [isSharing, setIsSharing] = useState(false);
  const [shareId, setShareId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadEmergencyContacts();
      checkSharingStatus();
    }
  }, [visible]);

  // Cargar contactos de emergencia
  const loadEmergencyContacts = async () => {
    const contacts = await ShareLocationService.getEmergencyContacts();
    setEmergencyContacts(contacts);
  };

  // Verificar estado actual
  const checkSharingStatus = () => {
    const status = ShareLocationService.getSharingStatus();
    setIsSharing(status.isSharing);
    setShareId(status.shareId);
  };

  // Iniciar compartir ubicación
  const startSharing = async () => {
    if (!tripData || !userLocation) {
      Alert.alert('Error', 'No hay información del viaje disponible');
      return;
    }

    setIsLoading(true);
    try {
      const id = await ShareLocationService.startSharing(tripData, userLocation);
      if (id) {
        setShareId(id);
        setIsSharing(true);
        Alert.alert('Éxito', 'Compartir ubicación activado');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo activar compartir ubicación');
    } finally {
      setIsLoading(false);
    }
  };

  // Detener compartir
  const stopSharing = async () => {
    Alert.alert(
      'Detener compartir',
      '¿Deseas dejar de compartir tu ubicación?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Detener',
          style: 'destructive',
          onPress: async () => {
            await ShareLocationService.stopSharing();
            setIsSharing(false);
            setShareId(null);
          }
        }
      ]
    );
  };

  // Compartir por WhatsApp
  const shareViaWhatsApp = async (phoneNumber = '') => {
    if (!isSharing) {
      await startSharing();
    }
    
    const success = await ShareLocationService.shareViaWhatsApp(phoneNumber);
    if (success) {
      Alert.alert('✅', 'Ubicación compartida por WhatsApp');
    }
  };

  // Compartir por SMS
  const shareViaSMS = async (phoneNumber = '') => {
    if (!isSharing) {
      await startSharing();
    }
    
    const success = await ShareLocationService.shareViaSMS(phoneNumber);
    if (success) {
      Alert.alert('✅', 'Ubicación compartida por SMS');
    }
  };

  // Compartir genérico
  const shareGeneric = async () => {
    if (!isSharing) {
      await startSharing();
    }
    
    await ShareLocationService.shareGeneric();
  };

  // Agregar contacto de emergencia
  const addEmergencyContact = async () => {
    if (!newContact.name || !newContact.phone) {
      Alert.alert('Error', 'Completa nombre y teléfono');
      return;
    }

    const success = await ShareLocationService.saveEmergencyContact(newContact);
    if (success) {
      await loadEmergencyContacts();
      setNewContact({ name: '', phone: '', relationship: '' });
      setShowAddContact(false);
      Alert.alert('✅', 'Contacto agregado');
    }
  };

  // Compartir con todos los contactos
  const shareWithAll = async () => {
    if (emergencyContacts.length === 0) {
      Alert.alert('Sin contactos', 'Agrega contactos de emergencia primero');
      return;
    }

    if (!isSharing) {
      await startSharing();
    }

    Alert.alert(
      'Compartir con todos',
      `¿Enviar tu ubicación a ${emergencyContacts.length} contactos?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar',
          onPress: async () => {
            const success = await ShareLocationService.shareWithEmergencyContacts();
            if (success) {
              Alert.alert('✅', 'Ubicación enviada a todos los contactos');
            }
          }
        }
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>📍 Compartir Ubicación</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Estado actual */}
            <View style={styles.statusCard}>
              {isSharing ? (
                <>
                  <Icon name="radio-button-on" size={24} color="#4CAF50" />
                  <Text style={styles.statusText}>Compartiendo ubicación</Text>
                  <TouchableOpacity 
                    style={styles.stopButton}
                    onPress={stopSharing}
                  >
                    <Text style={styles.stopButtonText}>Detener</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Icon name="radio-button-off" size={24} color="#999" />
                  <Text style={styles.statusText}>No estás compartiendo</Text>
                  <TouchableOpacity 
                    style={styles.startButton}
                    onPress={startSharing}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.startButtonText}>Activar</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>

            {/* Opciones de compartir */}
            <Text style={styles.sectionTitle}>Compartir por:</Text>
            
            <TouchableOpacity 
              style={styles.shareOption}
              onPress={() => shareViaWhatsApp()}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#25D366' }]}>
                <Icon name="logo-whatsapp" size={24} color="#fff" />
              </View>
              <Text style={styles.shareOptionText}>WhatsApp</Text>
              <Icon name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.shareOption}
              onPress={() => shareViaSMS()}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#007AFF' }]}>
                <Icon name="chatbubble-outline" size={24} color="#fff" />
              </View>
              <Text style={styles.shareOptionText}>SMS</Text>
              <Icon name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.shareOption}
              onPress={shareGeneric}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#FF9500' }]}>
                <Icon name="share-outline" size={24} color="#fff" />
              </View>
              <Text style={styles.shareOptionText}>Otras apps</Text>
              <Icon name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            {/* Contactos de emergencia */}
            <View style={styles.contactsSection}>
              <View style={styles.contactsHeader}>
                <Text style={styles.sectionTitle}>Contactos de emergencia</Text>
                <TouchableOpacity onPress={() => setShowAddContact(true)}>
                  <Icon name="add-circle" size={24} color="#007AFF" />
                </TouchableOpacity>
              </View>

              {emergencyContacts.length > 0 ? (
                <>
                  {emergencyContacts.map((contact) => (
                    <View key={contact.id} style={styles.contactItem}>
                      <Icon name="person-circle" size={32} color="#007AFF" />
                      <View style={styles.contactInfo}>
                        <Text style={styles.contactName}>{contact.name}</Text>
                        <Text style={styles.contactPhone}>{contact.phone}</Text>
                      </View>
                      <TouchableOpacity 
                        onPress={() => shareViaWhatsApp(contact.phone)}
                      >
                        <Icon name="send" size={20} color="#25D366" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  
                  <TouchableOpacity 
                    style={styles.shareAllButton}
                    onPress={shareWithAll}
                  >
                    <Icon name="people" size={20} color="#fff" />
                    <Text style={styles.shareAllButtonText}>
                      Compartir con todos ({emergencyContacts.length})
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={styles.noContactsText}>
                  No tienes contactos de emergencia
                </Text>
              )}
            </View>

            {/* Información */}
            <View style={styles.infoBox}>
              <Icon name="information-circle" size={20} color="#007AFF" />
              <Text style={styles.infoText}>
                Tu ubicación se actualizará en tiempo real durante el viaje. 
                El enlace se desactivará automáticamente al finalizar.
              </Text>
            </View>
          </ScrollView>

          {/* Modal agregar contacto */}
          {showAddContact && (
            <View style={styles.addContactModal}>
              <View style={styles.addContactContent}>
                <Text style={styles.modalTitle}>Agregar contacto</Text>
                
                <TextInput
                  style={styles.input}
                  placeholder="Nombre"
                  value={newContact.name}
                  onChangeText={(text) => setNewContact({...newContact, name: text})}
                />
                
                <TextInput
                  style={styles.input}
                  placeholder="Teléfono (ej: 8095551234)"
                  value={newContact.phone}
                  onChangeText={(text) => setNewContact({...newContact, phone: text})}
                  keyboardType="phone-pad"
                />
                
                <TextInput
                  style={styles.input}
                  placeholder="Relación (opcional)"
                  value={newContact.relationship}
                  onChangeText={(text) => setNewContact({...newContact, relationship: text})}
                />
                
                <View style={styles.modalButtons}>
                  <TouchableOpacity 
                    style={styles.cancelButton}
                    onPress={() => setShowAddContact(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.saveButton}
                    onPress={addEmergencyContact}
                  >
                    <Text style={styles.saveButtonText}>Guardar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
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
    maxHeight: '90%',
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    margin: 20,
    padding: 15,
    borderRadius: 10,
  },
  statusText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  stopButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  stopButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  startButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  startButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 20,
    marginTop: 10,
    marginBottom: 15,
  },
  shareOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  shareOptionText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  contactsSection: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  contactsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  contactInfo: {
    flex: 1,
    marginLeft: 12,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  contactPhone: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  noContactsText: {
    textAlign: 'center',
    color: '#999',
    marginVertical: 20,
  },
  shareAllButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  shareAllButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#e3f2fd',
    margin: 20,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    color: '#1976D2',
    lineHeight: 18,
  },
  addContactModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  addContactContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    marginRight: 10,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ShareLocationModal;