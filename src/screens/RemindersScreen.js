// src/screens/RemindersScreen.js
import React, { useContext, useState, useEffect } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  Alert,
  ImageBackground // <<<< IMPORTADO ImageBackground
} from 'react-native';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { Ionicons } from '@expo/vector-icons';

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
  const { reminders, addReminder, deleteReminder, currentGroup } = useContext(GroupContext);
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
            } catch (error) {
              console.error('[RemindersScreen] Error eliminando recordatorio:', error);
              Alert.alert('Error', 'No se pudo eliminar el recordatorio: ' + (error.message || 'Error desconocido'));
            }
          },
          style: "destructive"
        }
      ],
      { cancelable: true }
    );
  };

  const renderItem = ({ item, drag, isActive }) => {
    return (
      <ScaleDecorator>
        <View
          style={[
            styles.itemContainer,
            isActive && styles.itemActive,
            // Si quieres que los items también sean translúcidos, ajusta theme.cardBackground
            // para que sea un color RGBA, ej: 'rgba(255, 255, 255, 0.9)'
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
          <View style={styles.actionsContainer}>
            <TouchableOpacity 
              onPress={() => handleDeleteReminder(item.id, item.text)}
              style={styles.deleteButton}
            >
              <Ionicons name="trash-outline" size={24} color={theme.danger || '#FF3B30'} />
            </TouchableOpacity>
            <TouchableOpacity 
              onLongPress={drag}
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
    // <<<< MODIFICACIÓN: Envolver con ImageBackground >>>>
    <ImageBackground
      // CAMBIA ESTA RUTA a tu imagen de fondo. Asegúrate que la imagen esté en tu proyecto.
      source={require('../../assets/prisa.png')} 
      style={styles.backgroundImage}
      // Ajusta la opacidad de la imagen de fondo como necesites (0.0 a 1.0)
      imageStyle={{ opacity: 1.0 }} // Opacidad solo para la imagen, no para el contenido
      resizeMode="contain" // O 'contain', 'stretch', etc., según cómo quieras que se muestre la imagen
    >
      <View style={styles.container}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Nuevo recordatorio"
            placeholderTextColor={theme.placeholder}
            value={text}
            onChangeText={setText}
            // Si quieres que el input también sea translúcido, ajusta theme.inputBackground
            // para que sea un color RGBA, ej: 'rgba(255, 255, 255, 0.9)'
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
          onDragEnd={({ data }) => {
              setLocalReminders(data);
          }}
          contentContainerStyle={localReminders.length === 0 && styles.emptyContainer}
          ListEmptyComponent={<Text style={styles.empty}>No hay recordatorios</Text>}
          containerStyle={{ flex: 1 }}
        />
      </View>
    </ImageBackground> // <<<< FIN DE ImageBackground >>>>
  );
}

const getThemedStyles = (theme) => StyleSheet.create({
  // <<<< NUEVO ESTILO para ImageBackground >>>>
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    padding: 16,
    // <<<< MODIFICACIÓN del backgroundColor del container >>>>
    // El color de fondo del contenedor principal ahora es translúcido.
    // Ajusta el color (los tres primeros valores de rgba) y la opacidad (el último valor, 0.85)
    // según tu tema y la visibilidad deseada de la imagen de fondo.
    // Ejemplo para un tema claro:
    backgroundColor: 'rgba(255, 255, 255, 0.85)', 
    // Ejemplo para un tema oscuro (si theme.background fuera negro o gris oscuro):
    // backgroundColor: `rgba(30, 30, 30, 0.85)`,
    // Si quieres basarte en tu theme.background, y este es un color hex (ej. #RRGGBB),
    // puedes convertirlo a rgba manualmente aquí o modificarlo en tu ThemeContext.
    // Por ejemplo, si theme.background es '#FFFFFF', usa 'rgba(255,255,255,0.85)'.
    // Si theme.background es '#1E1E1E', usa 'rgba(30,30,30,0.85)'.
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
    backgroundColor: theme.inputBackground, // Para transparencia aquí, theme.inputBackground debe ser rgba
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
    backgroundColor: theme.cardBackground, // También podría ser translúcido si theme.cardBackground es rgba
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
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.cardBackground, // Para transparencia aquí, theme.cardBackground debe ser rgba
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
  itemContent: {
    flex: 1,
    marginRight: 8,
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
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    padding: 8,
    marginRight: 0,
  },
  dragHandleTouchable: {
    padding: 8,
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

