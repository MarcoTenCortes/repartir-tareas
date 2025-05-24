// FILE: src/screens/RegisterScreen.js
import React, { useState, useContext } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import { UserContext } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export const AVAILABLE_USER_ICONS = [
  { name: 'person-circle-outline', family: 'Ionicons' },
  { name: 'happy-outline', family: 'Ionicons' },
  { name: 'leaf-outline', family: 'Ionicons' },
  { name: 'rocket-outline', family: 'Ionicons' },
  { name: 'sparkles-outline', family: 'Ionicons' },
  { name: 'star-outline', family: 'Ionicons' },
];
export const DEFAULT_ICON_NAME = 'person-circle-outline';

const MIN_PASS_LENGTH = 6; // Mínimo 6 caracteres

export default function RegisterScreen({ navigation }) {
  const { user, register, logout } = useContext(UserContext);
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedIconName, setSelectedIconName] = useState(DEFAULT_ICON_NAME);
  const [passwordFocused, setPasswordFocused] = useState(false); // Para mostrar criterios

  // Estados para cada criterio de contraseña
  const [meetsMinLength, setMeetsMinLength] = useState(false);
  const [hasLowercase, setHasLowercase] = useState(false);
  const [hasUppercase, setHasUppercase] = useState(false);
  const [hasQuestionMark, setHasQuestionMark] = useState(false);

  const passwordCriteria = [
    { key: 'minLength', label: `Al menos ${MIN_PASS_LENGTH} caracteres`, met: meetsMinLength },
    { key: 'lowercase', label: 'Una letra minúscula (a-z)', met: hasLowercase },
    { key: 'uppercase', label: 'Una letra mayúscula (A-Z)', met: hasUppercase },
    { key: 'questionMark', label: 'Un signo de interrogación (?)', met: hasQuestionMark },
  ];

  const validatePassword = (text) => {
    setMeetsMinLength(text.length >= MIN_PASS_LENGTH);
    setHasLowercase(/[a-z]/.test(text));
    setHasUppercase(/[A-Z]/.test(text));
    setHasQuestionMark(/\?/.test(text)); // Busca el carácter literal '?'
  };

  const handlePasswordChange = (text) => {
    setPassword(text);
    validatePassword(text);
  };

  if (user) {
    return (
      <View style={styles.container}>
         <Animatable.View animation="fadeInDown" duration={800} style={styles.loggedInContainer}>
          <Ionicons name="person-add-outline" size={80} color={theme.success || 'green'} />
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

    // Validar que todos los criterios de contraseña se cumplen
    const allCriteriaMet = meetsMinLength && hasLowercase && hasUppercase && hasQuestionMark;
    if (!allCriteriaMet) {
      Alert.alert('Contraseña Inválida', 'La contraseña no cumple con todos los criterios requeridos.');
      return;
    }

    try {
      await register(name.trim(), email.trim(), password, selectedIconName);
      // Después del registro exitoso y envío de correo de verificación:
      Alert.alert(
        'Registro Exitoso',
        '¡Bienvenido! Se ha enviado un correo de verificación a tu dirección. Por favor, verifica tu email para activar completamente tu cuenta.',
        [{ text: 'OK', onPress: () => {} /* La navegación ya la maneja el observer de auth */ }]
      );
    } catch (err) {
      let errorMessage = 'No se pudo completar el registro.';
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'Este correo electrónico ya está registrado. Intenta iniciar sesión.';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'El formato del correo electrónico no es válido.';
      } else if (err.code === 'auth/weak-password') {
        // Aunque tenemos validación front-end, Firebase también tiene la suya.
        errorMessage = 'La contraseña es demasiado débil.';
      }
      Alert.alert('Error de Registro', err.message || errorMessage);
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
              placeholder="Contraseña" // Placeholder genérico
              placeholderTextColor={theme.placeholder}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={handlePasswordChange} // Usar el nuevo handler
              onFocus={() => setPasswordFocused(true)}
              // onBlur={() => setPasswordFocused(false)} // Opcional: ocultar criterios al perder foco
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={24} color={theme.placeholder} />
            </TouchableOpacity>
          </View>

          {/* Contenedor de criterios de contraseña */}
          {(passwordFocused || password.length > 0) && ( // Mostrar si está enfocado o si ya hay texto
            <Animatable.View animation="fadeIn" duration={300} style={styles.criteriaContainer}>
              {passwordCriteria.map(criterion => (
                <View key={criterion.key} style={styles.criterionRow}>
                  <Ionicons
                    name={criterion.met ? "checkmark-circle" : "ellipse-outline"} // close-circle-outline es muy rojo por defecto
                    size={18}
                    color={criterion.met ? (theme.success || 'green') : (theme.error || 'red')}
                    style={{ marginRight: 8 }}
                  />
                  <Text
                    style={[
                      styles.criterionText,
                      { color: criterion.met ? (theme.success || 'green') : theme.textSecondary }, // Verde si se cumple, color normal si no
                    ]}
                  >
                    {criterion.label}
                  </Text>
                </View>
              ))}
            </Animatable.View>
          )}

          <Text style={styles.label}>Elige tu avatar:</Text>
          <View style={styles.iconSelectorContainer}>
            {AVAILABLE_USER_ICONS.map((icon) => (
              <TouchableOpacity
                key={icon.name}
                style={[
                  styles.iconButton,
                  selectedIconName === icon.name && styles.iconButtonSelected
                ]}
                onPress={() => setSelectedIconName(icon.name)}
              >
                <Ionicons 
                    name={icon.name} 
                    size={30} 
                    color={selectedIconName === icon.name ? theme.primary : theme.textSecondary}
                />
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.buttonPrimary} onPress={handleRegister}>
            <Text style={styles.buttonTextPrimary}>Registrarse</Text>
          </TouchableOpacity>
         
          <TouchableOpacity style={styles.buttonSecondary} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.buttonTextSecondary}>¿Ya tienes cuenta? <Text style={styles.linkText}>Inicia sesión</Text></Text>
          </TouchableOpacity>
        </Animatable.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  // ... (todos tus estilos existentes) ...
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
    marginBottom: 15, 
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
    paddingVertical: 10, 
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
    backgroundColor: theme.background, 
  },
  info: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    color: theme.textSecondary,
  },
  container: { 
    flex: 1,
    backgroundColor: theme.background, 
  },
  label: {
    fontSize: 16,
    color: theme.textSecondary,
    marginBottom: 10,
    marginTop: 5,
  },
  iconSelectorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  iconButton: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    margin: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonSelected: {
    borderColor: theme.primary,
    backgroundColor: theme.primaryLight,
  },
  // NUEVOS ESTILOS PARA CRITERIOS DE CONTRASEÑA
  criteriaContainer: {
    marginTop: -5, // Para que esté más pegado al input de contraseña
    marginBottom: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
    // backgroundColor: theme.inputBackground, // Opcional: un fondo sutil
    // borderRadius: 8, // Opcional
  },
  criterionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  criterionText: {
    fontSize: 13, // Un poco más pequeño
    // color: theme.textSecondary, // Color por defecto del texto del criterio
    marginLeft: 0, // Ya hay margen en el icono
  },
  // No necesitamos 'criterionMetText' ya que cambiamos el color directamente en el style del Text
});

