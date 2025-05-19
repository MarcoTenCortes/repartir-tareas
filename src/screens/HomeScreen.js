import React, { useContext } from 'react';
import { View, Text, Button, FlatList } from 'react-native';
import { UserContext } from '../context/UserContext';
import { useNavigation } from '@react-navigation/native';

export default function HomeScreen() {
  const { user, groups } = useContext(UserContext);
  const navigation = useNavigation();
  const userGroups = groups.filter(g => g.members.includes(user.uid));

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
          <Text>{item.name}</Text>
        )}
      />
    </View>
  );
}
