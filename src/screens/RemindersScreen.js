// src/screens/RemindersScreen.js
import React, { useContext, useState } from 'react';
import {
  View,
  TextInput,
  Button,
  FlatList,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity
} from 'react-native';
// Importa DateTimePicker condicionalmente
const DateTimePicker = Platform.OS === 'web' ? null : require('@react-native-community/datetimepicker').default;
import { GroupContext } from '../context/GroupContext';

export default function RemindersScreen() {
  const { reminders, addReminder, currentGroup } = useContext(GroupContext);
  const [text, setText] = useState('');
  const [date, setDate] = useState(new Date());
  const [isDateSet, setIsDateSet] = useState(false); // Nuevo estado para controlar si la fecha fue seleccionada
  const [showPicker, setShowPicker] = useState(false);

  const handleAdd = async () => {
    const t = text.trim();
    if (!t) {
      alert('El texto del recordatorio no puede estar vacío.');
      return;
    }
    if (!currentGroup) {
      alert('Por favor, selecciona un grupo primero.');
      return;
    }
    try {
      // Pasar date solo si isDateSet es true, de lo contrario pasar null
      await addReminder(t, isDateSet ? date : null);
      setText('');
      setDate(new Date());
      setIsDateSet(false); // Resetear isDateSet
    } catch (err) {
      console.error('Error añadiendo recordatorio:', err);
      alert('Error añadiendo recordatorio: ' + (err.message || 'Error desconocido'));
    }
  };

  const onChangeDate = (event, selectedDate) => {
    const shouldHidePicker = Platform.OS === 'android' || (event.type === 'set' || event.type === 'dismissed');
    
    if (shouldHidePicker) {
        setShowPicker(false);
    }

    if (event.type === 'set' && selectedDate) {
      setDate(selectedDate);
      setIsDateSet(true); // Marcar que la fecha ha sido seleccionada
    } else if (Platform.OS === 'ios' && selectedDate) { // En iOS, puede que no haya event.type 'set' si solo se cierra
        setDate(selectedDate);
        setIsDateSet(true);
    }
  };

  const removeDate = () => {
    setIsDateSet(false);
    setDate(new Date()); // Opcional: resetear al valor por defecto
    alert('Fecha eliminada del recordatorio.');
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Nuevo recordatorio"
          value={text}
          onChangeText={setText}
        />
        {Platform.OS !== 'web' && DateTimePicker && (
          <Button title={isDateSet ? date.toLocaleDateString() : "Fecha"} onPress={() => setShowPicker(true)} />
        )}
        {Platform.OS === 'web' && (
          <Text style={{ marginLeft: 8, alignSelf: 'center' }}>(Selector de fecha no disponible en web)</Text>
        )}
      </View>
      
      {isDateSet && Platform.OS !== 'web' && (
        <TouchableOpacity onPress={removeDate} style={styles.removeDateButton}>
            <Text style={styles.removeDateButtonText}>Quitar Fecha</Text>
        </TouchableOpacity>
      )}

      {showPicker && Platform.OS !== 'web' && DateTimePicker && (
        <DateTimePicker
          testID="dateTimePicker"
          value={date}
          mode="datetime"
          is24Hour={true}
          display="default"
          onChange={onChangeDate}
        />
      )}

      <Button title="Añadir Recordatorio" onPress={handleAdd} />

      <FlatList
        data={reminders}
        keyExtractor={i => i.id}
        contentContainerStyle={reminders.length === 0 && styles.emptyContainer}
        renderItem={({ item }) => (
          <Text style={styles.item}>
            {item.text} —{' '}
            {item.date ? (item.date.toDate ? item.date.toDate().toLocaleString() : new Date(item.date).toLocaleString()) : 'Sin fecha'}
          </Text>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No hay recordatorios</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  inputRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'center' },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    marginRight: 8,
    borderRadius: 4
  },
  item: {
    fontSize: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: '#eee'
  },
  emptyContainer: { flex: 1, justifyContent: 'center' },
  empty: { textAlign: 'center', color: '#666' },
  removeDateButton: {
    alignSelf: 'flex-start',
    marginBottom: 10,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#ddd',
    borderRadius: 4,
  },
  removeDateButtonText: {
    color: '#333'
  }
});
