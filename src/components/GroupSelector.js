// src/components/GroupSelector.js
import React, { useContext, useState, useEffect } from 'react'; // Añadido useEffect
import { View, Text, StyleSheet } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { Ionicons } from '@expo/vector-icons';
import { GroupContext } from '../context/GroupContext';
import { UserContext } from '../context/UserContext';

export default function GroupSelector() {
  // CORRECCIÓN: Desestructurar 'groups' y opcionalmente renombrarlo a 'userGroups'
  const { groups: userGroups } = useContext(UserContext);
  const { currentGroup, setCurrentGroup } = useContext(GroupContext);
  const [isFocus, setIsFocus] = useState(false);
  
  // Estado local para el valor del Dropdown, inicializado con el ID del grupo actual si existe
  const [dropdownValue, setDropdownValue] = useState(currentGroup ? currentGroup.id : null);

  // Efecto para actualizar el valor del dropdown si currentGroup cambia desde el contexto
  useEffect(() => {
    if (currentGroup) {
      setDropdownValue(currentGroup.id);
    } else {
      setDropdownValue(null); // Si no hay grupo actual, el dropdown no tendrá valor seleccionado
    }
  }, [currentGroup]);

  // Asegurarse de que userGroups es un array antes de mapear
  // Aunque UserContext lo inicializa como [], esta es una guarda adicional.
  const dataForDropdown = Array.isArray(userGroups) ? userGroups.map(group => ({
    label: group.name,
    value: group.id,
  })) : [];

  // Si no hay grupos, mostrar un mensaje.
  // Verificar que userGroups sea un array antes de acceder a .length
  if (!Array.isArray(userGroups) || userGroups.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.noGroupsText}>No hay grupos</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Dropdown
        style={[styles.dropdown, isFocus && { borderColor: 'blue' }]}
        placeholderStyle={styles.placeholderStyle}
        selectedTextStyle={styles.selectedTextStyle}
        inputSearchStyle={styles.inputSearchStyle}
        iconStyle={styles.iconStyle}
        data={dataForDropdown}
        search
        maxHeight={300}
        labelField="label"
        valueField="value"
        // Mostrar el nombre del grupo actual como placeholder si no está en foco y hay un grupo
        placeholder={!isFocus && currentGroup ? currentGroup.name : 'Selecciona grupo'}
        searchPlaceholder="Buscar grupo..."
        value={dropdownValue} // Usar el estado local 'dropdownValue'
        onFocus={() => setIsFocus(true)}
        onBlur={() => setIsFocus(false)}
        onChange={item => {
          const selectedGroupObject = userGroups.find(g => g.id === item.value);
          if (selectedGroupObject) {
            setCurrentGroup(selectedGroupObject);
          }
          setDropdownValue(item.value); // Actualizar el estado local
          setIsFocus(false);
        }}
        renderLeftIcon={() => (
          <Ionicons
            style={styles.icon}
            color={isFocus ? 'blue' : 'black'}
            name="people-outline" // Cambiado a un icono más genérico de grupo
            size={20}
          />
        )}
        renderRightIcon={() => (
          <Ionicons
            name={isFocus ? "chevron-up-outline" : "chevron-down-outline"}
            size={22}
            color="gray"
            style={{ marginLeft: 5 }}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 4,
    minWidth: 150,
    marginRight: 10, // Espacio respecto al icono de usuario en AppHeader
    justifyContent: 'center', // Centrar el dropdown verticalmente en su contenedor
  },
  dropdown: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 0.5,
    borderRadius: 8,
    paddingHorizontal: 8,
    backgroundColor: '#FFFFFF',
  },
  icon: {
    marginRight: 10, // Más espacio para el icono izquierdo
  },
  placeholderStyle: {
    fontSize: 16,
    color: 'gray',
  },
  selectedTextStyle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'black',
    marginLeft: 5, // Pequeño margen si no hay icono izquierdo o para separar del icono
  },
  iconStyle: {
    width: 20,
    height: 20,
  },
  inputSearchStyle: {
    height: 40,
    fontSize: 16,
    borderRadius: 6,
  },
  noGroupsText: {
    fontSize: 16,
    color: 'gray',
    paddingHorizontal: 10,
  },
});
