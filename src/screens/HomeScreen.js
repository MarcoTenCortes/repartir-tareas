// src/screens/HomeScreen.js
import React, { useContext } from 'react';
import { View, Text, Button, FlatList, TouchableOpacity } from 'react-native';
import { UserContext } from '../context/UserContext';
import { GroupContext } from '../context/GroupContext';
import { useNavigation } from '@react-navigation/native';

export default function HomeScreen() {
  const { user } = useContext(UserContext);
  const { userGroups, currentGroup, setCurrentGroup } = useContext(GroupContext);
  const navigation = useNavigation();

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Button
        title="Buscar/Unirse a un grupo"
        onPress={() => navigation.navigate('BuscarGrupo')}
      />
      <Button
        title="Crear grupo familiar"
        onPress={() => navigation.navigate('CrearGrupo')}
      />

      <Text style={{ marginTop: 24, fontWeight: 'bold' }}>Mis grupos:</Text>
      <FlatList
        data={userGroups}
        keyExtractor={g => g.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => setCurrentGroup(item)}>
            <Text style={{ 
                padding: 8,
                fontWeight: item.id === currentGroup?.id ? 'bold' : 'normal'
              }}
            >
              {item.name}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
