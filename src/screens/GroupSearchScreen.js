import React, { useState, useContext } from 'react';
import { View, TextInput, Button, FlatList, Text, StyleSheet, Alert } from 'react-native';
import { UserContext } from '../context/UserContext';

export default function GroupSearchScreen() {
  const [queryText, setQueryText] = useState('');
  const [results, setResults] = useState([]);
  const { getGroupByName, joinGroup } = useContext(UserContext);

  const handleSearch = async () => {
    const groups = await getGroupByName(queryText.trim());
    setResults(groups);
  };

  const handleJoin = async (groupId) => {
    try {
      await joinGroup(groupId);
      Alert.alert('Éxito', 'Te has unido al grupo');
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Nombre de grupo"
        value={queryText}
        onChangeText={setQueryText}
      />
      <Button title="Buscar" onPress={handleSearch} />
      <FlatList
        data={results}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.name}>{item.name}</Text>
            <Button title="Unirse" onPress={() => handleJoin(item.id)} />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, marginBottom: 8 },
  item: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  name: { fontSize: 16 }
});
