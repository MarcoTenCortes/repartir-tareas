// src/screens/ShoppingScreen.js
import React, { useContext, useState } from 'react';
import {
  View,
  TextInput,
  Button,
  FlatList,
  Text,
  Switch,
  StyleSheet,
  TouchableOpacity, // <--- Importar TouchableOpacity
  Alert // <--- Importar Alert para confirmación (opcional pero recomendado)
} from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // <--- Importar Ionicons para el icono
import { GroupContext } from '../context/GroupContext';

export default function ShoppingScreen() {
  // <--- Añadida deleteShoppingItem del contexto
  const { shoppingList, addShoppingItem, toggleBought, deleteShoppingItem, currentGroup } = useContext(GroupContext);
  const [itemText, setItemText] = useState('');

  const handleAdd = async () => {
    const text = itemText.trim();
    if (!text) {
      Alert.alert('Error', 'El nombre del artículo no puede estar vacío.');
      return;
    }
    if (!currentGroup) {
      Alert.alert('Error', 'Debes seleccionar un grupo para añadir artículos.');
      return;
    }
    try {
      await addShoppingItem(text);
      setItemText('');
    } catch (err) {
      console.error('Error añadiendo ítem:', err);
      Alert.alert('Error', err.message || 'No se pudo añadir el artículo.');
    }
  };

  // --- NUEVA FUNCIÓN HANDLER PARA ELIMINAR ---
  const handleDelete = (itemId, itemName) => {
    if (!currentGroup) {
      Alert.alert('Error', 'No hay un grupo seleccionado.');
      return;
    }
    Alert.alert(
      'Confirmar eliminación',
      `¿Estás seguro de que quieres eliminar "${itemName}" de la lista?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteShoppingItem(itemId);
              // La lista se actualizará automáticamente gracias al listener onSnapshot
            } catch (err) {
              console.error('Error eliminando ítem:', err);
              Alert.alert('Error', err.message || 'No se pudo eliminar el artículo.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };
  // --- FIN NUEVA FUNCIÓN HANDLER ---

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Nuevo artículo para la compra"
          value={itemText}
          onChangeText={setItemText}
          onSubmitEditing={handleAdd} // Permite añadir con "Enter" en teclado
        />
        <Button title="Añadir" onPress={handleAdd} />
      </View>

      <FlatList
        data={shoppingList} // shoppingList ya viene ordenada desde el contexto
        keyExtractor={i => i.id}
        renderItem={({ item }) => (
          <View style={styles.itemRow}>
            <Switch
              value={item.bought}
              onValueChange={val => {
                if (!currentGroup) {
                  Alert.alert('Error', 'No hay un grupo seleccionado.');
                  return;
                }
                toggleBought(item.id, val).catch(err => Alert.alert('Error', err.message));
              }}
            />
            <Text style={[styles.itemText, item.bought && styles.boughtText]}>
              {item.text}
            </Text>
            {/* --- BOTÓN DE ELIMINAR --- */}
            <TouchableOpacity
              onPress={() => handleDelete(item.id, item.text)}
              style={styles.deleteButton}
            >
              <Ionicons name="trash-bin-outline" size={24} color="#FF3B30" />
            </TouchableOpacity>
            {/* --- FIN BOTÓN DE ELIMINAR --- */}
          </View>
        )}
        ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <Text style={styles.empty}>
                    {currentGroup ? 'La lista de la compra está vacía.' : 'Selecciona o crea un grupo para ver la lista de la compra.'}
                </Text>
            </View>
        }
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
    marginBottom: 16,
    alignItems: 'center' // Alinear TextInput y Button
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10, // Un poco más de padding
    marginRight: 8,
    borderRadius: 5 // Bordes redondeados
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10, // Un poco más de padding vertical
    borderBottomWidth: 1,
    borderBottomColor: '#eee' // Separador más sutil
  },
  itemText: {
    marginLeft: 10, // Aumentar un poco el margen
    fontSize: 16,
    flex: 1 // Para que el texto ocupe el espacio disponible y el botón de eliminar se alinee a la derecha
  },
  boughtText: {
    textDecorationLine: 'line-through',
    color: '#999'
  },
  // --- ESTILOS PARA EL BOTÓN DE ELIMINAR ---
  deleteButton: {
    padding: 8, // Área táctil
    marginLeft: 8, // Espacio respecto al texto
  },
  // --- FIN ESTILOS BOTÓN ---
  emptyContainer: { // Estilo para centrar el mensaje de lista vacía
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50
  },
  empty: {
    textAlign: 'center',
    fontSize: 16, // Ligeramente más grande
    color: '#666'
  }
});
