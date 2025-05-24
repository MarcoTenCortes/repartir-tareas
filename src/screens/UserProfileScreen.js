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
import { UserContext } from '../context/UserContext'; // Asumiendo que UserContext está en ../context/UserContext
import { useTheme } from '../context/ThemeContext'; // Asumiendo que ThemeContext está en ../context/ThemeContext
import { AVAILABLE_USER_ICONS, DEFAULT_ICON_NAME } from './RegisterScreen';

export default function UserProfileScreen({ navigation }) {
  const { user, updateUserProfile, changeUserPassword, logout, deleteUserAccount } = useContext(UserContext); // Añadido deleteUserAccount
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
        // No limpiar contraseñas aquí para que puedan ser usadas por eliminar cuenta si es necesario,
        // o limpiar solo newPassword y confirmNewPassword.
        setNewPassword('');
        setConfirmNewPassword('');
        // setCurrentPassword(''); // No limpiar currentPassword aún
      }
      
      Alert.alert('Éxito', 'Perfil actualizado correctamente.');
      
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
          style: 'destructive', // Puedes cambiarlo si quieres que sea menos 'alarmante' que el de eliminar
          onPress: async () => {
            await logout();
            navigation.navigate('Login');
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleDeleteUser = () => {
    if (!currentPassword) {
      Alert.alert(
        'Contraseña Requerida', 
        'Por favor, ingresa tu contraseña actual en el campo "Contraseña Actual" para poder eliminar tu cuenta.',
        [{ text: 'OK' }]
      );
      setError('Se requiere la contraseña actual para eliminar la cuenta.');
      return;
    }

    Alert.alert(
      'Eliminar Cuenta Permanentemente',
      '¿Estás absolutamente seguro de que quieres eliminar tu cuenta? Esta acción es irreversible y todos tus datos (perfil, grupos, tareas, etc.) serán eliminados permanentemente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar Mi Cuenta',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            setError(null);
            try {
              await deleteUserAccount(currentPassword);
              // No es necesario llamar a logout() aquí si deleteUserAccount ya maneja el signOut
              // y la limpieza del estado local del usuario en el contexto.
              // Firebase deleteUser() ya hace signOut.
              Alert.alert('Cuenta Eliminada', 'Tu cuenta ha sido eliminada exitosamente.');
              setCurrentPassword(''); // Limpiar contraseña
              setNewPassword('');
              setConfirmNewPassword('');
              navigation.navigate('Login');
            } catch (err) {
              console.error("Error deleting user account on screen: ", err);
              setError(err.message || 'No se pudo eliminar la cuenta. Inténtalo de nuevo.');
              // Errores específicos como 'auth/wrong-password' o 'auth/requires-recent-login' 
              // son manejados y reformulados por deleteUserAccount en el contexto.
            } finally {
              setIsLoading(false);
            }
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
          <Ionicons name={selectedIconName || "person-circle-outline"} size={80} color={theme.primary} />
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

          <Text style={styles.label}>Contraseña Actual (requerida para cambiar contraseña o eliminar cuenta)</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={theme.placeholder} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Contraseña Actual"
              placeholderTextColor={theme.placeholder}
              secureTextEntry={!showCurrentPassword}
              value={currentPassword}
              onChangeText={(text) => { setCurrentPassword(text); if(error) setError(null); }} // Limpiar error al escribir
            />
            <TouchableOpacity onPress={() => setShowCurrentPassword(!showCurrentPassword)} style={styles.eyeIcon}>
              <Ionicons name={showCurrentPassword ? "eye-off-outline" : "eye-outline"} size={22} color={theme.placeholder} />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Nueva Contraseña (dejar en blanco para no cambiar)</Text>
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

          <TouchableOpacity 
            style={[styles.buttonSecondary, isLoading && styles.buttonDisabled]} // Aplicar buttonDisabled también
            onPress={handleLogout}
            disabled={isLoading}
          >
            <Text style={styles.buttonTextSecondary}>Cerrar Sesión</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.buttonDanger, isLoading && styles.buttonDisabled]} 
            onPress={handleDeleteUser}
            disabled={isLoading}
          >
            {isLoading ? <ActivityIndicator color={theme.textLightInverted || theme.textLight} /> : <Text style={styles.buttonTextDanger}>Eliminar Cuenta</Text>}
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
    backgroundColor: theme.primaryLight,
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
  buttonDisabled: { // Estilo para deshabilitar botones
    backgroundColor: theme.grey || theme.border, // Un color gris o el color del borde
    opacity: 0.7,
  },
  buttonTextPrimary: {
    color: theme.textLight,
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Estilo modificado para Cerrar Sesión para que no sea rojo por defecto
  buttonSecondary: { 
    backgroundColor: 'transparent',
    borderColor: theme.primary, // O un color menos prominente como theme.border
    borderWidth: 1,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 15,
    minHeight: 50,
    justifyContent: 'center',
  },
  buttonTextSecondary: {
    color: theme.primary, // O theme.textSecondary
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Nuevo estilo para el botón de Eliminar Cuenta
  buttonDanger: {
    backgroundColor: theme.error, // Color rojo para acciones destructivas
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 15,
    minHeight: 50,
    justifyContent: 'center',
  },
  buttonTextDanger: {
    color: theme.textLightInverted || theme.textLight, // Asegurar contraste con el fondo rojo
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
  container: { 
    flex: 1,
    backgroundColor: theme.background,
    justifyContent: 'center',
    alignItems: 'center'
  },
});
