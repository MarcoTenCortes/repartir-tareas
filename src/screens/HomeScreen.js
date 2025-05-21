// src/screens/HomeScreen.js
import React, { useContext, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Modal,
  ActivityIndicator
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import { Ionicons } from '@expo/vector-icons';
import Swiper from 'react-native-swiper';
import { UserContext } from '../context/UserContext';
import { GroupContext } from '../context/GroupContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';

const { width: screenWidth } = Dimensions.get('window');

export default function HomeScreen() {
  const { user, groups: userAppGroups } = useContext(UserContext); // leaveGroup was removed in previous step, but it's not used here anymore so it's fine.
  const {
    currentGroup,
    payments,
    addPayment,
    toggleMemberPaymentStatus,
    deletePayment
    // joinRequests, approveJoinRequest, rejectJoinRequest were removed from here as intended
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
      if (successMessage) Alert.alert('Éxito', successMessage); // Show success only if message provided
    } catch (error) {
      Alert.alert('Error', `${errorMessagePrefix}: ${error.message}`);
    } finally {
      setLoadingAction(false);
    }
  };
  
  // handleApprove and handleReject were removed as join requests are managed in GroupSettingsScreen

  // handleLeaveGroup was removed as it's managed in GroupSettingsScreen

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
        if(!loadingAction) { 
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
        null, // No alert for success, to make UI quicker
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
            {payments.length > 0 && currentGroup && user?.uid === payment.createdByUid && (
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
  
  // isCurrentUserOwner was removed as join requests are managed in GroupSettingsScreen

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
      
      <Animatable.View animation="fadeInUp" delay={100} style={styles.groupActionsRowContainer}>
        <TouchableOpacity 
            style={[styles.actionButtonRow, userAppGroups.length >= 5 && styles.disabledButton]} 
            onPress={() => navigation.navigate('BuscarGrupo')}
            disabled={userAppGroups.length >= 5 || loadingAction}
        >
            <Ionicons name="search-outline" size={20} color={theme.textLight} style={styles.actionButtonIcon} />
            <Text style={styles.actionButtonText}>Buscar Grupo</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
            style={[styles.actionButtonRow, {backgroundColor: theme.accent}, userAppGroups.length >= 5 && styles.disabledButton]} 
            onPress={() => navigation.navigate('CrearGrupo')}
            disabled={userAppGroups.length >= 5 || loadingAction}
        >
            <Ionicons name="add-circle-outline" size={20} color={theme.textLight} style={styles.actionButtonIcon} />
            <Text style={styles.actionButtonText}>Crear Grupo</Text>
        </TouchableOpacity>
      </Animatable.View>
      {userAppGroups.length >= 5 && <Text style={styles.limitText}>Límite de 5 grupos alcanzado.</Text>}

      {/* Leave Group Button Container was removed */}
      {/* Join Requests Section was removed */}

      {/* Payments Swiper Section */}
      {currentGroup ? (
        payments.length > 0 ? (
          // CORRECTED LINE: The delay no longer references the undefined 'joinRequests' variable.
          <Animatable.View animation="fadeInUp" delay={300}>
            <Text style={styles.sectionHeader}>Pagos en "{currentGroup.name}":</Text>
            <Swiper
                style={styles.swiperWrapper}
                showsButtons={payments.length > 1}
                loop={false}
                paginationStyle={styles.swiperPagination}
                dotStyle={[styles.swiperDot, {backgroundColor: theme.borderLight}]}
                activeDotStyle={[styles.swiperDot, {backgroundColor: theme.primary}]}
                nextButton={<Text style={[styles.swiperButtonText, {color: theme.primary}]}>›</Text>}
                prevButton={<Text style={[styles.swiperButtonText, {color: theme.primary}]}>‹</Text>}
            >
                {payments.map((payment, index) => renderPaymentCard(payment, index))}
            </Swiper>
          </Animatable.View>
        ) : (
          <Animatable.View animation="fadeInUp" delay={300} style={styles.noContentContainer}>
            <Ionicons name="wallet-outline" size={50} color={theme.textSecondary} />
            <Text style={styles.noContentText}>No hay pagos registrados en "{currentGroup.name}".</Text>
            <TouchableOpacity onPress={() => setIsAddPaymentModalVisible(true)} style={styles.smallAddButton}>
                <Ionicons name="add-outline" size={20} color={theme.textLight} />
                <Text style={styles.smallAddButtonText}>Añadir Pago</Text>
            </TouchableOpacity>
          </Animatable.View>
        )
      ) : (
        <Animatable.View animation="fadeInUp" delay={200} style={styles.noContentContainer}>
          <Ionicons name="people-circle-outline" size={60} color={theme.textSecondary} />
          <Text style={styles.noContentText}>Selecciona o únete a un grupo para ver su actividad.</Text>
        </Animatable.View>
      )}
      {loadingAction && <ActivityIndicator size="large" color={theme.primary} style={styles.fullScreenLoader} />}
    </ScrollView>
  );
}

// Styles (getStyles function) remains unchanged from the previous response.
// For brevity, the getStyles function is not repeated here but should be the same as in the previous turn.
// Make sure the styles are correctly defined as in the prior response.
const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  scrollContentContainer: {
    paddingBottom: 30,
    paddingHorizontal: 15,
  },
  groupActionsRowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 15,
    paddingHorizontal: 5,
  },
  actionButtonRow: {
    flexDirection: 'row',
    backgroundColor: theme.primary,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginHorizontal: 5,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 48,
  },
  actionButtonIcon: {
    marginRight: 8,
  },
  actionButtonText: {
    color: theme.textLight,
    fontSize: 14,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: theme.border,
    opacity: 0.7,
  },
  limitText: {
    textAlign: 'center',
    color: theme.error,
    fontSize: 13,
    marginBottom: 10,
  },
  totalUnpaidText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.primary,
    textAlign: 'center',
    marginVertical: 15,
    padding: 10,
    backgroundColor: theme.cardBackground,
    borderRadius: 8,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.textPrimary,
    marginLeft: 5,
    marginBottom: 12,
    marginTop: 20,
  },
  swiperWrapper: {
    height: 300,
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  paymentItemContainer: {
    backgroundColor: theme.cardBackground,
    borderRadius: 12,
    padding: 15,
    width: screenWidth * 0.85,
    height: '95%',
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
    justifyContent: 'space-between',
  },
  paymentCardActions: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
  },
  paymentActionButton: {
    padding: 5,
    marginLeft: 8,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLight,
  },
  paymentTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: theme.textPrimary,
    flexShrink: 1,
    marginRight: 5,
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.accent,
  },
  payersScrollView: {
    flex: 1,
  },
  payerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  payerName: {
    fontSize: 15,
    color: theme.textPrimary,
  },
  paidText: {
    textDecorationLine: 'line-through',
    color: theme.textSecondary,
  },
  disabledText: {
    opacity: 0.7,
  },
  swiperPagination: {
    bottom: -5,
  },
  swiperDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  swiperButtonText: {
    fontSize: 30,
    fontWeight: 'bold',
  },
  modalCenteredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalView: {
    width: '90%',
    backgroundColor: theme.cardBackground,
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.textPrimary,
  },
  modalInput: {
    width: '100%',
    backgroundColor: theme.inputBackground,
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    color: theme.textPrimary,
    borderWidth: 1,
    borderColor: theme.border,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 10,
  },
  modalButton: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    elevation: 2,
    minWidth: 100,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  modalButtonText: {
    color: theme.textLight,
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 15,
  },
  noContentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 30,
  },
  noContentText: {
    fontSize: 16,
    color: theme.textSecondary,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 15,
    lineHeight: 22,
  },
  smallAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.primary,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  smallAddButtonText: {
    color: theme.textLight,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 5,
  },
  fullScreenLoader: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.5)', 
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
});
