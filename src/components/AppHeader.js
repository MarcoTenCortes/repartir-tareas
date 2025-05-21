// FILE: src/components/AppHeader.js
import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GroupSelector from './GroupSelector';
import { UserContext } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';

export default function AppHeader() {
  const { user } = useContext(UserContext);
  const { theme } = useTheme();
  const navigation = useNavigation();

  const handleUserPress = () => {
    navigation.navigate('UserProfile');
  };

  const handleGroupSettingsPress = () => {
    navigation.navigate('GroupSettings'); // Navegar a la pantalla de config de grupos
  };

  const userName = user ? user.name : '';
  const userFirstName = userName ? userName.split(' ')[0] : '';
  const userIconName = user?.icon || 'person-circle-outline';

  return (
    <View style={[styles.headerContainer, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}>
      <View style={styles.leftSection}>
        <View style={styles.groupSelectorWrapper}>
          <GroupSelector />
        </View>
        <TouchableOpacity onPress={handleGroupSettingsPress} style={styles.settingsIconContainer}>
          <Ionicons name="settings-outline" size={24} color={theme.primary} />
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity onPress={handleUserPress} style={styles.userActionContainer}>
        {userFirstName ? (
          <Text style={[styles.greetingText, { color: theme.textPrimary }]}>{`¡Hola, ${userFirstName}!`}</Text>
        ) : null}
        <Ionicons name={userIconName} size={28} color={theme.primary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: Platform.OS === 'android' ? 40 : 60,
    borderBottomWidth: 1,
    height: Platform.OS === 'android' ? 70 : 80,
    shadowColor: '#00000020',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  leftSection: { // Contenedor para el selector y el icono de tuerca
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1, // Para que no empuje al de usuario si el nombre es largo
    marginRight: 5, // Espacio antes del saludo del usuario
  },
  groupSelectorWrapper: { // Envoltura para controlar el ancho del selector
    maxWidth: 160, // Ancho máximo para el selector, ajústalo según necesites
    minWidth: 120, // Ancho mínimo
    flexGrow: 1,   // Que crezca si hay espacio, pero limitado por maxWidth
  },
  settingsIconContainer: {
    paddingLeft: 10, // Espacio entre selector y tuerca
    paddingRight: 5,
  },
  userActionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 5, // Reducir un poco si es necesario
    flexShrink: 0, // Para que el saludo y el icono de usuario no se encojan
  },
  greetingText: {
    marginRight: 8,
    fontSize: 15, // Un poco más pequeño si es necesario para el espacio
    fontWeight: '600',
  },
});
