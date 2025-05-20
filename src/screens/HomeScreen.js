// src/screens/HomeScreen.js
import React, { useContext, useState, useEffect } from 'react';
import {
  View,
  Text,
  Button,
  FlatList,
  StyleSheet,
  Alert,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Modal // <--- Importar Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Swiper from 'react-native-swiper';
import { UserContext } from '../context/UserContext';
import { GroupContext } from '../context/GroupContext';
import { useNavigation } from '@react-navigation/native';

const { width: screenWidth } = Dimensions.get('window');

export default function HomeScreen() {
  const { user, leaveGroup, groups: userAppGroups } = useContext(UserContext);
  const {
    currentGroup,
    joinRequests,
    approveJoinRequest,
    rejectJoinRequest,
    payments,
    addPayment,           // Se usará en el modal
    toggleMemberPaymentStatus,
    deletePayment         // <--- Obtener deletePayment del contexto
  } = useContext(GroupContext);
  const navigation = useNavigation();

  // Estado para el modal de añadir pago
  const [isAddPaymentModalVisible, setIsAddPaymentModalVisible] = useState(false);
  const [paymentDescription, setPaymentDescription] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  
  const [currentUserTotalUnpaid, setCurrentUserTotalUnpaid] = useState(0);

  // ... (useEffect para currentUserTotalUnpaid, handleApprove, handleReject, handleLeaveGroup sin cambios)
  useEffect(() => {
    if (user && currentGroup && payments.length > 0) {
      let totalUnpaid = 0;
      payments.forEach(payment => {
        const payerEntry = payment.payers[user.uid];
        if (payerEntry && !payerEntry.paid && payment.amount) {
          const numberOfPayers = Object.keys(payment.payers).length;
          if (numberOfPayers > 0) {
            totalUnpaid += parseFloat(payment.amount) / numberOfPayers;
          }
        }
      });
      setCurrentUserTotalUnpaid(totalUnpaid);
    } else {
      setCurrentUserTotalUnpaid(0);
    }
  }, [payments, user, currentGroup]);

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

  const handleLeaveGroup = async () => {
    if (!currentGroup) {
      Alert.alert("Error", "No hay un grupo seleccionado para abandonar.");
      return;
    }
    Alert.alert(
      "Abandonar Grupo",
      `¿Estás seguro de que quieres abandonar el grupo "${currentGroup.name}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Abandonar",
          style: "destructive",
          onPress: async () => {
            try {
              await leaveGroup(currentGroup.id);
              Alert.alert("Éxito", `Has abandonado el grupo "${currentGroup.name}".`);
            } catch (error) {
              Alert.alert("Error", `No se pudo abandonar el grupo: ${error.message}`);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };


  // Lógica para añadir pago (se llamará desde el modal)
  const handleModalAddPayment = async () => {
    if (!currentGroup) {
      Alert.alert("Error", "Selecciona un grupo para añadir el pago.");
      return;
    }
    if (!paymentDescription.trim()) {
      Alert.alert("Error", "La descripción del pago no puede estar vacía.");
      return;
    }
    try {
      await addPayment(paymentDescription, paymentAmount || null);
      setPaymentDescription('');
      setPaymentAmount('');
      setIsAddPaymentModalVisible(false); // Cerrar modal
      Alert.alert("Éxito", "Pago añadido correctamente.");
    } catch (error) {
      Alert.alert("Error", `No se pudo añadir el pago: ${error.message}`);
    }
  };

  const handleTogglePayment = async (paymentId, memberUidToToggle) => {
      if (!user) return;
      try {
        await toggleMemberPaymentStatus(paymentId, memberUidToToggle);
      } catch (error) {
          Alert.alert("Error", error.message || "No se pudo actualizar el estado del pago.");
      }
  };

  const handleDeleteCurrentPayment = (paymentIdToDelete, paymentDescToDelete) => {
    if (!currentGroup) {
        Alert.alert("Error", "No hay grupo seleccionado.");
        return;
    }
    Alert.alert(
        "Confirmar Eliminación",
        `¿Estás seguro de que quieres eliminar el pago "${paymentDescToDelete}"?`,
        [
            { text: "Cancelar", style: "cancel" },
            {
                text: "Eliminar",
                style: "destructive",
                onPress: async () => {
                    try {
                        await deletePayment(paymentIdToDelete);
                        Alert.alert("Éxito", "Pago eliminado.");
                        // El Swiper podría necesitar re-renderizarse o ir al siguiente/anterior slide.
                        // Si el payment eliminado era el único, el swiper se vaciará.
                    } catch (error) {
                        Alert.alert("Error", `No se pudo eliminar el pago: ${error.message}`);
                    }
                }
            }
        ],
        { cancelable: true }
    );
  };


  const renderPaymentCard = (payment) => (
    <View key={payment.id} style={styles.slide}>
      <View style={styles.paymentItemContainer}>
        {/* Iconos para añadir y eliminar pago */}
        <View style={styles.paymentCardActions}>
            <TouchableOpacity onPress={() => setIsAddPaymentModalVisible(true)} style={styles.paymentActionButton}>
                <Ionicons name="add-circle-outline" size={28} color="#007AFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDeleteCurrentPayment(payment.id, payment.description)} style={styles.paymentActionButton}>
                <Ionicons name="remove-circle-outline" size={28} color="#FF3B30" />
            </TouchableOpacity>
        </View>

        <View style={styles.paymentHeader}>
          <Text style={styles.paymentTitle}>{payment.description}</Text>
          {payment.amount != null && <Text style={styles.paymentAmount}>{`${parseFloat(payment.amount).toFixed(2)}€`}</Text>}
        </View>
        <ScrollView style={styles.payersScrollView} nestedScrollEnabled={true}>
          {Object.entries(payment.payers).map(([memberUid, payerData]) => (
            <TouchableOpacity
              key={memberUid}
              style={styles.payerRow}
              onPress={() => handleTogglePayment(payment.id, memberUid)}
              disabled={user?.uid !== memberUid}
            >
              <Text style={[styles.payerName, user?.uid !== memberUid && styles.disabledText]}>
                {payerData.userName}
              </Text>
              <Ionicons
                name={payerData.paid ? "checkmark-circle" : (user?.uid === memberUid ? "ellipse-outline" : "person-circle-outline")}
                size={24}
                color={payerData.paid ? "#4CAF50" : (user?.uid === memberUid ? "#757575" : "#BDBDBD")}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
  
  const isCurrentUserOwner = currentGroup && user && currentGroup.owner === user.uid;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContentContainer}>
      {/* Modal para Añadir Pago */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isAddPaymentModalVisible}
        onRequestClose={() => {
          setIsAddPaymentModalVisible(!isAddPaymentModalVisible);
          // Limpiar campos si se cierra sin añadir
          setPaymentDescription('');
          setPaymentAmount('');
        }}
      >
        <View style={styles.modalCenteredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalText}>Añadir Nuevo Pago</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Descripción del pago"
              value={paymentDescription}
              onChangeText={setPaymentDescription}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Monto total (€) (opcional)"
              value={paymentAmount}
              onChangeText={setPaymentAmount}
              keyboardType="numeric"
            />
            <View style={styles.modalButtonContainer}>
                <Button title="Cancelar" onPress={() => {
                    setIsAddPaymentModalVisible(false);
                    setPaymentDescription('');
                    setPaymentAmount('');
                }} color="#FF3B30" />
                <Button title="Añadir Pago" onPress={handleModalAddPayment} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Resto de la UI de HomeScreen */}
      {currentGroup && currentUserTotalUnpaid > 0 && (
        <Text style={styles.totalUnpaidText}>
          Total Pendiente: {currentUserTotalUnpaid.toFixed(2)}€
        </Text>
      )}

      <View style={styles.actionButtonsContainer}>
        <Button
          title="Buscar/Unirse a un grupo"
          onPress={() => navigation.navigate('BuscarGrupo')}
          disabled={userAppGroups.length >= 5}
        />
        {userAppGroups.length >= 5 && <Text style={styles.limitText}>Has alcanzado el límite de 5 grupos.</Text>}
        
        <Button
          title="Crear grupo familiar"
          onPress={() => navigation.navigate('CrearGrupo')}
          disabled={userAppGroups.length >= 5}
        />
      </View>

      {currentGroup && (
        <View style={styles.leaveGroupButtonContainer}>
          <Button
            title={`Abandonar "${currentGroup.name}"`}
            onPress={handleLeaveGroup}
            color="#FF3B30"
          />
        </View>
      )}

      {currentGroup ? (
        <>
          {isCurrentUserOwner && joinRequests.length > 0 && (
            <>
              <Text style={styles.header}>Solicitudes para unirse a "{currentGroup.name}":</Text>
              <FlatList
                data={joinRequests}
                keyExtractor={request => request.id}
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
                scrollEnabled={false}
              />
            </>
          )}
          {isCurrentUserOwner && joinRequests.length === 0 && (
             <Text style={styles.infoText}>No hay solicitudes pendientes para este grupo.</Text>
          )}

          {/* ELIMINADO: El anterior View style={styles.addPaymentContainer} */}

          <Text style={styles.header}>Pagos en "{currentGroup.name}":</Text>
          {payments.length > 0 ? (
            <Swiper
              style={styles.swiperWrapper}
              height={330} // Ligeramente más alto para acomodar los iconos de acción
              loop={false}
              showsButtons={false}
              dot={<View style={styles.dot} />}
              activeDot={<View style={styles.activeDot} />}
              paginationStyle={styles.paginationStyle}
            >
              {payments.map(payment => renderPaymentCard(payment))}
            </Swiper>
          ) : (
            <>
              <Text style={styles.infoText}>No hay pagos registrados para este grupo.</Text>
              {/* Botón para añadir el primer pago si la lista está vacía y hay grupo */}
              <Button title="Añadir Primer Pago" onPress={() => setIsAddPaymentModalVisible(true)} />
            </>
          )}
        </>
      ) : (
        <Text style={styles.infoText}>
          Selecciona o crea un grupo para ver detalles, solicitudes y pagos.
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // ... (estilos existentes: container, actionButtonsContainer, etc.)
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scrollContentContainer: {
    paddingBottom: 20,
  },
  actionButtonsContainer: {
    marginVertical: 16,
    gap: 10,
  },
  leaveGroupButtonContainer: {
    marginBottom: 16,
  },
  header: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 12,
    color: '#333',
  },
  requestItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  requestUser: {
    fontSize: 16,
    flex: 1,
    marginRight: 8,
    color: '#424242',
  },
  buttonGroup: {
    flexDirection: 'row',
  },
  buttonWrapper: {
    marginLeft: 8,
  },
  infoText: {
    marginTop: 25,
    textAlign: 'center',
    fontSize: 16,
    color: '#757575',
    marginBottom: 10,
  },
  limitText: {
    textAlign: 'center',
    color: '#D32F2F',
    fontSize: 12,
    marginBottom: 8,
  },
  totalUnpaidText: {
    fontSize: 26,
    fontWeight: '600',
    textAlign: 'center',
    marginVertical: 20,
    color: '#EF5350',
  },
  swiperWrapper: {},
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 30, 
  },
  paymentItemContainer: { // Contenedor de la tarjeta de pago
    width: screenWidth * 0.88,
    minHeight: 280, // Ajustar si es necesario para los iconos
    maxHeight: 310, 
    padding: 15, // Padding interno de la tarjeta
    paddingTop: 40, // Espacio arriba para los iconos de acción
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3, },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
    position: 'relative', // Para posicionar los iconos de acción absolutamente
  },
  paymentCardActions: { // Contenedor para los iconos + y -
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    zIndex: 1, // Para que estén por encima de otro contenido si es necesario
  },
  paymentActionButton: {
    marginLeft: 10, // Espacio entre los iconos + y -
    padding: 5, // Área táctil
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  paymentTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#212121',
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: '500',
    color: '#1976D2'
  },
  payersScrollView: {
    flex: 1,
    marginBottom: 10,
  },
  payerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  payerName: {
    fontSize: 17,
    color: '#424242',
  },
  disabledText: {
    color: '#9E9E9E',
  },
  dot: {
    backgroundColor: 'rgba(0,0,0,.25)',
    width: 9, height: 9, borderRadius: 4.5,
    marginLeft: 4, marginRight: 4, marginTop: 4, marginBottom: 4,
  },
  activeDot: {
    backgroundColor: '#0D47A1',
    width: 9, height: 9, borderRadius: 4.5,
    marginLeft: 4, marginRight: 4, marginTop: 4, marginBottom: 4,
  },
  paginationStyle: {
     bottom: -5,
  },
  // Estilos para el Modal
  modalCenteredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: 'rgba(0,0,0,0.5)' // Fondo semi-transparente
  },
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '90%' // Ancho del modal
  },
  modalText: {
    marginBottom: 15,
    textAlign: "center",
    fontSize: 18,
    fontWeight: 'bold'
  },
  modalInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 12,
    borderRadius: 5,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around', // O 'space-between'
    width: '100%',
    marginTop: 20,
  }
});
