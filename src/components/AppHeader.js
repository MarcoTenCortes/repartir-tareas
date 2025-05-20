// src/components/AppHeader.js
import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GroupSelector from './GroupSelector';
import { UserContext } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';

export default function AppHeader() {
  const { user, logout } = useContext(UserContext);
  const { theme } = useTheme();

  const handleUserPress = () => {
    Alert.alert(
      'Cuenta',
      '¿Quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: () => logout() }
      ],
      { cancelable: true }
    );
  };

  const userName = user ? user.name : '';
  const userFirstName = userName ? userName.split(' ')[0] : '';

  return (
    <View style={[styles.headerContainer, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}>
      <View style={styles.groupSelectorContainer}>
        <GroupSelector />
      </View>
      <TouchableOpacity onPress={handleUserPress} style={styles.userActionContainer}>
        {userFirstName ? (
          <Text style={[styles.greetingText, { color: theme.textPrimary }]}>¡Hola, {userFirstName}!</Text>
        ) : null}
        <Ionicons name="person-circle-outline" size={28} color={theme.primary} />
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
    marginTop: Platform.OS === 'android' ? 25 : 50,
    borderBottomWidth: 1,
    height: Platform.OS === 'android' ? 70 : 80,
    shadowColor: '#00000020',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  groupSelectorContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  userActionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
  },
  greetingText: {
    marginRight: 8,
    fontSize: 16,
    fontWeight: '600',
  },
});
