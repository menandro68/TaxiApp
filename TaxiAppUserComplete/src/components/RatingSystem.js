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
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';

const { width: screenWidth } = Dimensions.get('window');

const RatingSystem = ({ 
  visible, 
  onClose, 
  tripData, 
  driverInfo,
  onSubmit,
  mode = 'post-trip' // 'post-trip' o 'history'
}) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [animatedValue] = useState(new Animated.Value(0));
  const [showThankYou, setShowThankYou] = useState(false);

  // Tags predefinidos para feedback rápido
  const positiveTags = [
    { id: 'safe', label: 'Conducción segura', icon: 'shield-checkmark' },
    { id: 'friendly', label: 'Amable', icon: 'happy' },
    { id: 'punctual', label: 'Puntual', icon: 'time' },
    { id: 'clean', label: 'Vehículo limpio', icon: 'sparkles' },
    { id: 'professional', label: 'Profesional', icon: 'briefcase' },
    { id: 'smooth', label: 'Viaje cómodo', icon: 'car' }
  ];

  const negativeTags = [
    { id: 'unsafe', label: 'Conducción insegura', icon: 'warning' },
    { id: 'rude', label: 'Descortés', icon: 'sad' },
    { id: 'late', label: 'Llegó tarde', icon: 'time-outline' },
    { id: 'dirty', label: 'Vehículo sucio', icon: 'trash' },
    { id: 'unprofessional', label: 'Poco profesional', icon: 'close-circle' },
    { id: 'uncomfortable', label: 'Viaje incómodo', icon: 'thumbs-down' }
  ];

  useEffect(() => {
    if (visible) {
      // Animar entrada del modal
      Animated.spring(animatedValue, {
        toValue: 1,
        tension: 20,
        friction: 7,
        useNativeDriver: true
      }).start();
    } else {
      // Reset al cerrar
      setRating(0);
      setComment('');
      setSelectedTags([]);
      setShowThankYou(false);
      animatedValue.setValue(0);
    }
  }, [visible]);

  // Función para renderizar las estrellas
  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => handleStarPress(i)}
          style={styles.starButton}
        >
          <Animated.View
            style={{
              transform: [{
                scale: rating >= i ? animatedValue : 1
              }]
            }}
          >
            <Icon
              name={rating >= i ? 'star' : 'star-outline'}
              size={40}
              color={rating >= i ? '#FFD700' : '#DDD'}
            />
          </Animated.View>
        </TouchableOpacity>
      );
    }
    return stars;
  };

  const handleStarPress = (value) => {
    setRating(value);
    // Animación de rebote al seleccionar estrella
    Animated.sequence([
      Animated.spring(animatedValue, {
        toValue: 1.2,
        tension: 20,
        friction: 7,
        useNativeDriver: true
      }),
      Animated.spring(animatedValue, {
        toValue: 1,
        tension: 20,
        friction: 7,
        useNativeDriver: true
      })
    ]).start();
  };

  const handleTagSelect = (tagId) => {
    if (selectedTags.includes(tagId)) {
      setSelectedTags(selectedTags.filter(id => id !== tagId));
    } else {
      setSelectedTags([...selectedTags, tagId]);
    }
  };

  const getRatingMessage = () => {
    if (rating === 0) return 'Toca para calificar';
    if (rating === 1) return '😞 Muy mal';
    if (rating === 2) return '😕 Mal';
    if (rating === 3) return '😐 Regular';
    if (rating === 4) return '😊 Bien';
    if (rating === 5) return '🤩 Excelente';
    return '';
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Calificación requerida', 'Por favor selecciona una calificación');
      return;
    }

    setIsSubmitting(true);

    try {
      // Preparar datos de calificación
      const ratingData = {
        tripId: tripData?.id || `trip_${Date.now()}`,
        driverId: driverInfo?.id || 'driver_unknown',
        driverName: driverInfo?.name || 'Conductor',
        rating: rating,
        comment: comment.trim(),
        tags: selectedTags,
        timestamp: new Date().toISOString(),
        tripDate: tripData?.date || new Date().toISOString(),
        tripRoute: {
          pickup: tripData?.pickup || 'Origen',
          dropoff: tripData?.dropoff || 'Destino'
        }
      };

      // Guardar calificación en almacenamiento local
      await saveRatingToStorage(ratingData);

      // Actualizar promedio de calificaciones del usuario
      await updateUserRatingStats(rating);

      // Si hay callback onSubmit, ejecutarlo
      if (onSubmit) {
        await onSubmit(ratingData);
      }

      // Mostrar mensaje de agradecimiento
      setShowThankYou(true);

      // Cerrar modal después de 2 segundos
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (error) {
      console.error('Error guardando calificación:', error);
      Alert.alert('Error', 'No se pudo guardar tu calificación. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveRatingToStorage = async (ratingData) => {
    try {
      // Obtener calificaciones existentes
      const existingRatings = await AsyncStorage.getItem('userRatings');
      const ratings = existingRatings ? JSON.parse(existingRatings) : [];
      
      // Agregar nueva calificación
      ratings.unshift(ratingData); // Agregar al inicio
      
      // Limitar a las últimas 50 calificaciones
      const limitedRatings = ratings.slice(0, 50);
      
      // Guardar
      await AsyncStorage.setItem('userRatings', JSON.stringify(limitedRatings));
      
    } catch (error) {
      console.error('Error saving rating:', error);
      throw error;
    }
  };

  const updateUserRatingStats = async (newRating) => {
    try {
      const statsStr = await AsyncStorage.getItem('userRatingStats');
      const stats = statsStr ? JSON.parse(statsStr) : {
        totalRatings: 0,
        sumRatings: 0,
        averageRating: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };

      // Actualizar estadísticas
      stats.totalRatings += 1;
      stats.sumRatings += newRating;
      stats.averageRating = stats.sumRatings / stats.totalRatings;
      stats.distribution[newRating] = (stats.distribution[newRating] || 0) + 1;

      // Guardar estadísticas actualizadas
      await AsyncStorage.setItem('userRatingStats', JSON.stringify(stats));
      
    } catch (error) {
      console.error('Error updating rating stats:', error);
    }
  };

  const renderThankYouMessage = () => {
    if (!showThankYou) return null;

    return (
      <Animated.View 
        style={[
          styles.thankYouContainer,
          {
            opacity: animatedValue,
            transform: [{
              scale: animatedValue
            }]
          }
        ]}
      >
        <Icon name="checkmark-circle" size={80} color="#4CAF50" />
        <Text style={styles.thankYouTitle}>¡Gracias por tu calificación!</Text>
        <Text style={styles.thankYouSubtitle}>Tu opinión nos ayuda a mejorar</Text>
      </Animated.View>
    );
  };

  const renderTagSection = () => {
    const tags = rating >= 4 ? positiveTags : rating > 0 && rating < 4 ? negativeTags : [];
    
    if (tags.length === 0 || rating === 0) return null;

    return (
      <View style={styles.tagSection}>
        <Text style={styles.tagTitle}>
          {rating >= 4 ? '¿Qué te gustó?' : '¿Qué podría mejorar?'}
        </Text>
        <View style={styles.tagContainer}>
          {tags.map(tag => (
            <TouchableOpacity
              key={tag.id}
              style={[
                styles.tag,
                selectedTags.includes(tag.id) && styles.tagSelected
              ]}
              onPress={() => handleTagSelect(tag.id)}
            >
              <Icon 
                name={tag.icon} 
                size={16} 
                color={selectedTags.includes(tag.id) ? '#FFF' : '#666'} 
              />
              <Text style={[
                styles.tagText,
                selectedTags.includes(tag.id) && styles.tagTextSelected
              ]}>
                {tag.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
        >
          <Animated.View 
            style={[
              styles.modalContent,
              {
                opacity: animatedValue,
                transform: [{
                  translateY: animatedValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0]
                  })
                }]
              }
            ]}
          >
            {showThankYou ? (
              renderThankYouMessage()
            ) : (
              <View style={{flex: 1}}>
                {/* Header */}
                <View style={styles.header}>
                  <TouchableOpacity 
                    style={styles.closeButton}
                    onPress={onClose}
                  >
                    <Icon name="close" size={24} color="#666" />
                  </TouchableOpacity>
                  <Text style={styles.title}>Califica tu viaje</Text>
                </View>

                {/* Información del conductor */}
                {driverInfo && (
                  <View style={styles.driverInfo}>
                    <View style={styles.driverAvatar}>
                      <Text style={styles.driverInitial}>
                        {driverInfo.name ? driverInfo.name.charAt(0) : 'C'}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.driverName}>{driverInfo.name || 'Conductor'}</Text>
                      <Text style={styles.driverDetails}>{driverInfo.car || 'Vehículo'}</Text>
                    </View>
                  </View>
                )}

                {/* Información del viaje */}
                {tripData && (
                  <View style={styles.tripInfo}>
                    <View style={styles.tripRoute}>
                      <View style={styles.routePoint}>
                        <Icon name="radio-button-on" size={16} color="#4CAF50" />
                        <Text style={styles.routeText} numberOfLines={1}>
                          {tripData.pickup || 'Origen'}
                        </Text>
                      </View>
                      <View style={styles.routeLine} />
                      <View style={styles.routePoint}>
                        <Icon name="location" size={16} color="#F44336" />
                        <Text style={styles.routeText} numberOfLines={1}>
                          {tripData.dropoff || 'Destino'}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Estrellas de calificación */}
                <View style={styles.ratingSection}>
                  <Text style={styles.ratingMessage}>{getRatingMessage()}</Text>
                  <View style={styles.starsContainer}>
                    {renderStars()}
                  </View>
                </View>

                {/* Tags de feedback */}
                {renderTagSection()}

                {/* Campo de comentario */}
                {rating > 0 && (
                  <View style={styles.commentSection}>
                    <Text style={styles.commentLabel}>
                      Comentario adicional (opcional)
                    </Text>
                    <TextInput
                      style={styles.commentInput}
                      placeholder="Comparte más detalles sobre tu experiencia..."
                      multiline={true}
                      numberOfLines={4}
                      value={comment}
                      onChangeText={setComment}
                      maxLength={500}
                      textAlignVertical="top"
                    />
                    <Text style={styles.characterCount}>
                      {comment.length}/500
                    </Text>
                  </View>
                )}

                {/* Botones de acción */}
                <View style={styles.actionButtons}>
                  {mode === 'history' && (
                    <TouchableOpacity 
                      style={styles.skipButton}
                      onPress={onClose}
                    >
                      <Text style={styles.skipButtonText}>Omitir</Text>
                    </TouchableOpacity>
                  )}
                  
                  <TouchableOpacity 
                    style={[
                      styles.submitButton,
                      rating === 0 && styles.submitButtonDisabled
                    ]}
                    onPress={handleSubmit}
                    disabled={rating === 0 || isSubmitting}
                  >
                    {isSubmitting ? (
                      <Text style={styles.submitButtonText}>Enviando...</Text>
                    ) : (
                      <Text style={styles.submitButtonText}>
                        Enviar calificación
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Mensaje de privacidad */}
                <Text style={styles.privacyMessage}>
                  Tu calificación es anónima y nos ayuda a mejorar el servicio
                </Text>
              </View>
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  keyboardAvoid: {
    width: '100%',
    flex: 1,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    width: '100%',
    height: '92%',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    paddingTop: 10,
    paddingHorizontal: 10,
    marginBottom: 5,
  },
  closeButton: {
    position: 'absolute',
    right: 10,
    top: 10,
    zIndex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  driverAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  driverInitial: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  driverDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  tripInfo: {
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  tripRoute: {
    backgroundColor: '#F8F9FA',
    padding: 10,
    borderRadius: 10,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: '#DDD',
    marginLeft: 7,
    marginVertical: 5,
  },
  routeText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  ratingSection: {
    alignItems: 'center',
    marginBottom: 10,
  },
  ratingMessage: {
    fontSize: 18,
    color: '#666',
    marginBottom: 10,
    fontWeight: '500',
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  starButton: {
    padding: 3,
  },
  tagSection: {
    paddingHorizontal: 10,
    marginBottom: 5,
  },
  tagTitle: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    fontWeight: '500',
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 6,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  tagSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  tagText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#666',
  },
  tagTextSelected: {
    color: '#FFF',
  },
  commentSection: {
    paddingHorizontal: 10,
    marginBottom: 5,
  },
  commentLabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 6,
    fontWeight: '500',
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    padding: 8,
    fontSize: 12,
    minHeight: 50,
    backgroundColor: '#F8F9FA',
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 5,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    marginBottom: 8,
    gap: 10,
  },
  skipButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDD',
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 2,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#CCC',
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  privacyMessage: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  thankYouContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  thankYouTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  thankYouSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default RatingSystem;