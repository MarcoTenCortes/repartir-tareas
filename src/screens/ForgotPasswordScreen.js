// src/screens/ForgotPasswordScreen.js
import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Text,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import { auth } from '../services/firebase'; // Asumiendo que auth es la instancia de getAuth()
import { sendPasswordResetEmail } from 'firebase/auth'; // Importar la función específica
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export default function ForgotPasswordScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePasswordReset = async () => {
    if (!email.trim()) {
      Alert.alert('Campo vacío', 'Por favor, introduce tu correo electrónico.');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim()); // Usar sendPasswordResetEmail(auth, email) [7]
      Alert.alert(
        'Enlace Enviado',
        'Se ha enviado un enlace para restablecer tu contraseña a tu correo electrónico. Revisa tu bandeja de entrada (y la carpeta de spam).',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
      setEmail(''); // Limpiar el campo de email
    } catch (error) {
      let errorMessage = 'Ocurrió un error al intentar enviar el correo de recuperación. Por favor, inténtalo de nuevo.';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No se encontró ningún usuario registrado con este correo electrónico.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'El formato del correo electrónico no es válido.';
      }
      // console.error("Password Reset Error:", error); // Para depuración
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.keyboardAvoidingContainer}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Animatable.View animation="fadeInDown" duration={600} style={styles.logoContainer}>
          <Ionicons name="key-outline" size={100} color={theme.primary} />
          <Text style={styles.appName}>Recuperar Contraseña</Text>
        </Animatable.View>

        <Animatable.View animation="fadeInUp" duration={600} delay={200} style={styles.formContainer}>
          <Text style={styles.title}>Restablece tu Contraseña</Text>
          <Text style={styles.subtitle}>
            Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
          </Text>
          
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={22} color={theme.placeholder} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Correo electrónico"
              placeholderTextColor={theme.placeholder}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              onSubmitEditing={handlePasswordReset}
            />
          </View>

          <TouchableOpacity 
            style={[styles.buttonPrimary, loading && styles.buttonDisabled]} 
            onPress={handlePasswordReset}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.textLight} />
            ) : (
              <Text style={styles.buttonTextPrimary}>Enviar Enlace</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.buttonSecondary} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.buttonTextSecondary}>Volver a Inicio de Sesión</Text>
          </TouchableOpacity>
        </Animatable.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const getStyles = (theme) => StyleSheet.create({
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
    textAlign: 'center',
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
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: theme.textSecondary,
    textAlign: 'center',
    marginBottom: 25,
    paddingHorizontal: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.inputBackground,
    borderRadius: 12,
    marginBottom: 20, // Más espacio antes del botón
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
  buttonPrimary: {
    backgroundColor: theme.primary,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
    minHeight: 50, // Para el ActivityIndicator
    justifyContent: 'center',
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    backgroundColor: theme.border, // Un color más apagado para indicar que está deshabilitado
  },
  buttonTextPrimary: {
    color: theme.textLight,
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonSecondary: {
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonTextSecondary: {
    color: theme.accent, // Usar un color de acento o primario para que destaque como un enlace
    fontSize: 15,
    fontWeight: 'bold',
  },
});
