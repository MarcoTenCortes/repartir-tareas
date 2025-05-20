// src/screens/HomeScreen.js
import React, { useContext, useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Alert,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Modal,
  ActivityIndicator // Para indicar carga
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import { Ionicons } from '@expo/vector-icons';
import Swiper from 'react-native-swiper'; // Asegúrate de que Swiper es compatible o considera alternativas si da problemas de estilo
import { UserContext } from '../context/UserContext';
import { GroupContext } from '../context/GroupContext';
import { useTheme } from '../context/ThemeContext';
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
    addPayment,
    toggleMemberPaymentStatus,
    deletePayment
  } = useContext(GroupContext);
  const navigation = useNavigation();
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const [isAddPaymentModalVisible, setIsAddPaymentModalVisible] = useState(false);
  const [paymentDescription, setPaymentDescription] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [currentUserTotalUnpaid, setCurrentUserTotalUnpaid] = useState(0);
  const [loadingAction, setLoadingAction] = useState(false);


  useEffect(() => {
    if (user && currentGroup && payments.length > 0) {
      let totalUnpaid = 0;
      payments.forEach(payment => {
        const payerEntry = payment.payers && payment.payers[user.uid];
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

  const handleGenericAction = async (action, successMessage, errorMessagePrefix) => {
    setLoadingAction(true);
    try {
      await action();
      Alert.alert('Éxito', successMessage);
    } catch (error) {
      Alert.alert('Error', `${errorMessagePrefix}: ${error.message}`);
    } finally {
      setLoadingAction(false);
    }
  };
  
  const handleApprove = (groupId, requestingUserId, userName) => {
    handleGenericAction(
      () => approveJoinRequest(groupId, requestingUserId),
      `${userName} ha sido añadido al grupo.`,
      'No se pudo aprobar la solicitud'
    );
  };

  const handleReject = (groupId, requestingUserId, userName) => {
    Alert.alert(
      'Confirmar Rechazo',
      `¿Estás seguro de que quieres rechazar la solicitud de ${userName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Rechazar',
          style: 'destructive',
          onPress: () => handleGenericAction(
            () => rejectJoinRequest(groupId, requestingUserId),
            `La solicitud de ${userName} ha sido rechazada.`,
            'No se pudo rechazar la solicitud'
          ),
        },
      ],
      { cancelable: true }
    );
  };

  const handleLeaveGroup = () => {
    if (!currentGroup) return;
    Alert.alert(
      "Abandonar Grupo",
      `¿Seguro que quieres abandonar "${currentGroup.name}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Abandonar",
          style: "destructive",
          onPress: () => handleGenericAction(
            () => leaveGroup(currentGroup.id),
            `Has abandonado el grupo "${currentGroup.name}".`,
            'No se pudo abandonar el grupo'
          ),
        },
      ],
      { cancelable: true }
    );
  };

  const handleModalAddPayment = () => {
    if (!currentGroup || !paymentDescription.trim()) {
      Alert.alert("Error", "Descripción y grupo son necesarios.");
      return;
    }
    handleGenericAction(
      () => addPayment(paymentDescription, paymentAmount || null),
      "Pago añadido correctamente.",
      'No se pudo añadir el pago'
    ).then(() => {
        if(!loadingAction) { // Solo si la acción no falló (loadingAction sería false)
            setPaymentDescription('');
            setPaymentAmount('');
            setIsAddPaymentModalVisible(false);
        }
    });
  };

  const handleTogglePayment = (paymentId, memberUidToToggle) => {
     if (!user) return;
     handleGenericAction(
        () => toggleMemberPaymentStatus(paymentId, memberUidToToggle),
        "Estado de pago actualizado.", // Mensaje sutil, quizás no necesario un Alert aquí
        "No se pudo actualizar el estado del pago"
     );
  };

  const handleDeleteCurrentPayment = (paymentIdToDelete, paymentDescToDelete) => {
    if (!currentGroup) return;
    Alert.alert(
        "Confirmar Eliminación",
        `¿Eliminar el pago "${paymentDescToDelete}"?`,
        [
            { text: "Cancelar", style: "cancel" },
            {
                text: "Eliminar",
                style: "destructive",
                onPress: () => handleGenericAction(
                    () => deletePayment(paymentIdToDelete),
                    "Pago eliminado.",
                    'No se pudo eliminar el pago'
                )
            }
        ],
        { cancelable: true }
    );
  };

  const renderPaymentCard = (payment, index) => (
    <Animatable.View 
        animation="fadeInRight" 
        duration={600} 
        delay={index * 100} 
        key={payment.id} 
        style={styles.slide}
    >
      <View style={styles.paymentItemContainer}>
        <View style={styles.paymentCardActions}>
            <TouchableOpacity onPress={() => setIsAddPaymentModalVisible(true)} style={styles.paymentActionButton}>
                <Ionicons name="add-circle-outline" size={30} color={theme.primary} />
            </TouchableOpacity>
            {payments.length > 0 && currentGroup && user?.uid === payment.createdByUid && ( // Solo el creador del pago o admin del grupo puede eliminar
                <TouchableOpacity onPress={() => handleDeleteCurrentPayment(payment.id, payment.description)} style={styles.paymentActionButton}>
                    <Ionicons name="trash-outline" size={28} color={theme.error} />
                </TouchableOpacity>
            )}
        </View>

        <View style={styles.paymentHeader}>
          <Text style={styles.paymentTitle}>{payment.description}</Text>
          {payment.amount != null && <Text style={styles.paymentAmount}>{`${parseFloat(payment.amount).toFixed(2)}€`}</Text>}
        </View>
        <ScrollView style={styles.payersScrollView} nestedScrollEnabled={true}>
          {Object.entries(payment.payers || {}).map(([memberUid, payerData]) => (
            <TouchableOpacity
              key={memberUid}
              style={styles.payerRow}
              onPress={() => handleTogglePayment(payment.id, memberUid)}
              disabled={user?.uid !== memberUid || loadingAction}
            >
              <Text style={[styles.payerName, user?.uid !== memberUid && styles.disabledText, payerData.paid && styles.paidText]}>
                {payerData.userName}
              </Text>
              <Ionicons
                name={payerData.paid ? "checkmark-circle" : (user?.uid === memberUid ? "ellipse-outline" : "person-circle-outline")}
                size={26}
                color={payerData.paid ? theme.success : (user?.uid === memberUid ? theme.primary : theme.textSecondary)}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Animatable.View>
  );
  
  const isCurrentUserOwner = currentGroup && user && currentGroup.owner === user.uid;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContentContainer}>
      <Modal
        animationType="slide"
        transparent={true}
        visible={isAddPaymentModalVisible}
        onRequestClose={() => setIsAddPaymentModalVisible(false)}
      >
        <View style={styles.modalCenteredView}>
          <Animatable.View animation="zoomIn" duration={300} style={styles.modalView}>
            <Text style={styles.modalTitle}>Añadir Nuevo Pago</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Descripción del pago"
              placeholderTextColor={theme.placeholder}
              value={paymentDescription}
              onChangeText={setPaymentDescription}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Monto total (€) (opcional)"
              placeholderTextColor={theme.placeholder}
              value={paymentAmount}
              onChangeText={setPaymentAmount}
              keyboardType="numeric"
            />
            <View style={styles.modalButtonContainer}>
                <TouchableOpacity 
                    style={[styles.modalButton, {backgroundColor: theme.error}]} 
                    onPress={() => setIsAddPaymentModalVisible(false)}
                    disabled={loadingAction}
                >
                    <Text style={styles.modalButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.modalButton, {backgroundColor: theme.primary}]} 
                    onPress={handleModalAddPayment}
                    disabled={loadingAction}
                >
                    {loadingAction ? <ActivityIndicator color={theme.textLight} /> : <Text style={styles.modalButtonText}>Añadir</Text>}
                </TouchableOpacity>
            </View>
          </Animatable.View>
        </View>
      </Modal>

      {currentGroup && currentUserTotalUnpaid > 0 && (
        <Animatable.View animation="fadeIn" duration={500}>
            <Text style={styles.totalUnpaidText}>
            Total Pendiente: {currentUserTotalUnpaid.toFixed(2)}€
            </Text>
        </Animatable.View>
      )}

      <Animatable.View animation="fadeInUp" delay={100} style={styles.groupActionsContainer}>
        <TouchableOpacity 
            style={[styles.actionButton, userAppGroups.length >= 5 && styles.disabledButton]} 
            onPress={() => navigation.navigate('BuscarGrupo')}
            disabled={userAppGroups.length >= 5 || loadingAction}
        >
            <Ionicons name="search-outline" size={20} color={theme.textLight} style={{marginRight: 8}} />
            <Text style={styles.actionButtonText}>Buscar Grupo</Text>
        </TouchableOpacity>
        {userAppGroups.length >= 5 && <Text style={styles.limitText}>Límite de 5 grupos alcanzado.</Text>}
        
        <TouchableOpacity 
            style={[styles.actionButton, {backgroundColor: theme.accent}, userAppGroups.length >= 5 && styles.disabledButton]} 
            onPress={() => navigation.navigate('CrearGrupo')}
            disabled={userAppGroups.length >= 5 || loadingAction}
        >
            <Ionicons name="add-circle-outline" size={20} color={theme.textLight} style={{marginRight: 8}} />
            <Text style={styles.actionButtonText}>Crear Grupo</Text>
        </TouchableOpacity>
      </Animatable.View>

      {currentGroup && (
        <Animatable.View animation="fadeInUp" delay={200} style={styles.leaveGroupButtonContainer}>
          <TouchableOpacity 
            style={[styles.actionButton, {backgroundColor: theme.error}]} 
            onPress={handleLeaveGroup}
            disabled={loadingAction}
          >
            <Ionicons name="log-out-outline" size={20} color={theme.textLight} style={{marginRight: 8}} />
            <Text style={styles.actionButtonText}>{`Abandonar "${currentGroup.name}"`}</Text>
          </TouchableOpacity>
        </Animatable.View>
      )}

      {currentGroup ? (
        <>
          {isCurrentUserOwner && joinRequests.length > 0 && (
            <Animatable.View animation="fadeInUp" delay={300}>
              <Text style={styles.sectionHeader}>Solicitudes para "{currentGroup.name}":</Text>
              <FlatList
                data={joinRequests}
                keyExtractor={request => request.id}
                renderItem={({ item, index }) => (
                  <Animatable.View animation="fadeInRight" delay={index * 100} style={styles.requestItem}>
                    <Text style={styles.requestUser}>{item.requestingUserName}</Text>
                    <View style={styles.requestActions}>
                      <TouchableOpacity onPress={() => handleApprove(currentGroup.id, item.id, item.requestingUserName)} style={[styles.requestButton, {backgroundColor: theme.success}]} disabled={loadingAction}>
                         <Ionicons name="checkmark-outline" size={20} color={theme.textLight} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleReject(currentGroup.id, item.id, item.requestingUserName)} style={[styles.requestButton, {backgroundColor: theme.error}]} disabled={loadingAction}>
                         <Ionicons name="close-outline" size={20} color={theme.textLight} />
                      </TouchableOpacity>
                    </View>
                  </Animatable.View>
                )}
                scrollEnabled={false} // Si no es muy larga, para que no scrollee dentro del ScrollView principal
              />
            </Animatable.View>
          )}
          {isCurrentUserOwner && joinRequests.length === 0 && (
             <Animatable.Text animation="fadeIn" delay={300} style={styles.infoText}>No hay solicitudes pendientes.</Animatable.Text>
          )}

          <Animatable.View animation="fadeInUp" delay={400}>
            <Text style={styles.sectionHeader}>Pagos en "{currentGroup.name}":</Text>
            {payments.length > 0 ? (
                <Swiper
                    style={styles.swiperWrapper}
                    height={380} // Ajustar altura según contenido y acciones
                    loop={false}
                    //showsButtons={payments.length > 1} // Mostrar botones si hay más de un pago
                    //nextButton={<Ionicons name="arrow-forward-circle" size={30} color={theme.primary}/>}
                    //prevButton={<Ionicons name="arrow-back-circle" size={30} color={theme.primary}/>}
                    dot={<View style={styles.dot} />}
                    activeDot={<View style={styles.activeDot} />}
                    paginationStyle={styles.paginationStyle}
                >
                {payments.map((payment, index) => renderPaymentCard(payment, index))}
                </Swiper>
            ) : (
                <>
                <Text style={styles.infoText}>No hay pagos registrados.</Text>
                <TouchableOpacity style={[styles.actionButton, {backgroundColor: theme.accent}]} onPress={() => setIsAddPaymentModalVisible(true)} disabled={loadingAction}>
                    <Ionicons name="add-outline" size={20} color={theme.textLight} style={{marginRight: 8}} />
                    <Text style={styles.actionButtonText}>Añadir Primer Pago</Text>
                </TouchableOpacity>
                </>
            )}
          </Animatable.View>
        </>
      ) : (
        <Animatable.Text animation="fadeIn" style={styles.infoText}>
          Selecciona o crea un grupo para ver los detalles.
        </Animatable.Text>
      )}
      {loadingAction && <ActivityIndicator size="large" color={theme.primary} style={styles.fullScreenLoader}/>}
    </ScrollView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  scrollContentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  fullScreenLoader: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000, // Para que esté por encima de todo
  },
  groupActionsContainer: {
    marginVertical: 20,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    backgroundColor: theme.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    color: theme.textLight,
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: theme.border, // Un color que indique deshabilitado
  },
  limitText: {
    textAlign: 'center',
    color: theme.error,
    fontSize: 13,
    marginTop: -5,
    marginBottom: 5,
  },
  leaveGroupButtonContainer: {
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 25,
    marginBottom: 15,
    color: theme.textPrimary,
  },
  requestItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: theme.cardBackground,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  requestUser: {
    fontSize: 16,
    color: theme.textPrimary,
    fontWeight: '500',
  },
  requestActions: {
    flexDirection: 'row',
  },
  requestButton: {
    marginLeft: 10,
    padding: 8,
    borderRadius: 8,
  },
  infoText: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: 16,
    color: theme.textSecondary,
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  totalUnpaidText: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
    color: theme.error, // O un color de acento
    padding: 10,
    backgroundColor: theme.cardBackground,
    borderRadius: 10,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  swiperWrapper: {
    // height: 380, // ya definido en el componente Swiper
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 30, // Espacio para la paginación del Swiper
  },
  paymentItemContainer: {
    width: screenWidth * 0.9,
    height: 330, // Altura fija para consistencia
    backgroundColor: theme.cardBackground,
    borderRadius: 16,
    padding: 20,
    paddingTop: 50, // Espacio para los botones de acción de la tarjeta
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    position: 'relative', // Para posicionar los botones de acción
  },
  paymentCardActions: {
    position: 'absolute',
    top: 15,
    right: 15,
    flexDirection: 'row',
    zIndex: 1,
  },
  paymentActionButton: {
    marginLeft: 12,
    padding: 5,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    paddingBottom: 10,
  },
  paymentTitle: {
    fontSize: 20, // Ligeramente más pequeño para que quepa
    fontWeight: 'bold',
    color: theme.primary,
    flexShrink: 1, // Para que el texto se ajuste si es muy largo
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.accent,
  },
  payersScrollView: {
    flex: 1, // Ocupa el espacio restante
  },
  payerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingRight: 15
  },
  payerName: {
    fontSize: 16,
    color: theme.textPrimary,
    fontWeight: '500',
  },
  paidText: {
    textDecorationLine: 'line-through',
    color: theme.textSecondary,
    
  },
  disabledText: {
    color: theme.textSecondary, // Más claro para indicar inactividad
  },
  dot: {
    backgroundColor: theme.border,
    width: 10, height: 10, borderRadius: 5,
    marginLeft: 5, marginRight: 5,
  },
  activeDot: {
    backgroundColor: theme.primary,
    width: 10, height: 10, borderRadius: 5,
    marginLeft: 5, marginRight: 5,
  },
  paginationStyle: {
     bottom: 0, // Ajustar para que no se solape con el contenido
  },
  modalCenteredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: 'rgba(0,0,0,0.6)'
  },
  modalView: {
    width: '90%',
    margin: 20,
    backgroundColor: theme.cardBackground,
    borderRadius: 20,
    padding: 25, // Más padding
    alignItems: "center",
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 10,
  },
  modalTitle: {
    marginBottom: 20,
    textAlign: "center",
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.textPrimary,
  },
  modalInput: {
    width: '100%',
    height: 50,
    backgroundColor: theme.inputBackground,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 15,
    marginBottom: 15,
    borderRadius: 10,
    fontSize: 16,
    color: theme.textPrimary,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
  },
  modalButton: {
      flex: 1, // Para que ocupen el espacio disponible
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
      marginHorizontal: 5, // Espacio entre botones
      minHeight: 48, // Para el ActivityIndicator
      justifyContent: 'center',
  },
  modalButtonText: {
      color: theme.textLight,
      fontSize: 16,
      fontWeight: 'bold',
  }
});
