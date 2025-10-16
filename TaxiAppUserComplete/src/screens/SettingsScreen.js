import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SettingsScreen = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState({
    // Notificaciones
    notifications: true,
    soundEnabled: true,
    vibrationEnabled: true,
    promotionalNotifications: true,
    tripUpdates: true,
    driverNearby: true,
    
    // Preferencias de viaje
    defaultVehicleType: 'economy', // economy, comfort, premium
    airConditioning: true,
    quietRide: false,
    musicInRide: true,
    
    // Accesibilidad
    wheelchairAccess: false,
    assistanceNeeded: false,
    
    // Seguridad
    shareTripsAutomatically: false,
    emergencyContactsEnabled: false,
    
    // Pagos
    defaultPaymentMethod: 'cash', // cash, card, wallet
    autoTip: false,
    tipPercentage: 10,
    emailReceipts: true,
    
    // General
    language: 'es', // es, en
    units: 'km', // km, mi
    darkMode: false
  });

  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  // Cargar configuraciones guardadas
  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const savedSettings = await AsyncStorage.getItem('userSettings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error cargando configuraciones:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Guardar configuraciones
  const saveSettings = async (newSettings) => {
    try {
      await AsyncStorage.setItem('userSettings', JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Error guardando configuraciones:', error);
      Alert.alert('Error', 'No se pudieron guardar los cambios');
    }
  };

  // Actualizar una configuración específica
  const updateSetting = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  // Sección de Notificaciones
  const renderNotificationsSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Notificaciones</Text>
      
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Icon name="notifications-outline" size={24} color="#007AFF" />
          <Text style={styles.settingText}>Notificaciones</Text>
        </View>
        <Switch
          value={settings.notifications}
          onValueChange={(value) => updateSetting('notifications', value)}
          trackColor={{ false: '#767577', true: '#007AFF' }}
          thumbColor={settings.notifications ? '#fff' : '#f4f3f4'}
        />
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Icon name="volume-high-outline" size={24} color="#007AFF" />
          <Text style={styles.settingText}>Sonido</Text>
        </View>
        <Switch
          value={settings.soundEnabled}
          onValueChange={(value) => updateSetting('soundEnabled', value)}
          trackColor={{ false: '#767577', true: '#007AFF' }}
          thumbColor={settings.soundEnabled ? '#fff' : '#f4f3f4'}
          disabled={!settings.notifications}
        />
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Icon name="phone-portrait-outline" size={24} color="#007AFF" />
          <Text style={styles.settingText}>Vibración</Text>
        </View>
        <Switch
          value={settings.vibrationEnabled}
          onValueChange={(value) => updateSetting('vibrationEnabled', value)}
          trackColor={{ false: '#767577', true: '#007AFF' }}
          thumbColor={settings.vibrationEnabled ? '#fff' : '#f4f3f4'}
          disabled={!settings.notifications}
        />
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Icon name="megaphone-outline" size={24} color="#007AFF" />
          <Text style={styles.settingText}>Promociones</Text>
        </View>
        <Switch
          value={settings.promotionalNotifications}
          onValueChange={(value) => updateSetting('promotionalNotifications', value)}
          trackColor={{ false: '#767577', true: '#007AFF' }}
          thumbColor={settings.promotionalNotifications ? '#fff' : '#f4f3f4'}
          disabled={!settings.notifications}
        />
      </View>
    </View>
  );

  // Sección de Preferencias de Viaje
  const renderTripPreferencesSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Preferencias de Viaje</Text>
      
      <TouchableOpacity 
        style={styles.settingRow}
        onPress={() => setShowVehicleModal(true)}
      >
        <View style={styles.settingInfo}>
          <Icon name="car-outline" size={24} color="#34C759" />
          <Text style={styles.settingText}>Vehículo preferido</Text>
        </View>
        <View style={styles.settingValue}>
          <Text style={styles.valueText}>
            {settings.defaultVehicleType === 'economy' ? 'Económico' :
             settings.defaultVehicleType === 'comfort' ? 'Confort' : 'Premium'}
          </Text>
          <Icon name="chevron-forward" size={20} color="#999" />
        </View>
      </TouchableOpacity>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Icon name="snow-outline" size={24} color="#34C759" />
          <Text style={styles.settingText}>Aire acondicionado</Text>
        </View>
        <Switch
          value={settings.airConditioning}
          onValueChange={(value) => updateSetting('airConditioning', value)}
          trackColor={{ false: '#767577', true: '#34C759' }}
          thumbColor={settings.airConditioning ? '#fff' : '#f4f3f4'}
        />
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Icon name="volume-mute-outline" size={24} color="#34C759" />
          <Text style={styles.settingText}>Viaje silencioso</Text>
        </View>
        <Switch
          value={settings.quietRide}
          onValueChange={(value) => updateSetting('quietRide', value)}
          trackColor={{ false: '#767577', true: '#34C759' }}
          thumbColor={settings.quietRide ? '#fff' : '#f4f3f4'}
        />
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Icon name="musical-notes-outline" size={24} color="#34C759" />
          <Text style={styles.settingText}>Música en el viaje</Text>
        </View>
        <Switch
          value={settings.musicInRide}
          onValueChange={(value) => updateSetting('musicInRide', value)}
          trackColor={{ false: '#767577', true: '#34C759' }}
          thumbColor={settings.musicInRide ? '#fff' : '#f4f3f4'}
        />
      </View>
    </View>
  );

  // Sección de Accesibilidad
  const renderAccessibilitySection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Accesibilidad</Text>
      
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Icon name="accessibility-outline" size={24} color="#FF9500" />
          <Text style={styles.settingText}>Acceso para silla de ruedas</Text>
        </View>
        <Switch
          value={settings.wheelchairAccess}
          onValueChange={(value) => updateSetting('wheelchairAccess', value)}
          trackColor={{ false: '#767577', true: '#FF9500' }}
          thumbColor={settings.wheelchairAccess ? '#fff' : '#f4f3f4'}
        />
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Icon name="hand-left-outline" size={24} color="#FF9500" />
          <Text style={styles.settingText}>Necesito asistencia</Text>
        </View>
        <Switch
          value={settings.assistanceNeeded}
          onValueChange={(value) => updateSetting('assistanceNeeded', value)}
          trackColor={{ false: '#767577', true: '#FF9500' }}
          thumbColor={settings.assistanceNeeded ? '#fff' : '#f4f3f4'}
        />
      </View>
    </View>
  );

  // Sección de Seguridad
  const renderSecuritySection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Seguridad</Text>
      
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Icon name="share-social-outline" size={24} color="#FF3B30" />
          <Text style={styles.settingText}>Compartir viajes automáticamente</Text>
        </View>
        <Switch
          value={settings.shareTripsAutomatically}
          onValueChange={(value) => updateSetting('shareTripsAutomatically', value)}
          trackColor={{ false: '#767577', true: '#FF3B30' }}
          thumbColor={settings.shareTripsAutomatically ? '#fff' : '#f4f3f4'}
        />
      </View>

      <TouchableOpacity style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Icon name="people-outline" size={24} color="#FF3B30" />
          <Text style={styles.settingText}>Contactos de emergencia</Text>
        </View>
        <Icon name="chevron-forward" size={20} color="#999" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Icon name="shield-checkmark-outline" size={24} color="#FF3B30" />
          <Text style={styles.settingText}>Centro de seguridad</Text>
        </View>
        <Icon name="chevron-forward" size={20} color="#999" />
      </TouchableOpacity>
    </View>
  );

  // Sección de Pagos
  const renderPaymentSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Pagos</Text>
      
      <TouchableOpacity 
        style={styles.settingRow}
        onPress={() => setShowPaymentModal(true)}
      >
        <View style={styles.settingInfo}>
          <Icon name="wallet-outline" size={24} color="#5856D6" />
          <Text style={styles.settingText}>Método de pago predeterminado</Text>
        </View>
        <View style={styles.settingValue}>
          <Text style={styles.valueText}>
            {settings.defaultPaymentMethod === 'cash' ? 'Efectivo' :
             settings.defaultPaymentMethod === 'card' ? 'Tarjeta' : 'Billetera'}
          </Text>
          <Icon name="chevron-forward" size={20} color="#999" />
        </View>
      </TouchableOpacity>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Icon name="gift-outline" size={24} color="#5856D6" />
          <Text style={styles.settingText}>Propina automática (10%)</Text>
        </View>
        <Switch
          value={settings.autoTip}
          onValueChange={(value) => updateSetting('autoTip', value)}
          trackColor={{ false: '#767577', true: '#5856D6' }}
          thumbColor={settings.autoTip ? '#fff' : '#f4f3f4'}
        />
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Icon name="mail-outline" size={24} color="#5856D6" />
          <Text style={styles.settingText}>Recibos por email</Text>
        </View>
        <Switch
          value={settings.emailReceipts}
          onValueChange={(value) => updateSetting('emailReceipts', value)}
          trackColor={{ false: '#767577', true: '#5856D6' }}
          thumbColor={settings.emailReceipts ? '#fff' : '#f4f3f4'}
        />
      </View>
    </View>
  );

  // Sección General
  const renderGeneralSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>General</Text>
      
      <TouchableOpacity 
        style={styles.settingRow}
        onPress={() => setShowLanguageModal(true)}
      >
        <View style={styles.settingInfo}>
          <Icon name="language-outline" size={24} color="#666" />
          <Text style={styles.settingText}>Idioma</Text>
        </View>
        <View style={styles.settingValue}>
          <Text style={styles.valueText}>
            {settings.language === 'es' ? 'Español' : 'English'}
          </Text>
          <Icon name="chevron-forward" size={20} color="#999" />
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Icon name="speedometer-outline" size={24} color="#666" />
          <Text style={styles.settingText}>Unidades</Text>
        </View>
        <View style={styles.settingValue}>
          <Text style={styles.valueText}>
            {settings.units === 'km' ? 'Kilómetros' : 'Millas'}
          </Text>
          <Icon name="chevron-forward" size={20} color="#999" />
        </View>
      </TouchableOpacity>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Icon name="moon-outline" size={24} color="#666" />
          <Text style={styles.settingText}>Modo oscuro</Text>
        </View>
        <Switch
          value={settings.darkMode}
          onValueChange={(value) => updateSetting('darkMode', value)}
          trackColor={{ false: '#767577', true: '#666' }}
          thumbColor={settings.darkMode ? '#fff' : '#f4f3f4'}
        />
      </View>
    </View>
  );

  // Modal de selección de idioma
  const renderLanguageModal = () => (
    <Modal
      visible={showLanguageModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowLanguageModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Seleccionar idioma</Text>
          
          <TouchableOpacity 
            style={[styles.modalOption, settings.language === 'es' && styles.modalOptionSelected]}
            onPress={() => {
              updateSetting('language', 'es');
              setShowLanguageModal(false);
            }}
          >
            <Text style={styles.modalOptionText}>Español</Text>
            {settings.language === 'es' && <Icon name="checkmark" size={24} color="#007AFF" />}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.modalOption, settings.language === 'en' && styles.modalOptionSelected]}
            onPress={() => {
              updateSetting('language', 'en');
              setShowLanguageModal(false);
            }}
          >
            <Text style={styles.modalOptionText}>English</Text>
            {settings.language === 'en' && <Icon name="checkmark" size={24} color="#007AFF" />}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.modalCancelButton}
            onPress={() => setShowLanguageModal(false)}
          >
            <Text style={styles.modalCancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Modal de selección de vehículo
  const renderVehicleModal = () => (
    <Modal
      visible={showVehicleModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowVehicleModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Tipo de vehículo preferido</Text>
          
          <TouchableOpacity 
            style={[styles.modalOption, settings.defaultVehicleType === 'economy' && styles.modalOptionSelected]}
            onPress={() => {
              updateSetting('defaultVehicleType', 'economy');
              setShowVehicleModal(false);
            }}
          >
            <View style={styles.modalOptionInfo}>
              <Icon name="car-outline" size={24} color="#007AFF" />
              <View style={styles.modalOptionTextContainer}>
                <Text style={styles.modalOptionText}>Económico</Text>
                <Text style={styles.modalOptionSubtext}>La opción más barata</Text>
              </View>
            </View>
            {settings.defaultVehicleType === 'economy' && <Icon name="checkmark" size={24} color="#007AFF" />}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.modalOption, settings.defaultVehicleType === 'comfort' && styles.modalOptionSelected]}
            onPress={() => {
              updateSetting('defaultVehicleType', 'comfort');
              setShowVehicleModal(false);
            }}
          >
            <View style={styles.modalOptionInfo}>
              <Icon name="car-sport-outline" size={24} color="#34C759" />
              <View style={styles.modalOptionTextContainer}>
                <Text style={styles.modalOptionText}>Confort</Text>
                <Text style={styles.modalOptionSubtext}>Más espacio y comodidad</Text>
              </View>
            </View>
            {settings.defaultVehicleType === 'comfort' && <Icon name="checkmark" size={24} color="#007AFF" />}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.modalOption, settings.defaultVehicleType === 'premium' && styles.modalOptionSelected]}
            onPress={() => {
              updateSetting('defaultVehicleType', 'premium');
              setShowVehicleModal(false);
            }}
          >
            <View style={styles.modalOptionInfo}>
              <Icon name="car-outline" size={24} color="#FFD700" />
              <View style={styles.modalOptionTextContainer}>
                <Text style={styles.modalOptionText}>Premium</Text>
                <Text style={styles.modalOptionSubtext}>Vehículos de lujo</Text>
              </View>
            </View>
            {settings.defaultVehicleType === 'premium' && <Icon name="checkmark" size={24} color="#007AFF" />}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.modalCancelButton}
            onPress={() => setShowVehicleModal(false)}
          >
            <Text style={styles.modalCancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Modal de método de pago
  const renderPaymentModal = () => (
    <Modal
      visible={showPaymentModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowPaymentModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Método de pago predeterminado</Text>
          
          <TouchableOpacity 
            style={[styles.modalOption, settings.defaultPaymentMethod === 'cash' && styles.modalOptionSelected]}
            onPress={() => {
              updateSetting('defaultPaymentMethod', 'cash');
              setShowPaymentModal(false);
            }}
          >
            <View style={styles.modalOptionInfo}>
              <Icon name="cash-outline" size={24} color="#34C759" />
              <Text style={styles.modalOptionText}>Efectivo</Text>
            </View>
            {settings.defaultPaymentMethod === 'cash' && <Icon name="checkmark" size={24} color="#007AFF" />}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.modalOption, settings.defaultPaymentMethod === 'card' && styles.modalOptionSelected]}
            onPress={() => {
              updateSetting('defaultPaymentMethod', 'card');
              setShowPaymentModal(false);
            }}
          >
            <View style={styles.modalOptionInfo}>
              <Icon name="card-outline" size={24} color="#007AFF" />
              <Text style={styles.modalOptionText}>Tarjeta</Text>
            </View>
            {settings.defaultPaymentMethod === 'card' && <Icon name="checkmark" size={24} color="#007AFF" />}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.modalOption, settings.defaultPaymentMethod === 'wallet' && styles.modalOptionSelected]}
            onPress={() => {
              updateSetting('defaultPaymentMethod', 'wallet');
              setShowPaymentModal(false);
            }}
          >
            <View style={styles.modalOptionInfo}>
              <Icon name="wallet-outline" size={24} color="#5856D6" />
              <Text style={styles.modalOptionText}>Billetera digital</Text>
            </View>
            {settings.defaultPaymentMethod === 'wallet' && <Icon name="checkmark" size={24} color="#007AFF" />}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.modalCancelButton}
            onPress={() => setShowPaymentModal(false)}
          >
            <Text style={styles.modalCancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando configuraciones...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configuración</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderNotificationsSection()}
        {renderTripPreferencesSection()}
        {renderAccessibilitySection()}
        {renderSecuritySection()}
        {renderPaymentSection()}
        {renderGeneralSection()}
        
        <View style={styles.footer}>
          <TouchableOpacity style={styles.privacyButton}>
            <Text style={styles.privacyText}>Política de privacidad</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.termsButton}>
            <Text style={styles.termsText}>Términos y condiciones</Text>
          </TouchableOpacity>
          
          <Text style={styles.versionText}>Versión 1.0.0</Text>
        </View>
      </ScrollView>

      {renderLanguageModal()}
      {renderVehicleModal()}
      {renderPaymentModal()}
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
    backgroundColor: '#007AFF',
    padding: 16,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 20,
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  settingValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  valueText: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: '#f5f5f5',
  },
  modalOptionSelected: {
    backgroundColor: '#e3f2fd',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  modalOptionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalOptionTextContainer: {
    marginLeft: 12,
  },
  modalOptionText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  modalOptionSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  modalCancelButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  modalCancelText: {
    fontSize: 16,
    color: '#007AFF',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  privacyButton: {
    padding: 10,
  },
  privacyText: {
    fontSize: 14,
    color: '#007AFF',
  },
  termsButton: {
    padding: 10,
  },
  termsText: {
    fontSize: 14,
    color: '#007AFF',
  },
  versionText: {
    fontSize: 12,
    color: '#999',
    marginTop: 10,
  },
});

export default SettingsScreen;