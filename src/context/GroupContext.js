// src/context/GroupContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import { UserContext } from './UserContext';
import { auth, db } from '../services/firebase';
import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  Timestamp, // Asegúrate que Timestamp está importado
  serverTimestamp, // Importa serverTimestamp
  query,
  where,
  orderBy,
  getDoc,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const GroupContext = createContext();

export function GroupProvider({ children }) {
  const { user } = useContext(UserContext);
  const { groups: userGroupsFromUserContext } = useContext(UserContext);
  const [currentGroup, setCurrentGroup] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [shoppingList, setShoppingList] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [payments, setPayments] = useState([]);
  const [rooms, setRooms] = useState([]);

  // Efecto para seleccionar el primer grupo si no hay uno actual o el actual ya no existe
  useEffect(() => {
    if (userGroupsFromUserContext.length > 0) {
      if (!currentGroup || !userGroupsFromUserContext.some(g => g.id === currentGroup.id)) {
        setCurrentGroup(userGroupsFromUserContext[0]);
      }
    } else {
      setCurrentGroup(null);
    }
  }, [userGroupsFromUserContext, currentGroup]);

  // Efecto principal para suscribirse a los datos del grupo actual
  useEffect(() => {
    if (!currentGroup || !user) { // Asegurarse que hay usuario también para permisos
      setTasks([]);
      setShoppingList([]);
      setReminders([]);
      setJoinRequests([]);
      setPayments([]);
      setRooms([]);
      return () => {}; // Retornar una función vacía para limpiar
    }

    const groupDocPath = `groups/${currentGroup.id}`;

    // Tareas
    const tasksColRef = collection(db, groupDocPath, 'tasks');
    const tasksQueryRef = query(tasksColRef, orderBy('createdAt', 'desc'));
    const unsubTasks = onSnapshot(tasksQueryRef, snap => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => console.error("[GroupContext] Error en snapshot de tareas:", err));

    // Habitaciones
    const roomsColRef = collection(db, groupDocPath, 'rooms');
    const roomsQueryRef = query(roomsColRef, orderBy('createdAt', 'asc'));
    const unsubRooms = onSnapshot(roomsQueryRef, snap => {
      setRooms(snap.docs.map(d => {
        const data = d.data();
        const position = data.position || {};
        return {
          id: d.id, ...data, name: data.name || "Habitación sin nombre",
          width: Number(data.width) || 100, height: Number(data.height) || 60,
          rotation: Number(data.rotation) || 0, shape: data.shape || 'rectangle',
          position: { x: Number(position.x) || 0, y: Number(position.y) || 0 },
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt : (data.createdAt ? Timestamp.fromDate(new Date(data.createdAt)) : serverTimestamp()),
        };
      }));
    }, err => console.error("[GroupContext] Error en snapshot de habitaciones:", err));
    
    // Lista de la compra
    const shopColRef = collection(db, groupDocPath, 'shopping');
    const shopQueryRef = query(shopColRef, orderBy('order', 'asc'));
    const unsubShop = onSnapshot(shopQueryRef, snap => {
      setShoppingList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => console.error("[GroupContext] Error en snapshot de lista de compra:", err));
    
    // Recordatorios
    const remColRef = collection(db, groupDocPath, 'reminders');
    const unsubRem = onSnapshot(remColRef, snap => {
      const items = snap.docs.map(d => {
        const data = d.data();
        // Convertir Timestamp de Firestore a objeto Date de JS para el picker y la lógica de notificación
        const jsDate = data.date && data.date.toDate ? data.date.toDate() : null;
        return {
          id: d.id,
          ...data,
          date: jsDate, // Usar el objeto Date de JS
          notified: data.notified !== undefined ? data.notified : false,
        };
      });
      // Ordenar localmente por fecha (los nulos al final)
      setReminders(items.sort((a,b) => {
        if (a.date && b.date) return a.date.getTime() - b.date.getTime();
        if (a.date && !b.date) return -1; // 'a' con fecha va antes que 'b' sin fecha
        if (!a.date && b.date) return 1;  // 'b' con fecha va antes que 'a' sin fecha
        return 0; // Mismo estado de fecha (ambos con o ambos sin)
      }));

      // Lógica de notificaciones (solo si no es web)
      if (Platform.OS !== 'web') {
        items.forEach(item => {
          if (item.date && item.date instanceof Date && !item.notified) { // item.date ya es JS Date aquí
            const triggerDate = item.date;
            if (triggerDate > new Date()) { // Solo programar si la fecha es futura
              Notifications.scheduleNotificationAsync({
                content: { title: 'Recordatorio', body: item.text },
                trigger: triggerDate,
              }).then(notificationId => {
                // console.log(`[GroupContext] Notificación programada para recordatorio ${item.id}: ${notificationId}`);
                // Actualizar 'notified' en Firestore
                updateDoc(doc(db, groupDocPath, 'reminders', item.id), { notified: true })
                  .catch(e => console.error("[GroupContext] Error actualizando 'notified' del recordatorio:", e));
              }).catch(e => console.error("[GroupContext] Error programando notificación:", e));
            }
          }
        });
      }
    }, err => console.error("[GroupContext] Error en snapshot de recordatorios:", err));

    // Solicitudes de unión (solo para el propietario)
    let unsubJoinRequests = () => {};
    if (currentGroup.owner === user.uid) {
        const requestsQuery = query(
            collection(db, groupDocPath, 'joinRequests'),
            where('status', '==', 'pending')
        );
        unsubJoinRequests = onSnapshot(requestsQuery, snap => {
            setJoinRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }, err => console.error("[GroupContext] Error en snapshot de solicitudes de unión:", err));
    } else {
        setJoinRequests([]); // Limpiar si no es propietario
    }

    // Pagos
    const paymentsColRef = collection(db, groupDocPath, 'payments');
    const paymentsQueryRef = query(paymentsColRef, orderBy('createdAt', 'desc')); 
    const unsubPayments = onSnapshot(paymentsQueryRef, snap => {
      setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => console.error("[GroupContext] Error en snapshot de pagos:", err));


    return () => { // Función de limpieza
      unsubTasks();
      unsubRooms();
      unsubShop();
      unsubRem();
      unsubJoinRequests();
      unsubPayments();
    };
  }, [currentGroup, user]); // Dependencias del efecto principal


  const addReminder = async (text, reminderDateInput) => {
    if (!currentGroup) throw new Error("No hay un grupo seleccionado.");
    if (!text || typeof text !== 'string' || text.trim() === '') {
        throw new Error("El texto del recordatorio no puede estar vacío.");
    }

    // --- DEBUG LOG (Inicio) ---
    console.log('[GroupContext] addReminder:');
    console.log('  Texto recibido:', text);
    console.log('  Fecha de recordatorio (input):', reminderDateInput);
    if (reminderDateInput) {
      console.log('  reminderDateInput es instancia de Date?:', reminderDateInput instanceof Date);
      if (reminderDateInput instanceof Date) {
        console.log('  reminderDateInput.getTime() es NaN?:', isNaN(reminderDateInput.getTime()));
      }
    }
    // --- DEBUG LOG (Fin) ---

    const reminderDataObject = {
      text: text.trim(),
      createdAt: serverTimestamp(), // Usar serverTimestamp para la fecha de creación
      notified: false,
      date: null // Inicializar date como null
    };

    // Asignar la fecha solo si es una instancia válida de Date
    if (reminderDateInput && reminderDateInput instanceof Date && !isNaN(reminderDateInput.getTime())) {
      reminderDataObject.date = Timestamp.fromDate(reminderDateInput); // Convertir JS Date a Firestore Timestamp
    }
    
    // --- DEBUG LOG (Antes de guardar) ---
    console.log('[GroupContext] Datos del recordatorio a guardar en Firestore:', reminderDataObject);
    // --- DEBUG LOG (Fin) ---

    try {
      const remindersColRef = collection(db, 'groups', currentGroup.id, 'reminders');
      await addDoc(remindersColRef, reminderDataObject);
      console.log('[GroupContext] Recordatorio añadido a Firestore con éxito.');
    } catch (error) {
      console.error("[GroupContext] Error añadiendo recordatorio a Firestore: ", error);
      throw error; // Relanzar el error para que la UI pueda manejarlo si es necesario
    }
  };

  // ... (resto de las funciones como createTask, createRoom, addShoppingItem, etc., sin cambios)
  const createTask = async (taskName, roomId) => {
    if (!currentGroup || !user) throw new Error("Grupo o usuario no disponibles.");
    if (!taskName.trim()) throw new Error("El nombre de la tarea no puede estar vacío.");
    if (!roomId) throw new Error("Es necesario especificar una habitación para la tarea.");

    const tasksColRef = collection(db, 'groups', currentGroup.id, 'tasks');
    await addDoc(tasksColRef, {
      name: taskName.trim(),
      roomId: roomId,
      assignedTo: null,
      assignedToName: null,
      createdAt: serverTimestamp(),
      createdBy: user.uid,
      createdByName: user.name || user.email || "Usuario Desconocido",
    });
  };

  const assignTaskToUser = async (taskId, userIdToAssign, userNameToAssign) => {
    if (!currentGroup) throw new Error("No hay un grupo seleccionado.");
    if (!taskId || !userIdToAssign || !userNameToAssign) {
      throw new Error("Información incompleta para asignar la tarea.");
    }
    const taskDocRef = doc(db, 'groups', currentGroup.id, 'tasks', taskId);
    await updateDoc(taskDocRef, {
      assignedTo: userIdToAssign,
      assignedToName: userNameToAssign,
      assignedAt: serverTimestamp(),
    });
  };
  const unassignTask = async (taskId) => {
    if (!currentGroup) throw new Error("No hay un grupo seleccionado.");
    if (!taskId) throw new Error("ID de tarea no proporcionado.");
    const taskDocRef = doc(db, 'groups', currentGroup.id, 'tasks', taskId);
    await updateDoc(taskDocRef, {
      assignedTo: null,
      assignedToName: null,
      assignedAt: null
    });
  };

  const deleteTask = async (taskId) => {
    if (!currentGroup) throw new Error("No hay un grupo seleccionado.");
    if (!taskId) throw new Error("ID de tarea no proporcionado.");
    const taskDocRef = doc(db, 'groups', currentGroup.id, 'tasks', taskId);
    await deleteDoc(taskDocRef);
  };

  const createRoom = async (roomName, initialPosition = { x: 50, y: 50 }) => {
    if (!currentGroup || !user) throw new Error("Grupo o usuario no disponibles.");
    if (!roomName.trim()) throw new Error("El nombre de la habitación no puede estar vacío.");
    const roomsColRef = collection(db, 'groups', currentGroup.id, 'rooms');
    await addDoc(roomsColRef, {
      name: roomName.trim(),
      position: { 
        x: Number(initialPosition.x) || 0,
        y: Number(initialPosition.y) || 0,
      },
      shape: 'rectangle', 
      width: 100,
      height: 60,
      rotation: 0,
      createdAt: serverTimestamp(),
      createdBy: user.uid,
    });
  };

  const updateRoomPosition = async (roomId, newPosition) => {
    if (!currentGroup) throw new Error("No hay un grupo seleccionado.");
    if (!roomId || !newPosition) throw new Error("Información incompleta para actualizar la posición.");
    const roomDocRef = doc(db, 'groups', currentGroup.id, 'rooms', roomId);
    await updateDoc(roomDocRef, {
      position: { 
        x: Number(newPosition.x) || 0,
        y: Number(newPosition.y) || 0,
      }
    });
  };

  const updateRoomProperties = async (roomId, properties) => {
    if (!currentGroup) throw new Error("No hay un grupo seleccionado.");
    if (!roomId || !properties) throw new Error("Información incompleta para actualizar propiedades.");
    
    const sanitizedProperties = { ...properties };
    if (properties.hasOwnProperty('width')) {
      sanitizedProperties.width = Number(properties.width) || 100;
    }
    if (properties.hasOwnProperty('height')) {
      sanitizedProperties.height = Number(properties.height) || 60;
    }
    if (properties.hasOwnProperty('rotation')) {
      sanitizedProperties.rotation = Number(properties.rotation) || 0;
    }
    if (properties.hasOwnProperty('shape')) {
      sanitizedProperties.shape = String(properties.shape) || 'rectangle';
    }

    const roomDocRef = doc(db, 'groups', currentGroup.id, 'rooms', roomId);
    await updateDoc(roomDocRef, sanitizedProperties);
  };
  
  const deleteRoom = async (roomId) => {
    if (!currentGroup) throw new Error("No hay un grupo seleccionado.");
    if (!roomId) throw new Error("ID de habitación no proporcionado.");
  
    const batch = writeBatch(db);
    const roomDocRef = doc(db, 'groups', currentGroup.id, 'rooms', roomId);
    batch.delete(roomDocRef);
  
    const tasksQuery = query(
      collection(db, 'groups', currentGroup.id, 'tasks'),
      where('roomId', '==', roomId)
    );
    const tasksSnapshot = await getDocs(tasksQuery);
    tasksSnapshot.forEach(taskDoc => {
      batch.update(taskDoc.ref, { roomId: null }); // O eliminar las tareas asociadas
    });
    await batch.commit();
  };

  const approveJoinRequest = async (groupId, requestingUserId) => {
    if (!user || !currentGroup || currentGroup.id !== groupId || currentGroup.owner !== user.uid) {
        throw new Error("Operación no permitida o grupo incorrecto.");
    }
    const groupDocRef = doc(db, 'groups', groupId);
    const requestDocRef = doc(db, 'groups', groupId, 'joinRequests', requestingUserId);

    try {
      let newMemberName = "Nuevo Miembro"; 
      const userDocSnap = await getDoc(doc(db, 'users', requestingUserId));
      if (userDocSnap.exists() && userDocSnap.data().displayName) {
        newMemberName = userDocSnap.data().displayName;
      } else {
        const requestSnap = await getDoc(requestDocRef);
        if (requestSnap.exists() && requestSnap.data().requestingUserName) {
            newMemberName = requestSnap.data().requestingUserName;
        }
      }

      await updateDoc(groupDocRef, { members: arrayUnion(requestingUserId) });
      await updateDoc(requestDocRef, {
        status: 'approved',
        approvedBy: user.uid,
        approvedAt: Timestamp.now() // serverTimestamp() puede ser mejor aquí también
      });

      // Actualizar pagos existentes para incluir al nuevo miembro
      const paymentsQuery = query(collection(db, 'groups', groupId, 'payments'));
      const paymentsSnapshot = await getDocs(paymentsQuery);
      
      if (!paymentsSnapshot.empty) {
        const paymentBatch = writeBatch(db); 
        paymentsSnapshot.forEach(paymentDoc => {
          const paymentData = paymentDoc.data();
          const currentPayers = paymentData.payers && typeof paymentData.payers === 'object' ? paymentData.payers : {};
          
          if (!currentPayers[requestingUserId]) { // Solo añadir si no existe
            const updatedPayers = {
              ...currentPayers,
              [requestingUserId]: {
                paid: false,
                paidAt: null,
                userName: newMemberName // Usar el nombre obtenido
              }
            };
            paymentBatch.update(paymentDoc.ref, { payers: updatedPayers });
          }
        });
        await paymentBatch.commit();
      }

    } catch (error) {
      console.error("[GroupContext] Error aprobando solicitud y actualizando pagos:", error);
      throw error;
    }
  };

  const addPayment = async (description, amount = null) => {
    if (!currentGroup || !user) throw new Error("Grupo o usuario no disponibles.");
    if (!description.trim()) throw new Error("La descripción del pago no puede estar vacía.");

    const initialPayers = {};
    // Obtener los miembros actuales directamente del documento del grupo para la lista más actualizada
    const groupDocSnap = await getDoc(doc(db, 'groups', currentGroup.id));
    const membersForPayment = groupDocSnap.exists() ? groupDocSnap.data().members : (currentGroup.members || []);


    if (membersForPayment && membersForPayment.length > 0) {
      for (const memberUid of membersForPayment) {
        let memberName = "Miembro"; // Nombre por defecto
        // Intenta obtener el nombre del documento del usuario
        const userDocSnap = await getDoc(doc(db, 'users', memberUid));
        if (userDocSnap.exists() && userDocSnap.data().displayName) {
          memberName = userDocSnap.data().displayName;
        } else if (memberUid === user.uid && user.name) { // Para el usuario actual, usar el del contexto si está disponible
           memberName = user.name;
        }
        initialPayers[memberUid] = { paid: false, paidAt: null, userName: memberName };
      }
    }

    try {
      const paymentsColRef = collection(db, 'groups', currentGroup.id, 'payments');
      await addDoc(paymentsColRef, {
        description: description.trim(),
        amount: amount ? parseFloat(amount) : null, 
        createdAt: serverTimestamp(),
        createdByUid: user.uid,
        payers: initialPayers,
      });
    } catch (error) {
      console.error("[GroupContext] Error añadiendo pago:", error);
      throw error;
    }
  };

  const deletePayment = async (paymentId) => {
    if (!currentGroup || !paymentId) {
      throw new Error("Información insuficiente para eliminar el pago.");
    }
    try {
      const paymentDocRef = doc(db, 'groups', currentGroup.id, 'payments', paymentId);
      await deleteDoc(paymentDocRef);
    } catch (error) {
      console.error("[GroupContext] Error eliminando pago:", error);
      throw error;
    }
  };
  
  const toggleMemberPaymentStatus = async (paymentId, memberUidToToggle) => {
    if (!currentGroup || !user) throw new Error("Grupo o usuario no disponibles.");
    const paymentDocRef = doc(db, 'groups', currentGroup.id, 'payments', paymentId);
    try {
      const paymentSnap = await getDoc(paymentDocRef);
      if (!paymentSnap.exists()) throw new Error("El pago no existe.");
      const paymentData = paymentSnap.data();
      const currentPayerData = paymentData.payers[memberUidToToggle];
      
      if (user.uid !== memberUidToToggle) { // Restricción: solo el propio usuario puede marcar su pago
          throw new Error("Solo puedes marcar/desmarcar tu propio estado de pago.");
      }
      if (!currentPayerData) throw new Error("No estás en la lista de pagadores de este pago.");
      
      const newPaidStatus = !currentPayerData.paid;
      const newPaidAt = newPaidStatus ? serverTimestamp() : null; // Usar serverTimestamp() para la fecha de pago
      
      // Actualizar campos específicos usando notación de punto
      const updatePathStatus = `payers.${memberUidToToggle}.paid`;
      const updatePathTimestamp = `payers.${memberUidToToggle}.paidAt`;
      
      await updateDoc(paymentDocRef, {
        [updatePathStatus]: newPaidStatus,
        [updatePathTimestamp]: newPaidAt
      });
    } catch (error) {
      console.error("[GroupContext] Error actualizando estado de pago:", error);
      throw error;
    }
  };
  
  const rejectJoinRequest = async (groupId, requestingUserId) => {
    if (!user || !currentGroup || currentGroup.id !== groupId || currentGroup.owner !== user.uid) {
        throw new Error("Operación no permitida o grupo incorrecto.");
    }
    const requestDocRef = doc(db, 'groups', groupId, 'joinRequests', requestingUserId);
    try {
      await updateDoc(requestDocRef, {
        status: 'rejected',
        rejectedBy: user.uid,
        rejectedAt: Timestamp.now() // o serverTimestamp()
      });
    } catch (error) {
      console.error("[GroupContext] Error rechazando solicitud:", error);
      throw error;
    }
  };
  
  const addShoppingItem = async (itemText) => {
    if (!currentGroup) throw new Error("No hay un grupo seleccionado para añadir a la compra.");
    if (!itemText.trim()) throw new Error("El texto del artículo no puede estar vacío.");
    try {
      const shopColRef = collection(db, 'groups', currentGroup.id, 'shopping');
      await addDoc(shopColRef, {
        text: itemText.trim(),
        bought: false,
        createdAt: serverTimestamp(), // Usar serverTimestamp
        order: Date.now(), // Para el orden inicial, se puede usar Date.now() o serverTimestamp()
        addedBy: user?.uid || 'unknown',
        addedByName: user?.name || user?.email || 'Unknown User' // Nombre del usuario que añade
      });
    } catch (error) {
      console.error("[GroupContext] Error adding shopping item to Firestore: ", error);
      throw error;
    }
  };

  const toggleBought = async (itemId, bought) => {
    if (!currentGroup) throw new Error("No hay un grupo seleccionado.");
    try {
      const itemDocRef = doc(db, 'groups', currentGroup.id, 'shopping', itemId);
      await updateDoc(itemDocRef, { bought });
    } catch (error) {
      console.error("[GroupContext] Error updating bought status: ", error);
      throw error;
    }
  };

  const deleteShoppingItem = async (itemId) => {
    if (!currentGroup) throw new Error("No hay un grupo seleccionado.");
    try {
      const itemDocRef = doc(db, 'groups', currentGroup.id, 'shopping', itemId);
      await deleteDoc(itemDocRef);
    } catch (error) {
      console.error("[GroupContext] Error deleting shopping item: ", error);
      throw error;
    }
  };

  const updateShoppingListOrder = async (reorderedItems) => {
    if (!currentGroup) throw new Error("No hay un grupo seleccionado.");
    if (!reorderedItems || reorderedItems.length === 0) return;

    const batch = writeBatch(db);
    reorderedItems.forEach((item, index) => {
      if (item.id) { 
        const itemDocRef = doc(db, 'groups', currentGroup.id, 'shopping', item.id);
        batch.update(itemDocRef, { order: index });
      }
    });
    
    try {
      await batch.commit();
    } catch (error) {
      console.error("[GroupContext] Error actualizando el orden de la lista de la compra:", error);
      throw error;
    }
  };

  return (
    <GroupContext.Provider
      value={{
        userGroups: userGroupsFromUserContext,
        currentGroup,
        setCurrentGroup,
        tasks,
        shoppingList,
        reminders,
        joinRequests,
        payments,
        rooms, 
        createTask,
        assignTaskToUser,
        unassignTask,
        deleteTask,
        createRoom,
        updateRoomPosition,
        updateRoomProperties,
        deleteRoom,
        addReminder, // Asegúrate que está exportada
        addShoppingItem,
        toggleBought,
        deleteShoppingItem,
        updateShoppingListOrder,
        approveJoinRequest,
        rejectJoinRequest,
        addPayment,
        toggleMemberPaymentStatus,
        deletePayment,
      }}
    >
      {children}
    </GroupContext.Provider>
  );
}
