// src/components/AppHeader.js
import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GroupSelector from './GroupSelector';
import { UserContext } from '../context/UserContext';

export default function AppHeader() {
  const { user, logout } = useContext(UserContext);

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
    <View style={styles.headerContainer}>
      <View style={styles.groupSelectorContainer}>
        <GroupSelector />
      </View>
      <TouchableOpacity onPress={handleUserPress} style={styles.userActionContainer}>
        {userFirstName ? ( // Si userFirstName es una cadena vacía, se renderiza null, lo cual es correcto
          <Text style={styles.greetingText}>¡Hola, {userFirstName}!</Text>
        ) : null}
        <Ionicons name="person-circle-outline" size={28} color="#333" />
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
    backgroundColor: '#fff',
    marginTop: Platform.OS === 'android' ? 25 : 50, // Ajustado según tu configuración
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    height: Platform.OS === 'android' ? 70 : 80,
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
    color: '#333',
  },
});
