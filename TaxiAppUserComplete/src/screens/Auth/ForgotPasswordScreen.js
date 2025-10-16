import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { ValidationUtils } from '../../utils/ValidationUtils';

const ForgotPasswordScreen = ({ onBack, onSuccess }) => {
  const [step, setStep] = useState(1); // 1: email, 2: código, 3: nueva contraseña
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSendCode = async () => {
    if (!email) {
      setErrors({ email: 'El email es requerido' });
      return;
    }

    if (!ValidationUtils.isValidEmail(email)) {
      setErrors({ email: 'Email inválido' });
      return;
    }

    setIsLoading(true);
    setErrors({});

    // Simulación de envío
    setTimeout(() => {
      setIsLoading(false);
      Alert.alert(
        '✅ Código enviado',
        `Hemos enviado un código de 6 dígitos a ${email}`,
        [{ text: 'OK', onPress: () => setStep(2) }]
      );
    }, 1500);
  };

  const handleVerifyCode = () => {
    if (code.length !== 6) {
      setErrors({ code: 'El código debe tener 6 dígitos' });
      return;
    }

    // Simulación: código correcto es "123456"
    if (code === '123456') {
      setStep(3);
      setErrors({});
    } else {
      setErrors({ code: 'Código incorrecto' });
    }
  };

  const handleResetPassword = () => {
    const passwordValidation = ValidationUtils.isValidPassword(newPassword);
    
    if (!passwordValidation.isValid) {
      setErrors({ newPassword: 'Mínimo 6 caracteres' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrors({ confirmPassword: 'Las contraseñas no coinciden' });
      return;
    }

    setIsLoading(true);
    setErrors({});

    // Simulación de reset
    setTimeout(() => {
      setIsLoading(false);
      Alert.alert(
        '✅ Contraseña actualizada',
        'Tu contraseña ha sido cambiada exitosamente',
        [{ text: 'OK', onPress: onSuccess }]
      );
    }, 1500);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Recuperar contraseña</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Progress dots */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressDot, step >= 1 && styles.progressDotActive]} />
          <View style={[styles.progressDot, step >= 2 && styles.progressDotActive]} />
          <View style={[styles.progressDot, step >= 3 && styles.progressDotActive]} />
        </View>

        {/* Step 1: Email */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <Icon name="mail-outline" size={80} color="#007AFF" />
            <Text style={styles.title}>Ingresa tu email</Text>
            <Text style={styles.subtitle}>
              Te enviaremos un código de verificación
            </Text>

            <View style={styles.inputContainer}>
              <Icon name="mail" size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="tu@email.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleSendCode}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Enviar código</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Step 2: Código */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <Icon name="key-outline" size={80} color="#00BFA6" />
            <Text style={styles.title}>Ingresa el código</Text>
            <Text style={styles.subtitle}>
              Enviado a {email}
            </Text>

            <View style={styles.inputContainer}>
              <Icon name="lock-closed" size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.codeInput, errors.code && styles.inputError]}
                placeholder="123456"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
            </View>
            {errors.code && <Text style={styles.errorText}>{errors.code}</Text>}

            <TouchableOpacity
              style={styles.button}
              onPress={handleVerifyCode}
            >
              <Text style={styles.buttonText}>Verificar código</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => handleSendCode()} style={styles.resendButton}>
              <Text style={styles.resendText}>Reenviar código</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 3: Nueva contraseña */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            <Icon name="shield-checkmark-outline" size={80} color="#4ECDC4" />
            <Text style={styles.title}>Nueva contraseña</Text>
            <Text style={styles.subtitle}>
              Crea una contraseña segura
            </Text>

            <View style={styles.inputContainer}>
              <Icon name="lock-closed" size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, errors.newPassword && styles.inputError]}
                placeholder="Nueva contraseña"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>
            {errors.newPassword && <Text style={styles.errorText}>{errors.newPassword}</Text>}

            <View style={styles.inputContainer}>
              <Icon name="lock-closed" size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, errors.confirmPassword && styles.inputError]}
                placeholder="Confirmar contraseña"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>
            {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleResetPassword}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Cambiar contraseña</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    color: '#333',
  },
  headerSpacer: {
    width: 34,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 20,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 5,
  },
  progressDotActive: {
    backgroundColor: '#007AFF',
    width: 30,
  },
  stepContainer: {
    flex: 1,
    alignItems: 'center',
    padding: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 15,
  },
  inputIcon: {
    position: 'absolute',
    left: 15,
    zIndex: 1,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    padding: 15,
    paddingLeft: 45,
    fontSize: 16,
    backgroundColor: '#F8F9FA',
  },
  codeInput: {
    textAlign: 'center',
    fontSize: 24,
    letterSpacing: 5,
    fontWeight: 'bold',
  },
  inputError: {
    borderColor: '#FF3B30',
    borderWidth: 2,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginTop: -10,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: '#CCC',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resendButton: {
    marginTop: 20,
    padding: 10,
  },
  resendText: {
    color: '#007AFF',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});

export default ForgotPasswordScreen;