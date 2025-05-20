// src/screens/TasksScreen.js
import React, { useState, useContext } from 'react';
import { View, Text, TextInput, Button, FlatList, Alert, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Draggable from 'react-native-draggable'; // <--- Importar Draggable
import { UserContext } from '../context/UserContext';
import { GroupContext } from '../context/GroupContext';
import { Ionicons } from '@expo/vector-icons';

export default function TasksScreen() {
  const { user } = useContext(UserContext);
  const { 
    currentGroup, 
    rooms,               // <--- Usar rooms del contexto
    createRoom,          // <--- Usar createRoom del contexto
    updateRoomPosition,  // <--- Usar updateRoomPosition del contexto
    tasks: allTasks,     // Renombrar para evitar conflicto con tasks filtradas
    createTask,          // Usar createTask modificado
    assignTaskToUser, 
    unassignTask, 
    deleteTask 
  } = useContext(GroupContext);
  
  const [newRoomName, setNewRoomName] = useState('');
  const [selectedRoom, setSelectedRoom] = useState(null); // Para la habitación cuyas tareas se mostrarán
  const [newTaskName, setNewTaskName] = useState('');

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) {
      Alert.alert('Error', 'El nombre de la habitación no puede estar vacío.');
      return;
    }
    if (!currentGroup) {
      Alert.alert('Error', 'Debes seleccionar un grupo para crear habitaciones.');
      return;
    }
    try {
      // Posición inicial aleatoria simple para demostración
      const initialX = Math.floor(Math.random() * (styles.mapContainer.width - 80 || 150)); 
      const initialY = Math.floor(Math.random() * (styles.mapContainer.height - 80 || 200));
      await createRoom(newRoomName, { x: initialX, y: initialY });
      setNewRoomName('');
    } catch (error) {
      Alert.alert('Error al crear habitación', error.message);
    }
  };

  const handleRoomDragRelease = (room, gestureState) => {
    if (!currentGroup) return;
    // Calcula la nueva posición. dx, dy son el delta desde el inicio del arrastre.
    // La posición en Draggable es relativa al padre, por lo que el x, y del Draggable es la posición que guardamos.
    // gestureState.moveX y moveY son absolutos a la pantalla.
    // Necesitamos la posición del Draggable en el momento del release.
    // Draggable no pasa directamente la posición final en el evento.
    // Guardaremos la posición inicial del draggable y sumaremos el delta.
    // OJO: react-native-draggable por defecto podría tener `x` e `y` como props para la posición inicial,
    // pero onDragRelease da `dx` y `dy` (cambio desde el inicio del drag).
    // Para que funcione bien, debemos gestionar el estado de la posición de forma externa
    // o usar un componente que devuelva la posición final directamente.
    // En este caso, `room.position.x` y `room.position.y` son la posición *inicial*
    // al momento de renderizar el Draggable. `gestureState.dx` `dy` es el desplazamiento.
    
    const newX = room.position.x + gestureState.dx;
    const newY = room.position.y + gestureState.dy;
    
    updateRoomPosition(room.id, { x: newX, y: newY })
      .catch(err => Alert.alert("Error moviendo habitación", err.message));
  };

  const handleSelectRoom = (room) => {
    setSelectedRoom(room);
    setNewTaskName(''); // Limpiar input de tarea al cambiar de habitación
  };

  const handleCreateTaskForSelectedRoom = async () => {
    if (!newTaskName.trim()) {
      Alert.alert('Error', 'El nombre de la tarea no puede estar vacío.');
      return;
    }
    if (!selectedRoom) {
      Alert.alert('Error', 'Debes seleccionar una habitación para crear la tarea.');
      return;
    }
    try {
      await createTask(newTaskName, selectedRoom.id); // Pasar ID de la habitación seleccionada
      setNewTaskName('');
    } catch (error) {
      Alert.alert('Error al crear tarea', error.message);
    }
  };

  const tasksForSelectedRoom = selectedRoom
    ? allTasks.filter(task => task.roomId === selectedRoom.id)
    : [];

  const handleAssignTask = (taskId) => { 
    if (!user) { Alert.alert("Error", "Usuario no disponible."); return; }
    assignTaskToUser(taskId, user.uid, user.name || user.email || "Usuario Asignado")
      .catch(err => Alert.alert("Error asignando tarea", err.message)); 
  };
  
  const handleUnassignTask = (taskId) => { 
    unassignTask(taskId)
      .catch(err => Alert.alert("Error desasignando tarea", err.message));
  };
  
  const handleDeleteTaskPress = (taskId, taskName) => { 
    Alert.alert(
      'Confirmar Eliminación',
      `¿Estás seguro de que quieres eliminar la tarea "${taskName}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => deleteTask(taskId).catch(err => Alert.alert("Error eliminando tarea", err.message)),
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <ScrollView style={styles.container}>
      {!currentGroup ? (
        <Text style={styles.infoText}>Selecciona o crea un grupo para empezar.</Text>
      ) : (
        <>
          {/* Sección de Creación de Habitaciones */}
          <View style={styles.section}>
            <Text style={styles.title}>Crear Nueva Habitación:</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Nombre de la habitación"
                value={newRoomName}
                onChangeText={setNewRoomName}
                onSubmitEditing={handleCreateRoom}
              />
              <Button title="Crear" onPress={handleCreateRoom} disabled={!newRoomName.trim()} />
            </View>
          </View>

          {/* Mapa de Habitaciones */}
          <View style={styles.section}>
            <Text style={styles.title}>Habitaciones del Grupo:</Text>
            {rooms.length > 0 ? (
              <View style={styles.mapContainer}>
                {rooms.map(room => (
                  <Draggable
                    key={room.id}
                    x={room.position?.x || 50} // Posición X guardada o inicial
                    y={room.position?.y || 50} // Posición Y guardada o inicial
                    renderSize={80} 
                    renderColor={selectedRoom?.id === room.id ? '#FFB74D' : '#81D4FA'}
                    isCircle={false} // Para que sea cuadrado
                    onShortPressRelease={() => handleSelectRoom(room)}
                    onDragRelease={(event, gestureState) => handleRoomDragRelease(room, gestureState)}
                    onLongPress={() => {}} // Seleccionar habitación al arrastrar 
                    onPressOut={() => {}} // Seleccionar habitación al presionar
                    onPressIn={() => {}} // Seleccionar habitación al presionar
                    onDrag={() => {}}
                    onRelease={() => {}}
                  > 
                    <View style={styles.roomView}>
                       <Text style={styles.roomText}>{room.name}</Text>
                    </View>
                  </Draggable>
                ))}
              </View>
            ) : (
              <Text style={styles.infoText}>No hay habitaciones. ¡Crea la primera!</Text>
            )}
          </View>

          {/* Sección de Tareas para Habitación Seleccionada */}
          {selectedRoom && (
            <View style={styles.section}>
              <Text style={styles.title}>Tareas para: {selectedRoom.name}</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Nombre de la nueva tarea"
                  value={newTaskName}
                  onChangeText={setNewTaskName}
                  onSubmitEditing={handleCreateTaskForSelectedRoom}
                />
                <Button title="Añadir Tarea" onPress={handleCreateTaskForSelectedRoom} disabled={!newTaskName.trim()} />
              </View>

              {tasksForSelectedRoom.length > 0 ? (
                <FlatList
                  data={tasksForSelectedRoom}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <View style={styles.taskItem}>
                      <View style={styles.taskHeader}>
                        <Text style={styles.taskName}>{item.name}</Text>
                        {(user?.uid === item.createdBy || (currentGroup && user?.uid === currentGroup.owner)) && (
                          <TouchableOpacity onPress={() => handleDeleteTaskPress(item.id, item.name)} style={styles.deleteButton}>
                            <Ionicons name="trash-outline" size={22} color="#FF3B30" />
                          </TouchableOpacity>
                        )}
                      </View>
                      <Text style={styles.taskDetail}>
                        Encargado: {item.assignedToName ? item.assignedToName : 'Nadie'}
                      </Text>
                      <Text style={styles.taskDetail}>
                        Creada por: {item.createdByName || 'Desconocido'}
                      </Text>
                      {user && (
                        <View style={styles.taskActions}>
                          {!item.assignedTo && (
                            <Button title="Asignarme" onPress={() => handleAssignTask(item.id)} />
                          )}
                          {item.assignedTo === user.uid && ( 
                            <Button title="Desasignarme" onPress={() => handleUnassignTask(item.id)} color="orange" />
                          )}
                        </View>
                      )}
                    </View>
                  )}
                  // Para evitar scroll anidado problemático, si la lista es corta, no habilitar scroll.
                  // O darle una altura fija a la lista.
                  scrollEnabled={tasksForSelectedRoom.length > 3} // Ejemplo: habilitar scroll si hay más de 3 tareas
                  style={tasksForSelectedRoom.length <= 3 ? { maxHeight: 250 } : {}} // Altura máxima si es corta
                />
              ) : (
                <Text style={styles.infoText}>No hay tareas creadas en esta habitación.</Text>
              )}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  section: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginRight: 8,
    borderRadius: 5,
    backgroundColor: 'white',
  },
  mapContainer: {
    height: 300, 
    width: '100%', 
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 5,
    position: 'relative', 
    backgroundColor: '#E8F5E9', 
    overflow: 'hidden', 
  },
  roomView: { // Estilo para el contenido dentro del Draggable
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 5,
  },
  roomText: {
    color: 'black',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  taskItem: {
    backgroundColor: '#FFFDE7', 
    padding: 15,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 5,
    borderLeftColor: '#FFB74D', 
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#424242',
  },
  taskDetail: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
  },
  taskActions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 10,
    gap: 10, 
  },
  deleteButton: {
    padding: 5,
  },
  infoText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 15,
    paddingVertical: 20,
  }
});
