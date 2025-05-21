// FILE: src/screens/GroupSettingsScreen.js
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
import { useFocusEffect, useNavigation } from '@react-navigation/native';

export default function GroupSettingsScreen() {
  const navigation = useNavigation();
  const { user, groups: userAppGroups, leaveGroup, deleteGroup } = useContext(UserContext);
  const {
    currentGroup: contextCurrentGroup,
    setCurrentGroup: setContextCurrentGroup,
    updateGroupName,
    removeMemberFromGroup,
    transferGroupOwnership, // <--- IMPORTAR NUEVA FUNCIÓN
    getGroupMembersDetails,
    joinRequests, 
    approveJoinRequest, 
    rejectJoinRequest 
  } = useContext(GroupContext);
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const [selectedGroupForEditing, setSelectedGroupForEditing] = useState(null);
  const [groupNameToEdit, setGroupNameToEdit] = useState('');
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMembersLoading, setIsMembersLoading] = useState(false);
  const [isFocusDropdown, setIsFocusDropdown] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const userOwnedGroupsForDropdown = userAppGroups.filter(g => g.owner === user?.uid);
  const allUserGroupsForDropdown = userAppGroups;

  useEffect(() => {
    if (contextCurrentGroup) {
      if (!selectedGroupForEditing || selectedGroupForEditing.id !== contextCurrentGroup.id || selectedGroupForEditing.owner !== contextCurrentGroup.owner) {
        setSelectedGroupForEditing(contextCurrentGroup);
      }
    } else if (userOwnedGroupsForDropdown.length > 0 && (!selectedGroupForEditing || !userOwnedGroupsForDropdown.find(g => g.id === selectedGroupForEditing.id && g.owner === user?.uid))) {
      setSelectedGroupForEditing(userOwnedGroupsForDropdown[0]);
    } else if (allUserGroupsForDropdown.length > 0 && (!selectedGroupForEditing || !allUserGroupsForDropdown.find(g => g.id === selectedGroupForEditing.id))) {
      setSelectedGroupForEditing(allUserGroupsForDropdown[0]);
    } else {
      setSelectedGroupForEditing(null);
    }
  }, [contextCurrentGroup, userAppGroups, user]); // No selectedGroupForEditing en dependencias para evitar bucles

  useEffect(() => {
    if (selectedGroupForEditing) {
      setGroupNameToEdit(selectedGroupForEditing.name);
      fetchMembers(selectedGroupForEditing.members);
    } else {
      setGroupNameToEdit('');
      setMembers([]);
    }
  }, [selectedGroupForEditing]);
  
  useFocusEffect(
    useCallback(() => {
      // Esta lógica asegura que si el grupo actual del contexto cambia (ej. por acción en otra pantalla o listener)
      // y ese grupo es el que se está editando, se refresquen los datos localmente.
      if (selectedGroupForEditing && contextCurrentGroup && selectedGroupForEditing.id === contextCurrentGroup.id) {
        // Comprobar si hay cambios relevantes (ej. miembros, propietario) antes de actualizar para evitar re-renders innecesarios.
        if (JSON.stringify(selectedGroupForEditing.members) !== JSON.stringify(contextCurrentGroup.members) ||
            selectedGroupForEditing.owner !== contextCurrentGroup.owner) {
             fetchMembers(contextCurrentGroup.members); 
             setSelectedGroupForEditing(prev => ({...prev, members: contextCurrentGroup.members, owner: contextCurrentGroup.owner}));
        }
      }
    }, [contextCurrentGroup, selectedGroupForEditing]) // Dependencias clave
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
    } finally {
      setIsMembersLoading(false);
    }
  };

  const handleUpdateGroupName = async () => {
    if (!selectedGroupForEditing || !groupNameToEdit.trim() || selectedGroupForEditing.owner !== user?.uid) {
      Alert.alert('Error', 'Debes ser el propietario y proporcionar un nombre válido.');
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
    } catch (error) {
      Alert.alert('Error', `No se pudo actualizar el nombre: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransferOwnership = (memberIdToPromote, memberNameToPromote) => {
    if (!selectedGroupForEditing || selectedGroupForEditing.owner !== user?.uid) {
        Alert.alert('Error', 'Solo el propietario actual puede transferir la propiedad.');
        return;
    }
    if (memberIdToPromote === user?.uid) { // No se puede transferir a sí mismo
        Alert.alert('Error', 'No puedes transferirte la propiedad a ti mismo.');
        return;
    }

    Alert.alert(
      'Confirmar Transferencia de Propiedad',
      `¿Estás seguro de que quieres convertir a "${memberNameToPromote}" en el nuevo propietario de "${selectedGroupForEditing.name}"? Perderás la propiedad del grupo actual.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Transferir Propiedad',
          style: 'destructive', // Es una acción significativa
          onPress: async () => {
            setActionLoading(true);
            try {
              await transferGroupOwnership(selectedGroupForEditing.id, memberIdToPromote);
              Alert.alert('Éxito', `La propiedad de "${selectedGroupForEditing.name}" ha sido transferida a "${memberNameToPromote}".`);
              // El estado local de selectedGroupForEditing y la UI se actualizarán
              // a través de los useEffects que escuchan a contextCurrentGroup y userAppGroups.
            } catch (error) {
              Alert.alert('Error', `No se pudo transferir la propiedad: ${error.message}`);
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleRemoveMember = (memberIdToRemove, memberNameToRemove) => {
    if (!selectedGroupForEditing || selectedGroupForEditing.owner !== user?.uid) {
        Alert.alert('Error', 'Solo el propietario puede eliminar miembros.');
        return;
    }
    Alert.alert(
      'Confirmar Eliminación',
      `¿Eliminar a "${memberNameToRemove}" de "${selectedGroupForEditing.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await removeMemberFromGroup(selectedGroupForEditing.id, memberIdToRemove);
              Alert.alert('Éxito', `"${memberNameToRemove}" ha sido eliminado.`);
            } catch (error) {
              Alert.alert('Error', `No se pudo eliminar: ${error.message}`);
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleApproveRequest = async (groupId, requestingUserId, userName) => {
    if (selectedGroupForEditing?.owner !== user?.uid) return;
    setActionLoading(true);
    try {
      await approveJoinRequest(groupId, requestingUserId);
      Alert.alert('Éxito', `${userName} ha sido añadido al grupo.`);
    } catch (error) {
      Alert.alert('Error', `No se pudo aprobar: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectRequest = (groupId, requestingUserId, userName) => {
    if (selectedGroupForEditing?.owner !== user?.uid) return;
    Alert.alert('Confirmar Rechazo', `¿Rechazar solicitud de ${userName}?`,
      [ { text: 'Cancelar' },
        { text: 'Rechazar', style: 'destructive', onPress: async () => {
            setActionLoading(true);
            try { await rejectJoinRequest(groupId, requestingUserId);
                  Alert.alert('Éxito', `Solicitud de ${userName} rechazada.`);
            } catch (e) { Alert.alert('Error', `No se pudo rechazar: ${e.message}`); }
            finally { setActionLoading(false); }
        }}
      ]
    );
  };

  const handleLeaveSelectedGroup = () => {
    if (!selectedGroupForEditing) {
        Alert.alert("Error", "Ningún grupo seleccionado para abandonar.");
        return;
    }
    // Si el usuario es el propietario Y hay otros miembros, NO puede abandonar.
    // Esta lógica se maneja principalmente en UserContext.leaveGroup,
    // pero una verificación aquí puede ser útil.
    // Después de transferir la propiedad, el user.uid NO será selectedGroupForEditing.owner.
    if (selectedGroupForEditing.owner === user?.uid && selectedGroupForEditing.members.length > 1) {
        Alert.alert("Acción no permitida", "Eres el propietario y hay otros miembros. Primero transfiere la propiedad o elimina el grupo.");
        return;
    }
     if (selectedGroupForEditing.owner === user?.uid && selectedGroupForEditing.members.length === 1) {
        Alert.alert("Información", "Eres el único miembro y propietario. Utiliza la opción 'Eliminar Grupo' en su lugar.");
        return;
    }

    Alert.alert( "Abandonar Grupo", `¿Seguro que quieres abandonar "${selectedGroupForEditing.name}"?`,
      [ { text: "Cancelar" },
        { text: "Abandonar", style: "destructive", onPress: async () => {
            setActionLoading(true);
            try { await leaveGroup(selectedGroupForEditing.id);
                  Alert.alert('Éxito', `Has abandonado "${selectedGroupForEditing.name}".`);
                  setSelectedGroupForEditing(null); 
                  if (contextCurrentGroup && contextCurrentGroup.id === selectedGroupForEditing.id) {
                    setContextCurrentGroup(null); // Limpiar el grupo actual global si era este
                  }
            } catch (e) { Alert.alert('Error', `No se pudo abandonar: ${e.message}`); }
            finally { setActionLoading(false); }
        }}
      ]
    );
  };

  const handleDeleteSelectedGroup = () => {
    if (!selectedGroupForEditing || selectedGroupForEditing.owner !== user?.uid) {
        Alert.alert("Error", "Solo el propietario puede eliminar el grupo.");
        return;
    }
    Alert.alert("Eliminar Grupo", `¿SEGURO de que quieres eliminar "${selectedGroupForEditing.name}"? Esta acción es IRREVERSIBLE.`,
      [ { text: "Cancelar" },
        { text: "Eliminar Grupo", style: "destructive", onPress: async () => {
            setActionLoading(true);
            try { await deleteGroup(selectedGroupForEditing.id);
                  Alert.alert('Éxito', `Grupo "${selectedGroupForEditing.name}" eliminado.`);
                  setSelectedGroupForEditing(null);
                  if (contextCurrentGroup && contextCurrentGroup.id === selectedGroupForEditing.id) {
                    setContextCurrentGroup(null);
                  }
            } catch (e) { Alert.alert('Error', `No se pudo eliminar: ${e.message}`); }
            finally { setActionLoading(false); }
        }}
      ]
    );
  };
  
  const isViewingUserTheGroupOwner = selectedGroupForEditing && user && selectedGroupForEditing.owner === user.uid;

  const dataForDropdown = Array.isArray(allUserGroupsForDropdown) ? allUserGroupsForDropdown.map(group => ({
    label: group.name,
    value: group.id,
    fullGroup: group
  })) : [];

  if (!user) {
    return <View style={styles.centeredMessageContainer}><Text style={styles.infoText}>Debes iniciar sesión.</Text></View>;
  }
  
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardAvoidingContainer}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Animatable.View animation="fadeInDown" style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back-outline" size={28} color={theme.primary} />
          </TouchableOpacity>
          <Ionicons name="settings-outline" size={30} color={theme.primary} style={{ marginLeft: 10 }}/>
          <Text style={styles.mainTitle}>Configuración de Grupos</Text>
        </Animatable.View>
        {allUserGroupsForDropdown.length === 0 ? (
            <View style={styles.centeredMessageContainer}>
                <Ionicons name="people-off-outline" size={60} color={theme.textSecondary} style={{marginBottom:10}}/>
                <Text style={styles.infoText}>No perteneces a ningún grupo.</Text>
                <Text style={styles.infoTextSmall}>Crea o únete a un grupo desde la pantalla de inicio.</Text>
            </View>
        ) : (
        <>
          <Animatable.View animation="fadeInUp" delay={100} style={styles.sectionContainer}>
            <Text style={styles.label}>Selecciona un grupo:</Text>
            <Dropdown
              style={[styles.dropdown, { borderColor: isFocusDropdown ? theme.primary : theme.border }]}
              placeholderStyle={[styles.placeholderStyle, { color: theme.textSecondary }]}
              selectedTextStyle={[styles.selectedTextStyle, { color: theme.textPrimary }]}
              inputSearchStyle={styles.inputSearchStyle}
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
                setSelectedGroupForEditing(item.fullGroup); 
                setIsFocusDropdown(false);
              }}
              renderLeftIcon={() => ( <Ionicons style={styles.dropdownIcon} color={isFocusDropdown ? theme.primary : theme.textSecondary} name="list-outline" size={20}/> )}
            />
          </Animatable.View>

          {selectedGroupForEditing && (
            <>
            {isViewingUserTheGroupOwner && (
                <Animatable.View animation="fadeInUp" delay={200} style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Administrar: {selectedGroupForEditing.name}</Text>
                    <Text style={styles.label}>Cambiar nombre del grupo:</Text>
                    <View style={styles.inputContainer}>
                        <Ionicons name="create-outline" size={20} color={theme.placeholder} style={styles.inputIcon} />
                        <TextInput style={styles.input} placeholder="Nuevo nombre" value={groupNameToEdit} onChangeText={setGroupNameToEdit} />
                    </View>
                    <TouchableOpacity style={[styles.buttonPrimary, (isLoading || actionLoading || groupNameToEdit === selectedGroupForEditing.name) && styles.buttonDisabled]} onPress={handleUpdateGroupName} disabled={isLoading || actionLoading || groupNameToEdit === selectedGroupForEditing.name}>
                        {isLoading && !actionLoading ? <ActivityIndicator color={theme.textLight} /> : <Text style={styles.buttonTextPrimary}>Guardar Nombre</Text>}
                    </TouchableOpacity>

                    <Text style={styles.label}>Miembros ({members.length}):</Text>
                    {isMembersLoading ? <ActivityIndicator color={theme.primary} style={{marginVertical:15}}/> : (
                        members.length > 0 ? (
                        <FlatList data={members} keyExtractor={(item) => item.uid} scrollEnabled={false}
                            renderItem={({ item }) => (
                            <View style={styles.memberItem}>
                                <View style={styles.memberInfo}>
                                    <Ionicons name={item.icon || 'person-circle-outline'} size={28} color={theme.textSecondary} style={styles.memberIcon}/>
                                    <Text style={styles.memberName}>{item.name} {item.uid === selectedGroupForEditing.owner ? '(Propietario)' : ''}</Text>
                                </View>
                                <View style={styles.memberActions}>
                                    {/* Icono de Transferir Propiedad (Corona/Trofeo) */}
                                    {isViewingUserTheGroupOwner && item.uid !== selectedGroupForEditing.owner && (
                                        <TouchableOpacity 
                                            onPress={() => handleTransferOwnership(item.uid, item.name)} 
                                            style={styles.actionButton} 
                                            disabled={actionLoading}
                                        >
                                            <Ionicons name="trophy-outline" size={22} color={theme.warning} />
                                        </TouchableOpacity>
                                    )}
                                    {/* Icono de Eliminar Miembro */}
                                    {isViewingUserTheGroupOwner && item.uid !== selectedGroupForEditing.owner && (
                                        <TouchableOpacity 
                                            onPress={() => handleRemoveMember(item.uid, item.name)} 
                                            style={styles.actionButton} 
                                            disabled={actionLoading}
                                        >
                                            <Ionicons name="person-remove-outline" size={22} color={theme.error} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View> 
                            )} 
                        />
                        ) : <Text style={styles.infoText}>No hay otros miembros o no se pudieron cargar.</Text>
                    )}
                </Animatable.View>
            )}

            {isViewingUserTheGroupOwner && contextCurrentGroup?.id === selectedGroupForEditing.id && (
                <Animatable.View animation="fadeInUp" delay={300} style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Solicitudes de Unión ({joinRequests.length})</Text>
                    {actionLoading && <ActivityIndicator color={theme.primary} style={{ marginVertical:10}}/>}
                    {joinRequests.length > 0 ? (
                        <FlatList data={joinRequests} keyExtractor={(item) => item.id} scrollEnabled={false}
                            renderItem={({ item }) => (
                            <View style={styles.requestItem}>
                                <Text style={styles.requestName}>{item.requestingUserName || item.id}</Text>
                                <View style={styles.requestActions}>
                                    <TouchableOpacity style={[styles.actionButtonSmall, { backgroundColor: theme.error }]} onPress={() => handleRejectRequest(selectedGroupForEditing.id, item.id, item.requestingUserName || item.id)} disabled={actionLoading}><Ionicons name="close-circle-outline" size={20} color={theme.textLight} /></TouchableOpacity>
                                    <TouchableOpacity style={[styles.actionButtonSmall, { backgroundColor: theme.success }]} onPress={() => handleApproveRequest(selectedGroupForEditing.id, item.id, item.requestingUserName || item.id)} disabled={actionLoading}><Ionicons name="checkmark-circle-outline" size={20} color={theme.textLight} /></TouchableOpacity>
                                </View>
                            </View> )} />
                    ) : <Text style={styles.infoText}>No hay solicitudes pendientes.</Text>}
                </Animatable.View>
            )}
            
            <Animatable.View animation="fadeInUp" delay={isViewingUserTheGroupOwner ? 400 : 200} style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Otras Acciones</Text>
                <TouchableOpacity
                    style={[styles.buttonDestructive, { backgroundColor: theme.warning }, actionLoading && styles.buttonDisabled]}
                    onPress={handleLeaveSelectedGroup}
                    disabled={actionLoading}
                >
                    <Ionicons name="walk-outline" size={20} color={theme.textLight} style={{marginRight: 10}}/>
                    <Text style={styles.buttonTextPrimary}>Abandonar "{selectedGroupForEditing.name}"</Text>
                </TouchableOpacity>

                {isViewingUserTheGroupOwner && (
                    <TouchableOpacity
                        style={[styles.buttonDestructive, { marginTop: 15 } , actionLoading && styles.buttonDisabled]}
                        onPress={handleDeleteSelectedGroup}
                        disabled={actionLoading}
                    >
                        <Ionicons name="trash-bin-outline" size={20} color={theme.textLight} style={{marginRight: 10}}/>
                        <Text style={styles.buttonTextPrimary}>Eliminar "{selectedGroupForEditing.name}"</Text>
                    </TouchableOpacity>
                )}
                {actionLoading && <ActivityIndicator color={theme.primary} style={{ marginTop:15}}/>}
            </Animatable.View>
            </>
          )}
          {(isLoading && !actionLoading) && <ActivityIndicator size="large" color={theme.primary} style={styles.globalLoader} />}
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
    paddingHorizontal: 15,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    marginTop: Platform.OS === 'android' ? 25 : 40,
    marginBottom: 10,
  },
  backButton: {
    padding: 5,
    marginRight: 5,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.primary,
    marginLeft: 10,
  },
  sectionContainer: {
    backgroundColor: theme.cardBackground,
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    shadowColor: theme.shadowColor || '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 5,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.textPrimary,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLight,
    paddingBottom: 8,
  },
  label: {
    fontSize: 15,
    color: theme.textSecondary,
    marginBottom: 8,
    marginTop: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.inputBackground,
    borderRadius: 10,
    marginBottom: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.border,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: theme.textPrimary,
  },
  buttonPrimary: {
    backgroundColor: theme.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
    minHeight: 48,
    justifyContent: 'center',
  },
  buttonDestructive: {
    flexDirection: 'row',
    backgroundColor: theme.error,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    minHeight: 48,
  },
  buttonDisabled: {
    backgroundColor: theme.border,
    opacity: 0.7,
  },
  buttonTextPrimary: {
    color: theme.textLight,
    fontSize: 15,
    fontWeight: 'bold',
  },
  memberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLightest || '#f0f0f0',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1, // Permite que esta vista ocupe el espacio disponible
    marginRight: 8, // Margen antes de los botones de acción
  },
  memberIcon: {
    marginRight: 10,
  },
  memberName: {
    fontSize: 15,
    color: theme.textPrimary,
  },
  memberActions: { // Contenedor para los iconos de acción de cada miembro
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: { // Estilo para cada botón de acción (corona, eliminar)
    padding: 8, 
    marginLeft: 10, // Espacio entre los botones de acción si hay varios
  },
  infoText: {
    fontSize: 14,
    color: theme.textSecondary,
    textAlign: 'center',
    marginVertical: 12,
    lineHeight: 20,
  },
  infoTextSmall: {
    fontSize: 12,
    color: theme.textSecondary,
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 10,
  },
  centeredMessageContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      marginTop: 30,
  },
  dropdown: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: theme.inputBackground, 
    marginBottom: 12,
    borderColor: theme.border,
  },
  placeholderStyle: {
    fontSize: 15,
  },
  selectedTextStyle: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.textPrimary,
  },
  iconStyle: { 
    width: 22,
    height: 22,
  },
  inputSearchStyle: { 
    height: 42,
    fontSize: 15,
    borderRadius: 8,
    borderColor: theme.border,
    color: theme.textPrimary,
  },
  dropdownIcon: { 
    marginRight: 10,
  },
  requestItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLightest || '#f0f0f0',
  },
  requestName: {
    fontSize: 15,
    color: theme.textPrimary,
    flex: 1,
  },
  requestActions: {
    flexDirection: 'row',
  },
  actionButtonSmall: {
    padding: 8,
    borderRadius: 20,
    marginLeft: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  globalLoader: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -15 }, { translateY: -15 }], 
  }
});
