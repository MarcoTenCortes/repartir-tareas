// src/screens/TasksScreen.js
import React, { useState, useContext } from 'react';
import { View, Text, TextInput, Button, FlatList, Alert } from 'react-native';
import { UserContext } from '../context/UserContext'; // Asegúrate de que UserContext se importa

export default function TasksScreen() {
  const { user } = useContext(UserContext); // Obtener el objeto 'user' del contexto
  const [roomName, setRoomName] = useState('');
  const [rooms, setRooms] = useState([]); // Este estado es local y no persistirá entre sesiones o usuarios

  const handleCreateRoom = () => {
    if (!roomName.trim()) {
      Alert.alert('Error', 'El nombre de la sala no puede estar vacío');
      return;
    }

    // Se crea una sala nueva con un ID único (timestamp actual) y sin asignar
    const newRoom = {
      id: Date.now().toString(),
      name: roomName,
      assignedTo: null, // Inicialmente no asignada
    };

    setRooms([...rooms, newRoom]); // Añade la nueva sala a la lista local
    setRoomName(''); // Limpia el campo de entrada
  };

  const assignToRoom = (roomId) => {
    if (!user) { // Verificar que el usuario exista
      Alert.alert('Error', 'Usuario no encontrado. Por favor, inicia sesión de nuevo.');
      return;
    }
    setRooms(rooms.map(room =>
      room.id === roomId && !room.assignedTo // Si es la sala correcta y no está asignada
        ? { ...room, assignedTo: user.name || user.email } // Asigna el nombre del usuario (o email como fallback)
        : room
    ));
  };

  return (
    <View style={{ padding: 16 }}>
      <Text>Crear una nueva sala:</Text>
      <TextInput
        placeholder="Nombre de la sala"
        value={roomName}
        onChangeText={setRoomName}
        style={{
          borderWidth: 1,
          padding: 8,
          marginVertical: 8,
          borderRadius: 4,
        }}
      />
      <Button title="Crear sala" onPress={handleCreateRoom} />

      <Text style={{ marginTop: 20 }}>Salas:</Text>
      {rooms.length > 0 ? (
        <FlatList
          data={rooms}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={{ padding: 10, borderBottomWidth: 1, borderColor: '#eee' }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold' }}>Sala: {item.name}</Text>
              <Text>Encargado: {item.assignedTo ? item.assignedTo : 'Nadie'}</Text>
              {!item.assignedTo && user && ( // Mostrar botón solo si no está asignada y hay un usuario
                <Button title="Asignarme limpieza" onPress={() => assignToRoom(item.id)} />
              )}
            </View>
          )}
        />
      ) : (
        <Text style={{ textAlign: 'center', marginTop: 10, color: '#666' }}>No hay salas creadas todavía.</Text>
      )}
    </View>
  );
}
