// src/screens/TasksScreen.js
import React, { useState, useContext, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, Button, FlatList, Alert,
  StyleSheet, Dimensions, TouchableOpacity, Image
} from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated';

import { UserContext } from '../context/UserContext';
import { GroupContext } from '../context/GroupContext';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const AVAILABLE_SHAPES = ['rectangle', 'circle'];
const MIN_ROOM_SIZE = 40;
const MAX_ROOM_SIZE = 250;
const SNAP_DURATION_HIGHLIGHT_MS = 700;

// --- DraggableRoomComponent ---
const DraggableRoomComponent = ({
  room, onSelectRoom, onDragEnd, onUpdateRoomGestureProperties,
  selected, initialPosition, styles, isHighlighted
}) => {
  const translateX = useSharedValue(initialPosition.x);
  const translateY = useSharedValue(initialPosition.y);
  const dragStartX = useSharedValue(0);
  const dragStartY = useSharedValue(0);
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const savedRotation = useSharedValue(Number(room.rotation) || 0);
  const { theme } = useTheme();

  useEffect(() => {
    translateX.value = initialPosition.x;
    translateY.value = initialPosition.y;
    scale.value = 1;
    rotation.value = 0;
    savedRotation.value = Number(room.rotation) || 0;
  }, [room.id, initialPosition.x, initialPosition.y, room.rotation]);

  const animatedStyle = useAnimatedStyle(() => {
    const currentWidth = (Number(room.width) || 100) * scale.value;
    const currentHeight = (Number(room.height) || 60) * scale.value;
    const currentRotationDegrees = savedRotation.value + (rotation.value * 180 / Math.PI);

    let dynamicBorderColor = selected ? (theme.error || 'red') : (theme.accent || 'blue');
    if (isHighlighted) {
      dynamicBorderColor = theme.warning || 'yellow';
    }

    return {
      width: Math.max(MIN_ROOM_SIZE, Math.min(MAX_ROOM_SIZE, currentWidth)),
      height: Math.max(MIN_ROOM_SIZE, Math.min(MAX_ROOM_SIZE, currentHeight)),
      borderColor: dynamicBorderColor,
      borderWidth: isHighlighted || selected ? 3 : 1,
      borderRadius: room.shape === 'circle'
        ? Math.max(MIN_ROOM_SIZE, Math.min(MAX_ROOM_SIZE, Math.max(currentWidth, currentHeight))) / 2
        : 8,
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${currentRotationDegrees}deg` },
      ],
    };
  });

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      dragStartX.value = translateX.value;
      dragStartY.value = translateY.value;
      runOnJS(onDragEnd)(room.id, { x: translateX.value, y: translateY.value }, 'start');
    })
    .onUpdate((event) => {
      translateX.value = dragStartX.value + event.translationX;
      translateY.value = dragStartY.value + event.translationY;
    })
    .onEnd(() => {
      if (onDragEnd) {
        runOnJS(onDragEnd)(room.id, { x: translateX.value, y: translateY.value }, 'end');
      }
    })
    .shouldCancelWhenOutside(false);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => { scale.value = event.scale; })
    .onEnd(() => {
      const finalWidth = Math.max(MIN_ROOM_SIZE, Math.min(MAX_ROOM_SIZE, (Number(room.width) || 100) * scale.value));
      const finalHeight = Math.max(MIN_ROOM_SIZE, Math.min(MAX_ROOM_SIZE, (Number(room.height) || 60) * scale.value));
      if (onUpdateRoomGestureProperties) {
        runOnJS(onUpdateRoomGestureProperties)(room.id, { width: finalWidth, height: finalHeight });
      }
      scale.value = 1;
    });

  const rotationGesture = Gesture.Rotation()
    .onUpdate((event) => { rotation.value = event.rotation; })
    .onEnd(() => {
      const newRotationDegrees = (savedRotation.value + (rotation.value * 180 / Math.PI)) % 360;
      if (onUpdateRoomGestureProperties) {
        runOnJS(onUpdateRoomGestureProperties)(room.id, { rotation: newRotationDegrees });
      }
      rotation.value = 0;
    });

  const doubleTapGesture = Gesture.Tap().numberOfTaps(2).maxDuration(250)
    .onEnd((_event, success) => {
      if (success && onUpdateRoomGestureProperties) {
        const currentIndex = AVAILABLE_SHAPES.indexOf(room.shape || 'rectangle');
        const nextIndex = (currentIndex + 1) % AVAILABLE_SHAPES.length;
        runOnJS(onUpdateRoomGestureProperties)(room.id, { shape: AVAILABLE_SHAPES[nextIndex] });
      }
    });

  const singleTapGesture = Gesture.Tap().maxDuration(250)
    .onEnd((_event, success) => { if (success && onSelectRoom) runOnJS(onSelectRoom)(); });

  const continuousGestures = Gesture.Simultaneous(panGesture, pinchGesture, rotationGesture);
  const tapGestures = Gesture.Exclusive(doubleTapGesture, singleTapGesture);
  const composedGestures = Gesture.Race(continuousGestures, tapGestures);

  return (
    <GestureDetector gesture={composedGestures}>
      <Animated.View style={[styles.draggableWrapper, animatedStyle]}>
        <View style={[styles.roomBase, { backgroundColor: room.color || (theme.primary || 'lightblue') }]}>
          <Text style={styles.roomName}>{room.name}</Text>
        </View>
      </Animated.View>
    </GestureDetector>
  );
};

const getScreenStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  listHeaderContainer: { padding: 16 },
  inputRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'center' },
  input: { flex: 1, borderWidth: 1, borderColor: theme.border || '#ccc', padding: 10, marginRight: 8, borderRadius: 8, color: theme.textPrimary, backgroundColor: theme.inputBackground },
  createRoomButtonIcon: { // Estilo reutilizado para ambos botones de icono
    paddingLeft: 8,
    paddingRight: 8,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 16, marginBottom: 8, color: theme.textPrimary },
  mapContainer: { height: 300, borderWidth: 1, borderColor: theme.border || 'grey',     backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3Cpattern id=\'grid\' width=\'20\' height=\'20\' patternUnits=\'userSpaceOnUse\'%3E%3Cpath d=\'M 20 0 L 0 0 0 20\' fill=\'none\' stroke=\'rgba(204,204,204,0.5)\' stroke-width=\'1\'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width=\'100%25\' height=\'100%25\' fill=\'url(%23grid)\' /%3E%3C/svg%3E")', position: 'relative', overflow: 'hidden', marginBottom: 20, borderRadius: 8 },
  draggableWrapper: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  roomBase: { padding: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 3, overflow: 'hidden' },
  selectedRoom: {},
  roomName: { fontWeight: 'bold', color: theme.textLight || '#fff', fontSize: 14 },
  tasksSectionHeader: { marginTop: 20, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.border || '#e0e0e0' },
  deleteRoomButtonContainer: { marginVertical: 15, paddingHorizontal: 16, alignItems: 'center' },
  deleteRoomButton: { backgroundColor: theme.error || 'red', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
  deleteRoomButtonText: { color: theme.textLight || '#fff', fontSize: 15, fontWeight: 'bold', marginLeft: 8 },
  taskItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: theme.border || '#eee', backgroundColor: theme.background },
  taskName: { flex: 1, fontSize: 16, color: theme.textPrimary },
  assignButton: { marginLeft: 8, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: theme.primary || '#007bff', borderRadius: 5 },
  assignButtonText: { color: theme.textLight || 'white', fontSize: 14 },
  assignedToText: { fontStyle: 'italic', color: theme.textSecondary || 'gray', marginRight: 8 },
  actionsContainer: { flexDirection: 'row', alignItems: 'center' },
  actionIcon: { marginLeft: 10, padding: 5 },
  emptyTextContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 20 },
  emptyText: { textAlign: 'center', color: theme.textSecondary, fontSize: 16, paddingHorizontal: 16 },
  emptyStateImage: {
    width: 100,
    height: 100,
    marginTop: 15,
    resizeMode: 'contain'
  },
});

const ListHeaderComponent = React.memo(({
  currentGroup, rooms, newRoomName, setNewRoomName, handleCreateRoom,
  selectedRoom, handleSelectRoomForEditing, newTaskName, setNewTaskName, handleCreateTaskForSelectedRoom,
  mapContainerLayout, handleMapLayout, handleRoomDragRelease, onUpdateRoomGestureProperties,
  highlightedRoomIds, styles, theme,
}) => {
return (
  <View style={styles.listHeaderContainer}>
    <Text style={styles.sectionTitle}>Habitaciones del Grupo</Text>

    {!currentGroup && (
      <Text style={styles.emptyText}>Por favor, selecciona un grupo.</Text>
    )}

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
          <TouchableOpacity
            onPress={handleCreateRoom}
            style={styles.createRoomButtonIcon}
          >
            <Ionicons
              name="arrow-forward-outline"
              size={28}
              color={theme.primary}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.mapContainer} onLayout={handleMapLayout}>
          {rooms.map((room) => (
            <DraggableRoomComponent
              key={room.id}
              room={room}
              initialPosition={room.position || { x: 0, y: 0 }}
              onSelectRoom={() => handleSelectRoomForEditing(room)}
              onDragEnd={handleRoomDragRelease}
              onUpdateRoomGestureProperties={onUpdateRoomGestureProperties}
              selected={selectedRoom?.id === room.id}
              isHighlighted={highlightedRoomIds.has(room.id)}
              styles={styles}
            />
          ))}
        </View>
      </>
    )}

    {selectedRoom && (
      <View style={styles.tasksSectionHeader}>
        <Text style={styles.sectionTitle}>
          Tareas para: {selectedRoom.name}
        </Text>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Nueva tarea para esta habitación"
            placeholderTextColor={theme.placeholder}
            value={newTaskName}
            onChangeText={setNewTaskName}
          />
          {/* --- INICIO DE LA MODIFICACIÓN DEL BOTÓN "AÑADIR TAREA" --- */}
          <TouchableOpacity
            onPress={handleCreateTaskForSelectedRoom}
            style={styles.createRoomButtonIcon} // Reutilizamos el estilo
          >
            <Ionicons
              name="arrow-forward-outline" // Icono de flecha hacia la derecha
              size={28} // Tamaño del icono
              color={theme.primary} // Color del icono
            />
          </TouchableOpacity>
          {/* --- FIN DE LA MODIFICACIÓN DEL BOTÓN "AÑADIR TAREA" --- */}
        </View>
      </View>
    )}
  </View>
);
}, (prevProps, nextProps) => {
    return ( prevProps.currentGroup === nextProps.currentGroup && prevProps.rooms === nextProps.rooms && prevProps.newRoomName === nextProps.newRoomName && prevProps.selectedRoom === nextProps.selectedRoom && prevProps.newTaskName === nextProps.newTaskName && prevProps.highlightedRoomIds === nextProps.highlightedRoomIds && prevProps.handleCreateRoom === nextProps.handleCreateRoom && prevProps.handleSelectRoomForEditing === nextProps.handleSelectRoomForEditing && prevProps.handleCreateTaskForSelectedRoom === nextProps.handleCreateTaskForSelectedRoom && prevProps.handleMapLayout === nextProps.handleMapLayout && prevProps.handleRoomDragRelease === nextProps.handleRoomDragRelease && prevProps.onUpdateRoomGestureProperties === nextProps.onUpdateRoomGestureProperties && prevProps.styles === nextProps.styles && prevProps.theme === nextProps.theme );
});

export default function TasksScreen() {
  const { user } = useContext(UserContext);
  const {
    currentGroup, rooms, createRoom, updateRoomPosition, updateRoomProperties, deleteRoom,
    tasks: allTasks, createTask, assignTaskToUser, unassignTask, deleteTask: deleteTaskFromContext
  } = useContext(GroupContext);
  const { theme } = useTheme();

  const [newRoomName, setNewRoomName] = useState('');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [newTaskName, setNewTaskName] = useState('');
  const [highlightedRoomIds, setHighlightedRoomIds] = useState(new Set());
  const snapHighlightTimers = useRef({});

  const styles = useMemo(() => getScreenStyles(theme), [theme]);
  const mapContainerLayout = useSharedValue({ width: 0, height: 0 });

  useEffect(() => { if (selectedRoom) setNewTaskName(''); else setNewTaskName(''); }, [selectedRoom]);
  useEffect(() => { return () => { Object.values(snapHighlightTimers.current).forEach(clearTimeout); }; }, []);

  const handleMapLayout = useCallback((event) => { const { width, height } = event.nativeEvent.layout; mapContainerLayout.value = { width, height }; }, [mapContainerLayout]);
  const handleCreateRoom = useCallback(async () => {
    if (!newRoomName.trim()) { Alert.alert('Error', 'Nombre hab. vacío'); return; } if (!currentGroup) { Alert.alert('Error', 'Selecciona grupo'); return; }
    try { const cW = mapContainerLayout.value.width || Dimensions.get('window').width * 0.8; const cH = mapContainerLayout.value.height || 250; const iRW = 100; const iRH = 60; const mPX = Math.max(0, cW - iRW); const mPY = Math.max(0, cH - iRH); const iX = Math.floor(Math.random() * mPX); const iY = Math.floor(Math.random() * mPY); await createRoom(newRoomName, { x: iX, y: iY }); setNewRoomName(''); } catch (e) { Alert.alert('Error creando hab.', e.message); }
  }, [newRoomName, currentGroup, createRoom, mapContainerLayout, setNewRoomName]);

  const handleRoomDragRelease = useCallback((draggedRoomId, releasePosition, gestureState) => {
    const draggedRoomData = rooms.find(r => r.id === draggedRoomId);
    if (!draggedRoomData) return;

    if (snapHighlightTimers.current[draggedRoomId]) {
      clearTimeout(snapHighlightTimers.current[draggedRoomId]);
      delete snapHighlightTimers.current[draggedRoomId];
    }
    setHighlightedRoomIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(draggedRoomId)) {
        newSet.delete(draggedRoomId);
        return newSet;
      }
      return prev;
    });

    if (gestureState === 'start') {
      return;
    }

    if (gestureState === 'end') {
      const dRoom = {
        id: draggedRoomId,
        x: releasePosition.x, y: releasePosition.y,
        width: Number(draggedRoomData.width) || 100,
        height: Number(draggedRoomData.height) || 60,
      };

      let snappedToTarget = null;

      for (const otherRoom of rooms) {
        if (otherRoom.id === draggedRoomId) continue;

        const tRoom = {
          id: otherRoom.id,
          x: Number(otherRoom.position.x) || 0, y: Number(otherRoom.position.y) || 0,
          width: Number(otherRoom.width) || 100, height: Number(otherRoom.height) || 60,
        };

        const dRoomCenterX = dRoom.x + dRoom.width / 2;
        const dRoomCenterY = dRoom.y + dRoom.height / 2;

        if (dRoomCenterX >= tRoom.x && dRoomCenterX < tRoom.x + tRoom.width &&
            dRoomCenterY >= tRoom.y && dRoomCenterY < tRoom.y + tRoom.height) {

          snappedToTarget = tRoom;

          const snapPositions = [
            { x: tRoom.x - dRoom.width, y: tRoom.y + (tRoom.height - dRoom.height) / 2 },
            { x: tRoom.x + tRoom.width, y: tRoom.y + (tRoom.height - dRoom.height) / 2 },
            { x: tRoom.x + (tRoom.width - dRoom.width) / 2, y: tRoom.y - dRoom.height },
            { x: tRoom.x + (tRoom.width - dRoom.width) / 2, y: tRoom.y + tRoom.height },
          ];

          let bestSnapPosition = null;
          let minDistanceSqToOriginalRelease = Infinity;

          snapPositions.forEach(sp => {
            const distSq = (dRoom.x - sp.x) ** 2 + (dRoom.y - sp.y) ** 2;
            if (distSq < minDistanceSqToOriginalRelease) {
              minDistanceSqToOriginalRelease = distSq;
              bestSnapPosition = { x: sp.x, y: sp.y };
            }
          });

          if (bestSnapPosition) {
            const finalSnapX = Math.max(0, Math.min(bestSnapPosition.x, (mapContainerLayout.value.width || Infinity) - dRoom.width));
            const finalSnapY = Math.max(0, Math.min(bestSnapPosition.y, (mapContainerLayout.value.height || Infinity) - dRoom.height));

            updateRoomPosition(draggedRoomId, { x: finalSnapX, y: finalSnapY });

            setHighlightedRoomIds(prev => new Set([...prev, draggedRoomId, tRoom.id]));

            if (snapHighlightTimers.current[draggedRoomId]) clearTimeout(snapHighlightTimers.current[draggedRoomId]);
            if (snapHighlightTimers.current[tRoom.id]) clearTimeout(snapHighlightTimers.current[tRoom.id]);

            const pairKey = [draggedRoomId, tRoom.id].sort().join('-');
            if (snapHighlightTimers.current[pairKey]) clearTimeout(snapHighlightTimers.current[pairKey]);
            snapHighlightTimers.current[pairKey] = setTimeout(() => {
                 setHighlightedRoomIds(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(draggedRoomId);
                    newSet.delete(tRoom.id);
                    return newSet;
                  });
                  delete snapHighlightTimers.current[pairKey];
            }, SNAP_DURATION_HIGHLIGHT_MS);
            break;
          }
        }
      }

      if (!snappedToTarget) {
        const constrainedX = Math.max(0, Math.min(releasePosition.x, (mapContainerLayout.value.width || Infinity) - dRoom.width));
        const constrainedY = Math.max(0, Math.min(releasePosition.y, (mapContainerLayout.value.height || Infinity) - dRoom.height));
        updateRoomPosition(draggedRoomId, { x: constrainedX, y: constrainedY });
      }
    }
  }, [currentGroup, rooms, updateRoomPosition, mapContainerLayout.value.width, mapContainerLayout.value.height, theme.warning]);

  const handleSelectRoomForEditing = useCallback((room) => { setSelectedRoom(prev => (prev?.id === room.id ? null : room)); }, [setSelectedRoom]);
  const handleCreateTaskForSelectedRoom = useCallback(async () => {
    if (!newTaskName.trim()) { Alert.alert('Error', 'Nombre tarea vacío.'); return; }
    if (!selectedRoom) { Alert.alert('Error', 'Selecciona hab.'); return; }
    try { await createTask(newTaskName, selectedRoom.id); setNewTaskName(''); } catch (e) { Alert.alert('Error tarea', e.message); }
  }, [newTaskName, selectedRoom, createTask, setNewTaskName]);

  const tasksForSelectedRoom = useMemo(() => {
    return selectedRoom ? allTasks.filter(task => task.roomId === selectedRoom.id) : [];
  }, [selectedRoom, allTasks]);

  const handleUpdateRoomGestureProperties = useCallback(async (roomId, newProps) => {
    if (!roomId || !newProps) return;

    const pairKeysToClear = Object.keys(snapHighlightTimers.current).filter(key => key.includes(roomId));
    pairKeysToClear.forEach(key => {
        clearTimeout(snapHighlightTimers.current[key]);
        delete snapHighlightTimers.current[key];
    });

    setHighlightedRoomIds(prev => {
        const newSet = new Set(prev);
        let changed = false;
        if (newSet.has(roomId)) {
            newSet.delete(roomId);
            changed = true;
        }
        return changed ? newSet : prev;
    });

    try { await updateRoomProperties(roomId, newProps); } catch (e) { Alert.alert("Error", `No se pudo actualizar: ${e.message}`); }
  }, [updateRoomProperties]);

  const handleDeleteSelectedRoom = useCallback(async () => {
    if (!selectedRoom) return;
    Alert.alert( "Eliminar Habitación", `¿Estás seguro de que quieres eliminar "${selectedRoom.name}"?`, [ { text: "Cancelar", style: "cancel" }, { text: "Eliminar", style: "destructive", onPress: async () => { try { await deleteRoom(selectedRoom.id); setSelectedRoom(null); Alert.alert("Éxito", "Habitación eliminada."); } catch (error) { Alert.alert("Error", `No se pudo eliminar: ${error.message}`); } }, }, ] );
  }, [selectedRoom, deleteRoom, setSelectedRoom]);

  const renderListFooter = useCallback(() => {
    if (!selectedRoom) return null;
    return ( <View style={styles.deleteRoomButtonContainer}><TouchableOpacity style={styles.deleteRoomButton} onPress={handleDeleteSelectedRoom}><Ionicons name="trash-outline" size={20} color={theme.textLight || '#fff'} /><Text style={styles.deleteRoomButtonText}>Eliminar Habitación</Text></TouchableOpacity></View> );
  }, [selectedRoom, handleDeleteSelectedRoom, styles, theme]);

return (
  <FlatList
    style={styles.container}
    data={tasksForSelectedRoom}
    keyExtractor={item => item.id}
    ListHeaderComponent={useMemo(
      () => (
        <ListHeaderComponent
          currentGroup={currentGroup}
          rooms={rooms}
          newRoomName={newRoomName}
          setNewRoomName={setNewRoomName}
          handleCreateRoom={handleCreateRoom}
          selectedRoom={selectedRoom}
          handleSelectRoomForEditing={handleSelectRoomForEditing}
          newTaskName={newTaskName}
          setNewTaskName={setNewTaskName}
          handleCreateTaskForSelectedRoom={handleCreateTaskForSelectedRoom}
          mapContainerLayout={mapContainerLayout}
          handleMapLayout={handleMapLayout}
          handleRoomDragRelease={handleRoomDragRelease}
          onUpdateRoomGestureProperties={handleUpdateRoomGestureProperties}
          highlightedRoomIds={highlightedRoomIds}
          styles={styles}
          theme={theme}
        />
      ),
      [
        currentGroup,
        rooms,
        newRoomName,
        setNewRoomName,
        handleCreateRoom,
        selectedRoom,
        handleSelectRoomForEditing,
        newTaskName,
        setNewTaskName,
        handleCreateTaskForSelectedRoom,
        mapContainerLayout,
        handleMapLayout,
        handleRoomDragRelease,
        handleUpdateRoomGestureProperties,
        highlightedRoomIds,
        styles,
        theme,
      ]
    )}
    renderItem={({ item }) => (
      <View style={styles.taskItem}>
        <Text style={styles.taskName}>{item.name}</Text>
        <View style={styles.actionsContainer}>
          {item.assignedTo ? (
            <>
              <Text style={styles.assignedToText}>
                Asignada a: {item.assignedToName}
              </Text>
              {user && item.assignedTo === user.uid && (
                <TouchableOpacity
                  onPress={() => unassignTask(item.id)}
                  style={styles.actionIcon}
                >
                  <Ionicons
                    name="close-circle-outline"
                    size={24}
                    color={theme.error || 'red'}
                  />
                </TouchableOpacity>
              )}
            </>
          ) : (
            user && (
              <TouchableOpacity
                onPress={() =>
                  assignTaskToUser(item.id, user.uid, user.name || user.email)
                }
                style={styles.assignButton}
              >
                <Text style={styles.assignButtonText}>Asignarme</Text>
              </TouchableOpacity>
            )
          )}
          {user && item.createdBy === user.uid && (
            <TouchableOpacity
              onPress={() => deleteTaskFromContext(item.id)}
              style={styles.actionIcon}
            >
              <Ionicons
                name="trash-outline"
                size={24}
                color={theme.error || 'red'}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    )}
    ListEmptyComponent={
      currentGroup ? (
        selectedRoom ? (
          tasksForSelectedRoom.length === 0 ? (
            <View style={styles.emptyTextContainer}>
              <Text style={styles.emptyText}>
                No hay tareas para {selectedRoom.name}.
              </Text>
            </View>
          ) : null
        ) : (
          <View style={styles.emptyTextContainer}>
            <Text style={styles.emptyText}>
              Selecciona una habitación para ver sus tareas.
            </Text>
            <Image
              source={require('../../assets/raton_limpiando.png')}
              style={styles.emptyStateImage}
            />
          </View>
        )
      ) : null
    }
    ListFooterComponent={renderListFooter}
    contentContainerStyle={{ flexGrow: 1 }}
    extraData={{
      selectedRoom,
      highlightedRoomIdsLength: highlightedRoomIds.size,
    }}
  />
);
}
