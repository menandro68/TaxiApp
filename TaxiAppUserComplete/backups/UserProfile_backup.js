import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import SharedStorage from './SharedStorage';

const UserProfile = ({ visible, onClose, onProfileUpdate }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    totalTrips: 0,
    rating: 5.0,
    memberSince: '',
  });

  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
  });

  useEffect(() => {
    if (visible) {
      loadUserProfile();
    }
  }, [visible]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const userProfile = await SharedStorage.getUserProfile();
      
      if (userProfile) {
        setProfile(userProfile);
        setEditForm({
          name: userProfile.name || '',
          phone: userProfile.phone || '',
        });
      }
    } catch (error) {
      console.error('❌ Error cargando perfil:', error);
      Alert.alert('Error', 'No se pudo cargar el perfil de usuario');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      
      const updatedProfile = {
        ...profile,
        name: editForm.name,
        phone: editForm.phone,
      };
      
      await SharedStorage.updateUserProfile(updatedProfile);
      setProfile(updatedProfile);
      setEditing(false);
      
      if (onProfileUpdate) {
        onProfileUpdate(updatedProfile);
      }
      
      Alert.alert('✅ Éxito', 'Perfil actualizado correctamente');
    } catch (error) {
      console.error('❌ Error guardando perfil:', error);
      Alert.alert('Error', 'No se pudo guardar el perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleVerification = async (type, value) => {
    if (!value) {
      Alert.alert('Error', `Por favor, agrega tu ${type === 'email' ? 'correo electrónico' : 'teléfono'} primero`);
      return;
    }

    Alert.alert(
      `Verificar ${type === 'email' ? 'Email' : 'Teléfono'}`,
      `Enviaremos un código de verificación a ${value}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar código',
          onPress: async () => {
            const result = await SharedStorage.sendVerificationCode(type, value);
            if (result.success) {
              // En producción, no mostrar el código
              Alert.prompt(
                'Código de Verificación',
                `Ingresa el código de 6 dígitos enviado a ${value}\n(Código de prueba: ${result.code})`,
                [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'Verificar',
                    onPress: async (code) => {
                      const verifyResult = await SharedStorage.verifyCode(type, code);
                      if (verifyResult.success) {
                        Alert.alert('✅ Éxito', verifyResult.message);
                        loadUserProfile(); // Recargar perfil para mostrar verificación
                      } else {
                        Alert.alert('❌ Error', verifyResult.message);
                      }
                    }
                  }
                ],
                'plain-text'
              );
            } else {
              Alert.alert('Error', 'No se pudo enviar el código');
            }
          }
        }
      ]
    );
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>👤 Mi Perfil</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Cargando perfil...</Text>
          </View>
        ) : (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Avatar */}
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {profile.name ? profile.name.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
              <TouchableOpacity style={styles.changePhotoButton}>
                <Text style={styles.changePhotoText}>📷 Cambiar foto</Text>
              </TouchableOpacity>
            </View>

            {/* Información básica */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Información Personal</Text>
              
              <View style={styles.infoRow}>
                <Text style={styles.label}>Nombre:</Text>
                <Text style={styles.value}>{profile.name || 'No especificado'}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <View style={styles.labelContainer}>
                  <Text style={styles.label}>Email:</Text>
                  {profile.emailVerified ? (
                    <Text style={styles.verifiedBadge}>✓ Verificado</Text>
                  ) : (
                    <TouchableOpacity 
                      style={styles.verifyButton}
                      onPress={() => handleVerification('email', profile.email)}
                    >
                      <Text style={styles.verifyButtonText}>Verificar</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.value}>{profile.email || 'No especificado'}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <View style={styles.labelContainer}>
                  <Text style={styles.label}>Teléfono:</Text>
                  {profile.phoneVerified ? (
                    <Text style={styles.verifiedBadge}>✓ Verificado</Text>
                  ) : (
                    <TouchableOpacity 
                      style={styles.verifyButton}
                      onPress={() => handleVerification('phone', profile.phone)}
                    >
                      <Text style={styles.verifyButtonText}>Verificar</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.value}>{profile.phone || 'No especificado'}</Text>
              </View>
            </View>

            {/* Estadísticas */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Estadísticas</Text>
              
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{profile.totalTrips || 0}</Text>
                  <Text style={styles.statLabel}>Viajes</Text>
                </View>
                
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>⭐ {profile.rating || 5.0}</Text>
                  <Text style={styles.statLabel}>Calificación</Text>
                </View>
                
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>🗓️</Text>
                  <Text style={styles.statLabel}>Miembro desde</Text>
                  <Text style={styles.statSmall}>{profile.memberSince || 'Hoy'}</Text>
                </View>
              </View>
            </View>

            {/* Direcciones Favoritas */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>⭐ Direcciones Favoritas</Text>
              
              <TouchableOpacity 
                style={styles.addFavoriteButton}
                onPress={() => Alert.alert('Próximamente', 'Esta función estará disponible pronto')}
              >
                <Text style={styles.addFavoriteText}>+ Agregar dirección favorita</Text>
              </TouchableOpacity>
              
              <Text style={styles.favoriteHint}>
                Guarda tus lugares frecuentes desde la pantalla principal
              </Text>
            </View>

            {/* Botones de acción */}
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={styles.editButton}
                onPress={() => setEditing(true)}
              >
                <Text style={styles.editButtonText}>✏️ Editar Perfil</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.settingsButton}>
                <Text style={styles.settingsButtonText}>⚙️ Configuración</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.logoutButton}
                onPress={() => {
                  Alert.alert(
                    'Cerrar sesión',
                    '¿Estás seguro que deseas cerrar sesión?',
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      { 
                        text: 'Cerrar sesión', 
                        style: 'destructive',
                        onPress: async () => {
                          await SharedStorage.clearAuth();
                          onClose();
                          Alert.alert('Sesión cerrada', 'Has cerrado sesión exitosamente');
                        }
                      }
                    ]
                  );
                }}
              >
                <Text style={styles.logoutButtonText}>🚪 Cerrar Sesión</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {/* Modal de Edición */}
        {editing && (
          <View style={styles.editModal}>
            <View style={styles.editHeader}>
              <Text style={styles.editTitle}>Editar Perfil</Text>
              <TouchableOpacity onPress={() => setEditing(false)}>
                <Text style={styles.editCancelText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.editContent}>
              <Text style={styles.editLabel}>Nombre</Text>
              <TextInput
                style={styles.editInput}
                value={editForm.name}
                onChangeText={(text) => setEditForm({...editForm, name: text})}
                placeholder="Tu nombre completo"
              />
              
              <Text style={styles.editLabel}>Teléfono</Text>
              <TextInput
                style={styles.editInput}
                value={editForm.phone}
                onChangeText={(text) => setEditForm({...editForm, phone: text})}
                placeholder="Tu número de teléfono"
                keyboardType="phone-pad"
              />
              
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleSaveProfile}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>💾 Guardar Cambios</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#007AFF',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  changePhotoButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  changePhotoText: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  label: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  value: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  statSmall: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
    marginTop: 2,
  },
  actionButtons: {
    marginTop: 20,
    gap: 10,
  },
  editButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  settingsButton: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  settingsButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Estilos del Modal de Edición
  editModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    zIndex: 10,
  },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  editTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  editCancelText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  editContent: {
    padding: 20,
  },
  editLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    marginTop: 15,
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 30,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Estilos para direcciones favoritas
  addFavoriteButton: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  addFavoriteText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  favoriteHint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Estilos para verificación
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  verifiedBadge: {
    backgroundColor: '#d4edda',
    color: '#155724',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600',
  },
  verifyButton: {
    backgroundColor: '#ffc107',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  verifyButtonText: {
    color: '#856404',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default UserProfile;