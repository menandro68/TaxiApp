// UserProfile.js - Actualizado con integración de API
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import UserAPI from '../services/UserAPI'; // Nueva importación
import NetInfo from '@react-native-community/netinfo'; // Nueva importación

const UserProfile = ({ visible, onClose, userId = '1' }) => {
  // Estados existentes
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState('');
  
  // Datos del perfil
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    photo: null,
    rating: 4.8,
    totalTrips: 127,
    memberSince: '2024-01-15',
    favoriteAddresses: []
  });

  // Copia temporal para edición
  const [tempProfile, setTempProfile] = useState({...profile});

  // Verificar conexión de red
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected);
      
      // Si vuelve la conexión, sincronizar cambios pendientes
      if (state.isConnected) {
        syncPendingChanges();
      }
    });

    return () => unsubscribe();
  }, []);

  // Cargar perfil al abrir
  useEffect(() => {
    if (visible) {
      loadUserProfile();
    }
  }, [visible]);

  // FUNCIÓN 1: Cargar perfil desde API
  const loadUserProfile = async () => {
    setIsLoading(true);
    try {
      // Primero intentar cargar desde API
      const result = await UserAPI.getUserProfile(userId);
      
      if (result.success) {
        setProfile(result.data);
        setTempProfile(result.data);
        
        // Mostrar si viene de cache
        if (result.fromCache) {
          setSyncStatus('📱 Modo offline - Datos locales');
        } else {
          setSyncStatus('✅ Sincronizado');
        }
      } else {
        // Si falla la API, cargar datos locales como fallback
        const localProfile = await AsyncStorage.getItem('userProfile');
        if (localProfile) {
          const parsedProfile = JSON.parse(localProfile);
          setProfile(parsedProfile);
          setTempProfile(parsedProfile);
          setSyncStatus('📱 Datos locales');
        } else {
          // Si no hay datos locales, usar datos por defecto
          Alert.alert(
            'Información',
            'No se pudo cargar el perfil. Usando datos de ejemplo.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('Error cargando perfil:', error);
      Alert.alert('Error', 'Error al cargar el perfil');
    } finally {
      setIsLoading(false);
    }
  };

  // FUNCIÓN 2: Guardar cambios del perfil
  const saveProfile = async () => {
    setIsLoading(true);
    
    try {
      // Validaciones
      if (!validateProfile()) {
        setIsLoading(false);
        return;
      }

      // Intentar guardar en la API
      const result = await UserAPI.updateUserProfile(userId, tempProfile);
      
      if (result.success) {
        setProfile(tempProfile);
        setIsEditing(false);
        
        Alert.alert(
          '✅ Éxito',
          result.message,
          [{ text: 'OK' }]
        );
        
        setSyncStatus('✅ Sincronizado');
      } else if (result.pendingSync) {
        // Cambios guardados localmente
        setProfile(tempProfile);
        setIsEditing(false);
        
        // Guardar también en AsyncStorage local
        await AsyncStorage.setItem('userProfile', JSON.stringify(tempProfile));
        
        Alert.alert(
          '📱 Sin conexión',
          result.message,
          [{ text: 'OK' }]
        );
        
        setSyncStatus('⏳ Pendiente de sincronización');
      } else {
        Alert.alert(
          'Error',
          result.message || 'No se pudo actualizar el perfil',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error guardando perfil:', error);
      // Guardar localmente como fallback
      await AsyncStorage.setItem('userProfile', JSON.stringify(tempProfile));
      setProfile(tempProfile);
      setIsEditing(false);
      Alert.alert('Información', 'Cambios guardados localmente');
      setSyncStatus('💾 Guardado localmente');
    } finally {
      setIsLoading(false);
    }
  };

  // FUNCIÓN 3: Sincronizar cambios pendientes
  const syncPendingChanges = async () => {
    if (!isOnline) return;
    
    try {
      const result = await UserAPI.syncPendingUpdates();
      
      if (result.success && result.results?.length > 0) {
        setSyncStatus('✅ Sincronizado');
        // Recargar perfil para obtener última versión
        loadUserProfile();
      }
    } catch (error) {
      console.error('Error sincronizando:', error);
    }
  };

  // FUNCIÓN 4: Validar datos del perfil
  const validateProfile = () => {
    if (!tempProfile.name || tempProfile.name.trim().length < 2) {
      Alert.alert('Error', 'El nombre debe tener al menos 2 caracteres');
      return false;
    }
    
    if (!tempProfile.email || !isValidEmail(tempProfile.email)) {
      Alert.alert('Error', 'Email inválido');
      return false;
    }
    
    if (!tempProfile.phone || tempProfile.phone.length < 10) {
      Alert.alert('Error', 'Número de teléfono inválido');
      return false;
    }
    
    return true;
  };

  // Validar formato de email
  const isValidEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  // FUNCIÓN 5: Pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserProfile();
    await syncPendingChanges();
    setRefreshing(false);
  };

  // FUNCIÓN 6: Cambiar foto de perfil
  const changeProfilePhoto = async () => {
    // Aquí conectarías con react-native-image-picker
    Alert.alert(
      'Cambiar foto',
      'Selecciona una opción',
      [
        { text: 'Cámara', onPress: () => console.log('Abrir cámara') },
        { text: 'Galería', onPress: () => console.log('Abrir galería') },
        { text: 'Cancelar', style: 'cancel' }
      ]
    );
  };

  // FUNCIÓN 7: Cerrar sesión
  const handleLogout = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Sí, cerrar sesión', 
          onPress: async () => {
            // Limpiar datos locales
            await AsyncStorage.multiRemove([
              'userProfile',
              'authToken',
              'pendingProfileUpdates'
            ]);
            onClose();
            // Aquí navegarías a la pantalla de login
          }
        }
      ]
    );
  };

  // FUNCIÓN 8: Agregar dirección favorita
  const addFavoriteAddress = () => {
    Alert.prompt(
      'Nueva dirección favorita',
      'Ingresa la dirección:',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Agregar',
          onPress: (address) => {
            if (address && address.trim()) {
              const newProfile = {
                ...tempProfile,
                favoriteAddresses: [...(tempProfile.favoriteAddresses || []), address.trim()]
              };
              setTempProfile(newProfile);
            }
          }
        }
      ]
    );
  };

  // Componente de estado de conexión
  const ConnectionStatus = () => (
    <View style={[styles.connectionStatus, !isOnline && styles.offline]}>
      <Icon 
        name={isOnline ? 'wifi' : 'wifi-outline'} 
        size={16} 
        color={isOnline ? '#4CAF50' : '#FF9800'} 
      />
      <Text style={styles.connectionText}>
        {syncStatus || (isOnline ? 'En línea' : 'Sin conexión')}
      </Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Icon name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mi Perfil</Text>
          <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
            <Icon name={isEditing ? 'close' : 'create-outline'} size={24} color="#333" />
          </TouchableOpacity>
        </View>

        {/* Estado de conexión */}
        <ConnectionStatus />

        {/* Contenido con scroll y pull to refresh */}
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#007AFF']}
            />
          }
        >
          {isLoading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Cargando perfil...</Text>
            </View>
          ) : (
            <>
              {/* Foto de perfil */}
              <View style={styles.photoSection}>
                <TouchableOpacity onPress={changeProfilePhoto} disabled={!isEditing}>
                  <View style={styles.photoContainer}>
                    {profile.photo ? (
                      <Image source={{ uri: profile.photo }} style={styles.photo} />
                    ) : (
                      <Icon name="person-circle" size={100} color="#ccc" />
                    )}
                    {isEditing && (
                      <View style={styles.photoOverlay}>
                        <Icon name="camera" size={24} color="white" />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              </View>

              {/* Estadísticas */}
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{profile.totalTrips || 0}</Text>
                  <Text style={styles.statLabel}>Viajes</Text>
                </View>
                <View style={styles.statItem}>
                  <View style={styles.ratingContainer}>
                    <Icon name="star" size={20} color="#FFD700" />
                    <Text style={styles.statValue}>{profile.rating || '0.0'}</Text>
                  </View>
                  <Text style={styles.statLabel}>Calificación</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {profile.memberSince ? new Date(profile.memberSince).getFullYear() : '2024'}
                  </Text>
                  <Text style={styles.statLabel}>Miembro desde</Text>
                </View>
              </View>

              {/* Campos del perfil */}
              <View style={styles.fieldsContainer}>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Nombre</Text>
                  <TextInput
                    style={[styles.fieldInput, !isEditing && styles.fieldInputDisabled]}
                    value={isEditing ? tempProfile.name : profile.name}
                    onChangeText={(text) => setTempProfile({...tempProfile, name: text})}
                    editable={isEditing}
                    placeholder="Tu nombre"
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Email</Text>
                  <TextInput
                    style={[styles.fieldInput, !isEditing && styles.fieldInputDisabled]}
                    value={isEditing ? tempProfile.email : profile.email}
                    onChangeText={(text) => setTempProfile({...tempProfile, email: text})}
                    editable={isEditing}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholder="tu@email.com"
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Teléfono</Text>
                  <TextInput
                    style={[styles.fieldInput, !isEditing && styles.fieldInputDisabled]}
                    value={isEditing ? tempProfile.phone : profile.phone}
                    onChangeText={(text) => setTempProfile({...tempProfile, phone: text})}
                    editable={isEditing}
                    keyboardType="phone-pad"
                    placeholder="809-123-4567"
                  />
                </View>
              </View>

              {/* Direcciones favoritas */}
              <View style={styles.favoriteAddressesContainer}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Direcciones Favoritas</Text>
                  {isEditing && (
                    <TouchableOpacity onPress={addFavoriteAddress}>
                      <Icon name="add-circle" size={24} color="#007AFF" />
                    </TouchableOpacity>
                  )}
                </View>
                {profile.favoriteAddresses && profile.favoriteAddresses.length > 0 ? (
                  profile.favoriteAddresses.map((address, index) => (
                    <View key={index} style={styles.addressItem}>
                      <Icon name="location-outline" size={16} color="#666" />
                      <Text style={styles.addressText}>{address}</Text>
                      {isEditing && (
                        <TouchableOpacity
                          onPress={() => {
                            const newAddresses = tempProfile.favoriteAddresses.filter((_, i) => i !== index);
                            setTempProfile({...tempProfile, favoriteAddresses: newAddresses});
                          }}
                        >
                          <Icon name="trash-outline" size={16} color="#FF3B30" />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))
                ) : (
                  <Text style={styles.noAddressesText}>No hay direcciones guardadas</Text>
                )}
              </View>

              {/* Botones de acción */}
              {isEditing && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    style={[styles.button, styles.cancelButton]} 
                    onPress={() => {
                      setTempProfile(profile);
                      setIsEditing(false);
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.button, styles.saveButton]} 
                    onPress={saveProfile}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text style={styles.saveButtonText}>Guardar</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* Botón de cerrar sesión */}
              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Icon name="log-out-outline" size={20} color="#FF3B30" />
                <Text style={styles.logoutText}>Cerrar sesión</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
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
    padding: 16,
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
  },
  offline: {
    backgroundColor: '#FFF3E0',
  },
  connectionText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 50,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  photoSection: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
  },
  photoContainer: {
    position: 'relative',
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#007AFF',
    borderRadius: 20,
    padding: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: 'white',
    marginTop: 10,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldsContainer: {
    backgroundColor: 'white',
    marginTop: 10,
    padding: 16,
  },
  field: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  fieldInputDisabled: {
    backgroundColor: '#f9f9f9',
    color: '#666',
  },
  favoriteAddressesContainer: {
    backgroundColor: 'white',
    marginTop: 10,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  addressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  addressText: {
    flex: 1,
    marginLeft: 8,
    color: '#666',
  },
  noAddressesText: {
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginTop: 20,
    marginBottom: 40,
  },
  logoutText: {
    color: '#FF3B30',
    marginLeft: 8,
    fontSize: 16,
  },
});

export default UserProfile;
