// src/screens/TasksScreen.js
import React, { useState, useContext } from 'react';
import { View, Text, TextInput, Button, FlatList, Alert, StyleSheet, TouchableOpacity } from 'react-native';
import { UserContext } from '../context/UserContext';
import { GroupContext } from '../context/GroupContext'; // <--- Importar GroupContext
import { Ionicons } from '@expo/vector-icons'; // Para el icono de eliminar

export default function TasksScreen() {
  const { user } = useContext(UserContext);
  // Usar el estado y funciones del GroupContext
  const { currentGroup, tasks, createTask, assignTaskToUser, unassignTask, deleteTask } = useContext(GroupContext);
  
  const [taskName, setTaskName] = useState('');

  const handleCreateTask = async () => {
    if (!taskName.trim()) {
      Alert.alert('Error', 'El nombre de la tarea no puede estar vacío.');
      return;
    }
    if (!currentGroup) {
      Alert.alert('Error', 'Debes seleccionar un grupo para crear tareas.');
      return;
    }
    try {
      await createTask(taskName);
      setTaskName('');
    } catch (error) {
      Alert.alert('Error al crear tarea', error.message);
    }
  };

  const handleAssignTask = async (taskId) => {
    if (!user) {
      Alert.alert('Error', 'Usuario no encontrado. Por favor, inicia sesión de nuevo.');
      return;
    }
    if (!currentGroup) {
      Alert.alert('Error', 'No hay grupo seleccionado.');
      return;
    }
    try {
      await assignTaskToUser(taskId, user.uid, user.name || user.email || "Usuario Asignado");
    } catch (error) {
      Alert.alert('Error al asignar tarea', error.message);
    }
  };

  const handleUnassignTask = async (taskId) => {
    if (!currentGroup) {
        Alert.alert('Error', 'No hay grupo seleccionado.');
        return;
    }
    try {
        await unassignTask(taskId);
    } catch (error) {
        Alert.alert('Error al desasignar tarea', error.message);
    }
  };

  const handleDeleteTask = (taskId, currentTaskName) => {
    if (!currentGroup) {
        Alert.alert('Error', 'No hay grupo seleccionado.');
        return;
    }
    Alert.alert(
        'Confirmar Eliminación',
        `¿Estás seguro de que quieres eliminar la tarea "${currentTaskName}"?`,
        [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Eliminar',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteTask(taskId);
                    } catch (error) {
                        Alert.alert('Error al eliminar tarea', error.message);
                    }
                },
            },
        ],
        { cancelable: true }
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Crear Nueva Tarea:</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Nombre de la tarea"
          value={taskName}
          onChangeText={setTaskName}
          onSubmitEditing={handleCreateTask}
        />
        <Button title="Crear Tarea" onPress={handleCreateTask} disabled={!currentGroup || !taskName.trim()} />
      </View>

      <Text style={styles.title}>Tareas del Grupo:</Text>
      {!currentGroup ? (
        <Text style={styles.infoText}>Selecciona un grupo para ver o crear tareas.</Text>
      ) : tasks.length > 0 ? (
        <FlatList
          data={tasks} // Usar 'tasks' del contexto
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.taskItem}>
              <View style={styles.taskHeader}>
                <Text style={styles.taskName}>{item.name}</Text>
                {user && (user.uid === item.createdBy || (currentGroup && user.uid === currentGroup.owner)) && ( // Creador o dueño del grupo puede eliminar
                  <TouchableOpacity onPress={() => handleDeleteTask(item.id, item.name)} style={styles.deleteButton}>
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
              {user && ( // Mostrar botones de asignación/desasignación si hay un usuario logueado
                <View style={styles.taskActions}>
                  {!item.assignedTo && (
                    <Button title="Asignarme esta tarea" onPress={() => handleAssignTask(item.id)} />
                  )}
                  {item.assignedTo === user.uid && ( 
                    <Button title="Desasignarme" onPress={() => handleUnassignTask(item.id)} color="orange" />
                  )}
                </View>
              )}
            </View>
          )}
        />
      ) : (
        <Text style={styles.infoText}>No hay tareas creadas en este grupo.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5', // Un fondo claro
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 8,
    color: '#333',
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'center',
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
  taskItem: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  taskName: {
    fontSize: 17,
    fontWeight: '600', // Un poco más de énfasis
    color: '#2c3e50',
    flex: 1, // Para que el nombre no se salga si es largo y hay botón de eliminar
  },
  taskDetail: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  taskActions: {
    marginTop: 10,
    flexDirection: 'row', // Para futuros botones adicionales
    justifyContent: 'flex-start', // Alinear botones a la izquierda
  },
  infoText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  deleteButton: {
    padding: 5, // Para facilitar el toque
  },
});
