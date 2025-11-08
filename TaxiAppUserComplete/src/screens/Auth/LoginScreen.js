import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import ApiService from '../../services/ApiService';

const LoginScreen = ({ navigation }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  // LOGIN FIELDS
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginPasswordVisible, setLoginPasswordVisible] = useState(false);

  // REGISTER FIELDS
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerPasswordVisible, setRegisterPasswordVisible] = useState(false);

  // VALIDACIÓN DE EMAIL
  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  // VALIDACIÓN DE TELÉFONO
  const validatePhone = (phone) => {
    return phone.replace(/\D/g, '').length >= 10;
  };

  // LOGIN HANDLER
  const handleLogin = async () => {
    if (!loginEmail.trim() || !loginPassword.trim()) {
      Alert.alert('❌ Error', 'Por favor completa todos los campos');
      return;
    }

    if (!validateEmail(loginEmail)) {
      Alert.alert('❌ Email inválido', 'Por favor ingresa un email válido');
      return;
    }

    if (loginPassword.length < 6) {
      Alert.alert('❌ Contraseña inválida', 'La contraseña debe tener mínimo 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      console.log('🔐 [LOGIN] Intentando iniciar sesión...');
      const response = await ApiService.login({
        email: loginEmail.trim(),
        password: loginPassword,
      });

      console.log('✅ [LOGIN] Respuesta del servidor:', response);

      if (response && response.success) {
        Alert.alert('✅ Éxito', 'Sesión iniciada correctamente');
        // Navegar a la pantalla principal
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
      } else {
        Alert.alert('❌ Error', response?.error || 'No se pudo iniciar sesión');
      }
    } catch (error) {
      console.error('❌ [LOGIN] Error:', error.message);
      Alert.alert('❌ Error', error.message || 'Hubo un error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  // REGISTER HANDLER
  const handleRegister = async () => {
    if (!registerName.trim() || !registerEmail.trim() || !registerPhone.trim() || !registerPassword.trim()) {
      Alert.alert('❌ Error', 'Por favor completa todos los campos');
      return;
    }

    if (!validateEmail(registerEmail)) {
      Alert.alert('❌ Email inválido', 'Por favor ingresa un email válido');
      return;
    }

    if (!validatePhone(registerPhone)) {
      Alert.alert('❌ Teléfono inválido', 'Por favor ingresa un teléfono válido (mínimo 10 dígitos)');
      return;
    }

    if (registerPassword.length < 6) {
      Alert.alert('❌ Contraseña débil', 'La contraseña debe tener mínimo 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      console.log('📝 [REGISTRO] Intentando registrarse...');
      const response = await ApiService.register({
        name: registerName.trim(),
        email: registerEmail.trim(),
        phone: registerPhone.trim(),
        password: registerPassword,
      });

      console.log('✅ [REGISTRO] Respuesta del servidor:', response);

      if (response && response.success) {
        Alert.alert('✅ ¡Éxito!', 'Cuenta creada correctamente. Inicia sesión ahora.');
        // Limpiar campos y volver a login
        setRegisterName('');
        setRegisterEmail('');
        setRegisterPhone('');
        setRegisterPassword('');
        setIsLogin(true);
      } else {
        Alert.alert('❌ Error', response?.error || 'No se pudo crear la cuenta');
      }
    } catch (error) {
      console.error('❌ [REGISTRO] Error:', error.message);
      Alert.alert('❌ Error', error.message || 'Hubo un error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={styles.header}>
          <Icon name="car" size={60} color="#0066FF" />
          <Text style={styles.title}>TaxiApp</Text>
          <Text style={styles.subtitle}>
            {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </Text>
        </View>

        {/* FORMULARIO LOGIN */}
        {isLogin ? (
          <View style={styles.form}>
            {/* EMAIL */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputContainer}>
                <Icon name="mail" size={20} color="#0066FF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="tu@email.com"
                  value={loginEmail}
                  onChangeText={setLoginEmail}
                  editable={!loading}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* PASSWORD */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contraseña</Text>
              <View style={styles.inputContainer}>
                <Icon name="lock-closed" size={20} color="#0066FF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Mínimo 6 caracteres"
                  value={loginPassword}
                  onChangeText={setLoginPassword}
                  editable={!loading}
                  secureTextEntry={!loginPasswordVisible}
                />
                <TouchableOpacity onPress={() => setLoginPasswordVisible(!loginPasswordVisible)}>
                  <Icon
                    name={loginPasswordVisible ? 'eye' : 'eye-off'}
                    size={20}
                    color="#0066FF"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* FORGOT PASSWORD */}
            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword')}
              disabled={loading}
            >
              <Text style={styles.forgotPassword}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>

            {/* LOGIN BUTTON */}
            <TouchableOpacity
              style={[styles.button, styles.loginButton, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" size="large" />
              ) : (
                <Text style={styles.buttonText}>Iniciar Sesión</Text>
              )}
            </TouchableOpacity>

            {/* SWITCH TO REGISTER */}
            <View style={styles.switchContainer}>
              <Text style={styles.switchText}>¿No tienes cuenta? </Text>
              <TouchableOpacity onPress={() => setIsLogin(false)} disabled={loading}>
                <Text style={styles.switchLink}>Crear cuenta</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* FORMULARIO REGISTER */
          <View style={styles.form}>
            {/* NAME */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nombre Completo</Text>
              <View style={styles.inputContainer}>
                <Icon name="person" size={20} color="#0066FF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Tu nombre"
                  value={registerName}
                  onChangeText={setRegisterName}
                  editable={!loading}
                />
              </View>
            </View>

            {/* EMAIL */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputContainer}>
                <Icon name="mail" size={20} color="#0066FF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="tu@email.com"
                  value={registerEmail}
                  onChangeText={setRegisterEmail}
                  editable={!loading}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* PHONE */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Teléfono</Text>
              <View style={styles.inputContainer}>
                <Icon name="call" size={20} color="#0066FF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="809-XXX-XXXX"
                  value={registerPhone}
                  onChangeText={setRegisterPhone}
                  editable={!loading}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* PASSWORD */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contraseña</Text>
              <View style={styles.inputContainer}>
                <Icon name="lock-closed" size={20} color="#0066FF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Mínimo 6 caracteres"
                  value={registerPassword}
                  onChangeText={setRegisterPassword}
                  editable={!loading}
                  secureTextEntry={!registerPasswordVisible}
                />
                <TouchableOpacity onPress={() => setRegisterPasswordVisible(!registerPasswordVisible)}>
                  <Icon
                    name={registerPasswordVisible ? 'eye' : 'eye-off'}
                    size={20}
                    color="#0066FF"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* REGISTER BUTTON */}
            <TouchableOpacity
              style={[styles.button, styles.registerButton, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" size="large" />
              ) : (
                <Text style={styles.buttonText}>Crear Cuenta</Text>
              )}
            </TouchableOpacity>

            {/* SWITCH TO LOGIN */}
            <View style={styles.switchContainer}>
              <Text style={styles.switchText}>¿Ya tienes cuenta? </Text>
              <TouchableOpacity onPress={() => setIsLogin(true)} disabled={loading}>
                <Text style={styles.switchLink}>Iniciar sesión</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#0066FF',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  form: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
  },
  forgotPassword: {
    color: '#0066FF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'right',
  },
  button: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  loginButton: {
    backgroundColor: '#0066FF',
  },
  registerButton: {
    backgroundColor: '#00CC88',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  switchText: {
    color: '#666',
    fontSize: 14,
  },
  switchLink: {
    color: '#0066FF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default LoginScreen;