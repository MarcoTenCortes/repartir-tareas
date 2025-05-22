// FILE: src/screens/GroupCreateScreen.js
import React, { useState, useContext } from 'react';
import { View, TextInput, Button, StyleSheet, Alert, Image } from 'react-native'; // Importar Image
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
      <Image 
        source={require('../../assets/rey.png')} 
        style={styles.bottomImage} 
        resizeMode="contain" // Ajusta según necesites: cover, stretch, etc.
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 16, 
    marginTop: 70, 
    justifyContent: 'flex-start', // Alinea el contenido arriba
  },
  input: { 
    borderWidth: 1, 
    borderColor: '#ccc', 
    padding: 8, 
    marginBottom: 8 
  },
  bottomImage: {
    width: '80%', // O un tamaño fijo, ej: 200
    height: '90%',  // O un tamaño fijo, ej: 150
    alignSelf: 'center',
    marginTop: 'auto', // Empuja la imagen hacia abajo
    marginBottom: 40, // Espacio opcional desde el borde inferior
  }
});
