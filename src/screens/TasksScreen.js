// FILE: src/screens/TasksScreen.js
import React, { useState, useContext, useMemo, useCallback, useEffect } from 'react';
import { 
  View, Text, TextInput, Button, FlatList, Alert, 
  StyleSheet, TouchableOpacity, Dimensions, Platform, ScrollView
} from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  runOnJS,
  withSpring,
} from 'react-native-reanimated';
import { Picker } from '@react-native-picker/picker';
import { UserContext } from '../context/UserContext';
import { GroupContext } from '../context/GroupContext';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const MAP_HEIGHT = 300; 

const PREDEFINED_SHAPES = [
  { label: 'Rectángulo', value: 'rectangle' },
  { label: 'Redondeado', value: 'rounded' },
  { label: 'Círculo', value: 'circle' },
];

const DraggableRoomComponent = ({ room, onSelectRoom, onDragEnd, selected, initialPosition, styles: screenStyles }) => {
  const translateX = useSharedValue(initialPosition.x);
  const translateY = useSharedValue(initialPosition.y);

  // Actualizar la posición si la prop initialPosition cambia (ej. desde DB)
  useEffect(() => {
    translateX.value = withSpring(initialPosition.x);
    translateY.value = withSpring(initialPosition.y);
  }, [initialPosition.x, initialPosition.y, translateX, translateY]);


  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, ctx) => {
      ctx.startX = translateX.value;
      ctx.startY = translateY.value;
    },
    onActive: (event, ctx) => {
      translateX.value = ctx.startX + event.translationX;
      translateY.value = ctx.startY + event.translationY;
    },
    onEnd: () => {
      const roomWidth = room.width || (screenStyles.roomBase?.minWidth || 70);
      const roomHeight = room.height || (screenStyles.roomBase?.minHeight || 40);
      
      const newX = Math.max(0, Math.min(translateX.value, screenWidth - roomWidth - (Platform.OS === 'web' ? 0 : 32) )); // 32 es padding aprox. del mapContainer
      const newY = Math.max(0, Math.min(translateY.value, MAP_HEIGHT - roomHeight - (Platform.OS === 'web' ? 0 : 10) ));

      translateX.value = withSpring(newX);
      translateY.value = withSpring(newY);
      
      if (onDragEnd) {
        runOnJS(onDragEnd)({ x: newX, y: newY });
      }
    },
  });

  const animatedRoomWrapperStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        // La rotación se aplica al View interno para que el drag no se vea afectado por el eje rotado
      ],
    };
  });

  const getRoomDynamicStyle = () => {
    const baseStyle = { ...screenStyles.roomBase }; // Usar roomBase para estilos comunes
    if (selected) {
      baseStyle.borderColor = screenStyles.selectedRoom.borderColor;
      baseStyle.borderWidth = screenStyles.selectedRoom.borderWidth;
    }

    const roomW = room.width || baseStyle.minWidth || 70;
    const roomH = room.height || baseStyle.minHeight || 40;

    baseStyle.width = roomW;
    baseStyle.height = roomH;
    baseStyle.transform = [{ rotateZ: `${room.rotation || 0}deg` }];


    switch (room.shape) {
      case 'rounded':
        baseStyle.borderRadius = Math.min(roomW, roomH) / 3; // Más redondeado
        break;
      case 'circle':
        const circleDiameter = Math.min(roomW, roomH);
        baseStyle.width = circleDiameter;
        baseStyle.height = circleDiameter;
        baseStyle.borderRadius = circleDiameter / 2;
        break;
      case 'rectangle':
      default:
        baseStyle.borderRadius = screenStyles.roomBase.borderRadius || 8;
        break;
    }
    return baseStyle;
  };

  return (
    <PanGestureHandler onGestureEvent={gestureHandler}>
      <Animated.View style={[screenStyles.draggableWrapper, animatedRoomWrapperStyle]}>
        <TouchableOpacity onPress={onSelectRoom} activeOpacity={0.7}>
          <Animated.View style={getRoomDynamicStyle()}>
            <Text style={screenStyles.roomName}>{room.name}</Text>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </PanGestureHandler>
  );
};


export default function TasksScreen() {
  const { user } = useContext(UserContext);
  const {
    currentGroup,
    tasks,
    rooms,
    createRoom,
    updateRoomPosition,
    updateRoomProperties, // Usaremos esta para shape, size, rotation
    deleteRoom,           // Para eliminar habitación
    assignTaskToUser,
    unassignTask,
    deleteTask: deleteTaskFromContext, // Renombrar para evitar conflicto con la local
    createTask,
  } = useContext(GroupContext);
  const { theme } = useTheme();
  const styles = getScreenStyles(theme);

  const [newRoomName, setNewRoomName] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [newTaskName, setNewTaskName] = useState('');

  // Estados para los inputs de propiedades de la habitación seleccionada
  const [editingRoomWidth, setEditingRoomWidth] = useState('');
  const [editingRoomHeight, setEditingRoomHeight] = useState('');

  const selectedRoom = useMemo(() => {
    if (!selectedRoomId) return null;
    const foundRoom = rooms.find(r => r.id === selectedRoomId);
    if (foundRoom) {
      // Sincronizar inputs cuando selectedRoom cambia
      setEditingRoomWidth((foundRoom.width || 100).toString());
      setEditingRoomHeight((foundRoom.height || 60).toString());
    } else {
      // Si la habitación seleccionada fue eliminada, limpiar inputs
      setEditingRoomWidth('');
      setEditingRoomHeight('');
    }
    return foundRoom;
  }, [rooms, selectedRoomId]);


  const tasksForSelectedRoom = useMemo(() => {
    if (!selectedRoomId && !tasks.some(task => task.roomId === null)) return [];
    // Mostrar tareas asignadas a la habitación seleccionada O tareas sin habitación asignada (roomId es null)
    return tasks.filter(task => task.roomId === selectedRoomId || (selectedRoomId === null && task.roomId === null));
  }, [tasks, selectedRoomId]);


  const groupMembers = useMemo(() => {
    if (!currentGroup || !currentGroup.membersDetails || currentGroup.membersDetails.length === 0) {
        // Fallback si membersDetails no está o está vacío, usar la info del usuario actual si es miembro
        if (user && currentGroup && currentGroup.members && currentGroup.members.includes(user.uid)) {
             return [{ id: user.uid, name: user.name || user.email || "Yo" }];
        }
        return [];
    }
    return currentGroup.membersDetails; // Asumiendo que membersDetails tiene [{id, name}, ...]
                                      // Esto debería venir populado desde UserContext o GroupContext
                                      // si necesitas los nombres de todos los miembros.
                                      // Por ahora, si no está, la asignación podría fallar en mostrar nombres.
                                      // Para una demo más completa, asegúrate que GroupContext/UserContext provean esto.
                                      // Temporalmente:
                                      // return currentGroup.members.map(uid => ({ id: uid, name: uid === user.uid ? (user.name || 'Yo') : `Usuario ${uid.substring(0,4)}`}));
  }, [currentGroup, user]);


  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) return Alert.alert('Error', 'Nombre de habitación vacío.');
    try {
      await createRoom(newRoomName); setNewRoomName('');
    } catch (e) { Alert.alert('Error', e.message); }
  };

  const handleSelectRoom = (roomId) => {
    setSelectedRoomId(roomId);
    const room = rooms.find(r => r.id === roomId);
    if (room) {
      setEditingRoomWidth((room.width || 100).toString());
      setEditingRoomHeight((room.height || 60).toString());
    }
  };
  
  const handleUpdateRoomPositionOptimistic = (roomId, newPosition) => {
    // Actualización optimista en la UI (reanimated se encarga)
    // Llamada a la base de datos
    updateRoomPosition(roomId, newPosition).catch(error => {
      Alert.alert('Error DB', `No se pudo guardar la posición: ${error.message}`);
      // Podrías necesitar revertir la posición en la UI si la DB falla,
      // pero reanimated ya tiene la posición visual. Forzar un re-fetch o
      // mover el sharedValue de vuelta a la `initialPosition` original podría ser una opción.
    });
  };

  const handleUpdateRoomShape = async (newShape) => {
    if (!selectedRoom) return;
    try {
      await updateRoomProperties(selectedRoom.id, { shape: newShape });
    } catch (e) { Alert.alert('Error', `No se pudo actualizar la forma: ${e.message}`); }
  };

  const handleUpdateRoomSize = async () => {
    if (!selectedRoom) return;
    const newWidth = parseInt(editingRoomWidth, 10);
    const newHeight = parseInt(editingRoomHeight, 10);
    if (isNaN(newWidth) || isNaN(newHeight) || newWidth <= 0 || newHeight <= 0) {
      Alert.alert('Error', 'Ancho y alto deben ser números positivos.');
      return;
    }
    try {
      await updateRoomProperties(selectedRoom.id, { width: newWidth, height: newHeight });
    } catch (e) { Alert.alert('Error', `No se pudo actualizar el tamaño: ${e.message}`); }
  };
  
  const handleUpdateRoomRotation = async (degrees) => {
    if (!selectedRoom) return;
    const currentRotation = selectedRoom.rotation || 0;
    const newRotation = (currentRotation + degrees + 360) % 360; // Normalizar a 0-359
    try {
      await updateRoomProperties(selectedRoom.id, { rotation: newRotation });
    } catch (e) { Alert.alert('Error', `No se pudo actualizar la rotación: ${e.message}`); }
  };

  const handleDeleteSelectedRoom = async () => {
    if (!selectedRoom) return;
    Alert.alert(
      'Confirmar Eliminación',
      `¿Estás seguro de que quieres eliminar la habitación "${selectedRoom.name}"? Las tareas asociadas se desvincularán.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteRoom(selectedRoom.id);
              setSelectedRoomId(null); // Deseleccionar
              Alert.alert('Éxito', 'Habitación eliminada.');
            } catch (error) {
              Alert.alert('Error', `No se pudo eliminar la habitación: ${error.message}`);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleCreateTask = async () => {
    if (!newTaskName.trim()) return Alert.alert('Error', 'Nombre de tarea vacío.');
    if (!selectedRoomId && selectedRoomId !== null) return Alert.alert('Error', 'Selecciona una habitación o crea tareas generales (deseleccionando habitación).');
    try {
      await createTask(newTaskName, selectedRoomId); // selectedRoomId puede ser null para tareas generales
      setNewTaskName('');
    } catch (e) { Alert.alert('Error', e.message); }
  };
  
  const confirmAndAssignTask = async (taskId, member) => {
    try {
      await assignTaskToUser(taskId, member.id, member.name);
      Alert.alert('Éxito', `Tarea asignada a ${member.name}.`);
    } catch (error) {
      Alert.alert('Error', `No se pudo asignar la tarea: ${error.message}`);
    }
  };

  const handleAttemptAssignTask = (task) => {
    if (!currentGroup || !currentGroup.membersDetails || currentGroup.membersDetails.length === 0) {
      Alert.alert("Información", "No hay miembros en el grupo para asignar la tarea, o los detalles de los miembros no están disponibles.");
      return;
    }
    const memberButtons = currentGroup.membersDetails.map(member => ({
      text: member.name,
      onPress: () => confirmAndAssignTask(task.id, member),
    }));
    memberButtons.push({ text: 'Cancelar', style: 'cancel' });

    Alert.alert(
      `Asignar Tarea "${task.name}"`,
      'Selecciona un miembro:',
      memberButtons,
      { cancelable: true }
    );
  };

  const handleUnassignTask = async (taskId) => {
    try { await unassignTask(taskId); } catch (e) { Alert.alert('Error', e.message); }
  };

  const handleDeleteTask = async (taskId, taskName) => {
    Alert.alert('Confirmar', `Eliminar tarea "${taskName}"?`, [
      { text: 'Cancelar' },
      { text: 'Eliminar', onPress: async () => {
        try { await deleteTaskFromContext(taskId); } catch (e) { Alert.alert('Error', e.message); }
      }},
    ]);
  };

  const renderTaskItem = ({ item }) => (
    <View style={styles.taskItem}>
      <View style={styles.taskInfo}>
        <Text style={styles.taskName}>{item.name}</Text>
        {item.assignedToName && <Text style={styles.assignedToText}>Asignada a: {item.assignedToName}</Text>}
        {!item.roomId && selectedRoomId !== null && <Text style={styles.genericTaskText}>(Tarea general)</Text>}
      </View>
      <View style={styles.taskActions}>
        {item.assignedTo ? (
          <TouchableOpacity onPress={() => handleUnassignTask(item.id)} style={styles.actionButton}>
            <Ionicons name="person-remove-outline" size={20} color={theme.error} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => handleAttemptAssignTask(item)} style={styles.actionButton}>
            <Ionicons name="person-add-outline" size={20} color={theme.primary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => handleDeleteTask(item.id, item.name)} style={styles.actionButton}>
          <Ionicons name="trash-outline" size={20} color={theme.error} />
        </TouchableOpacity>
      </View>
    </View>
  );
  
  const ListHeader = () => (
    <View style={styles.listHeaderContainer}>
      <Text style={styles.mainTitle}>Gestión de Habitaciones y Tareas</Text>
      
      <View style={styles.sectionBox}>
        <Text style={styles.sectionTitle}>Nueva Habitación</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Nombre habitación"
            placeholderTextColor={theme.placeholder}
            value={newRoomName}
            onChangeText={setNewRoomName}
          />
          <Button title="Crear" onPress={handleCreateRoom} color={theme.primary} />
        </View>
      </View>

      <View style={styles.mapContainer}>
        {rooms.map(room => (
          <DraggableRoomComponent
            key={room.id}
            room={room}
            onSelectRoom={() => handleSelectRoom(room.id)}
            onDragEnd={(newPosition) => handleUpdateRoomPositionOptimistic(room.id, newPosition)}
            selected={selectedRoomId === room.id}
            initialPosition={room.position || { x: 10, y: 10 }}
            styles={styles}
          />
        ))}
      </View>
      <TouchableOpacity 
          onPress={() => setSelectedRoomId(null)} 
          style={styles.clearSelectionButton}
      >
          <Text style={styles.clearSelectionButtonText}>Mostrar Tareas Generales / Deseleccionar Habitación</Text>
      </TouchableOpacity>

      {selectedRoom && (
        <View style={[styles.sectionBox, styles.controlsBox]}>
          <Text style={styles.sectionTitle}>Controles para "{selectedRoom.name}"</Text>
          {/* Forma */}
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Forma:</Text>
            <Picker
              selectedValue={selectedRoom.shape || 'rectangle'}
              style={styles.picker} itemStyle={styles.pickerItem}
              onValueChange={(itemValue) => handleUpdateRoomShape(itemValue)}
            >
              {PREDEFINED_SHAPES.map(shape => (
                <Picker.Item key={shape.value} label={shape.label} value={shape.value} color={Platform.OS === 'android' ? theme.textPrimary : undefined}/>
              ))}
            </Picker>
          </View>
          {/* Tamaño */}
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Ancho:</Text>
            <TextInput style={styles.sizeInput} value={editingRoomWidth} onChangeText={setEditingRoomWidth} keyboardType="numeric" />
            <Text style={styles.controlLabel}>Alto:</Text>
            <TextInput style={styles.sizeInput} value={editingRoomHeight} onChangeText={setEditingRoomHeight} keyboardType="numeric" />
            <Button title="Aplicar Tamaño" onPress={handleUpdateRoomSize} color={theme.accent}/>
          </View>
          {/* Rotación */}
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Rotación: {selectedRoom.rotation || 0}°</Text>
            <Button title="-15°" onPress={() => handleUpdateRoomRotation(-15)} color={theme.accent}/>
            <Button title="+15°" onPress={() => handleUpdateRoomRotation(15)} color={theme.accent}/>
          </View>
           {/* Eliminar Habitación */}
           <TouchableOpacity style={styles.deleteRoomButton} onPress={handleDeleteSelectedRoom}>
             <Ionicons name="trash-outline" size={20} color={theme.textLight} />
             <Text style={styles.deleteRoomButtonText}>Eliminar Habitación</Text>
           </TouchableOpacity>
        </View>
      )}

      <View style={styles.sectionBox}>
        <Text style={styles.sectionTitle}>
          {selectedRoomId ? `Tareas para ${selectedRoom?.name || '...'}:` : 'Tareas Generales (sin habitación asignada):'}
        </Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Nueva tarea"
            placeholderTextColor={theme.placeholder}
            value={newTaskName}
            onChangeText={setNewTaskName}
          />
          <Button title="Añadir Tarea" onPress={handleCreateTask} color={theme.primary} />
        </View>
      </View>
    </View>
  );

  if (!currentGroup) {
    return (
      <View style={[styles.container, styles.centeredMessageContainer]}>
        <Ionicons name="alert-circle-outline" size={60} color={theme.textSecondary} />
        <Text style={styles.centeredMessageText}>
          Selecciona o crea un grupo para gestionar tareas.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={tasksForSelectedRoom}
      keyExtractor={(item) => item.id}
      renderItem={renderTaskItem}
      ListHeaderComponent={ListHeader}
      ListEmptyComponent={
        <View style={styles.tasksListContainer}>
            <Text style={styles.emptyTasksText}>
            {selectedRoomId ? 'No hay tareas para esta habitación.' : (selectedRoomId === null ? 'No hay tareas generales.' : 'Selecciona habitación o "Tareas Generales".')}
            </Text>
        </View>
      }
      contentContainerStyle={{ paddingBottom: 20 }}
    />
  );
}

const getScreenStyles = (theme) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: theme.background,
  },
  centeredMessageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  centeredMessageText: {
    marginTop: 15,
    fontSize: 18,
    textAlign: 'center',
    color: theme.textSecondary,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.primary,
    textAlign: 'center',
    marginBottom: 20,
  },
  listHeaderContainer: {
    paddingHorizontal: Platform.OS === 'web' ? 30 : 16, // Más padding en web
    paddingTop: 16,
  },
  sectionBox: {
    backgroundColor: theme.cardBackground,
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  controlsBox: {
    borderColor: theme.primary,
    borderWidth: 1,
  },
  inputRow: { 
    flexDirection: 'row', 
    marginBottom: 10, 
    alignItems: 'center',
    gap: 8,
  },
  input: { 
    flex: 1, 
    borderWidth: 1, 
    borderColor: theme.border, 
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    color: theme.textPrimary,
    backgroundColor: theme.inputBackground,
    fontSize: 16,
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    marginBottom: 12,
    color: theme.textPrimary,
  },
  mapContainer: {
    height: MAP_HEIGHT,
    borderWidth: 1.5,
    borderColor: theme.border,
    backgroundColor: theme.cardBackgroundFaded || '#f9f9f9',
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 10,
    borderRadius: 12,
  },
  clearSelectionButton: {
    backgroundColor: theme.accentFaded,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  clearSelectionButtonText: {
    color: theme.accent,
    fontWeight: '500',
    fontSize: 14,
  },
  draggableWrapper: {
    position: 'absolute', // Crucial for positioning
  },
  roomBase: { // Estilos base para todas las formas de habitación
    padding: 10, // Padding interno
    borderWidth: 2,
    borderColor: theme.accent, // Color de borde por defecto
    borderRadius: 8, // Para 'rectangle'
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50, // Mínimo para que el texto quepa
    minHeight: 30,
    backgroundColor: theme.primary, // Color de fondo
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  roomName: {
    color: theme.textLight,
    fontWeight: 'bold',
    fontSize: 12,
    textAlign: 'center',
  },
  selectedRoom: { // Solo para destacar el borde
    borderColor: theme.successDarker || 'darkgreen',
    borderWidth: 3,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8, // Espacio entre elementos de la fila
  },
  controlLabel: {
    fontSize: 15,
    color: theme.textSecondary,
    marginRight: 5,
  },
  picker: {
    flex: Platform.OS === 'android' ? 1 : undefined, // En Android, flex:1 ayuda
    width: Platform.OS === 'ios' ? 150 : undefined, // En iOS, un ancho fijo puede ser mejor
    height: Platform.OS === 'android' ? 40 : 150, // Altura diferente para el componente nativo
    color: theme.textPrimary,
    backgroundColor: theme.inputBackground,
  },
  pickerItem: { // Para iOS
    color: theme.textPrimary,
    height: 120,
  },
  sizeInput: {
    borderWidth: 1,
    borderColor: theme.border,
    paddingVertical: 8,
    paddingHorizontal: 10,
    width: 60,
    borderRadius: 6,
    color: theme.textPrimary,
    backgroundColor: theme.inputBackground,
    textAlign: 'center',
  },
  deleteRoomButton: {
    flexDirection: 'row',
    backgroundColor: theme.error,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    alignSelf: 'flex-start', // Para que no ocupe todo el ancho
  },
  deleteRoomButtonText: {
    color: theme.textLight,
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  tasksListContainer: {
    height: 200, // Altura fija
    backgroundColor: theme.cardBackground,
    borderRadius: 10,
    padding: 10,
    marginHorizontal: Platform.OS === 'web' ? 30 : 16,
    marginTop: 5, 
    marginBottom: 20,
  },
  emptyTasksText: {
    textAlign: 'center',
    color: theme.textSecondary,
    fontSize: 16,
    paddingVertical: 20,
  },
  taskItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: Platform.OS === 'web' ? 30 : 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: theme.cardBackground,
  },
  taskInfo: { flex: 1 },
  taskName: { fontSize: 17, fontWeight: '500', color: theme.textPrimary },
  assignedToText: { fontSize: 13, color: theme.textSecondary, marginTop: 3 },
  genericTaskText: { fontSize: 12, color: theme.accent, fontStyle: 'italic', marginTop: 2 },
  taskActions: { flexDirection: 'row' },
  actionButton: { marginLeft: 15, padding: 5 },
  shapeSelectorWrapper: { /* Eliminado o reusado como controlRow */ },
  shapeSelectorLabel: { /* Eliminado o reusado como controlLabel */ },
  shapePicker: { /* Reemplazado por picker en controlRow */ },
  shapePickerItem: { /* Reemplazado por pickerItem en controlRow */ },
});
