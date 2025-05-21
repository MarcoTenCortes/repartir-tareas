// src/screens/ShoppingScreen.js
import React, { useContext, useState, useCallback } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { GroupContext } from '../context/GroupContext';
import { useTheme } from '../context/ThemeContext';

export default function ShoppingScreen() {
  const {
    shoppingList,
    addShoppingItem,
    toggleBought,
    deleteShoppingItem,
    currentGroup,
    updateShoppingListOrder
  } = useContext(GroupContext);
  const { theme } = useTheme();
  const [itemText, setItemText] = useState('');

  const paperColor = '#FFF9E6';
  const inkColor = '#4A4A4A';
  const lineColor = '#B0C4DE';

  const styles = getThemedStyles(theme, paperColor, inkColor, lineColor);

  // ... (tus funciones handleAdd, handleDelete, handleDragEnd, renderShoppingItem no cambian)
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

  const handleDragEnd = useCallback(async ({ data: reorderedData }) => {
    if (!currentGroup) {
      Alert.alert("Error", "No hay grupo seleccionado para reordenar.");
      return;
    }
    try {
      await updateShoppingListOrder(reorderedData);
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar el nuevo orden de la lista.');
      console.error("Error actualizando el orden de la lista:", error);
    }
  }, [currentGroup, updateShoppingListOrder]);

  const renderShoppingItem = useCallback(({ item, drag, isActive }) => {
    return (
      <ScaleDecorator>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => toggleBought(item.id, !item.bought)}
          onLongPress={drag}
          disabled={isActive}
          style={[
            styles.itemContainer,
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
            disabled={isActive}
          >
            <Ionicons name="trash-bin-outline" size={24} color={theme.error} />
          </TouchableOpacity>
        </TouchableOpacity>
      </ScaleDecorator>
    );
  }, [theme, inkColor, styles, toggleBought, handleDelete]);


  return (
    <View style={styles.overallScreenContainer}>
      <Image
        source={require('../../assets/pollo_comprando.png')} // Ajusta la ruta si es necesario
        style={styles.fixedBackgroundImage}
        resizeMode="contain"
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingWrapper}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0} // Mantén tu offset si es necesario
      >
        {/* Contenedor para el input y la lista, que SÍ se ajustará */}
        <View style={styles.contentContainerForKAV}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Añadir a la lista..."
              placeholderTextColor={theme.placeholder}
              value={itemText}
              onChangeText={setItemText}
              onSubmitEditing={handleAdd}
            />
            <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
              <Ionicons name="add-circle-outline" size={32} color={theme.primary} />
            </TouchableOpacity>
          </View>

          <DraggableFlatList
            data={shoppingList}
            keyExtractor={(item) => item.id}
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
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const getThemedStyles = (theme, paperColor, inkColor, lineColor) => StyleSheet.create({
  overallScreenContainer: { // NUEVO: Contenedor principal de toda la pantalla
    flex: 1,
    backgroundColor: paperColor, // El color de fondo general se aplica aquí
  },
  fixedBackgroundImage: { // NUEVO: Estilo para la imagen que no se moverá
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: '100%',
    height: 200, // Ajusta esta altura como necesites
    opacity: 0.7, // O la opacidad que desees
    zIndex: 0, // Detrás del contenido del KeyboardAvoidingView
  },
  keyboardAvoidingWrapper: { // MODIFICADO: El antiguo keyboardAvoidingContainer
    flex: 1,
    backgroundColor: 'transparent', // Importante para que se vea la imagen de detrás
    zIndex: 1, // Encima de la fixedBackgroundImage
  },
  contentContainerForKAV: { // NUEVO: Contenedor para el contenido que se ajusta con el teclado
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 20 : 10,
    paddingHorizontal: 15,
  },
  // LOS SIGUIENTES ESTILOS SON LOS QUE YA TENÍAS (inputContainer, input, etc.)
  // Y SE USARÁN DENTRO DE contentContainerForKAV.
  // He eliminado el antiguo 'container' y 'keyboardAvoidingContainer' de tus estilos
  // ya que han sido reemplazados/renombrados.
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: theme.cardBackground, // Este fondo tapará la imagen del pollo en esta área, lo cual es correcto
    borderRadius: 12,
    borderBottomWidth: 2,
    borderBottomColor: lineColor,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3, // Asegura que inputContainer esté visualmente por encima de la imagen si comparten padre
                  // (aunque aquí no es el caso directo, el zIndex del KAV ya lo maneja)
  },
  input: {
    flex: 1,
    fontSize: 17,
    paddingVertical: 10,
    color: inkColor,
  },
  addButton: {
    marginLeft: 10,
    padding: 5,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 10,
    backgroundColor: 'transparent', // Los items de la lista son transparentes, se verá la imagen del pollo detrás
    borderBottomWidth: 1,
    borderBottomColor: lineColor,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkboxIcon: {
    marginRight: 12,
  },
  itemText: {
    fontSize: 18,
    color: inkColor,
    flex: 1,
  },
  itemTextBought: {
    textDecorationLine: 'line-through',
    color: theme.textSecondary,
    fontStyle: 'italic',
  },
  deleteButton: {
    paddingLeft: 10,
    paddingVertical: 5,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
    // Si quieres que la imagen del pollo se vea detrás del texto de lista vacía:
    // backgroundColor: 'transparent', (si tuviera alguno)
  },
  emptyListText: {
    marginTop: 15,
    fontSize: 17,
    color: theme.textSecondary,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 20, // Para que el último item no quede pegado al borde o a la imagen
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // EL ESTILO 'backgroundImage' ORIGINAL FUE RENOMBRADO A 'fixedBackgroundImage'
});
