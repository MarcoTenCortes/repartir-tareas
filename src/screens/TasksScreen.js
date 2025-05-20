// src/screens/TasksScreen.js
import React, { useState, useContext } from 'react';
import { View, Text, TextInput, Button, FlatList, Alert } from 'react-native';
import { UserContext } from '../context/UserContext';

export default function TasksScreen() {

  const { user } = useContext(UserContext);
  const [roomName, setRoomName] = useState('');
  const [rooms, setRooms] = useState([]);

  const handleCreateRoom = () => {
    if (!roomName.trim()) {
      Alert.alert('Error', 'El nombre de la sala no puede estar vacío');
      return;
    }

    const newRoom = {
      id: Date.now().toString(),
      name: roomName,
      assignedTo: null,
    };

    setRooms([...rooms, newRoom]);
    setRoomName('');
  };

  const assignToRoom = (roomId) => {
    setRooms(rooms.map(room =>
      room.id === roomId && !room.assignedTo
        ? { ...room, assignedTo: user.uid }
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
      <FlatList
        data={rooms}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ padding: 10, borderBottomWidth: 1 }}>
            <Text>Sala: {item.name}</Text>
            <Text>Encargado: {item.assignedTo ? item.assignedTo : 'Nadie'}</Text>
            {!item.assignedTo && (
              <Button title="Asignarme limpieza" onPress={() => assignToRoom(item.id)} />
            )}
          </View>
        )}
      />
    </View>
  );
}