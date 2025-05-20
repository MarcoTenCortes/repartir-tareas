// src/screens/HomeScreen.js
import React, { useContext } from 'react';
import { View, Text, Button, FlatList, StyleSheet, Alert } from 'react-native';
import { UserContext } from '../context/UserContext';
import { GroupContext } from '../context/GroupContext';
import { useNavigation } from '@react-navigation/native';

export default function HomeScreen() {
  const { user } = useContext(UserContext); // user puede ser útil para futuras comprobaciones de permisos
  const {
    currentGroup,
    joinRequests,
    approveJoinRequest,
    rejectJoinRequest,
  } = useContext(GroupContext);
  const navigation = useNavigation();

  const handleApprove = async (groupId, requestingUserId, userName) => {
    try {
      await approveJoinRequest(groupId, requestingUserId);
      Alert.alert('Éxito', `${userName} ha sido añadido al grupo.`);
    } catch (error) {
      Alert.alert('Error', `No se pudo aprobar la solicitud: ${error.message}`);
    }
  };

  const handleReject = async (groupId, requestingUserId, userName) => {
    Alert.alert(
      'Confirmar Rechazo',
      `¿Estás seguro de que quieres rechazar la solicitud de ${userName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Rechazar',
          style: 'destructive',
          onPress: async () => {
            try {
              await rejectJoinRequest(groupId, requestingUserId);
              Alert.alert('Solicitud Rechazada', `La solicitud de ${userName} ha sido rechazada.`);
            } catch (error) {
              Alert.alert('Error', `No se pudo rechazar la solicitud: ${error.message}`);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.actionButtonsContainer}>
        <Button
          title="Buscar/Unirse a un grupo"
          onPress={() => navigation.navigate('BuscarGrupo')}
        />
        <Button
          title="Crear grupo familiar"
          onPress={() => navigation.navigate('CrearGrupo')}
        />
      </View>

      {currentGroup ? (
        <>
          <Text style={styles.header}>Solicitudes para unirse a "{currentGroup.name}":</Text>
          {joinRequests.length > 0 ? (
            <FlatList
              data={joinRequests}
              keyExtractor={request => request.id} // request.id es el requestingUserId
              renderItem={({ item }) => (
                <View style={styles.requestItem}>
                  <Text style={styles.requestUser}>{item.requestingUserName}</Text>
                  <View style={styles.buttonGroup}>
                    <View style={styles.buttonWrapper}>
                      <Button title="Aprobar" onPress={() => handleApprove(currentGroup.id, item.id, item.requestingUserName)} />
                    </View>
                    <View style={styles.buttonWrapper}>
                      <Button title="Rechazar" color="#FF3B30" onPress={() => handleReject(currentGroup.id, item.id, item.requestingUserName)} />
                    </View>
                  </View>
                </View>
              )}
            />
          ) : (
            <Text style={styles.infoText}>No hay solicitudes pendientes para este grupo.</Text>
          )}
        </>
      ) : (
        <Text style={styles.infoText}>Selecciona un grupo utilizando el selector en la cabecera para ver las solicitudes de unión.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  actionButtonsContainer: {
    marginBottom: 16,
  },
  header: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16, // Ajustado de 24 a 16
    marginBottom: 10,
  },
  requestItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  requestUser: {
    fontSize: 16,
    flex: 1, // Permite que el texto ocupe el espacio disponible
    marginRight: 8, // Espacio antes de los botones
  },
  buttonGroup: {
    flexDirection: 'row',
  },
  buttonWrapper: {
    marginLeft: 8, // Espacio entre botones
  },
  infoText: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
  },
});
