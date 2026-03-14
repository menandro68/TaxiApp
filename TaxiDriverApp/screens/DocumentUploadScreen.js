import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Platform,
  ActivityIndicator
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DocumentUploadScreen = ({ navigation, documentType, driverId }) => {
  const [licenseImage, setLicenseImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('pending'); // pending, uploaded, verified

  // Obtener el tipo de documento actual
  const currentDocument = documentType || { 
    title: 'Licencia de Conducir',
    id: 'licencia'
  };

  const imageOptions = {
    mediaType: 'photo',
    includeBase64: false,
    maxHeight: 2000,
    maxWidth: 2000,
    quality: 0.8
  };

  const showImagePicker = () => {
    Alert.alert(
      `Seleccionar ${currentDocument.title}`,
      `¿Cómo quieres cargar tu ${currentDocument.title.toLowerCase()}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Tomar Foto', onPress: openCamera },
        { text: 'Elegir de Galería', onPress: openGallery }
      ]
    );
  };

const openCamera = async () => {
    const { request, PERMISSIONS, RESULTS } = require('react-native-permissions');
    const result = await request(PERMISSIONS.ANDROID.CAMERA);
    if (result === RESULTS.GRANTED) {
      launchCamera(imageOptions, handleImageResponse);
    } else {
      Alert.alert('Permiso requerido', 'Necesitas permitir el acceso a la cámara en Configuración');
    }
  };

  const openGallery = () => {
    launchImageLibrary(imageOptions, handleImageResponse);
  };

  const handleImageResponse = (response) => {
    if (response.didCancel || response.error) {
      console.log('Usuario canceló o error:', response.error);
      return;
    }

    if (response.assets && response.assets[0]) {
      const imageUri = response.assets[0].uri;
      setLicenseImage(imageUri);
      setUploadStatus('uploaded');
    }
  };

  const saveDocument = async () => {
    if (!licenseImage) {
      Alert.alert('Error', `Por favor carga una imagen de ${currentDocument.title.toLowerCase()}`);
      return;
    }
    setLoading(true);
    try {
      const driver = driverId ? { id: driverId } : JSON.parse(await AsyncStorage.getItem('loggedDriver'));
      if (!driver) throw new Error('No se encontró datos del conductor');

      const formData = new FormData();
      formData.append('document', {
        uri: licenseImage,
        type: 'image/jpeg',
        name: `${currentDocument.id}_${Date.now()}.jpg`
      });
      formData.append('document_type', currentDocument.id);

      const response = await fetch(
        `https://web-production-99844.up.railway.app/api/documents/driver/${driver.id}/upload`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'multipart/form-data' },
          body: formData
        }
      );
      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      Alert.alert(
        'Documento Enviado',
        `${currentDocument.title} fue enviado para verificación.`,
        [{ text: 'OK', onPress: () => navigation && navigation.goBack && navigation.goBack() }]
      );
      setUploadStatus('verified');
    } catch (error) {
      console.error('Error subiendo documento:', error);
      Alert.alert('Error', 'No se pudo enviar el documento: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const removeImage = () => {
    Alert.alert(
      'Eliminar Imagen',
      '¿Estás seguro de que quieres eliminar esta imagen?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: () => {
            setLicenseImage(null);
            setUploadStatus('pending');
          }
        }
      ]
    );
  };

  // Función para obtener instrucciones específicas por documento
  const getInstructions = () => {
    const instructions = {
      'cedula': [
        '• Captura ambos lados del documento',
        '• Asegúrate que todos los datos sean legibles',
        '• Evita reflejos en el plástico',
        '• Verifica que no esté vencida'
      ],
      'matricula': [
        '• El documento debe estar completo',
        '• Todos los sellos deben ser visibles',
        '• Incluye todas las páginas si hay más de una',
        '• Debe estar vigente'
      ],
      'licencia': [
        '• La imagen debe ser clara y legible',
        '• Incluye ambos lados si es necesario',
        '• Evita reflejos y sombras',
        '• Asegúrate que esté vigente'
      ],
      'foto_vehiculo': [
        '• Toma fotos del frente, laterales y parte trasera',
        '• El vehículo debe estar limpio',
        '• La placa debe ser visible',
        '• Incluye fotos del interior'
      ],
      'seguro': [
        '• Captura la página principal de la póliza',
        '• El número de póliza debe ser legible',
        '• Verifica las fechas de vigencia',
        '• Incluye la página con coberturas'
      ]
    };

    return instructions[currentDocument.id] || instructions['licencia'];
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Carga de Documentos</Text>
        <Text style={styles.subtitle}>{currentDocument.title}</Text>
      </View>

      <View style={styles.content}>
        {/* Instrucciones */}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>📋 Instrucciones</Text>
          {getInstructions().map((instruction, index) => (
            <Text key={index} style={styles.instructionText}>{instruction}</Text>
          ))}
        </View>

        {/* Área de carga de imagen */}
        <View style={styles.uploadArea}>
          {!licenseImage ? (
            <TouchableOpacity 
              style={styles.uploadButton}
              onPress={showImagePicker}
            >
              <Text style={styles.uploadIcon}>📷</Text>
              <Text style={styles.uploadButtonText}>
                Cargar {currentDocument.title}
              </Text>
              <Text style={styles.uploadHint}>Toca para tomar foto o seleccionar</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.imageContainer}>
              <Image source={{ uri: licenseImage }} style={styles.documentImage} />
              <View style={styles.imageActions}>
                <TouchableOpacity 
                  style={styles.changeButton}
                  onPress={showImagePicker}
                >
                  <Text style={styles.changeButtonText}>Cambiar Imagen</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.removeButton}
                  onPress={removeImage}
                >
                  <Text style={styles.removeButtonText}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Estado de verificación */}
        {uploadStatus === 'uploaded' && (
          <View style={styles.statusCard}>
            <Text style={styles.statusIcon}>⏳</Text>
            <Text style={styles.statusText}>Documento cargado - Pendiente de verificación</Text>
          </View>
        )}

        {uploadStatus === 'verified' && (
          <View style={[styles.statusCard, styles.statusVerified]}>
            <Text style={styles.statusIcon}>✅</Text>
            <Text style={styles.statusText}>Documento verificado</Text>
          </View>
        )}

        {/* Botón de guardar */}
        <TouchableOpacity
          style={[
            styles.saveButton,
            (!licenseImage || loading) && styles.saveButtonDisabled
          ]}
          onPress={saveDocument}
          disabled={!licenseImage || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveButtonText}>
              {uploadStatus === 'verified' ? 'Continuar' : 'Guardar y Continuar'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Link para saltar */}
        <TouchableOpacity 
          style={styles.skipLink}
          onPress={() => Alert.alert('Aviso', `Necesitas cargar ${currentDocument.title.toLowerCase()} para continuar`)}
        >
          <Text style={styles.skipLinkText}>
            ¿Problemas? Contacta soporte
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#4CAF50',
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#E8F5E9',
  },
  content: {
    padding: 20,
  },
  instructionsCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    lineHeight: 20,
  },
  uploadArea: {
    marginBottom: 20,
  },
  uploadButton: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
    padding: 40,
    alignItems: 'center',
    elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
  },
  uploadIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  uploadButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  uploadHint: {
    fontSize: 14,
    color: '#999',
  },
  imageContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
  },
  documentImage: {
    width: '100%',
    height: 250,
    resizeMode: 'contain',
    backgroundColor: '#F0F0F0',
  },
  imageActions: {
    flexDirection: 'row',
    padding: 12,
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  changeButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  changeButtonText: {
    color: '#4CAF50',
    fontWeight: 'bold',
    fontSize: 16,
  },
  removeButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  removeButtonText: {
    color: '#F44336',
    fontWeight: 'bold',
    fontSize: 16,
  },
  statusCard: {
    backgroundColor: '#FFF4E5',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusVerified: {
    backgroundColor: '#E8F5E9',
  },
  statusIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  statusText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  saveButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  skipLink: {
    alignItems: 'center',
  },
  skipLinkText: {
    color: '#999',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});

export default DocumentUploadScreen;
