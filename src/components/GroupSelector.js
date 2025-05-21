// FILE: src/components/GroupSelector.js
import React, { useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { Ionicons } from '@expo/vector-icons';
import { GroupContext } from '../context/GroupContext';
import { UserContext } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';

export default function GroupSelector() {
  const { groups: userGroups } = useContext(UserContext);
  const { currentGroup, setCurrentGroup } = useContext(GroupContext);
  const { theme } = useTheme();

  const [isFocus, setIsFocus] = useState(false);
  const [dropdownValue, setDropdownValue] = useState(currentGroup ? currentGroup.id : null);

  useEffect(() => {
    if (currentGroup) {
      setDropdownValue(currentGroup.id);
    } else {
      setDropdownValue(null);
    }
  }, [currentGroup]);

  const dataForDropdown = Array.isArray(userGroups) ? userGroups.map(group => ({
    label: group.name,
    value: group.id,
  })) : [];

  if (!Array.isArray(userGroups) || userGroups.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={[styles.noGroupsText, { color: theme.textSecondary }]}>No hay grupos</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Dropdown
        style={[styles.dropdown, { borderColor: isFocus ? theme.primary : theme.border, backgroundColor: theme.cardBackground }, isFocus && { shadowColor: theme.primary, shadowOpacity: 0.3, shadowRadius: 5, elevation: 3 }]}
        placeholderStyle={[styles.placeholderStyle, { color: theme.textSecondary }]}
        selectedTextStyle={[styles.selectedTextStyle, { color: theme.textPrimary }]}
        inputSearchStyle={[styles.inputSearchStyle, { color: theme.textPrimary }]} // Asegurar color de texto en búsqueda
        iconStyle={styles.iconStyle}
        data={dataForDropdown}
        search
        maxHeight={300}
        labelField="label"
        valueField="value"
        placeholder={!isFocus && currentGroup ? currentGroup.name : 'Selecciona grupo'}
        searchPlaceholder="Buscar..." // Más corto
        value={dropdownValue}
        onFocus={() => setIsFocus(true)}
        onBlur={() => setIsFocus(false)}
        onChange={item => {
          const selectedGroupObject = userGroups.find(g => g.id === item.value);
          if (selectedGroupObject) {
            setCurrentGroup(selectedGroupObject);
          }
          setDropdownValue(item.value);
          setIsFocus(false);
        }}
        renderLeftIcon={() => (
          <Ionicons
            style={styles.icon}
            color={isFocus ? theme.primary : theme.textSecondary}
            name="people-outline"
            size={20}
          />
        )}
        renderRightIcon={() => (
          <Ionicons
            name={isFocus ? "chevron-up-outline" : "chevron-down-outline"}
            size={22}
            color={theme.textSecondary}
            style={{ marginLeft: 5 }} // Ajustar si es necesario
          />
        )}
        // containerStyle={{ width: '100%' }} // Asegura que use el ancho del wrapper
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // flex: 1, // Quitar flex:1 para que el wrapper en AppHeader controle el tamaño
    paddingVertical: 4,
    // minWidth: 150, // Quitar minWidth si el wrapper en AppHeader lo controla
    // marginRight: 10, // Quitar margen si se maneja en AppHeader
    justifyContent: 'center',
    width: '100%', // Para que ocupe el ancho de su wrapper en AppHeader
  },
  dropdown: {
    height: 40, // O 42 para un poco más de padding vertical
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10, // Reducir un poco si el texto no cabe
  },
  icon: {
    marginRight: 8, // Reducir un poco si es necesario
  },
  placeholderStyle: {
    fontSize: 15, // Un poco más pequeño si es necesario
  },
  selectedTextStyle: {
    fontSize: 15, // Un poco más pequeño si es necesario
    fontWeight: '600',
    marginLeft: 5,
  },
  iconStyle: {
    width: 20,
    height: 20,
  },
  inputSearchStyle: {
    height: 40,
    fontSize: 15, // Un poco más pequeño
    borderRadius: 8,
  },
  noGroupsText: {
    fontSize: 15, // Un poco más pequeño
    paddingLeft: 5, // Pequeño padding para alinear con el dropdown si estuviera presente
  },
});
