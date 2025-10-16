import React, { Component } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView
} from 'react-native';
import ErrorLogger from './ErrorLogger';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Registrar el error
    ErrorLogger.logError(error, {
      component: errorInfo.componentStack,
      action: 'Component Error Boundary',
      errorBoundary: true
    });

    // Actualizar estado con información del error
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.header}>
              <Text style={styles.emoji}>😔</Text>
              <Text style={styles.title}>¡Ups! Algo salió mal</Text>
              <Text style={styles.subtitle}>
                La aplicación encontró un error inesperado
              </Text>
            </View>

            {__DEV__ && (
              <View style={styles.errorDetails}>
                <Text style={styles.errorTitle}>Detalles del error:</Text>
                <Text style={styles.errorMessage}>
                  {this.state.error && this.state.error.toString()}
                </Text>
                <ScrollView style={styles.stackContainer}>
                  <Text style={styles.stackTrace}>
                    {this.state.errorInfo && this.state.errorInfo.componentStack}
                  </Text>
                </ScrollView>
              </View>
            )}

            <View style={styles.actions}>
              <TouchableOpacity 
                style={styles.button}
                onPress={this.resetError}
              >
                <Text style={styles.buttonText}>Reintentar</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.button, styles.secondaryButton]}
                onPress={() => {
                  this.resetError();
                  // Navegar al inicio si es necesario
                }}
              >
                <Text style={styles.secondaryButtonText}>Ir al inicio</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.errorCount}>
              Errores en esta sesión: {this.state.errorCount}
            </Text>
          </ScrollView>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  emoji: {
    fontSize: 60,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorDetails: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#d32f2f',
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  stackContainer: {
    maxHeight: 200,
  },
  stackTrace: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'monospace',
  },
  actions: {
    marginTop: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#f0f0f0',
  },
  secondaryButtonText: {
    color: '#333',
    fontSize: 16,
  },
  errorCount: {
    textAlign: 'center',
    color: '#999',
    marginTop: 20,
    fontSize: 12,
  },
});

export default ErrorBoundary;