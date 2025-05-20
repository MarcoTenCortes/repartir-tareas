// src/screens/RegisterScreen.js
import React, { useState, useContext } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Text,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import { UserContext } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterScreen({ navigation }) {
  const { user, register, logout } = useContext(UserContext);
  const { theme } = useTheme();
  const styles = getStyles(theme); // Reutilizamos la función getStyles con ajustes menores si es necesario

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);


  if (user) { // Este caso es menos probable aquí, pero por consistencia
    return (
      <View style={styles.container}>
         <Animatable.View animation="fadeInDown" duration={800} style={styles.loggedInContainer}>
          <Ionicons name="person-add-outline" size={80} color={theme.success} />
          <Text style={styles.title}>Ya tienes una cuenta</Text>
          <Text style={styles.info}>Estás registrado como {user.name}</Text>
          <TouchableOpacity style={styles.buttonPrimary} onPress={logout}>
            <Text style={styles.buttonTextPrimary}>Cerrar sesión</Text>
          </TouchableOpacity>
        </Animatable.View>
      </View>
    );
  }

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert('Campos incompletos', 'Por favor, completa todos los campos.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Contraseña corta', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    try {
      await register(name.trim(), email.trim(), password);
      // La navegación se maneja automáticamente
    } catch (err) {
      Alert.alert('Error de Registro', err.message || 'No se pudo completar el registro.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.keyboardAvoidingContainer}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Animatable.View animation="fadeInDown" duration={600} style={styles.logoContainer}>
          <Ionicons name="person-add-sharp" size={100} color={theme.primary} />
           <Text style={styles.appName}>Crear Cuenta</Text>
        </Animatable.View>

        <Animatable.View animation="fadeInUp" duration={600} delay={200} style={styles.formContainer}>
          <Text style={styles.title}>Regístrate</Text>
          
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={22} color={theme.placeholder} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Nombre completo"
              placeholderTextColor={theme.placeholder}
              value={name}
              onChangeText={setName}
            />
          </View>

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
              placeholder="Contraseña (mín. 6 caracteres)"
              placeholderTextColor={theme.placeholder}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={24} color={theme.placeholder} />
            </TouchableOpacity>
          </View>

          <Animatable.View animation="pulse" iterationCount="infinite" delay={1000} duration={1500}>
            <TouchableOpacity style={styles.buttonPrimary} onPress={handleRegister}>
              <Text style={styles.buttonTextPrimary}>Crear cuenta</Text>
            </TouchableOpacity>
          </Animatable.View>

          <TouchableOpacity style={styles.buttonSecondary} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.buttonTextSecondary}>¿Ya tienes cuenta? <Text style={styles.linkText}>Inicia sesión</Text></Text>
          </TouchableOpacity>
        </Animatable.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Reutilizamos la función getStyles de LoginScreen, ya que son muy similares.
// Si necesitas estilos específicos para RegisterScreen, puedes duplicar y modificar getStyles.
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
  },
  formContainer: {
    width: '100%',
    backgroundColor: theme.cardBackground,
    borderRadius: 16,
    padding: 25,
    shadowColor: theme.shadowColor,
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
    marginBottom: 15,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonTextPrimary: {
    color: theme.textLight, // Asumiendo que tienes textLight en tu tema para texto sobre fondo primario
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonSecondary: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  buttonTextSecondary: {
    color: theme.textSecondary,
    fontSize: 15,
  },
  linkText: {
    color: theme.accent, // Usar color de acento para el enlace
    fontWeight: 'bold',
  },
  loggedInContainer: { // Estilo para cuando el usuario ya está logueado (menos común en Register)
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  info: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    color: theme.textSecondary,
  }
});
