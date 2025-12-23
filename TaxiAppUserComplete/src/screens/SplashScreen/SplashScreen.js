import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';

const { width, height } = Dimensions.get('window');

const SplashScreen = ({ onAnimationComplete }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const dotAnim1 = useRef(new Animated.Value(0)).current;
  const dotAnim2 = useRef(new Animated.Value(0)).current;
  const dotAnim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animacion de los puntos de carga
    const dotAnimation = (anim, delay) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
    };

    dotAnimation(dotAnim1, 0).start();
    dotAnimation(dotAnim2, 200).start();
    dotAnimation(dotAnim3, 400).start();

    // Animacion principal
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 20,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(slideUpAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.delay(1800),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onAnimationComplete) {
        onAnimationComplete();
      }
    });
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#87CEEB" barStyle="dark-content" translucent={false} />
      
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>Squid</Text>
        </View>

        <Animated.View
          style={[
            styles.taglineContainer,
            {
              transform: [{ translateY: slideUpAnim }],
            },
          ]}
        >
          <Text style={styles.tagline}>Tu app dominicana</Text>
        </Animated.View>
      </Animated.View>

      <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
        <View style={styles.loadingContainer}>
          <Animated.View
            style={[
              styles.dot,
              {
                opacity: dotAnim1.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.3, 1],
                }),
                transform: [{
                  scale: dotAnim1.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.3],
                  }),
                }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.dot,
              {
                opacity: dotAnim2.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.3, 1],
                }),
                transform: [{
                  scale: dotAnim2.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.3],
                  }),
                }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.dot,
              {
                opacity: dotAnim3.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.3, 1],
                }),
                transform: [{
                  scale: dotAnim3.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.3],
                  }),
                }],
              },
            ]}
          />
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#87CEEB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 15,
  },
  logoText: {
    fontSize: 72,
    fontWeight: '800',
    color: '#1a1a2e',
    letterSpacing: 3,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  taglineContainer: {
    alignItems: 'center',
  },
  tagline: {
    fontSize: 18,
    color: '#2c3e50',
    fontWeight: '600',
    letterSpacing: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 100,
    alignItems: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1a1a2e',
    marginHorizontal: 6,
  },
});

export default SplashScreen;
