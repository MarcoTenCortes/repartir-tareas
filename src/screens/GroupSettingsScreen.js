// src/screens/GroupSettingsScreen.js
import React, { useState, useContext, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Dropdown } from 'react-native-element-dropdown';
import * as Animatable from 'react-native-animatable';
import { UserContext } from '../context/UserContext';
import { GroupContext } from '../context/GroupContext';
import { useTheme } from '../context/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';


export default function GroupSettingsScreen({ navigation }) {
  const { user, groups: userOwnedGroups } = useContext(UserContext);
  const {
    currentGroup: contextCurrentGroup, // Renombrar para evitar conflicto
    setCurrentGroup: setContextCurrentGroup,
    updateGroupName,
    removeMemberFromGroup,
    getGroupMembersDetails
  } = useContext(GroupContext);
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const [selectedGroupForEditing, setSelectedGroupForEditing] = useState(null);
  const [groupNameToEdit, setGroupNameToEdit] = useState('');
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMembersLoading, setIsMembersLoading] = useState(false);
  const [isFocusDropdown, setIsFocusDropdown] = useState(false);


  // Sincronizar selectedGroupForEditing con el currentGroup del contexto al entrar
  useEffect(() => {
    if (contextCurrentGroup) {
      setSelectedGroupForEditing(contextCurrentGroup);
    } else if (userOwnedGroups.length > 0) {
      // Si no hay currentGroup en contexto pero sí hay grupos del usuario, seleccionar el primero
      setSelectedGroupForEditing(userOwnedGroups[0]);
      setContextCurrentGroup(userOwnedGroups[0]); // Actualizar también el contexto
    }
  }, [contextCurrentGroup, userOwnedGroups, setContextCurrentGroup]);


  // Cargar nombre y miembros cuando selectedGroupForEditing cambia
  useEffect(() => {
    if (selectedGroupForEditing) {
      setGroupNameToEdit(selectedGroupForEditing.name);
      fetchMembers(selectedGroupForEditing.members);
    } else {
      setGroupNameToEdit('');
      setMembers([]);
    }
  }, [selectedGroupForEditing]);
  
  // Refrescar miembros si el grupo actual en el contexto cambia (por ejemplo, si se elimina un miembro)
  useFocusEffect(
    useCallback(() => {
      if (selectedGroupForEditing && contextCurrentGroup && selectedGroupForEditing.id === contextCurrentGroup.id) {
        // Si el grupo editado es el mismo que el del contexto y ha habido cambios en los miembros del contexto
        if (JSON.stringify(selectedGroupForEditing.members) !== JSON.stringify(contextCurrentGroup.members)) {
             fetchMembers(contextCurrentGroup.members); // Recargar miembros
             // Actualizar selectedGroupForEditing para que tenga la lista de miembros más reciente
             setSelectedGroupForEditing(prev => ({...prev, members: contextCurrentGroup.members}));
        }
      }
    }, [contextCurrentGroup, selectedGroupForEditing])
  );


  const fetchMembers = async (memberUIDs) => {
    if (!memberUIDs || memberUIDs.length === 0) {
      setMembers([]);
      return;
    }
    setIsMembersLoading(true);
    try {
      const memberDetails = await getGroupMembersDetails(memberUIDs);
      setMembers(memberDetails);
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar la lista de miembros.');
      console.error("Error fetching members:", error);
    } finally {
      setIsMembersLoading(false);
    }
  };

  const handleUpdateGroupName = async () => {
    if (!selectedGroupForEditing || !groupNameToEdit.trim()) {
      Alert.alert('Error', 'Selecciona un grupo y escribe un nombre válido.');
      return;
    }
    if (selectedGroupForEditing.name === groupNameToEdit.trim()) {
      Alert.alert('Información', 'El nombre del grupo no ha cambiado.');
      return;
    }
    setIsLoading(true);
    try {
      await updateGroupName(selectedGroupForEditing.id, groupNameToEdit.trim());
      Alert.alert('Éxito', 'Nombre del grupo actualizado.');
      // Actualizar el selectedGroupForEditing para reflejar el cambio localmente
      setSelectedGroupForEditing(prev => ({ ...prev, name: groupNameToEdit.trim() }));
      // El UserContext y GroupContext se actualizarán a través de listeners de Firestore
    } catch (error) {
      Alert.alert('Error', `No se pudo actualizar el nombre: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = (memberIdToRemove, memberNameToRemove) => {
    if (!selectedGroupForEditing) return;
    Alert.alert(
      'Confirmar Eliminación',
      `¿Estás seguro de que quieres eliminar a "${memberNameToRemove}" del grupo "${selectedGroupForEditing.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              await removeMemberFromGroup(selectedGroupForEditing.id, memberIdToRemove);
              Alert.alert('Éxito', `"${memberNameToRemove}" ha sido eliminado del grupo.`);
              // Los miembros se refrescarán a través de useFocusEffect y cambios en contextCurrentGroup.members
            } catch (error) {
              Alert.alert('Error', `No se pudo eliminar al miembro: ${error.message}`);
            } finally {
              setIsLoading(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };
  
  const isCurrentUserOwner = selectedGroupForEditing && user && selectedGroupForEditing.owner === user.uid;

  const dataForDropdown = Array.isArray(userOwnedGroups) ? userOwnedGroups.map(group => ({
    label: group.name,
    value: group.id,
    fullGroup: group // Guardar el objeto completo para fácil acceso
  })) : [];


  if (!user) {
    return <View style={styles.centeredMessageContainer}><Text style={styles.infoText}>Debes iniciar sesión.</Text></View>;
  }
  
  // if (userOwnedGroups.length === 0) {
  //   return <View style={styles.centeredMessageContainer}><Text style={styles.infoText}>No perteneces a ningún grupo.</Text></View>;
  // }

  return (
    <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingContainer}
    >
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <Animatable.View animation="fadeInDown" style={styles.header}>
        <Ionicons name="settings-outline" size={30} color={theme.primary} />
        <Text style={styles.mainTitle}>Configuración de Grupos</Text>
      </Animatable.View>

    {userOwnedGroups.length === 0 ? (
         <View style={styles.centeredMessageContainer}>
            <Ionicons name="people-circle-outline" size={60} color={theme.textSecondary} style={{marginBottom:10}}/>
            <Text style={styles.infoText}>Aún no perteneces a ningún grupo.</Text>
            <Text style={styles.infoTextSmall}>Crea uno o únete a uno existente desde la pantalla de inicio.</Text>
         </View>
    ) : (
    <>
      <Animatable.View animation="fadeInUp" delay={100} style={styles.sectionContainer}>
        <Text style={styles.label}>Selecciona un grupo para administrar:</Text>
        <Dropdown
          style={[styles.dropdown, { borderColor: isFocusDropdown ? theme.primary : theme.border, backgroundColor: theme.cardBackground }]}
          placeholderStyle={[styles.placeholderStyle, { color: theme.textSecondary }]}
          selectedTextStyle={[styles.selectedTextStyle, { color: theme.textPrimary }]}
          inputSearchStyle={[styles.inputSearchStyle, { color: theme.textPrimary }]}
          iconStyle={styles.iconStyle}
          data={dataForDropdown}
          search
          maxHeight={250}
          labelField="label"
          valueField="value"
          placeholder={!isFocusDropdown && selectedGroupForEditing ? selectedGroupForEditing.name : "Selecciona un grupo"}
          searchPlaceholder="Buscar grupo..."
          value={selectedGroupForEditing ? selectedGroupForEditing.id : null}
          onFocus={() => setIsFocusDropdown(true)}
          onBlur={() => setIsFocusDropdown(false)}
          onChange={item => {
            setSelectedGroupForEditing(item.fullGroup); // item.fullGroup contiene el objeto completo
            setContextCurrentGroup(item.fullGroup); // Actualizar también el currentGroup del contexto global
            setIsFocusDropdown(false);
          }}
          renderLeftIcon={() => (
            <Ionicons
              style={styles.dropdownIcon}
              color={isFocusDropdown ? theme.primary : theme.textSecondary}
              name="people-outline"
              size={20}
            />
          )}
        />
      </Animatable.View>

      {selectedGroupForEditing && (
        <Animatable.View animation="fadeInUp" delay={200} style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Administrar: {selectedGroupForEditing.name}</Text>
          
          {isCurrentUserOwner ? (
            <>
              <Text style={styles.label}>Cambiar nombre del grupo:</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="create-outline" size={20} color={theme.placeholder} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Nuevo nombre del grupo"
                  placeholderTextColor={theme.placeholder}
                  value={groupNameToEdit}
                  onChangeText={setGroupNameToEdit}
                />
              </View>
              <TouchableOpacity 
                style={[styles.buttonPrimary, isLoading && styles.buttonDisabled]} 
                onPress={handleUpdateGroupName}
                disabled={isLoading || groupNameToEdit === selectedGroupForEditing.name}
              >
                {isLoading ? <ActivityIndicator color={theme.textLight} /> : <Text style={styles.buttonTextPrimary}>Guardar Nombre</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.infoText}>No eres el propietario de este grupo, no puedes cambiar su nombre ni eliminar miembros.</Text>
          )}

          <Text style={styles.label}>Miembros del grupo ({members.length}):</Text>
          {isMembersLoading ? (
            <ActivityIndicator size="large" color={theme.primary} style={{marginVertical: 20}} />
          ) : members.length > 0 ? (
            <FlatList
              data={members}
              keyExtractor={(item) => item.uid}
              renderItem={({ item }) => (
                <View style={styles.memberItem}>
                  <View style={styles.memberInfo}>
                     <Ionicons name={item.icon || 'person-circle-outline'} size={28} color={theme.textSecondary} style={styles.memberIcon}/>
                     <Text style={styles.memberName}>{item.name} {item.uid === selectedGroupForEditing.owner ? '(Propietario)' : ''}</Text>
                  </View>
                  {isCurrentUserOwner && item.uid !== user.uid && (
                    <TouchableOpacity 
                        onPress={() => handleRemoveMember(item.uid, item.name)} 
                        style={styles.removeButton}
                        disabled={isLoading}
                    >
                      <Ionicons name="trash-bin-outline" size={22} color={theme.error} />
                    </TouchableOpacity>
                  )}
                </View>
              )}
              style={styles.membersList}
              scrollEnabled={false} // Para que el scroll principal maneje todo
            />
          ) : (
            <Text style={styles.infoText}>No hay miembros en este grupo o no se pudieron cargar.</Text>
          )}
        </Animatable.View>
      )}
      {isLoading && <ActivityIndicator size="large" color={theme.primary} style={styles.globalLoader} />}
      </>
    )}
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  keyboardAvoidingContainer: {
    flex: 1,
    backgroundColor: theme.background,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    marginTop: Platform.OS === 'android' ? 20 : 30,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.primary,
    marginLeft: 10,
  },
  sectionContainer: {
    backgroundColor: theme.cardBackground,
    borderRadius: 12,
    padding: 20,
    marginBottom: 25,
    shadowColor: theme.shadowColor || '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.textPrimary,
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    paddingBottom: 10,
  },
  label: {
    fontSize: 16,
    color: theme.textSecondary,
    marginBottom: 8,
    marginTop: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.inputBackground,
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: theme.border,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: theme.textPrimary,
  },
  buttonPrimary: {
    backgroundColor: theme.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    minHeight: 50,
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: theme.border,
  },
  buttonTextPrimary: {
    color: theme.textLight,
    fontSize: 16,
    fontWeight: 'bold',
  },
  membersList: {
    marginTop: 10,
  },
  memberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLight,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberIcon: {
    marginRight: 12,
  },
  memberName: {
    fontSize: 16,
    color: theme.textPrimary,
  },
  removeButton: {
    padding: 8,
  },
  infoText: {
    fontSize: 15,
    color: theme.textSecondary,
    textAlign: 'center',
    marginVertical: 15,
    lineHeight: 22,
  },
  infoTextSmall: {
    fontSize: 13,
    color: theme.textSecondary,
    textAlign: 'center',
    marginBottom: 15,
  },
  centeredMessageContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      marginTop: 50,
  },
  dropdown: {
    height: 50,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    backgroundColor: theme.inputBackground, // Coherencia con inputs
    marginBottom: 15,
  },
  placeholderStyle: {
    fontSize: 16,
  },
  selectedTextStyle: {
    fontSize: 16,
    fontWeight: '500',
  },
  iconStyle: { // Para la flecha del dropdown
    width: 24,
    height: 24,
  },
  inputSearchStyle: { // Para el campo de búsqueda dentro del dropdown
    height: 45,
    fontSize: 16,
    borderRadius: 8,
    borderColor: theme.border,
  },
  dropdownIcon: { // Para el icono a la izquierda del dropdown
    marginRight: 10,
  },
  globalLoader: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -15 }, { translateY: -15 }], // Centrar aprox.
  }
});
