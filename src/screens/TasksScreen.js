// src/screens/TasksScreen.js
import React, { useState, useContext, useMemo, useCallback } from 'react';
import {
  View, Text, TextInput, Button, FlatList, Alert,
  StyleSheet, TouchableOpacity, Dimensions
} from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  runOnJS,
} from 'react-native-reanimated';

import { UserContext } from '../context/UserContext';
import { GroupContext } from '../context/GroupContext';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

// Componente DraggableRoom reutilizable
const DraggableRoomComponent = ({ room, onSelectRoom, onDragEnd, selected, initialPosition, styles }) => {
  const translateX = useSharedValue(initialPosition.x);
  const translateY = useSharedValue(initialPosition.y);
  const databaseStartX = useSharedValue(initialPosition.x);
  const databaseStartY = useSharedValue(initialPosition.y);

  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, ctx) => {
      ctx.startX = translateX.value;
      ctx.startY = translateY.value;
      databaseStartX.value = initialPosition.x;
      databaseStartY.value = initialPosition.y;
    },
    onActive: (event, ctx) => {
      translateX.value = ctx.startX + event.translationX;
      translateY.value = ctx.startY + event.translationY;
    },
    onEnd: (event) => { // ctx no es necesario aquí si usamos databaseStart y event.translation
      const finalX = databaseStartX.value + event.translationX;
      const finalY = databaseStartY.value + event.translationY;

      if (onDragEnd) {
        runOnJS(onDragEnd)({ x: finalX, y: finalY });
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
      ],
    };
  });

  return (
    <PanGestureHandler onGestureEvent={gestureHandler}>
      <Animated.View style={[styles.draggableWrapper, animatedStyle]}>
        <TouchableOpacity onPress={onSelectRoom}>
          <View style={[styles.room, selected && styles.selectedRoom]}>
            <Text style={styles.roomName}>{room.name}</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </PanGestureHandler>
  );
};

// Función para generar estilos dependientes del tema
const getScreenStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  // Estilos para el ListHeaderComponent
  listHeaderContainer: {
    padding: 16,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'center'
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.border || '#ccc',
    padding: 10,
    marginRight: 8,
    borderRadius: 8,
    color: theme.textPrimary,
    backgroundColor: theme.inputBackground
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    color: theme.textPrimary,
  },
  mapContainer: {
    height: 300,
    borderWidth: 1,
    borderColor: theme.border || 'grey',
    backgroundColor: theme.cardBackground || '#f0f0f0',
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 20,
    borderRadius: 8,
  },
  draggableWrapper: {
    position: 'absolute',
  },
  room: {
    padding: 12,
    backgroundColor: theme.primary || 'lightblue',
    borderWidth: 1,
    borderColor: theme.accent || 'blue',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
    minHeight: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  selectedRoom: {
    borderColor: theme.error || 'red',
    borderWidth: 3,
  },
  roomName: {
    fontWeight: 'bold',
    color: theme.textLight || '#fff',
    fontSize: 14,
  },
  tasksSectionHeader: { // Estilo para el contenedor de la sección de tareas (dentro del header)
    marginTop: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.border || '#e0e0e0',
  },
  // Estilos para los items de la lista de tareas
  taskItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16, // Padding para los items
    borderBottomWidth: 1,
    borderBottomColor: theme.border || '#eee',
    backgroundColor: theme.background, // Fondo para items de tarea
  },
  taskName: {
    flex: 1,
    fontSize: 16,
    color: theme.textPrimary,
  },
  assignButton: {
    marginLeft: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: theme.primary || '#007bff',
    borderRadius: 5,
  },
  assignButtonText: {
    color: theme.textLight || 'white',
    fontSize: 14,
  },
  assignedToText: {
    fontStyle: 'italic',
    color: theme.textSecondary || 'gray',
    marginRight: 8,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  actionIcon: {
    marginLeft: 10,
    padding: 5,
  },
  emptyText: { // Para mensajes de lista vacía
    textAlign: 'center',
    marginTop: 20,
    padding: 16,
    color: theme.textSecondary,
    fontSize: 16,
  },
  emptyListContainer: { // Para el contentContainerStyle de FlatList cuando está vacío
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const ListHeaderComponent = React.memo(({
  currentGroup,
  rooms,
  newRoomName,
  setNewRoomName,
  handleCreateRoom,
  selectedRoom,
  handleSelectRoom,
  newTaskName,
  setNewTaskName,
  handleCreateTaskForSelectedRoom,
  mapContainerLayout,
  handleMapLayout,
  styles,
  theme
}) => {
  return (
    <View style={styles.listHeaderContainer}>
      <Text style={styles.sectionTitle}>Habitaciones del Grupo</Text>
      {!currentGroup && <Text style={styles.emptyText}>Por favor, selecciona un grupo.</Text>}
      {currentGroup && (
        <>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Nombre nueva habitación"
              placeholderTextColor={theme.placeholder}
              value={newRoomName}
              onChangeText={setNewRoomName}
            />
            <Button title="Crear Habitación" onPress={handleCreateRoom} color={theme.primary} />
          </View>

          <View style={styles.mapContainer} onLayout={handleMapLayout}>
            {rooms.map((room) => (
              <DraggableRoomComponent
                key={room.id}
                room={room}
                initialPosition={room.position || { x: 0, y: 0 }}
                onSelectRoom={() => handleSelectRoom(room)}
                onDragEnd={(newPosition) => handleRoomDragRelease(room.id, newPosition)}
                selected={selectedRoom?.id === room.id}
                styles={styles}
              />
            ))}
          </View>
        </>
      )}

      {selectedRoom && (
        <View style={styles.tasksSectionHeader}>
          <Text style={styles.sectionTitle}>Tareas para: {selectedRoom.name}</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Nueva tarea para esta habitación"
              value={newTaskName}
              onChangeText={setNewTaskName}
            />
            <Button title="Añadir Tarea" onPress={handleCreateTaskForSelectedRoom} color={theme.primary} />
          </View>
        </View>
      )}
    </View>
  );
}, (prevProps, nextProps) => {
  // Implementa una comparación superficial de las props para determinar si se debe re-renderizar
  return (
    prevProps.currentGroup === nextProps.currentGroup &&
    prevProps.rooms === nextProps.rooms &&
    prevProps.newRoomName === nextProps.newRoomName &&
    prevProps.selectedRoom === nextProps.selectedRoom &&
    prevProps.newTaskName === nextProps.newTaskName &&
    prevProps.mapContainerLayout === nextProps.mapContainerLayout
  );
});

export default function TasksScreen() {
  const { user } = useContext(UserContext);
  const {
    currentGroup,
    rooms,
    createRoom,
    updateRoomPosition,
    tasks: allTasks,
    createTask,
    assignTaskToUser,
    unassignTask,
    deleteTask
  } = useContext(GroupContext);
  const { theme } = useTheme();

  const [newRoomName, setNewRoomName] = useState('');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [newTaskName, setNewTaskName] = useState('');

  const styles = useMemo(() => getScreenStyles(theme), [theme]);
  const mapContainerLayout = useSharedValue({ width: 0, height: 0 });

  const handleMapLayout = useCallback((event) => {
    const { width, height } = event.nativeEvent.layout;
    mapContainerLayout.value = { width, height };
  }, [mapContainerLayout]);

  const handleCreateRoom = useCallback(async () => {
    if (!newRoomName.trim()) {
      Alert.alert('Error', 'El nombre de la habitación no puede estar vacío.');
      return;
    }
    if (!currentGroup) {
      Alert.alert('Error', 'Debes seleccionar un grupo para crear habitaciones.');
      return;
    }
    try {
      const containerWidth = mapContainerLayout.value.width || Dimensions.get('window').width * 0.8;
      const containerHeight = mapContainerLayout.value.height || 250;
      const roomWidth = 100;
      const roomHeight = 60;
      const maxPosX = Math.max(0, containerWidth - roomWidth);
      const maxPosY = Math.max(0, containerHeight - roomHeight);
      const initialX = Math.floor(Math.random() * maxPosX);
      const initialY = Math.floor(Math.random() * maxPosY);
      await createRoom(newRoomName, { x: initialX, y: initialY });
      setNewRoomName('');
    } catch (error) {
      Alert.alert('Error al crear habitación', error.message);
    }
  }, [newRoomName, currentGroup, createRoom, mapContainerLayout]);

  const handleRoomDragRelease = useCallback((roomId, newPosition) => {
    if (!currentGroup) return;
    const containerWidth = mapContainerLayout.value.width || Infinity;
    const containerHeight = mapContainerLayout.value.height || Infinity;
    const roomWidth = 100;
    const roomHeight = 60;
    const constrainedX = Math.max(0, Math.min(newPosition.x, containerWidth - roomWidth));
    const constrainedY = Math.max(0, Math.min(newPosition.y, containerHeight - roomHeight));
    updateRoomPosition(roomId, { x: constrainedX, y: constrainedY })
      .catch(err => Alert.alert("Error moviendo habitación", err.message));
  }, [currentGroup, updateRoomPosition, mapContainerLayout]);

  const handleSelectRoom = useCallback((room) => {
    setSelectedRoom(room);
    setNewTaskName('');
  }, [setSelectedRoom, setNewTaskName]);

  const handleCreateTaskForSelectedRoom = useCallback(async () => {
    if (!newTaskName.trim()) {
      Alert.alert('Error', 'El nombre de la tarea no puede estar vacío.');
      return;
    }
    if (!selectedRoom) {
      Alert.alert('Error', 'Debes seleccionar una habitación para crear la tarea.');
      return;
    }
    try {
      await createTask(newTaskName, selectedRoom.id);
      setNewTaskName('');
    } catch (error) {
      Alert.alert('Error al crear tarea', error.message);
    }
  }, [newTaskName, selectedRoom, createTask]);

  const tasksForSelectedRoom = useMemo(() =>
    selectedRoom
      ? allTasks.filter(task => task.roomId === selectedRoom.id)
      : [],
    [selectedRoom, allTasks]
  );

  return (
    <FlatList
      style={styles.container}
      data={tasksForSelectedRoom}
      keyExtractor={item => item.id}
      ListHeaderComponent={useMemo(() => (
        <ListHeaderComponent
          currentGroup={currentGroup}
          rooms={rooms}
          newRoomName={newRoomName}
          setNewRoomName={setNewRoomName}
          handleCreateRoom={handleCreateRoom}
          selectedRoom={selectedRoom}
          handleSelectRoom={handleSelectRoom}
          newTaskName={newTaskName}
          setNewTaskName={setNewTaskName}
          handleCreateTaskForSelectedRoom={handleCreateTaskForSelectedRoom}
          mapContainerLayout={mapContainerLayout}
          handleMapLayout={handleMapLayout}
          styles={styles}
          theme={theme}
        />
      ), [
        currentGroup, rooms, newRoomName, setNewRoomName, handleCreateRoom,
        selectedRoom, handleSelectRoom, newTaskName, setNewTaskName,
        handleCreateTaskForSelectedRoom, mapContainerLayout, handleMapLayout,
        styles, theme
      ])}
      renderItem={({ item }) => (
        <View style={styles.taskItem}>
          <Text style={styles.taskName}>{item.name}</Text>
          <View style={styles.actionsContainer}>
            {item.assignedTo ? (
              <>
                <Text style={styles.assignedToText}>Asignada a: {item.assignedToName}</Text>
                {user && item.assignedTo === user.uid && (
                  <TouchableOpacity onPress={() => unassignTask(item.id)} style={styles.actionIcon}>
                    <Ionicons name="close-circle-outline" size={24} color={theme.error || 'red'} />
                  </TouchableOpacity>
                )}
              </>
            ) : (
              user && (
                <TouchableOpacity onPress={() => assignTaskToUser(item.id, user.uid, user.name || user.email)} style={styles.assignButton}>
                  <Text style={styles.assignButtonText}>Asignarme</Text>
                </TouchableOpacity>
              )
            )}
            {user && item.createdBy === user.uid && (
              <TouchableOpacity onPress={() => deleteTask(item.id)} style={styles.actionIcon}>
                <Ionicons name="trash-outline" size={24} color={theme.error || 'red'} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
      ListEmptyComponent={
        currentGroup ? (
          selectedRoom && tasksForSelectedRoom.length === 0 ?
            <Text style={styles.emptyText}>No hay tareas para esta habitación.</Text> :
            !selectedRoom ? <Text style={styles.emptyText}>Selecciona una habitación para ver sus tareas.</Text> : null
        ) : null
      }
      contentContainerStyle={tasksForSelectedRoom.length === 0 && selectedRoom ? styles.emptyListContainer : {}}
    />
  );
}
