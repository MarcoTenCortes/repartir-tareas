// src/screens/ShoppingScreen.js
import React, { useContext, useState } from 'react';
import {
  View,
  TextInput,
  Button,
  FlatList,
  Text,
  Switch,
  StyleSheet
} from 'react-native';
import { GroupContext } from '../context/GroupContext';

export default function ShoppingScreen() {
  const { shoppingList, addShoppingItem, toggleBought } = useContext(GroupContext);
  const [itemText, setItemText] = useState('');

  const handleAdd = async () => {
    const text = itemText.trim();
    if (!text) return;
    try {
      await addShoppingItem(text);
      setItemText('');
    } catch (err) {
      console.error('Error añadiendo ítem:', err);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Nuevo ítem"
          value={itemText}
          onChangeText={setItemText}
        />
        <Button title="Añadir" onPress={handleAdd} />
      </View>

      <FlatList
        data={shoppingList}
        keyExtractor={i => i.id}
        renderItem={({ item }) => (
          <View style={styles.itemRow}>
            <Switch
              value={item.bought}
              onValueChange={val => toggleBought(item.id, val)}
            />
            <Text style={[styles.itemText, item.bought && styles.boughtText]}>
              {item.text}
            </Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No hay ítems</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, 
    padding: 16 
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 16
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    marginRight: 8,
    borderRadius: 4
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  itemText: {
    marginLeft: 8,
    fontSize: 16
  },
  boughtText: {
    textDecorationLine: 'line-through',
    color: '#999'
  },
  empty: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666'
  }
});
