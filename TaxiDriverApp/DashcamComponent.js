import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  PermissionsAndroid,
  AppState
} from 'react-native';
import { Camera, useCameraDevices, useFrameProcessor } from 'react-native-vision-camera';
import RNFS from 'react-native-fs';

const DashcamComponent = ({ isActive, tripId, onIncidentSaved }) => {
  const [hasPermission, setHasPermission] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [bufferSize, setBufferSize] = useState(0);
  
  const camera = useRef(null);
  const devices = useCameraDevices();
  const device = devices.front;
  const recordingTimer = useRef(null);
  const videoBuffer = useRef([]);
  const currentRecording = useRef(null);

  // Configuración
  const BUFFER_DURATION = 300; // 5 minutos en segundos
  const INCIDENT_SAVE_DURATION = 120; // Últimos 2 minutos
  const VIDEO_QUALITY = '720p';
  const MAX_STORAGE_MB = 500; // Máximo espacio a usar

  useEffect(() => {
    requestCameraPermission();
    setupVideoDirectory();
    
    return () => {
      stopRecording();
      clearBuffer();
    };
  }, []);

  useEffect(() => {
    if (isActive && hasPermission && device) {
      startBufferRecording();
    } else {
      stopRecording();
    }
  }, [isActive, hasPermission, device]);

  const requestCameraPermission = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Permiso de Cámara',
            message: 'La dashcam necesita acceso a la cámara para grabar el viaje',
            buttonNeutral: 'Preguntar después',
            buttonNegative: 'Cancelar',
            buttonPositive: 'OK',
          }
        );
        setHasPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
      } else {
        const status = await Camera.requestCameraPermission();
        setHasPermission(status === 'authorized');
      }
    } catch (error) {
      console.error('Error solicitando permisos:', error);
    }
  };

  const setupVideoDirectory = async () => {
    const dashcamDir = `${RNFS.DocumentDirectoryPath}/dashcam`;
    try {
      const exists = await RNFS.exists(dashcamDir);
      if (!exists) {
        await RNFS.mkdir(dashcamDir);
      }
      // Limpiar videos antiguos
      await cleanOldVideos();
    } catch (error) {
      console.error('Error configurando directorio:', error);
    }
  };

  const cleanOldVideos = async () => {
    try {
      const dashcamDir = `${RNFS.DocumentDirectoryPath}/dashcam`;
      const files = await RNFS.readDir(dashcamDir);
      const now = Date.now();
      const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
      
      for (const file of files) {
        if (file.mtime < oneWeekAgo) {
          await RNFS.unlink(file.path);
        }
      }
    } catch (error) {
      console.error('Error limpiando videos antiguos:', error);
    }
  };

  const startBufferRecording = async () => {
    if (!camera.current || isRecording) return;
    
    try {
      setIsRecording(true);
      
      // Configuración de grabación con buffer circular
      const timestamp = Date.now();
      const videoPath = `${RNFS.DocumentDirectoryPath}/dashcam/buffer_${timestamp}.mp4`;
      
      currentRecording.current = await camera.current.startRecording({
        onRecordingFinished: (video) => {
          handleRecordingFinished(video);
        },
        onRecordingError: (error) => {
          console.error('Error grabando:', error);
          setIsRecording(false);
        },
        fileType: 'mp4',
        path: videoPath,
        videoBitRate: 'normal',
        videoCodec: 'h264',
      });
      
      // Iniciar timer de duración
      recordingTimer.current = setInterval(() => {
        setRecordingDuration(prev => {
          const newDuration = prev + 1;
          
          // Reiniciar grabación cada 30 segundos para mantener buffer
          if (newDuration % 30 === 0) {
            rotateBufferRecording();
          }
          
          return newDuration;
        });
      }, 1000);
      
    } catch (error) {
      console.error('Error iniciando grabación:', error);
      setIsRecording(false);
    }
  };

  const rotateBufferRecording = async () => {
    if (!camera.current || !isRecording) return;
    
    try {
      // Detener grabación actual
      await camera.current.stopRecording();
      
      // Iniciar nueva grabación inmediatamente
      setTimeout(() => {
        startBufferRecording();
      }, 100);
      
    } catch (error) {
      console.error('Error rotando buffer:', error);
    }
  };

  const handleRecordingFinished = async (video) => {
    try {
      // Agregar video al buffer
      videoBuffer.current.push({
        path: video.path,
        timestamp: Date.now(),
        duration: 30 // segundos
      });
      
      // Mantener solo los últimos 10 clips (5 minutos)
      if (videoBuffer.current.length > 10) {
        const oldVideo = videoBuffer.current.shift();
        // Eliminar video antiguo
        await RNFS.unlink(oldVideo.path).catch(() => {});
      }
      
      // Actualizar tamaño del buffer
      updateBufferSize();
      
    } catch (error) {
      console.error('Error manejando video terminado:', error);
    }
  };

  const updateBufferSize = async () => {
    let totalSize = 0;
    for (const video of videoBuffer.current) {
      try {
        const stat = await RNFS.stat(video.path);
        totalSize += stat.size;
      } catch (error) {
        // Video no existe, remover del buffer
        videoBuffer.current = videoBuffer.current.filter(v => v.path !== video.path);
      }
    }
    setBufferSize(Math.round(totalSize / (1024 * 1024))); // MB
  };

  const stopRecording = async () => {
    try {
      if (camera.current && isRecording) {
        await camera.current.stopRecording();
      }
      
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
        recordingTimer.current = null;
      }
      
      setIsRecording(false);
      setRecordingDuration(0);
    } catch (error) {
      console.error('Error deteniendo grabación:', error);
    }
  };

  const saveIncident = async () => {
    try {
      if (videoBuffer.current.length === 0) {
        Alert.alert('Sin Video', 'No hay video disponible para guardar');
        return;
      }
      
      // Detener grabación actual si está activa
      if (isRecording) {
        await stopRecording();
      }
      
      // Crear carpeta de incidente
      const incidentId = `incident_${tripId}_${Date.now()}`;
      const incidentDir = `${RNFS.DocumentDirectoryPath}/dashcam/incidents/${incidentId}`;
      await RNFS.mkdir(incidentDir);
      
      // Copiar últimos 4 clips (2 minutos) a carpeta de incidente
      const clipsToSave = videoBuffer.current.slice(-4);
      const savedPaths = [];
      
      for (let i = 0; i < clipsToSave.length; i++) {
        const clip = clipsToSave[i];
        const newPath = `${incidentDir}/clip_${i + 1}.mp4`;
        await RNFS.copyFile(clip.path, newPath);
        savedPaths.push(newPath);
      }
      
      // Crear archivo de metadata
      const metadata = {
        incidentId,
        tripId,
        timestamp: new Date().toISOString(),
        clips: savedPaths,
        duration: clipsToSave.length * 30,
        location: null // Aquí podrías agregar GPS
      };
      
      await RNFS.writeFile(
        `${incidentDir}/metadata.json`,
        JSON.stringify(metadata, null, 2),
        'utf8'
      );
      
      Alert.alert(
        '✅ Incidente Guardado',
        `Se guardaron los últimos ${clipsToSave.length * 30} segundos de video`,
        [
          { text: 'OK', onPress: () => {
            if (onIncidentSaved) {
              onIncidentSaved(metadata);
            }
          }}
        ]
      );
      
      // Reiniciar grabación
      if (isActive) {
        setTimeout(() => startBufferRecording(), 1000);
      }
      
    } catch (error) {
      console.error('Error guardando incidente:', error);
      Alert.alert('Error', 'No se pudo guardar el incidente');
    }
  };

  const clearBuffer = async () => {
    try {
      for (const video of videoBuffer.current) {
        await RNFS.unlink(video.path).catch(() => {});
      }
      videoBuffer.current = [];
      setBufferSize(0);
    } catch (error) {
      console.error('Error limpiando buffer:', error);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Se requiere permiso de cámara</Text>
        <TouchableOpacity style={styles.button} onPress={requestCameraPermission}>
          <Text style={styles.buttonText}>Conceder Permiso</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No se encontró cámara</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.cameraContainer}>
        <Camera
          ref={camera}
          style={styles.camera}
          device={device}
          isActive={isActive}
          video={true}
          audio={false}
          fps={30}
        />
        
        {/* Overlay de información */}
        <View style={styles.overlay}>
          <View style={styles.infoBar}>
            <View style={styles.recordingIndicator}>
              {isRecording && (
                <>
                  <View style={styles.recordingDot} />
                  <Text style={styles.recordingText}>REC</Text>
                </>
              )}
            </View>
            
            <Text style={styles.durationText}>
              {formatDuration(recordingDuration)}
            </Text>
            
            <Text style={styles.bufferText}>
              Buffer: {bufferSize}MB
            </Text>
          </View>
        </View>
      </View>
      
      {/* Botón de Incidente */}
      <TouchableOpacity 
        style={[styles.incidentButton, !isRecording && styles.incidentButtonDisabled]}
        onPress={saveIncident}
        disabled={!isRecording}
      >
        <Text style={styles.incidentButtonText}>
          🚨 GUARDAR INCIDENTE
        </Text>
        <Text style={styles.incidentButtonSubtext}>
          Guarda los últimos 2 minutos
        </Text>
      </TouchableOpacity>
      
      {/* Estado de la dashcam */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          {isRecording ? '🟢 Grabando' : '⭕ Detenido'}
        </Text>
        <Text style={styles.statusSubtext}>
          {videoBuffer.current.length * 30} segundos en buffer
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 15,
    overflow: 'hidden',
    margin: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  cameraContainer: {
    height: 200,
    backgroundColor: 'black',
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 10,
  },
  infoBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    borderRadius: 8,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
    marginRight: 5,
    animation: 'pulse 1.5s infinite',
  },
  recordingText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  durationText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  bufferText: {
    color: 'white',
    fontSize: 12,
  },
  incidentButton: {
    backgroundColor: '#ef4444',
    padding: 15,
    alignItems: 'center',
    margin: 15,
    borderRadius: 10,
  },
  incidentButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  incidentButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  incidentButtonSubtext: {
    color: 'white',
    fontSize: 12,
    marginTop: 5,
  },
  statusContainer: {
    padding: 15,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statusSubtext: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 5,
  },
  errorText: {
    textAlign: 'center',
    padding: 20,
    color: '#ef4444',
  },
  button: {
    backgroundColor: '#3b82f6',
    padding: 12,
    margin: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default DashcamComponent;