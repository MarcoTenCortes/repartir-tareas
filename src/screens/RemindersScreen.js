// src/screens/RemindersScreen.js
import React, { useContext, useState } from 'react';
import {
  View,
  TextInput,
  Button,
  FlatList,
  Text,
  StyleSheet
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { GroupContext } from '../context/GroupContext';

export default function RemindersScreen() {
  const { reminders, addReminder } = useContext(GroupContext);
  const [text, setText] = useState('');
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  const handleAdd = async () => {
    const t = text.trim();
    if (!t) return;
    try {
      await addReminder(t, date);
      setText('');
    } catch (err) {
      console.error('Error añadiendo recordatorio:', err);
    }
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
        <Button title="Fecha" onPress={() => setShowPicker(true)} />
      </View>

      {showPicker && (
        <DateTimePicker
          value={date}
          mode="datetime"
          display="default"
          onChange={(_, d) => {
            setShowPicker(false);
            if (d) setDate(d);
          }}
        />
      )}

      <Button title="Añadir" onPress={handleAdd} />

      <FlatList
        data={reminders}
        keyExtractor={i => i.id}
        contentContainerStyle={reminders.length === 0 && styles.emptyContainer}
        renderItem={({ item }) => (
          <Text style={styles.item}>
            {item.text} —{' '}
            {item.date.toDate().toLocaleString()}
          </Text>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No hay recordatorios</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  inputRow: { flexDirection: 'row', marginBottom: 12 },
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
  empty: { textAlign: 'center', color: '#666' }
});
