// src/screens/GroupSearchScreen.js
import React, { useState, useContext } from 'react';
import { View, TextInput, Button, FlatList, Text, StyleSheet, Alert, TouchableOpacity, Image } from 'react-native';
import { UserContext } from '../context/UserContext';

export default function GroupSearchScreen({ navigation }) {
  const [queryText, setQueryText] = useState('');
  const [results, setResults] = useState([]);
  const { getGroupByName, joinGroup, user, groups: userGroups } = useContext(UserContext);

  const handleSearch = async () => {
    if (!queryText.trim()) {
      Alert.alert('Error', 'Introduce un nombre de grupo para buscar.');
      return;
    }
    try {
      const groupsFound = await getGroupByName(queryText.trim());
      setResults(groupsFound);
      if (groupsFound.length === 0) {
        Alert.alert('Sin resultados', 'No se encontraron grupos con ese nombre.');
      }
    } catch (error) {
      Alert.alert('Error de búsqueda', error.message);
    }
  };

  const handleJoin = async (groupId, groupName) => {
    try {
      const isAlreadyMember = userGroups.some(g => g.id === groupId);
      if (isAlreadyMember) {
        Alert.alert('Información', 'Ya eres miembro de este grupo.');
        return;
      }

      await joinGroup(groupId, groupName);
      Alert.alert('Solicitud enviada', 'Tu solicitud para unirte al grupo ha sido enviada.');
    } catch (err) {
      Alert.alert('Error al solicitar unirse', err.message);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Nombre de grupo"
        value={queryText}
        onChangeText={setQueryText}
        onSubmitEditing={handleSearch}
      />
      <Button title="Buscar Grupo" onPress={handleSearch} />
      <FlatList
        data={results}
        keyExtractor={item => item.id}
        renderItem={({ item }) => {
          const isAlreadyMember = userGroups.some(g => g.id === item.id);
          return (
            <View style={styles.item}>
              <Text style={styles.name}>{item.name}</Text>
              {!isAlreadyMember ? (
                <Button title="Solicitar Unirse" onPress={() => handleJoin(item.id, item.name)} />
              ) : (
                <Text style={styles.memberText}>Ya eres miembro</Text>
              )}
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.emptyText}>Introduce un nombre para buscar grupos.</Text>}
      />
      <Image
        source={require('../../assets/divertido.png')}
        style={styles.bottomImage}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    marginTop: 50,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 12,
    borderRadius: 5
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  name: { fontSize: 16, flex: 1 },
  memberText: { color: 'green', fontStyle: 'italic' },
  emptyText: { textAlign: 'center', marginTop: 20, color: '#888' },
  bottomImage: {
    width: '80%', // O un tamaño fijo, ej: 200
    height: '90%',  // O un tamaño fijo, ej: 150
    alignSelf: 'center',
    marginTop: 'auto', // Empuja la imagen hacia abajo
    marginBottom: 40, // Espacio opcional desde el borde inferior
  }
});
