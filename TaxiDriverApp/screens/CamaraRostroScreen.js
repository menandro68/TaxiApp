import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import ImageResizer from '@bam.tech/react-native-image-resizer';

const { width, height } = Dimensions.get('window');
const GUIA = width * 0.68;

const CamaraRostroScreen = ({ onCapturar, onCancelar }) => {
  const camaraRef = useRef(null);
  const dispositivo = useCameraDevice('front');
  const [permiso, setPermiso] = useState(false);
  const [tomando, setTomando] = useState(false);

  useEffect(() => {
    (async () => {
      const estado = await Camera.requestCameraPermission();
      setPermiso(estado === 'granted');
    })();
  }, []);

  const capturar = async () => {
    if (!camaraRef.current || tomando) return;
    setTomando(true);
    try {
          const foto = await camaraRef.current.takePhoto({ flash: 'off' });
      const ruta = 'file://' + foto.path;

      // Recortar exactamente el area de la guia rosa
      const anchoFoto = foto.width;
      const altoFoto = foto.height;

      // La guia ocupa el 68% del ancho de pantalla, con proporcion 1:1.25
      const anchoRecorte = Math.round(anchoFoto * 0.68);
      const altoRecorte = Math.round(anchoRecorte * 1.25);

      const x = Math.round((anchoFoto - anchoRecorte) / 2);
      // La guia esta 5% mas arriba del centro
      const y = Math.max(0, Math.round((altoFoto - altoRecorte) / 2 - altoFoto * 0.05));

      const recortada = await ImageResizer.createResizedImage(
        ruta,
        anchoRecorte,
        altoRecorte,
        'JPEG',
        90,
        0,
        undefined,
        false,
        { mode: 'cover', onlyScaleDown: false, crop: { left: x, top: y, width: anchoRecorte, height: Math.min(altoRecorte, altoFoto - y) } }
      );

      onCapturar(recortada.uri);
    } catch (e) {
      console.log('Error al capturar:', e?.message);
    } finally {
      setTomando(false);
    }
  };

  if (!permiso || !dispositivo) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.textoEspera}>
          {!permiso ? 'Se requiere permiso de camara' : 'Preparando camara...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.contenedor}>
      <Camera
        ref={camaraRef}
        style={StyleSheet.absoluteFill}
        device={dispositivo}
        isActive={true}
        photo={true}
      />

      <View style={styles.marco} pointerEvents="none">
        <View style={styles.guia} />
      </View>

      <View style={styles.instruccion} pointerEvents="none">
        <Text style={styles.textoInstruccion}>
          Coloque su rostro dentro del recuadro
        </Text>
      </View>

      <View style={styles.controles}>
        <TouchableOpacity style={styles.cancelar} onPress={onCancelar}>
          <Text style={styles.textoCancelar}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.disparador} onPress={capturar} disabled={tomando} />
        <View style={{ width: 80 }} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#000' },
  centro: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  textoEspera: { color: '#fff', marginTop: 16, fontSize: 15 },
  marco: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  guia: {
    width: GUIA,
    height: GUIA * 1.25,
    borderWidth: 3,
    borderColor: '#E91E63',
    borderRadius: 12,
    marginTop: -height * 0.05,
  },
  instruccion: { position: 'absolute', top: height * 0.1, width: '100%', alignItems: 'center' },
  textoInstruccion: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  controles: {
    position: 'absolute',
    bottom: 40,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  cancelar: { width: 80, alignItems: 'center' },
  textoCancelar: { color: '#fff', fontSize: 16 },
  disparador: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#fff',
    borderWidth: 5,
    borderColor: 'rgba(255,255,255,0.4)',
  },
});

export default CamaraRostroScreen;