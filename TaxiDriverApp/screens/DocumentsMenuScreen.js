import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal
} from 'react-native';
import DocumentUploadScreen from './DocumentUploadScreen';

const DocumentsMenuScreen = ({ navigation }) => {
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const documents = [
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
    setSelectedDocument(doc);
    setShowUploadModal(true);
  };

  const handleCloseModal = () => {
    setShowUploadModal(false);
    setSelectedDocument(null);
  };

  const getDocumentStatus = (docId) => {
    // Aquí puedes verificar el estado real desde AsyncStorage
    // Por ahora retornamos 'pending' para todos
    return 'pending';
  };

  const renderStatusBadge = (status) => {
    const statusConfig = {
      pending: { text: 'Pendiente', color: '#FFA500' },
      uploaded: { text: 'Cargado', color: '#4CAF50' },
      verified: { text: 'Verificado', color: '#2196F3' }
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
      <View style={[styles.statusBadge, { backgroundColor: config.color }]}>
        <Text style={styles.statusText}>{config.text}</Text>
      </View>
    );
  };

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
            <View style={[styles.progressFill, { width: '20%' }]} />
          </View>
          <Text style={styles.progressText}>1 de 5 documentos completados</Text>
        </View>

        {/* Instructions */}
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
    elevation: 3,
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
    elevation: 2,
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
});

export default DocumentsMenuScreen;