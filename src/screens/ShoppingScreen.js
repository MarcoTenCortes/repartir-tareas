// src/screens/ShoppingScreen.js
import React, { useContext, useState } from 'react';
import {
  View,
  TextInput,
  FlatList,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ImageBackground, // Añadido para un posible fondo de imagen
  KeyboardAvoidingView, // Añadido para mejorar la interacción con el teclado
  Platform // Añadido para comportamiento específico de la plataforma
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GroupContext } from '../context/GroupContext';
import { useTheme } from '../context/ThemeContext'; // Importar useTheme

// Conceptual: Si deseas usar una imagen de fondo de papel, deberías añadirla a tus assets.
// const paperBackgroundAsset = require('../../assets/images/shopping_list_bg.png');

export default function ShoppingScreen() {
  const { shoppingList, addShoppingItem, toggleBought, deleteShoppingItem, currentGroup } = useContext(GroupContext);
  const { theme } = useTheme(); // Usar el tema global de la aplicación
  const [itemText, setItemText] = useState('');

  // Colores específicos para la estética de la lista de la compra
  const paperColor = '#FFF9E6'; // Un color crema, ligeramente amarillento como el papel
  const inkColor = '#4A4A4A';   // Gris oscuro para el texto, simulando lápiz o tinta
  const lineColor = '#B0C4DE';  // Azul acero claro para las líneas del papel

  // Generar estilos que combinan el tema global con los colores personalizados de la lista
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

  const handleToggleBought = async (itemId, currentBoughtStatus) => {
    if (!currentGroup) return;
    try {
      await toggleBought(itemId, !currentBoughtStatus);
    } catch (error) {
      console.error("Error actualizando estado de compra:", error);
      Alert.alert('Error', 'No se pudo actualizar el estado del artículo.');
    }
  };

  const renderShoppingItem = ({ item }) => (
    <View style={styles.listItemContainer}>
      <TouchableOpacity
        style={styles.checkboxContainer}
        onPress={() => handleToggleBought(item.id, item.bought)}
      >
        <Ionicons
          name={item.bought ? 'checkbox-outline' : 'square-outline'}
          size={28}
          color={item.bought ? theme.success : inkColor} // Color del checkbox
        />
      </TouchableOpacity>
      <View style={styles.itemTextContainer}>
        <Text style={[styles.listItemText, item.bought && styles.boughtText]}>
          {item.text}
        </Text>
        {item.addedByName && ( // Mostrar quién añadió el artículo si está disponible
          <Text style={styles.addedByText}>(Por: {item.addedByName})</Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDelete(item.id, item.text)}
      >
        <Ionicons name="trash-bin-outline" size={24} color={theme.error} />
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: theme.background }} // Fondo general de la app
    >
      {/* 
        Para usar una imagen de fondo específica para la lista (ej. textura de papel):
        1. Descomenta la línea de `ImageBackground` abajo.
        2. Asegúrate de tener una imagen (ej. 'shopping_list_bg.png') en tu carpeta `assets/images/`.
        3. Descomenta la importación de `paperBackgroundAsset` al inicio del archivo.
        
        <ImageBackground source={paperBackgroundAsset} style={styles.background}>
          ... contenido de la lista ...
        </ImageBackground>
        
        Por ahora, se usa un color sólido para el área de la lista para simular papel.
      */}
      <View style={styles.container}> 
        <Text style={styles.title}>Lista de la Compra</Text>
        
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="¿Qué necesitas comprar?"
            placeholderTextColor={theme.placeholder} // Usar color de placeholder del tema
            value={itemText}
            onChangeText={setItemText}
            onSubmitEditing={handleAdd} // Permite añadir con "Enter"
          />
          <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
            <Ionicons name="add-circle-outline" size={32} color={theme.primary} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={shoppingList}
          renderItem={renderShoppingItem}
          keyExtractor={item => item.id}
          ListEmptyComponent={<Text style={styles.emptyListText}>¡Tu lista de la compra está vacía!</Text>}
          contentContainerStyle={styles.listContentContainer}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

// Función para generar los estilos, incorporando el tema y colores personalizados
const getThemedStyles = (theme, paperColor, inkColor, lineColor) => StyleSheet.create({
  // background: { // Estilo para ImageBackground si se usa una imagen de fondo
  //   flex: 1,
  // },
  container: { // Contenedor principal de la lista, simula una hoja de papel
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: Platform.OS === 'android' ? 20 : 10,
    backgroundColor: paperColor, // Color de fondo tipo papel
    margin: 10, // Margen para que la "hoja" destaque sobre el fondo de la app
    borderRadius: 10, // Bordes redondeados para la "hoja"
    shadowColor: '#000', // Sombra para dar profundidad
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3, // Elevación para Android
  },
  title: { // Estilo para el título "Lista de la Compra"
    fontSize: 28,
    fontWeight: 'bold',
    color: inkColor, // Color de tinta para el título
    textAlign: 'center',
    marginBottom: 20,
    // Intenta usar una fuente que parezca más manuscrita o de cuaderno
    fontFamily: Platform.OS === 'ios' ? 'MarkerFelt-Thin' : 'sans-serif-condensed', 
  },
  inputContainer: { // Contenedor para el campo de texto y el botón de añadir
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1, // Línea debajo del input, como en un cuaderno
    borderBottomColor: lineColor,
    paddingBottom: 10,
  },
  input: { // Estilo para el campo de texto
    flex: 1,
    height: 50,
    fontSize: 18,
    color: inkColor, // Color de tinta para el texto del input
    paddingHorizontal: 10,
  },
  addButton: { // Estilo para el botón de añadir
    paddingLeft: 15,
    paddingVertical: 5,
  },
  listContentContainer: { // Estilo para el contenido de la FlatList
    paddingBottom: 20,
  },
  listItemContainer: { // Contenedor para cada artículo de la lista
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1, // Líneas separadoras entre artículos
    borderBottomColor: lineColor,
  },
  checkboxContainer: { // Contenedor para el checkbox
    paddingRight: 12,
  },
  itemTextContainer: { // Contenedor para el texto del artículo y quién lo añadió
    flex: 1,
  },
  listItemText: { // Estilo para el texto del artículo
    fontSize: 17,
    color: inkColor, // Color de tinta
  },
  boughtText: { // Estilo para artículos comprados (tachados)
    textDecorationLine: 'line-through',
    color: theme.textSecondary, // Color más tenue del tema para texto secundario
  },
  addedByText: { // Estilo para el texto "Añadido por:"
    fontSize: 12,
    color: theme.textSecondary, // Color tenue
    fontStyle: 'italic',
    marginTop: 2,
  },
  deleteButton: { // Estilo para el botón de eliminar
    paddingLeft: 15, 
    paddingVertical: 5,
  },
  emptyListText: { // Estilo para el mensaje cuando la lista está vacía
    textAlign: 'center',
    marginTop: 50,
    fontSize: 18,
    color: inkColor, // Color de tinta
    fontStyle: 'italic',
  },
});

