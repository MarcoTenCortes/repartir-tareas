// FILE: src/screens/ShoppingScreen.js
import React, { useContext, useState, useCallback } from 'react'; // Añadir useCallback
import {
  View,
  TextInput,
  // FlatList, // Se reemplazará por DraggableFlatList
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ImageBackground, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// Importar DraggableFlatList y ScaleDecorator
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { GroupContext } from '../context/GroupContext';
import { useTheme } from '../context/ThemeContext'; 

// const paperBackgroundAsset = require('../../assets/images/shopping_list_bg.png');

export default function ShoppingScreen() {
  const { 
    shoppingList, 
    addShoppingItem, 
    toggleBought, 
    deleteShoppingItem, 
    currentGroup,
    updateShoppingListOrder // Importar la nueva función del contexto
  } = useContext(GroupContext);
  const { theme } = useTheme(); 
  const [itemText, setItemText] = useState('');

  const paperColor = '#FFF9E6'; 
  const inkColor = '#4A4A4A';   
  const lineColor = '#B0C4DE';  

  const styles = getThemedStyles(theme, paperColor, inkColor, lineColor);

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

  // NUEVA FUNCIÓN: Manejador para cuando termina el arrastre
  const handleDragEnd = useCallback(async ({ data: reorderedData }) => {
    if (!currentGroup) {
      Alert.alert("Error", "No hay grupo seleccionado para reordenar.");
      // Podrías revertir el estado visual si DraggableFlatList no lo hace,
      // pero usualmente la actualización del contexto lo arreglará.
      return;
    }
    try {
      // `shoppingList` en el contexto se actualizará a través del listener de Firestore
      // después de que `updateShoppingListOrder` complete la escritura.
      // DraggableFlatList actualiza su 'data' internamente para la UI de forma optimista.
      await updateShoppingListOrder(reorderedData);
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar el nuevo orden de la lista.');
      console.error("Error actualizando el orden de la lista:", error);
      // Aquí podrías forzar una recarga o revertir el estado visual si es necesario.
    }
  }, [currentGroup, updateShoppingListOrder]);


  // MODIFICADO: renderItem ahora se llama renderShoppingItem y usa props de DraggableFlatList
  const renderShoppingItem = useCallback(({ item, drag, isActive }) => {
    return (
      <ScaleDecorator>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => toggleBought(item.id, !item.bought)}
          onLongPress={drag} // Activa el arrastre con pulsación larga
          disabled={isActive} // Deshabilita onPress y onLongPress mientras se arrastra
          style={[
            styles.itemContainer,
            // Podrías añadir un estilo visual para 'isActive' si ScaleDecorator no es suficiente
            // isActive && { backgroundColor: theme.primaryLight, elevation: 5 } 
          ]}
        >
          <View style={styles.itemContent}>
            <Ionicons
              name={item.bought ? "checkbox-outline" : "square-outline"}
              size={28}
              color={item.bought ? theme.success : inkColor}
              style={styles.checkboxIcon}
            />
            <Text style={[styles.itemText, item.bought && styles.itemTextBought]}>
              {item.text}
            </Text>
          </View>
          <TouchableOpacity 
            onPress={() => handleDelete(item.id, item.text)} 
            style={styles.deleteButton}
            disabled={isActive} // También deshabilita el botón de eliminar durante el arrastre
          >
            <Ionicons name="trash-bin-outline" size={24} color={theme.error} />
          </TouchableOpacity>
        </TouchableOpacity>
      </ScaleDecorator>
    );
  }, [theme, inkColor, styles, toggleBought, handleDelete]); // Añadir dependencias de useCallback


  return (
    // GestureHandlerRootView debe envolver la aplicación, usualmente en App.js o el navegador raíz.
    // Si no está ya, necesitarías añadirlo aquí o más arriba.
    // Como está en App.js, no se necesita aquí.
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.keyboardAvoidingContainer}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0} // Ajustar según altura del header
    >
      {/* Opcional: Fondo de imagen de papel */}
      {/* <ImageBackground source={paperBackgroundAsset} style={styles.backgroundImage}> */}
      <View style={styles.container}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Añadir a la lista..."
            placeholderTextColor={theme.placeholder}
            value={itemText}
            onChangeText={setItemText}
            onSubmitEditing={handleAdd} // Añadir al presionar Enter
          />
          <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
            <Ionicons name="add-circle-outline" size={32} color={theme.primary} />
          </TouchableOpacity>
        </View>

        {/* REEMPLAZADO: FlatList por DraggableFlatList */}
        <DraggableFlatList
          data={shoppingList}
          keyExtractor={(item) => item.id} // Asegúrate que cada item tiene un id único y estable
          renderItem={renderShoppingItem}
          onDragEnd={handleDragEnd}
          activationDistance={10}
           pressDuration={5}
          ListEmptyComponent={
            <View style={styles.emptyListContainer}>
              <Ionicons name="cart-outline" size={60} color={theme.textSecondary} />
              <Text style={styles.emptyListText}>
                {currentGroup ? "Tu lista de la compra está vacía." : "Selecciona un grupo para ver la lista."}
              </Text>
            </View>
          }
          contentContainerStyle={shoppingList.length === 0 ? styles.listContentEmpty : styles.listContent}
          // containerStyle={{ flex: 1 }} // Si la lista debe ocupar todo el espacio restante
        />
      </View>
      {/* </ImageBackground> */}
    </KeyboardAvoidingView>
  );
}

// Función para generar estilos
const getThemedStyles = (theme, paperColor, inkColor, lineColor) => StyleSheet.create({
  keyboardAvoidingContainer: {
    flex: 1,
    backgroundColor: paperColor, // Fondo de "papel"
  },
  // backgroundImage: {
  //   flex: 1,
  //   resizeMode: 'cover', // o 'stretch'
  // },
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 20 : 10, // Más espacio arriba en Android
    paddingHorizontal: 15,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: theme.cardBackground, // Un fondo ligeramente diferente para el input
    borderRadius: 12,
    borderBottomWidth: 2, // Simula una línea más gruesa de cuaderno
    borderBottomColor: lineColor, 
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  input: {
    flex: 1,
    fontSize: 17,
    paddingVertical: 10,
    color: inkColor, // Color de tinta para el input
  },
  addButton: {
    marginLeft: 10,
    padding: 5,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15, // Más padding vertical para mejor toque
    paddingHorizontal: 10,
    // marginBottom: 8, // Espacio entre items si no hay líneas
    backgroundColor: 'transparent', // El fondo es el del contenedor principal (papel)
    borderBottomWidth: 1, // Líneas de "cuaderno"
    borderBottomColor: lineColor, 
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1, // Para que el texto ocupe el espacio disponible
  },
  checkboxIcon: {
    marginRight: 12, // Más espacio
  },
  itemText: {
    fontSize: 18, // Texto más grande
    color: inkColor, // Color de tinta
    flex: 1, // Para que el texto se ajuste y no empuje el botón de borrar
  },
  itemTextBought: {
    textDecorationLine: 'line-through',
    color: theme.textSecondary, // Color más tenue para items comprados
    fontStyle: 'italic',
  },
  deleteButton: {
    paddingLeft: 10, // Área de toque para el botón de eliminar
    paddingVertical: 5,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyListText: {
    marginTop: 15,
    fontSize: 17,
    color: theme.textSecondary,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 20, // Espacio al final de la lista
  },
  listContentEmpty: { // Estilo para cuando la lista está vacía y ocupa toda la pantalla
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
