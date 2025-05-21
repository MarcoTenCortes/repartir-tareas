// src/screens/UserProfileScreen.js
import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import { Ionicons } from '@expo/vector-icons';
import { UserContext } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import { AVAILABLE_USER_ICONS, DEFAULT_ICON_NAME } from './RegisterScreen'; // Reutilizamos la lista de iconos

export default function UserProfileScreen({ navigation }) {
  const { user, updateUserProfile, changeUserPassword, logout } = useContext(UserContext);
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const [displayName, setDisplayName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [selectedIconName, setSelectedIconName] = useState(DEFAULT_ICON_NAME);
  
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.name || '');
      setSelectedIconName(user.icon || DEFAULT_ICON_NAME);
    }
  }, [user]);

  const handleSaveChanges = async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);

    let profileUpdates = {};
    if (displayName.trim() !== user.name) {
      if (!displayName.trim()) {
        setError('El nombre no puede estar vacío.');
        setIsLoading(false);
        return;
      }
      profileUpdates.name = displayName.trim();
    }
    if (selectedIconName !== user.icon) {
      profileUpdates.iconName = selectedIconName;
    }

    try {
      if (Object.keys(profileUpdates).length > 0) {
        await updateUserProfile(profileUpdates);
      }

      if (currentPassword && newPassword) {
        if (newPassword.length < 6) {
          setError('La nueva contraseña debe tener al menos 6 caracteres.');
          setIsLoading(false);
          return;
        }
        if (newPassword !== confirmNewPassword) {
          setError('Las nuevas contraseñas no coinciden.');
          setIsLoading(false);
          return;
        }
        await changeUserPassword(currentPassword, newPassword);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      }
      
      Alert.alert('Éxito', 'Perfil actualizado correctamente.');
      // Opcional: navigation.goBack(); si quieres cerrar la pantalla tras guardar.
      
    } catch (err) {
      console.error("Error updating profile: ", err);
      setError(err.message || 'Error al actualizar el perfil.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            await logout();
            navigation.navigate('Login'); // Asegurarse de que navega al login tras cerrar sesión
          },
        },
      ],
      { cancelable: true }
    );
  };


  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.infoText}>No hay usuario logueado.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.keyboardAvoidingContainer}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Animatable.View animation="fadeInDown" duration={600} style={styles.headerContainer}>
          <Ionicons name="person-circle-outline" size={80} color={theme.primary} />
          <Text style={styles.mainTitle}>Editar Perfil</Text>
        </Animatable.View>

        <Animatable.View animation="fadeInUp" duration={600} delay={200} style={styles.formContainer}>
          {error && <Text style={styles.errorText}>{error}</Text>}

          <Text style={styles.label}>Nombre de Usuario</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color={theme.placeholder} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Tu nombre"
              placeholderTextColor={theme.placeholder}
              value={displayName}
              onChangeText={setDisplayName}
            />
          </View>

          <Text style={styles.label}>Cambiar Contraseña (dejar en blanco para no cambiar)</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={theme.placeholder} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Contraseña Actual"
              placeholderTextColor={theme.placeholder}
              secureTextEntry={!showCurrentPassword}
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />
            <TouchableOpacity onPress={() => setShowCurrentPassword(!showCurrentPassword)} style={styles.eyeIcon}>
              <Ionicons name={showCurrentPassword ? "eye-off-outline" : "eye-outline"} size={22} color={theme.placeholder} />
            </TouchableOpacity>
          </View>
          <View style={styles.inputContainer}>
            <Ionicons name="lock-open-outline" size={20} color={theme.placeholder} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Nueva Contraseña"
              placeholderTextColor={theme.placeholder}
              secureTextEntry={!showNewPassword}
              value={newPassword}
              onChangeText={setNewPassword}
            />
             <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={styles.eyeIcon}>
              <Ionicons name={showNewPassword ? "eye-off-outline" : "eye-outline"} size={22} color={theme.placeholder} />
            </TouchableOpacity>
          </View>
          <View style={styles.inputContainer}>
            <Ionicons name="shield-checkmark-outline" size={20} color={theme.placeholder} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Confirmar Nueva Contraseña"
              placeholderTextColor={theme.placeholder}
              secureTextEntry={!showConfirmNewPassword}
              value={confirmNewPassword}
              onChangeText={setConfirmNewPassword}
            />
            <TouchableOpacity onPress={() => setShowConfirmNewPassword(!showConfirmNewPassword)} style={styles.eyeIcon}>
              <Ionicons name={showConfirmNewPassword ? "eye-off-outline" : "eye-outline"} size={22} color={theme.placeholder} />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Elige tu Avatar</Text>
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
                <Ionicons name={icon.name} size={30} color={selectedIconName === icon.name ? theme.primary : theme.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity 
            style={[styles.buttonPrimary, isLoading && styles.buttonDisabled]} 
            onPress={handleSaveChanges} 
            disabled={isLoading}
          >
            {isLoading ? <ActivityIndicator color={theme.textLight} /> : <Text style={styles.buttonTextPrimary}>Guardar Cambios</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.buttonSecondary} onPress={handleLogout}>
            <Text style={styles.buttonTextSecondary}>Cerrar Sesión</Text>
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
  headerContainer: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: Platform.OS === 'android' ? 20 : 40,
  },
  mainTitle: {
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
  label: {
    fontSize: 16,
    color: theme.textSecondary,
    marginBottom: 8,
    marginTop: 15,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.inputBackground,
    borderRadius: 12,
    marginBottom: 10,
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
  iconSelectorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: 20,
    marginTop: 5,
  },
  iconButton: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    margin: 5,
  },
  iconButtonSelected: {
    borderColor: theme.primary,
    backgroundColor: theme.primaryLight, // Un color de fondo sutil para el seleccionado
  },
  buttonPrimary: {
    backgroundColor: theme.primary,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    minHeight: 50,
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: theme.border,
  },
  buttonTextPrimary: {
    color: theme.textLight,
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonSecondary: {
    backgroundColor: theme.error, // Color distintivo para cerrar sesión
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 15,
  },
  buttonTextSecondary: {
    color: theme.textLight, // Texto claro para contraste
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: theme.error,
    textAlign: 'center',
    marginBottom: 15,
    fontSize: 14,
  },
  infoText: {
      fontSize: 16,
      color: theme.textSecondary,
      textAlign: 'center',
      marginTop: 50
  },
  container: { // Estilo para el contenedor principal si el usuario no está logueado
    flex: 1,
    backgroundColor: theme.background,
    justifyContent: 'center',
    alignItems: 'center'
  },
});
