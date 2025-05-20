import React, { useState, useContext } from 'react';
import { View, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { UserContext } from '../context/UserContext';

export default function GroupCreateScreen({ navigation }) {
  const [name, setName] = useState('');
  const { createGroup } = useContext(UserContext);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'El nombre no puede estar vacío');
      return;
    }
    try {
      await createGroup(name.trim());
      Alert.alert('Éxito', 'Grupo creado correctamente', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Nombre de nuevo grupo"
        value={name}
        onChangeText={setName}
      />
      <Button title="Crear grupo" onPress={handleCreate} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, marginTop: 70 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, marginBottom: 8 }
});