import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MapView, { Marker, Polyline } from 'react-native-maps';

const { width } = Dimensions.get('window');

const MultipleStopsManager = ({ 
  stops = [], 
  currentStopIndex = 0,
  onStopCompleted,
  onNavigateToStop,
  tripStatus
}) => {
  const [expandedView, setExpandedView] = useState(false);
  const [completedStops, setCompletedStops] = useState([]);
  
  // Formatear las paradas para mostrar
  const getAllStops = () => {
    const allStops = [];
    
    // Agregar punto de recogida
    if (stops.pickup) {
      allStops.push({
        id: 'pickup',
        type: 'pickup',
        address: stops.pickup.address || 'Punto de recogida',
        coordinates: stops.pickup.coordinates,
        completed: tripStatus === 'in_progress'
      });
    }
    
    // Agregar paradas adicionales si existen
    if (stops.additionalStops && stops.additionalStops.length > 0) {
      stops.additionalStops.forEach((stop, index) => {
        allStops.push({
          id: `stop_${index}`,
          type: 'intermediate',
          address: stop.address,
          coordinates: stop.coordinates,
          stopNumber: index + 1,
          completed: completedStops.includes(`stop_${index}`)
        });
      });
    }
    
    // Agregar destino final
    if (stops.destination) {
      allStops.push({
        id: 'destination',
        type: 'destination',
        address: stops.destination.address || 'Destino final',
        coordinates: stops.destination.coordinates,
        completed: false
      });
    }
    
    return allStops;
  };

  const handleStopCompleted = (stopId) => {
    Alert.alert(
      'Completar Parada',
      '¿Has completado esta parada?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Sí, Completada', 
          onPress: () => {
            setCompletedStops([...completedStops, stopId]);
            if (onStopCompleted) {
              onStopCompleted(stopId);
            }
          }
        }
      ]
    );
  };

  const handleNavigateToStop = (stop) => {
    if (onNavigateToStop) {
      onNavigateToStop(stop);
    }
  };

  const getStopIcon = (type, completed) => {
    if (completed) return 'check-circle';
    switch(type) {
      case 'pickup': return 'person-pin';
      case 'intermediate': return 'place';
      case 'destination': return 'flag';
      default: return 'place';
    }
  };

  const getStopColor = (type, completed, isCurrent) => {
    if (completed) return '#4CAF50';
    if (isCurrent) return '#2196F3';
    switch(type) {
      case 'pickup': return '#4CAF50';
      case 'intermediate': return '#FF9800';
      case 'destination': return '#F44336';
      default: return '#757575';
    }
  };

  const allStops = getAllStops();
  const currentStop = allStops[currentStopIndex];
  const remainingStops = allStops.filter(s => !s.completed).length;

  return (
    <View style={styles.container}>
      {/* Vista compacta - Parada actual */}
      <TouchableOpacity 
        style={styles.currentStopCard}
        onPress={() => setExpandedView(!expandedView)}
        activeOpacity={0.9}
      >
        <View style={styles.currentStopHeader}>
          <View style={styles.currentStopInfo}>
            <Text style={styles.currentStopLabel}>
              {currentStop?.type === 'pickup' ? 'RECOGER EN:' : 
               currentStop?.type === 'destination' ? 'DESTINO FINAL:' : 
               `PARADA ${currentStop?.stopNumber}:`}
            </Text>
            <Text style={styles.currentStopAddress} numberOfLines={2}>
              {currentStop?.address}
            </Text>
          </View>
          
          <View style={styles.currentStopActions}>
            {remainingStops > 1 && (
              <View style={styles.remainingBadge}>
                <Text style={styles.remainingText}>{remainingStops - 1} más</Text>
              </View>
            )}
            <Icon 
              name={expandedView ? 'expand-less' : 'expand-more'} 
              size={28} 
              color="#666"
            />
          </View>
        </View>

        {/* Botones de acción para la parada actual */}
        {!expandedView && currentStop && !currentStop.completed && (
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.navigateButton}
              onPress={() => handleNavigateToStop(currentStop)}
            >
              <Icon name="navigation" size={20} color="#fff" />
              <Text style={styles.buttonText}>Navegar</Text>
            </TouchableOpacity>
            
            {currentStop.type !== 'pickup' && (
              <TouchableOpacity 
                style={styles.completeButton}
                onPress={() => handleStopCompleted(currentStop.id)}
              >
                <Icon name="check" size={20} color="#fff" />
                <Text style={styles.buttonText}>Completar</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>

      {/* Vista expandida - Todas las paradas */}
      {expandedView && (
        <ScrollView style={styles.expandedView} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Ruta completa del viaje</Text>
          
          {allStops.map((stop, index) => {
            const isCurrent = index === currentStopIndex;
            const isCompleted = stop.completed;
            
            return (
              <View key={stop.id}>
                {/* Línea conectora */}
                {index > 0 && (
                  <View style={styles.connector}>
                    <View style={[
                      styles.connectorLine,
                      isCompleted && styles.connectorLineCompleted
                    ]} />
                  </View>
                )}
                
                {/* Tarjeta de parada */}
                <TouchableOpacity
                  style={[
                    styles.stopCard,
                    isCurrent && styles.stopCardCurrent,
                    isCompleted && styles.stopCardCompleted
                  ]}
                  onPress={() => !isCompleted && handleNavigateToStop(stop)}
                  disabled={isCompleted}
                  activeOpacity={0.8}
                >
                  <View style={[
                    styles.stopIcon,
                    { backgroundColor: getStopColor(stop.type, isCompleted, isCurrent) }
                  ]}>
                    <Icon 
                      name={getStopIcon(stop.type, isCompleted)} 
                      size={24} 
                      color="#fff" 
                    />
                  </View>
                  
                  <View style={styles.stopInfo}>
                    <View style={styles.stopHeader}>
                      <Text style={[
                        styles.stopType,
                        isCompleted && styles.textCompleted
                      ]}>
                        {stop.type === 'pickup' ? 'Punto de recogida' :
                         stop.type === 'destination' ? 'Destino final' :
                         `Parada ${stop.stopNumber}`}
                      </Text>
                      {isCurrent && !isCompleted && (
                        <View style={styles.currentBadge}>
                          <Text style={styles.currentBadgeText}>ACTUAL</Text>
                        </View>
                      )}
                      {isCompleted && (
                        <Icon name="check-circle" size={20} color="#4CAF50" />
                      )}
                    </View>
                    
                    <Text style={[
                      styles.stopAddress,
                      isCompleted && styles.textCompleted
                    ]} numberOfLines={2}>
                      {stop.address}
                    </Text>
                    
                    {!isCompleted && isCurrent && (
                      <View style={styles.stopActions}>
                        <TouchableOpacity 
                          style={styles.miniButton}
                          onPress={() => handleNavigateToStop(stop)}
                        >
                          <Icon name="navigation" size={16} color="#2196F3" />
                          <Text style={styles.miniButtonText}>Navegar</Text>
                        </TouchableOpacity>
                        
                        {stop.type !== 'pickup' && (
                          <TouchableOpacity 
                            style={[styles.miniButton, styles.miniButtonComplete]}
                            onPress={() => handleStopCompleted(stop.id)}
                          >
                            <Icon name="check" size={16} color="#4CAF50" />
                            <Text style={[styles.miniButtonText, { color: '#4CAF50' }]}>
                              Marcar completada
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            );
          })}
          
          {/* Resumen del progreso */}
          <View style={styles.progressSummary}>
            <Text style={styles.progressText}>
              Progreso: {completedStops.length + (tripStatus === 'in_progress' ? 1 : 0)} de {allStops.length} paradas
            </Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill,
                  { 
                    width: `${((completedStops.length + (tripStatus === 'in_progress' ? 1 : 0)) / allStops.length) * 100}%` 
                  }
                ]}
              />
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    maxHeight: '70%',
  },
  currentStopCard: {
    padding: 15,
  },
  currentStopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  currentStopInfo: {
    flex: 1,
    marginRight: 10,
  },
  currentStopLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  currentStopAddress: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  currentStopActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  remainingBadge: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  remainingText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 10,
  },
  navigateButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#2196F3',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  expandedView: {
    maxHeight: 400,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 15,
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 15,
  },
  connector: {
    alignItems: 'center',
    marginVertical: -2,
  },
  connectorLine: {
    width: 2,
    height: 30,
    backgroundColor: '#E0E0E0',
  },
  connectorLineCompleted: {
    backgroundColor: '#4CAF50',
  },
  stopCard: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginBottom: 4,
  },
  stopCardCurrent: {
    backgroundColor: '#E3F2FD',
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  stopCardCompleted: {
    opacity: 0.7,
  },
  stopIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stopInfo: {
    flex: 1,
  },
  stopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  stopType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
  },
  stopAddress: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  textCompleted: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  currentBadge: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  currentBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  stopActions: {
    flexDirection: 'row',
    gap: 8,
  },
  miniButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  miniButtonComplete: {
    borderColor: '#4CAF50',
  },
  miniButtonText: {
    fontSize: 12,
    color: '#2196F3',
    marginLeft: 4,
  },
  progressSummary: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
});

export default MultipleStopsManager;