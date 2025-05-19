// src/components/AppHeader.js
import React, { useContext } from 'react';
import { View, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GroupSelector from './GroupSelector';
import { UserContext } from '../context/UserContext';

export default function AppHeader() {
  const { logout } = useContext(UserContext);

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

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 8,
        backgroundColor: '#fff',
        marginTop:50
      }}
    >
      <GroupSelector />
      <TouchableOpacity onPress={handleUserPress} style={{ padding: 8 }}>
        <Ionicons name="person-circle-outline" size={28} />
      </TouchableOpacity>
    </View>
  );
}
