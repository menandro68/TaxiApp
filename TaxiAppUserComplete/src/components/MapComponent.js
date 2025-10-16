import React from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

const MapComponent = ({ userLocation, driverInfo, destination, showDriverLocation = false }) => {
  const santodomingo = {
    latitude: 18.5204,
    longitude: -69.8340,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  };

  const defaultUserLocation = {
    latitude: userLocation?.latitude || 18.5204,
    longitude: userLocation?.longitude || -69.8340,
  };

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={santodomingo}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={true}
        showsScale={true}
        mapType="standard"
      >
        <Marker
          coordinate={defaultUserLocation}
          title="📍 Tu ubicación"
          description="Ubicación actual"
          pinColor="#007AFF"
        />
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
});

export default MapComponent;