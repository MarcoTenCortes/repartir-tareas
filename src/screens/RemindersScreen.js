// src/screens/RemindersScreen.js
import React, { useContext, useState, useEffect } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  Alert // Importar Alert para la confirmación
} from 'react-native';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { Ionicons } from '@expo/vector-icons'; // Ionicons ya está importado

let DateTimePicker;
let DateTimePickerAndroid;
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
  if (Platform.OS === 'android') {
    DateTimePickerAndroid = require('@react-native-community/datetimepicker').DateTimePickerAndroid;
  }
}

import { GroupContext } from '../context/GroupContext';
import { useTheme } from '../context/ThemeContext';

export default function RemindersScreen() {
  const { reminders, addReminder, deleteReminder, currentGroup } = useContext(GroupContext); // <<< OBTENER deleteReminder DEL CONTEXTO
  const { theme } = useTheme();
  const styles = getThemedStyles(theme);

  const [text, setText] = useState('');
  const [date, setDate] = useState(new Date());
  const [isDateSet, setIsDateSet] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const [localReminders, setLocalReminders] = useState(reminders);

  useEffect(() => {
    setLocalReminders(reminders);
  }, [reminders]);

  const handleAdd = async () => {
    const t = text.trim();
    if (!t) {
      Alert.alert('Error', 'El texto del recordatorio no puede estar vacío.');
      return;
    }
    if (!currentGroup) {
      Alert.alert('Error', 'Por favor, selecciona un grupo primero.');
      return;
    }
    const dateToSend = isDateSet ? date : null;    
    try {
      await addReminder(t, dateToSend);
      setText('');
      setDate(new Date()); 
      setIsDateSet(false);
    } catch (err) {
      console.error('[RemindersScreen] Error añadiendo recordatorio:', err);
      Alert.alert('Error', 'Error añadiendo recordatorio: ' + (err.message || 'Error desconocido'));
    }
  };
  
  const onIOSDateTimeChange = (event, selectedDate) => {
    const currentDate = selectedDate || date;
    if (Platform.OS === 'ios') {
        setShowPicker(false);
    }
    if (event.type === 'set') {
      setDate(currentDate);
      setIsDateSet(true);
    }
  };

  const showDateTimePicker = () => {
    if (Platform.OS === 'android' && DateTimePickerAndroid) {
      const onDateChangeAndroid = (event, selectedAndroidDate) => {
        if (event.type === 'set' && selectedAndroidDate) {
          const newDateWithSelectedDay = selectedAndroidDate;
          const onTimeChangeAndroid = (timeEvent, selectedAndroidTime) => {
            if (timeEvent.type === 'set' && selectedAndroidTime) {
              const finalDate = new Date(
                newDateWithSelectedDay.getFullYear(),
                newDateWithSelectedDay.getMonth(),
                newDateWithSelectedDay.getDate(),
                selectedAndroidTime.getHours(),
                selectedAndroidTime.getMinutes()
              );
              setDate(finalDate);
              setIsDateSet(true);
            } else {
              setIsDateSet(false);
            }
          };
          DateTimePickerAndroid.open({
            value: newDateWithSelectedDay,
            mode: 'time',
            is24Hour: true,
            display: 'default',
            onChange: onTimeChangeAndroid,
          });
        } else {
          setIsDateSet(false);
        }
      };
      DateTimePickerAndroid.open({
        value: date,
        mode: 'date',
        display: 'default',
        onChange: onDateChangeAndroid,
      });
    } else if (Platform.OS === 'ios') {
      setShowPicker(true);
    }
  };
  
  const removeDate = () => {
    setIsDateSet(false);
    setDate(new Date()); 
  };

  // --- FUNCIÓN PARA MANEJAR EL BORRADO DE UN RECORDATORIO ---
  const handleDeleteReminder = (reminderId, reminderText) => {
    Alert.alert(
      "Confirmar Borrado",
      `¿Estás seguro de que quieres eliminar el recordatorio "${reminderText}"?`,
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        {
          text: "Eliminar",
          onPress: async () => {
            try {
              await deleteReminder(reminderId);
              // La lista se actualizará automáticamente gracias a onSnapshot en GroupContext
            } catch (error) {
              console.error('[RemindersScreen] Error eliminando recordatorio:', error);
              Alert.alert('Error', 'No se pudo eliminar el recordatorio: ' + (error.message || 'Error desconocido'));
            }
          },
          style: "destructive" // Estilo para iOS que indica acción destructiva
        }
      ],
      { cancelable: true } // Permite cerrar la alerta tocando fuera en Android
    );
  };

  const renderItem = ({ item, drag, isActive }) => {
    return (
      <ScaleDecorator>
        <View // Cambiado de TouchableOpacity a View para un mejor control de las áreas táctiles
          style={[
            styles.itemContainer,
            isActive && styles.itemActive,
            { backgroundColor: isActive ? theme.primaryLight : theme.cardBackground },
          ]}
        >
          <View style={styles.itemContent}>
            <Text style={styles.itemText}>{item.text}</Text>
            {item.date && (
              <Text style={styles.itemDate}>
                {item.date.toLocaleString()} 
              </Text>
            )}
          </View>
          {/* Contenedor para los iconos de acción */}
          <View style={styles.actionsContainer}>
            {/* Icono de Borrado */}
            <TouchableOpacity 
              onPress={() => handleDeleteReminder(item.id, item.text)}
              style={styles.deleteButton}
            >
              <Ionicons name="trash-outline" size={24} color={theme.danger || '#FF3B30'} />
            </TouchableOpacity>
            {/* Icono de Arrastre (manejador) */}
            <TouchableOpacity 
              onLongPress={drag} // O onPressIn={drag} si se prefiere un toque corto para iniciar el arrastre
              disabled={isActive}
              style={styles.dragHandleTouchable}
            >
              <Ionicons name="reorder-three-outline" size={28} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </ScaleDecorator>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Nuevo recordatorio"
          placeholderTextColor={theme.placeholder}
          value={text}
          onChangeText={setText}
        />
        {Platform.OS !== 'web' && (DateTimePicker || DateTimePickerAndroid) && (
          <TouchableOpacity style={styles.dateButton} onPress={showDateTimePicker}>
            <Text style={styles.dateButtonText}>{isDateSet ? date.toLocaleDateString() : "Fecha"}</Text>
          </TouchableOpacity>
        )}
        {Platform.OS === 'web' && (
          <Text style={{ marginLeft: 8, alignSelf: 'center', color: theme.textSecondary }}>
            (Selector de fecha no disponible en web)
          </Text>
        )}
      </View>
      
      {isDateSet && Platform.OS !== 'web' && (
        <TouchableOpacity onPress={removeDate} style={styles.removeDateButton}>
            <Text style={styles.removeDateButtonText}>Quitar Fecha</Text>
        </TouchableOpacity>
      )}

      {showPicker && Platform.OS === 'ios' && DateTimePicker && (
        <DateTimePicker
          testID="dateTimePickerIOS"
          value={date}
          mode="datetime"
          is24Hour={true}
          display="default" 
          onChange={onIOSDateTimeChange}
        />
      )}

      <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
        <Text style={styles.addButtonText}>Añadir Recordatorio</Text>
      </TouchableOpacity>

      <DraggableFlatList
        data={localReminders} // Usar localReminders que se actualiza con `reminders` del contexto
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        onDragEnd={({ data }) => {
            setLocalReminders(data);
            // Opcional: Si quieres guardar el orden de arrastre en Firestore,
            // necesitarías una función similar a updateShoppingListOrder
            // y un campo 'order' en tus recordatorios.
        }}
        contentContainerStyle={localReminders.length === 0 && styles.emptyContainer}
        ListEmptyComponent={<Text style={styles.empty}>No hay recordatorios</Text>}
        containerStyle={{ flex: 1 }}
      />
    </View>
  );
}

const getThemedStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: theme.background,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.inputBackground,
    color: theme.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 8,
    borderRadius: 8,
    fontSize: 16,
  },
  dateButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: theme.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 40, 
  },
  dateButtonText: {
    color: theme.textLight,
    fontSize: 15,
    fontWeight: '500',
  },
  removeDateButton: {
    alignSelf: 'flex-start',
    marginBottom: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: theme.cardBackground,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 6,
  },
  removeDateButtonText: {
    color: theme.textSecondary,
    fontSize: 13,
  },
  addButton: {
    backgroundColor: theme.accent,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  addButtonText: {
    color: theme.textLight,
    fontSize: 16,
    fontWeight: 'bold',
  },
  // ESTILOS MODIFICADOS Y NUEVOS PARA EL ITEM DE LA LISTA
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // Para separar contenido de acciones
    paddingVertical: 12,
    paddingHorizontal: 16, // Padding horizontal para el contenido y los iconos
    marginVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.cardBackground,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  itemActive: { 
    shadowOpacity: 0.2,
    elevation: 5,
  },
  itemContent: { // Contenedor para el texto y la fecha, permite que se expanda
    flex: 1,
    marginRight: 8, // Espacio antes de los iconos de acción
  },
  itemText: {
    fontSize: 16,
    color: theme.textPrimary,
    fontWeight: '500',
  },
  itemDate: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 4,
  },
  actionsContainer: { // Nuevo: Contenedor para los iconos de borrado y arrastre
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: { // Nuevo: Estilo para el botón (área táctil) de borrado
    padding: 8, // Aumenta el área táctil alrededor del icono
    marginRight: 0, // Ajusta según sea necesario
  },
  dragHandleTouchable: { // Nuevo: Estilo para el botón (área táctil) de arrastre
    padding: 8, // Aumenta el área táctil alrededor del icono
    // marginLeft: 4, // Espacio opcional si deleteButton no tiene marginRight
  },
  // dragHandle (estilo antiguo) ya no es necesario si usas dragHandleTouchable
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    textAlign: 'center',
    color: theme.textSecondary,
    fontSize: 16,
  },
});
