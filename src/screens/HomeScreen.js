import React, { useContext } from 'react';
import { View, Text, Button, FlatList } from 'react-native';
import { UserContext } from '../context/UserContext';

export default function HomeScreen() {
  const { user, groups, selectGroup } = useContext(UserContext);
  const currentGroup = user.selectedGroup;

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Button title="Buscar/Crear grupo" onPress={() => { /* navegar */ }} />
      <FlatList
        data={groups}
        keyExtractor={g => g.id}
        renderItem={({ item }) => (
          <Button
            title={item.name}
            onPress={() => selectGroup(item.id)}
          />
        )}
      />
      {currentGroup && (
        <View style={{ marginTop: 24 }}>
          <Text>Integrantes de {currentGroup.name}:</Text>
          <FlatList
            data={currentGroup.members}
            keyExtractor={m => m.id}
            renderItem={({ item }) => (
              <Text>{item.name} - {item.status}</Text>
            )}
          />
        </View>
      )}
    </View>
  );
}
