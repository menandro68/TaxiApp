import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
BackHandler,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DocumentUploadScreen from './DocumentUploadScreen';

const API_URL = 'https://web-production-99844.up.railway.app/api';

const DocumentsMenuScreen = ({ navigation }) => {
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [driverInfo, setDriverInfo] = useState(null);
  const [showInfoForm, setShowInfoForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState([]);

  useEffect(() => { checkDriverInfo(); }, []);

  const checkDriverInfo = async () => {
    try {
      const saved = await AsyncStorage.getItem('@temp_driver_info');
      if (saved) { const info = JSON.parse(saved); setDriverInfo(info); loadUploadedDocs(info.id); }
      else { setShowInfoForm(true); }
    } catch (e) { setShowInfoForm(true); }
    finally { setLoading(false); }
  };

const loadUploadedDocs = async (driverId) => {
    try {
      const res = await fetch(`${API_URL}/documents/driver/${driverId}`);
      const data = await res.json();
      if (data.success) {
        const docs = data.documents.map(d => d.document_type);
        setUploadedDocs(docs);
        if (docs.length >= 6) {
          Alert.alert(
            '🎉 ¡Documentos Completos!',
            '✅ Todos tus documentos han sido enviados exitosamente.\n\n📋 Tu solicitud está siendo revisada por nuestro equipo.\n\n⏰ Recibirás una notificación por WhatsApp cuando sean aprobados.\n\n¡Gracias por unirte a Squid! 🚕',
            [{ text: '¡Entendido!', style: 'default', onPress: () => BackHandler.exitApp() }]
          );
        }
      }
    } catch (e) {}
  };

  const handleSaveInfo = async () => {
    if (!formName.trim() || !formPhone.trim()) { Alert.alert('Error', 'Por favor completa nombre y teléfono'); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/documents/register-temp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName.trim(), phone: formPhone.trim() })
      });
      const data = await res.json();
    if (!data.success) throw new Error(data.error);
if (data.existing) {
  Alert.alert('⚠️ Número ya registrado', 'Este número de teléfono ya está registrado por otro conductor. Por favor usa un número diferente.');
  return;
}
      const info = { id: data.driver_id, name: formName.trim(), phone: formPhone.trim() };
      await AsyncStorage.setItem('@temp_driver_info', JSON.stringify(info));
      setDriverInfo(info); setShowInfoForm(false); loadUploadedDocs(data.driver_id);
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
  };

  const documents = [
    {
      id: 'foto_perfil',
      title: 'Foto de Perfil',
      icon: '🤳',
      color: '#E91E63',
      description: 'Foto de rostro de frente'
    },
    {
      id: 'cedula',
      title: 'Cédula y/o Pasaporte',
      icon: '🆔',
      color: '#4CAF50',
      description: 'Documento de identidad'
    },
    {
      id: 'matricula',
      title: 'Matrícula',
      icon: '📋',
      color: '#2196F3',
      description: 'Registro del vehículo'
    },
    {
      id: 'licencia',
      title: 'Licencia',
      icon: '🚗',
      color: '#FF9800',
      description: 'Licencia de conducir'
    },
    {
      id: 'foto_vehiculo',
      title: 'Foto Vehículo',
      icon: '📸',
      color: '#9C27B0',
      description: 'Fotografías del vehículo'
    },
    {
      id: 'seguro',
      title: 'Seguro',
      icon: '🛡️',
      color: '#F44336',
      description: 'Póliza de seguro'
    }
  ];

  const handleDocumentPress = (doc) => {
    if (!driverInfo) { setShowInfoForm(true); return; }
    setSelectedDocument(doc);
    setShowUploadModal(true);
  };

  const handleCloseModal = () => {
    setShowUploadModal(false);
    setSelectedDocument(null);
    if (driverInfo) loadUploadedDocs(driverInfo.id);
  };

  const getDocumentStatus = (docId) => uploadedDocs.includes(docId) ? 'uploaded' : 'pending';

  const renderStatusBadge = (status) => {
    const config = status === 'uploaded'
      ? { text: 'Cargado ✓', color: '#4CAF50' }
      : { text: 'Pendiente', color: '#FFA500' };
    return (
      <View style={[styles.statusBadge, { backgroundColor: config.color }]}>
        <Text style={styles.statusText}>{config.text}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (showInfoForm) {
    return (
      <KeyboardAvoidingView 
        style={{ flex: 1, backgroundColor: '#4CAF50' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={{ paddingTop: 60, paddingHorizontal: 30, paddingBottom: 30 }}>
          <Text style={{ fontSize: 28, fontWeight: 'bold', color: 'white', marginBottom: 8 }}>👋 Bienvenido</Text>
          <Text style={{ fontSize: 16, color: 'rgba(255,255,255,0.9)' }}>Antes de subir tus documentos, necesitamos tu información básica</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 24 }}>Tus datos</Text>
          <Text style={{ fontSize: 14, color: '#666', marginBottom: 6 }}>Nombre completo</Text>
          <TextInput style={styles.input} placeholder="Ej: Juan Pérez" value={formName} onChangeText={setFormName} autoCapitalize="words" />
          <Text style={{ fontSize: 14, color: '#666', marginBottom: 6, marginTop: 16 }}>Teléfono</Text>
          <TextInput style={styles.input} placeholder="Ej: 8091234567" value={formPhone} onChangeText={setFormPhone} keyboardType="phone-pad" maxLength={10} />
          <TouchableOpacity style={[styles.btnPrimary, { marginTop: 30 }]} onPress={handleSaveInfo} disabled={saving}>
            {saving ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>Continuar →</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={{ marginTop: 16, alignItems: 'center' }} onPress={() => navigation && navigation.goBack()}>
            <Text style={{ color: '#999', fontSize: 14 }}>← Volver</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation && navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cargar Documentos</Text>
        <View style={styles.backButton} />
      </View>

      {driverInfo && (
        <View style={{ backgroundColor: '#E8F5E9', padding: 12, paddingHorizontal: 20 }}>
          <Text style={{ color: '#2e7d32', fontSize: 13 }}>👤 {driverInfo.name} · 📞 {driverInfo.phone}</Text>
        </View>
      )}

      {/* Subtitle */}
      <View style={styles.subtitleContainer}>
        <Text style={styles.subtitle}>
          Selecciona cada documento para cargar las fotos correspondientes
        </Text>
      </View>

      {/* Document Buttons */}
      <ScrollView style={styles.scrollView}>
        <View style={styles.documentsGrid}>
          {documents.map((doc) => (
            <TouchableOpacity
              key={doc.id}
              style={[styles.documentCard, { borderColor: doc.color }]}
              onPress={() => handleDocumentPress(doc)}
              activeOpacity={0.8}
            >
              <View style={styles.cardContent}>
                <Text style={styles.documentIcon}>{doc.icon}</Text>
                <View style={styles.documentInfo}>
                  <Text style={styles.documentTitle}>{doc.title}</Text>
                  <Text style={styles.documentDescription}>{doc.description}</Text>
                </View>
                {renderStatusBadge(getDocumentStatus(doc.id))}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Progress Summary */}
        <View style={styles.progressCard}>
          <Text style={styles.progressTitle}>📊 Progreso de Documentación</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(uploadedDocs.length / documents.length) * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>{uploadedDocs.length} de {documents.length} documentos completados</Text>
        </View>

       {uploadedDocs.length >= documents.length && (
          <TouchableOpacity
            style={{ backgroundColor: '#22c55e', padding: 18, borderRadius: 12, margin: 20, marginBottom: 0, alignItems: 'center' }}
           onPress={() => Alert.alert('✅ Documentos Enviados', 'Tus documentos han sido enviados para revisión. Te contactaremos por WhatsApp cuando sean aprobados.', [{ text: 'OK', onPress: () => BackHandler.exitApp() }])}
          >
            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>📤 Enviar Documentos</Text>
          </TouchableOpacity>
        )}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>ℹ️ Información Importante</Text>
          <Text style={styles.instructionText}>
            • Todos los documentos deben estar vigentes{'\n'}
            • Las fotos deben ser claras y legibles{'\n'}
            • La verificación puede tomar 24-48 horas{'\n'}
            • Recibirás una notificación cuando estén aprobados
          </Text>
        </View>
      </ScrollView>

      {/* Upload Modal */}
      <Modal
        visible={showUploadModal}
        animationType="slide"
        onRequestClose={handleCloseModal}
      >
        {selectedDocument && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={handleCloseModal}>
                <Text style={styles.modalCloseButton}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                Cargar {selectedDocument.title}
              </Text>
              <View style={{ width: 30 }} />
            </View>
            <DocumentUploadScreen 
              documentType={selectedDocument}
              driverId={driverInfo?.id}
              navigation={{
                goBack: handleCloseModal
              }}
            />
          </View>
        )}
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 60,
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  subtitleContainer: {
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  scrollView: {
    flex: 1,
  },
  documentsGrid: {
    padding: 20,
  },
  documentCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 2,
    elevation: 3, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  documentIcon: {
    fontSize: 40,
    marginRight: 15,
  },
  documentInfo: {
    flex: 1,
  },
  documentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  documentDescription: {
    fontSize: 12,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  progressCard: {
    backgroundColor: '#FFF',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
  },
  instructionsCard: {
    backgroundColor: '#E3F2FD',
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 10,
  },
  instructionText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#4CAF50',
  },
  modalCloseButton: {
    fontSize: 24,
    color: '#FFF',
    fontWeight: 'bold',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14, fontSize: 16, backgroundColor: '#f9f9f9' },
  btnPrimary: { backgroundColor: '#4CAF50', padding: 16, borderRadius: 12, alignItems: 'center' },
});

export default DocumentsMenuScreen;
