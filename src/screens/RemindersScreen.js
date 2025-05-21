// src/screens/RemindersScreen.js
import React, { useContext, useState, useEffect } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  Alert
} from 'react-native';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { Ionicons } from '@expo/vector-icons';

let DateTimePicker;
let DateTimePickerAndroid; // Solo para la API imperativa de Android
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
  if (Platform.OS === 'android') {
    // Acceder a DateTimePickerAndroid desde la exportación principal
    DateTimePickerAndroid = require('@react-native-community/datetimepicker').DateTimePickerAndroid;
  }
}

import { GroupContext } from '../context/GroupContext';
import { useTheme } from '../context/ThemeContext';

export default function RemindersScreen() {
  const { reminders, addReminder, currentGroup } = useContext(GroupContext);
  const { theme } = useTheme();
  const styles = getThemedStyles(theme);

  const [text, setText] = useState('');
  const [date, setDate] = useState(new Date());
  const [isDateSet, setIsDateSet] = useState(false);
  const [showPicker, setShowPicker] = useState(false); // Para el picker de iOS

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

    // DEBUG LOGS (se pueden quitar una vez funcione)
    console.log('[RemindersScreen] handleAdd:');
    console.log('  isDateSet:', isDateSet);
    console.log('  Estado de "date":', date);
    const dateToSend = isDateSet ? date : null;
    console.log('  Fecha que se pasará a addReminder:', dateToSend);
    
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
  
  // Manejador para iOS
  const onIOSDateTimeChange = (event, selectedDate) => {
    const currentDate = selectedDate || date;
    if (Platform.OS === 'ios') {
        setShowPicker(false); // Ocultar el picker modal de iOS
    }

    if (event.type === 'set') { // Solo si el usuario confirma la selección
      setDate(currentDate);
      setIsDateSet(true);
    }
    // Si es 'dismissed' o cualquier otro evento, no consideramos la fecha como "fijada"
  };

  // Función para mostrar los pickers
  const showDateTimePicker = () => {
    if (Platform.OS === 'android' && DateTimePickerAndroid) {
      // Lógica para Android usando callbacks anidados
      const onDateChangeAndroid = (event, selectedAndroidDate) => {
        if (event.type === 'set' && selectedAndroidDate) {
          const newDateWithSelectedDay = selectedAndroidDate; // Fecha seleccionada (día, mes, año)
          
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
              console.log('[RemindersScreen] Android: Fecha y Hora seleccionadas:', finalDate);
            } else {
              // Time picker fue cancelado o no se seleccionó hora
              setIsDateSet(false); // O manejar como fecha parcialmente establecida si se desea
              console.log('[RemindersScreen] Android: Time picker cancelado.');
            }
          };

          DateTimePickerAndroid.open({
            value: newDateWithSelectedDay, // Usar la fecha que se acaba de seleccionar
            mode: 'time',
            is24Hour: true,
            display: 'default',
            onChange: onTimeChangeAndroid,
          });

        } else {
          // Date picker fue cancelado
          setIsDateSet(false);
          console.log('[RemindersScreen] Android: Date picker cancelado.');
        }
      };

      console.log('[RemindersScreen] Android: Abriendo Date picker...');
      DateTimePickerAndroid.open({
        value: date, // El estado 'date' actual como valor inicial
        mode: 'date',
        display: 'default',
        onChange: onDateChangeAndroid,
      });

    } else if (Platform.OS === 'ios') {
      setShowPicker(true); // Mostrar el componente DateTimePicker para iOS
    }
  };
  
  const removeDate = () => {
    setIsDateSet(false);
    setDate(new Date()); 
  };

  const renderItem = ({ item, drag, isActive }) => {
    return (
      <ScaleDecorator>
        <TouchableOpacity
          onLongPress={drag}
          disabled={isActive}
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
          <Ionicons name="reorder-three-outline" size={24} color={theme.textSecondary} style={styles.dragHandle} />
        </TouchableOpacity>
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
        data={localReminders}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        onDragEnd={({ data }) => setLocalReminders(data)}
        contentContainerStyle={localReminders.length === 0 && styles.emptyContainer}
        ListEmptyComponent={<Text style={styles.empty}>No hay recordatorios</Text>}
        containerStyle={{ flex: 1 }}
      />
    </View>
  );
}

// La función getThemedStyles (styles) permanece igual que en la respuesta anterior.
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
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.cardBackground, // Añadido para que coincida con isActive
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  itemActive: { 
    shadowOpacity: 0.2,
    elevation: 5,
    // backgroundColor se maneja dinámicamente en el componente
  },
  itemContent: {
    flex: 1,
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
  dragHandle: { 
    marginLeft: 10,
  },
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
