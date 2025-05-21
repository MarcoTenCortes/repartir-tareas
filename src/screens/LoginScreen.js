// src/screens/LoginScreen.js
import React, { useState, useContext } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Text,
  // Image, // Si no se usa, se puede quitar
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import { UserContext } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen({ navigation }) {
  const { user, login, logout } = useContext(UserContext);
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  if (user) {
    // ... (código para usuario logueado sin cambios)
    return (
      <View style={styles.container}>
        <Animatable.View animation="fadeInDown" duration={800} style={styles.loggedInContainer}>
          <Ionicons name="checkmark-circle-outline" size={80} color={theme.success} />
          <Text style={styles.title}>¡Bienvenido de nuevo!</Text>
          <Text style={styles.info}>Sesión iniciada como {user.name}</Text>
          <TouchableOpacity style={styles.buttonPrimary} onPress={logout}>
            <Text style={styles.buttonTextPrimary}>Cerrar sesión</Text>
          </TouchableOpacity>
        </Animatable.View>
      </View>
    );
  }

  const handleLogin = async () => {
    // ... (lógica de handleLogin sin cambios)
    if (!email.trim() || !password) {
      Alert.alert('Campos incompletos', 'Por favor, introduce tu email y contraseña.');
      return;
    }
    try {
      await login(email.trim(), password);
    } catch (err) {
      Alert.alert('Error de inicio de sesión', err.message || 'No se pudo iniciar sesión. Verifica tus credenciales.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.keyboardAvoidingContainer}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Animatable.View animation="fadeInDown" duration={600} style={styles.logoContainer}>
          <Ionicons name="people-circle-outline" size={100} color={theme.primary} />
          <Text style={styles.appName}>CompartePiso App</Text>
        </Animatable.View>

        <Animatable.View animation="fadeInUp" duration={600} delay={200} style={styles.formContainer}>
          <Text style={styles.title}>Iniciar Sesión</Text>
          
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={22} color={theme.placeholder} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={theme.placeholder}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={22} color={theme.placeholder} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              placeholderTextColor={theme.placeholder}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={handleLogin} // Opcional: para loguear con Enter
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={24} color={theme.placeholder} />
            </TouchableOpacity>
          </View>

          {/* Mantener Animatable.View para el botón de login si se desea */}
          <TouchableOpacity style={styles.buttonPrimary} onPress={handleLogin}>
            <Text style={styles.buttonTextPrimary}>Entrar</Text>
          </TouchableOpacity>
         
          {/* --- AÑADIR ESTE BLOQUE --- */}
          <TouchableOpacity
            style={styles.forgotPasswordButton}
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>
          {/* --- FIN DEL BLOQUE AÑADIDO --- */}

          <TouchableOpacity style={styles.buttonSecondary} onPress={() => navigation.navigate('Register')}>
            <Text style={styles.buttonTextSecondary}>¿No tienes cuenta? <Text style={styles.linkText}>Regístrate</Text></Text>
          </TouchableOpacity>
        </Animatable.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  // ... (otros estilos sin cambios)
  keyboardAvoidingContainer: {
    flex: 1,
    backgroundColor: theme.background,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.primary,
    marginTop: 10,
  },
  formContainer: {
    width: '100%',
    backgroundColor: theme.cardBackground,
    borderRadius: 16,
    padding: 25,
    shadowColor: theme.shadowColor || '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.textPrimary,
    textAlign: 'center',
    marginBottom: 25,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.inputBackground,
    borderRadius: 12,
    marginBottom: 15,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: theme.border,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: theme.textPrimary,
  },
  eyeIcon: {
    padding: 5,
  },
  buttonPrimary: {
    backgroundColor: theme.primary,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15, // Ajustar margen si es necesario
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonTextPrimary: {
    color: theme.textLight,
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonSecondary: {
    paddingVertical: 10, // Mantener padding consistente
    alignItems: 'center',
  },
  buttonTextSecondary: {
    color: theme.textSecondary,
    fontSize: 15,
  },
  linkText: {
    color: theme.accent,
    fontWeight: 'bold',
  },
  loggedInContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: theme.background, // Asegurar que el fondo sea consistente
  },
  info: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    color: theme.textSecondary,
  },
  container: { // Estilo para el contenedor principal de la pantalla logueada
    flex: 1,
    backgroundColor: theme.background, // Para consistencia con el KeyboardAvoidingView
  },
  // --- AÑADIR ESTOS ESTILOS ---
  forgotPasswordButton: {
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 8, // Espacio antes del botón de registrarse
  },
  forgotPasswordText: {
    color: theme.accent, // Usar el color de acento para el enlace
    fontSize: 14,
    // textDecorationLine: 'underline', // Opcional si quieres subrayado
  },
  // --- FIN DE ESTILOS AÑADIDOS ---
});
