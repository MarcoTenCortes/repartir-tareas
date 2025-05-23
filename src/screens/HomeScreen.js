// FILE: src/screens/HomeScreen.js
import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Dimensions, Alert, ImageBackground, Modal, TextInput } from 'react-native'; // Añadido ImageBackground
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import Swiper from 'react-native-swiper';
import { UserContext } from '../context/UserContext';
import { GroupContext } from '../context/GroupContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';

const { width: screenWidth } = Dimensions.get('window');
// paste-2.txt: Dentro de export default function HomeScreen() { ... }


export default function HomeScreen() {
  const { user } = useContext(UserContext);
  const [isAddPaymentModalVisible, setIsAddPaymentModalVisible] = useState(false);
const [paymentDescription, setPaymentDescription] = useState('');
const [paymentAmount, setPaymentAmount] = useState('');
const [loadingAction, setLoadingAction] = useState(false); // Para el estado de carga del modal
  const {
    currentGroup,
    tasks,
    payments,
    deletePayment,
    toggleMemberPaymentStatus,
    addPayment
  } = useContext(GroupContext);
  const { theme } = useTheme();
  const navigation = useNavigation();
  const styles = getStyles(theme);
// paste-2.txt: Añade estas funciones
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

const handleModalAddPayment = () => {
  if (!currentGroup || !paymentDescription.trim()) {
    Alert.alert("Error", "Descripción y grupo son necesarios.");
    return;
  }
  handleGenericAction(
    () => addPayment(paymentDescription, paymentAmount || null), // Asegúrate que addPayment acepte estos params
    "Pago añadido correctamente.",
    'No se pudo añadir el pago'
  ).then(() => {
    // El .then(() => {}) se ejecutará independientemente del éxito/error de handleGenericAction
    // Solo limpiar y cerrar si no está cargando (implica que la acción ya finalizó, sea éxito o error)
    // Esta lógica es un poco extraña, normalmente el finally de handleGenericAction es suficiente.
    // Considera si la limpieza debe ocurrir solo en caso de éxito dentro del try de handleGenericAction.
    // Por ahora, mantenemos la lógica original de paste.txt:
    if(!loadingAction) { // Esta condición podría necesitar revisión, ya que setLoadingAction(false) se llama en el finally
        setPaymentDescription('');
        setPaymentAmount('');
        setIsAddPaymentModalVisible(false);
    }
  });
};

  const navigateToScreen = (screenName, params = {}) => {
    navigation.navigate(screenName, params);
  };

  const getTotalPendingTasksForGroup = () => {
    return tasks.filter(task => !task.assignedTo).length;
  };

  const getTotalAssignedToUserInGroup = () => {
    return tasks.filter(task => task.assignedTo === user?.uid).length;
  };

  const handleDeletePayment = async (paymentId, paymentDescription) => {
    if (!currentGroup || currentGroup.owner !== user?.uid) {
      Alert.alert("Error", "Solo el propietario del grupo puede eliminar pagos.");
      return;
    }
    Alert.alert(
      "Confirmar Eliminación",
      `¿Estás seguro de que quieres eliminar el pago "${paymentDescription}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await deletePayment(paymentId);
              Alert.alert("Éxito", "Pago eliminado correctamente.");
            } catch (error) {
              Alert.alert("Error", `No se pudo eliminar el pago: ${error.message}`);
            }
          },
        },
      ]
    );
  };

  const handleTogglePayerStatus = async (paymentId, payerId) => {
    if (payerId !== user?.uid) {
      Alert.alert("Acción no permitida", "Solo puedes cambiar tu propio estado de pago.");
      return;
    }
    try {
      await toggleMemberPaymentStatus(paymentId, payerId);
    } catch (error) {
      Alert.alert("Error", `No se pudo actualizar el estado: ${error.message}`);
    }
  };

  if (!user) {
    return (
      <View style={styles.centeredMessageContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={styles.infoText}>Cargando usuario...</Text>
      </View>
    );
  }
  
  const renderPaymentItemContent = (payment) => (
    <Animatable.View animation="fadeInUp" style={styles.paymentItemCard}>
      <View style={styles.paymentItemHeader}>
        <Text style={styles.paymentDescription} numberOfLines={1} ellipsizeMode="tail">{payment.description}</Text>
        <View style={styles.paymentHeaderActions}>
            <TouchableOpacity
            style={styles.paymentActionIcon}
            onPress={() => setIsAddPaymentModalVisible(true)} // <--- CAMBIO AQUÍ
            disabled={loadingAction} // <--- AÑADIR SI ES RELEVANTE (igual que en paste.txt)
            >
            <Ionicons name="add-circle-outline" size={28} color={theme.primary} />
          </TouchableOpacity>
          {/* Icono para Eliminar pago actual (solo si es propietario) */}
          {currentGroup && currentGroup.owner === user?.uid && (
            <TouchableOpacity 
              onPress={() => handleDeletePayment(payment.id, payment.description)} 
              style={styles.paymentActionIcon}
            >
              <Ionicons name="trash-outline" size={26} color={theme.error} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {payment.amount != null && (
        <Text style={styles.paymentAmount}>
          {payment.amount.toFixed(2)} €
        </Text>
      )}
      
      <View style={styles.payersListContainer}>
        {Object.entries(payment.payers || {}).length > 0 ? (
          Object.entries(payment.payers || {}).map(([payerId, payerData]) => (
            <View key={payerId} style={styles.payerItem}>
              <Text style={styles.payerName} numberOfLines={1} ellipsizeMode="tail">{payerData.userName || 'Usuario Desc.'}</Text>
              <TouchableOpacity 
                onPress={() => handleTogglePayerStatus(payment.id, payerId)}
                disabled={payerId !== user?.uid}
                style={styles.payerStatusIconContainer}
              >
                <Ionicons 
                  name={payerData.paid ? "checkmark-circle" : (payerId === user?.uid ? "ellipse-outline" : "person-circle-outline")} 
                  size={24} 
                  color={payerData.paid ? theme.success : (payerId === user?.uid ? theme.primary : theme.textSecondary)}
                />
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <Text style={styles.infoTextSmallPayer}>No hay participantes asignados.</Text>
        )}
      </View>
    </Animatable.View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Animatable.View animation="fadeInDown" duration={800} style={styles.welcomeContainer}>
          <Ionicons name={user.icon || 'person-circle-outline'} size={50} color={theme.primary} style={styles.userIcon} />
          <View style={styles.welcomeTextAndActionsContainer}>
            <View>
              <Text style={styles.welcomeText}>Hola de nuevo,</Text>
              <Text style={styles.userName}>{user.name || 'Usuario'}</Text>
            </View>
            <View style={styles.welcomeActionsRow}>
              <TouchableOpacity style={styles.welcomeActionButton} onPress={() => navigateToScreen('BuscarGrupo')}>
                <Ionicons name="search-outline" size={18} color={theme.primary} />
                <Text style={styles.welcomeActionButtonText}>Buscar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.welcomeActionButton} onPress={() => navigateToScreen('CrearGrupo')}>
                <Ionicons name="add-circle-outline" size={18} color={theme.primary} />
                <Text style={styles.welcomeActionButtonText}>Crear</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animatable.View>

        {!currentGroup ? (
          <Animatable.View animation="fadeInUp" delay={200} style={styles.noGroupContainer}>
            <Ionicons name="people-off-outline" size={60} color={theme.textSecondary} style={{ marginBottom: 15 }} />
            <Text style={styles.noGroupText}>No estás en ningún grupo o no hay un grupo seleccionado.</Text>
            <Text style={styles.noGroupSubText}>Puedes crear uno nuevo o buscar un grupo existente para unirte.</Text>
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.primary }]} onPress={() => navigateToScreen('CrearGrupo')}>
                <Ionicons name="add-circle-outline" size={20} color={theme.textLight} style={styles.actionIcon} />
                <Text style={styles.actionButtonText}>Crear Grupo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.accent, marginLeft: 10 }]} onPress={() => navigateToScreen('BuscarGrupo')}>
                <Ionicons name="search-circle-outline" size={20} color={theme.textLight} style={styles.actionIcon} />
                <Text style={styles.actionButtonText}>Buscar Grupo</Text>
              </TouchableOpacity>
            </View>
          </Animatable.View>
        ) : (
          <>

            
            <Animatable.View animation="fadeInUp" delay={200} style={styles.summaryContainer}>
              <View style={styles.summaryBox}>
                  <Ionicons name="list-circle-outline" size={32} color={theme.accent} />
                  <Text style={styles.summaryNumber}>{getTotalPendingTasksForGroup()}</Text>
                  <Text style={styles.summaryLabel}>Tareas Pendientes</Text>
              </View>
              <View style={styles.summaryBox}>
                  <Ionicons name="person-circle-outline" size={32} color={theme.success} />
                  <Text style={styles.summaryNumber}>{getTotalAssignedToUserInGroup()}</Text>
                  <Text style={styles.summaryLabel}>Mis Tareas Asignadas</Text>
              </View>
            </Animatable.View>

            <Animatable.View animation="fadeInUp" delay={300}>
              <Text style={styles.sectionTitle}>Gestión de Pagos</Text>
            </Animatable.View>

            {payments.length === 0 ? (
              <Animatable.View animation="fadeInUp" delay={350} style={styles.centeredMessageContainerNoItems}>
                <Ionicons name="wallet-outline" size={50} color={theme.textSecondary} style={{marginBottom:10}}/>
                <Text style={styles.infoText}>No hay pagos registrados.</Text>
                <TouchableOpacity
                style={styles.addNewPaymentButtonCentered}
                onPress={() => setIsAddPaymentModalVisible(true)} // <--- CAMBIO AQUÍ
                disabled={loadingAction} // <--- AÑADIR SI ES RELEVANTE (igual que en paste.txt)
                >
                <Ionicons name="add-circle-outline" size={20} color={theme.textLight} style={{marginRight: 8}} />
                <Text style={styles.addNewPaymentButtonText}>Añadir Primer Pago</Text>
                </TouchableOpacity>
              </Animatable.View>
            ) : (
              // Modificado: View -> ImageBackground para el carrusel de pagos
              <ImageBackground
                source={require('../../assets/pagos.png')}
                style={styles.paymentsCarouselBackground} // Usar el nuevo estilo
                imageStyle={styles.paymentsCarouselBackgroundImage} // Estilo para la imagen interna
                resizeMode="cover" // 'cover' para llenar el fondo, 'contain' para asegurar visibilidad completa
              >
                <Swiper
                  style={styles.swiperWrapper}
                  height={370} 
                  showsPagination={true}
                  paginationStyle={styles.paginationStyle}
                  dot={<View style={[styles.dot, { backgroundColor: theme.borderMuted || theme.border }]} />}
                  activeDot={<View style={[styles.activeDot, { backgroundColor: theme.primary }]} />}
                  loop={false}
                  removeClippedSubviews={false}
                >
                  {payments.map(payment => (
                    <View key={payment.id} style={styles.slide}>
                      {renderPaymentItemContent(payment)}
                    </View>
                  ))}
                </Swiper>
              </ImageBackground>
            )}
          </>
        )}

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

      </ScrollView>
    </View>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: { 
    flex: 1,
  },
  contentContainer: { 
    paddingBottom: 60, // Ajustado, ya no necesita tanto espacio para una imagen al final
    paddingHorizontal: 15,
  },
  // ... (otros estilos permanecen igual)
  welcomeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    marginBottom: 10,
    backgroundColor: theme.cardBackgroundSlightlyOpaque || theme.cardBackground + 'F2',
    borderRadius: 12,
    paddingHorizontal: 15,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  userIcon: {
    marginRight: 12,
  },
  welcomeTextAndActionsContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  welcomeText: {
    fontSize: 16,
    color: theme.textSecondary,
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.textPrimary,
    marginBottom: 8,
  },
  welcomeActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  welcomeActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.inputBackground || theme.background,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.borderLight || theme.border,
    marginRight: 10,
  },
  welcomeActionButtonText: {
    color: theme.primary,
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 5,
  },
  noGroupContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 25,
    marginTop: 20,
    backgroundColor: theme.cardBackgroundSlightlyOpaque || theme.cardBackground + 'F2',
    borderRadius: 12,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  noGroupText: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  noGroupSubText: {
    fontSize: 14,
    color: theme.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  actionIcon: {
    marginRight: 8,
  },
  actionButtonText: {
    color: theme.textLight,
    fontSize: 15,
    fontWeight: 'bold',
  },
  currentGroupContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: theme.infoBackgroundSlightlyOpaque || (theme.infoBackground || '#e0f3ff') + 'F2',
    borderRadius: 10,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: theme.primary,
  },
  currentGroupText: {
    fontSize: 15,
    color: theme.textPrimary,
    marginLeft: 10,
  },
  currentGroupName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.primary,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 25,
  },
  summaryBox: {
    backgroundColor: theme.cardBackgroundSlightlyOpaque || theme.cardBackground + 'F2',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    width: '47%', 
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  summaryNumber: {
    fontSize: 26,
    fontWeight: 'bold',
    color: theme.textPrimary,
    marginTop: 5,
  },
  summaryLabel: {
    fontSize: 13,
    color: theme.textSecondary,
    marginTop: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.textPrimary,
    marginBottom: 8,
    paddingLeft: 5,
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
  padding: 25,
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
  flex: 1,
  paddingVertical: 12,
  borderRadius: 10,
  alignItems: 'center',
  marginHorizontal: 5,
  minHeight: 48,
  justifyContent: 'center',
},
modalButtonText: {
  color: theme.textLight,
  fontSize: 16,
  fontWeight: 'bold',
},
  addNewPaymentButtonCentered: {
    flexDirection: 'row',
    backgroundColor: theme.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addNewPaymentButtonText: {
    color: theme.textLight,
    fontSize: 15,
    fontWeight: 'bold',
  },
  centeredMessageContainerNoItems: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 25,
    paddingHorizontal: 20,
    backgroundColor: theme.cardBackgroundTransparentLight || theme.cardBackground + 'CC',
    borderRadius: 10,
    marginBottom: 20,
    minHeight: 200,
  },
  infoText: {
    fontSize: 15,
    color: theme.textSecondaryStrong || theme.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  infoTextSmallPayer: {
    fontSize: 13,
    color: theme.textSecondaryStronger || theme.textSecondary,
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
  paymentItemCard: {
    backgroundColor: theme.cardBackgroundTransparent || theme.cardBackground + 'D9', // 90% Opacidad (E6) - se mantiene
    borderRadius: 1,
    paddingHorizontal: 15,
    paddingTop: 12,
    paddingBottom: 10,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 1,
    elevation: 5,
    width: screenWidth * 0.88,
    alignSelf: 'center',
    minHeight: 310,
  },
  paymentItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  paymentDescription: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.textPrimary,
    flex: 1, 
    marginRight: 10,
  },
  paymentHeaderActions: { // Contenedor para los iconos de acción
    flexDirection: 'row', // Asegura que los iconos estén uno al lado del otro
    alignItems: 'center',
  },
  paymentActionIcon: {
    padding: 5, 
    marginLeft: 10, // Espacio entre iconos si hay más de uno
  },
  paymentAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.accent,
    alignSelf: 'flex-end',
    marginTop: 0, 
    marginBottom: 10,
    marginRight: 5,
  },
  payersListContainer: {
    marginTop: 5,
    flex: 1, 
  },
  payerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: theme.borderTransparent || theme.borderLightest + '99',
  },
  payerName: {
    fontSize: 15,
    color: theme.textPrimary,
    flexShrink: 1,
    marginRight: 8,
  },
  payerStatusIconContainer: {
    paddingHorizontal: 4,
  },
  // Estilo original 'paymentsCarouselContainer' ahora es 'paymentsCarouselBackground' para ImageBackground
  paymentsCarouselBackground: { // Estilo para el componente ImageBackground
    height: 380, 
    marginBottom: 20,
    // overflow: 'hidden', // Descomentar si se usa borderRadius para que la imagen se recorte bien
    // borderRadius: 10, // Opcional: si quieres que el fondo tenga bordes redondeados
  },
  paymentsCarouselBackgroundImage: { // Estilo para la imagen DENTRO de ImageBackground
    opacity: 0.6, // Hacer la imagen de fondo sutil. Ajusta este valor (0.0 a 1.0)
     resizeMode: 'contain'
    // borderRadius: 10, // Si el contenedor tiene borderRadius, la imagen también debería tenerlo
  },
  swiperWrapper: {},
  slide: {
    flex: 1,
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'transparent', // Importante para que se vea el ImageBackground
    paddingVertical: 2, 
  },
  paginationStyle: {
    bottom: -2, 
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 5,
    marginRight: 5,
  },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 5,
    marginRight: 5,
  },
  // Eliminado bottomBackgroundImage ya que la imagen ahora es fondo del carrusel de pagos
  // ... (otros estilos como centeredMessageContainer, etc., permanecen)
});

