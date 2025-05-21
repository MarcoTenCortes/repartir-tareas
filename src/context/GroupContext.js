// FILE: src/context/GroupContext.js
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
  arrayRemove,
  Timestamp,
  serverTimestamp,
  query,
  where,
  orderBy,
  getDoc,
  getDocs,
  writeBatch,
  runTransaction // Asegúrate que esté importado para transferGroupOwnership
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

  // ... (useEffect para seleccionar grupo y suscribirse a datos SIN CAMBIOS) ...
  useEffect(() => {
    if (userGroupsFromUserContext.length > 0) {
      if (!currentGroup || !userGroupsFromUserContext.some(g => g.id === currentGroup.id)) {
        setCurrentGroup(userGroupsFromUserContext[0]);
      }
    } else {
      setCurrentGroup(null);
    }
  }, [userGroupsFromUserContext, currentGroup]);

  useEffect(() => {
    if (!currentGroup || !user) {
      setTasks([]);
      setShoppingList([]);
      setReminders([]);
      setJoinRequests([]);
      setPayments([]);
      setRooms([]);
      return () => {};
    }

    const groupDocPath = `groups/${currentGroup.id}`;

    const tasksColRef = collection(db, groupDocPath, 'tasks');
    const tasksQueryRef = query(tasksColRef, orderBy('createdAt', 'desc'));
    const unsubTasks = onSnapshot(tasksQueryRef, snap => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => console.error("[GroupContext] Error en snapshot de tareas:", err));

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
    
    const shopColRef = collection(db, groupDocPath, 'shopping');
    const shopQueryRef = query(shopColRef, orderBy('order', 'asc'));
    const unsubShop = onSnapshot(shopQueryRef, snap => {
      setShoppingList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => console.error("[GroupContext] Error en snapshot de lista de compra:", err));
    
    const remColRef = collection(db, groupDocPath, 'reminders');
    const unsubRem = onSnapshot(remColRef, snap => {
      const items = snap.docs.map(d => {
        const data = d.data();
        const jsDate = data.date && data.date.toDate ? data.date.toDate() : null;
        return {
          id: d.id,
          ...data,
          date: jsDate,
          notified: data.notified !== undefined ? data.notified : false,
        };
      });
      setReminders(items.sort((a,b) => {
        if (a.date && b.date) return a.date.getTime() - b.date.getTime();
        if (a.date && !b.date) return -1;
        if (!a.date && b.date) return 1;
        return 0;
      }));

      if (Platform.OS !== 'web') {
        items.forEach(item => {
          if (item.date && item.date instanceof Date && !item.notified) {
            const triggerDate = item.date;
            if (triggerDate > new Date()) {
              Notifications.scheduleNotificationAsync({
                content: { title: 'Recordatorio', body: item.text },
                trigger: triggerDate,
              }).then(notificationId => {
                updateDoc(doc(db, groupDocPath, 'reminders', item.id), { notified: true })
                  .catch(e => console.error("[GroupContext] Error actualizando 'notified' del recordatorio:", e));
              }).catch(e => console.error("[GroupContext] Error programando notificación:", e));
            }
          }
        });
      }
    }, err => console.error("[GroupContext] Error en snapshot de recordatorios:", err));

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
        setJoinRequests([]);
    }

    const paymentsColRef = collection(db, groupDocPath, 'payments');
    const paymentsQueryRef = query(paymentsColRef, orderBy('createdAt', 'desc')); 
    const unsubPayments = onSnapshot(paymentsQueryRef, snap => {
      setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => console.error("[GroupContext] Error en snapshot de pagos:", err));
    return () => {
      unsubTasks();
      unsubRooms();
      unsubShop();
      unsubRem();
      unsubJoinRequests();
      unsubPayments();
    };
  }, [currentGroup, user]);

  const getGroupMembersDetails = async (memberUIDs) => {
    if (!memberUIDs || memberUIDs.length === 0) return [];
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('uid', 'in', memberUIDs));
      const querySnapshot = await getDocs(q);
      const memberDetails = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        memberDetails.push({
          uid: data.uid,
          name: data.displayName || 'Usuario sin nombre',
          icon: data.selectedIcon || 'person-circle-outline',
        });
      });
      return memberDetails;
    } catch (error) {
      console.error("Error fetching member details:", error);
      return memberUIDs.map(uid => ({ uid, name: 'Error al cargar nombre', icon: 'alert-circle-outline' }));
    }
  };

  const updateGroupName = async (groupId, newName) => {
    if (!user) throw new Error("Usuario no autenticado.");
    const groupDocRef = doc(db, 'groups', groupId);
    const trimmedNewName = newName.trim();
    if (!trimmedNewName) throw new Error("El nuevo nombre del grupo no puede estar vacío.");

    try {
      await runTransaction(db, async (transaction) => {
        const groupSnap = await transaction.get(groupDocRef);
        if (!groupSnap.exists()) throw new Error("El grupo no existe.");
        const groupData = groupSnap.data();

        if (groupData.owner !== user.uid) {
          throw new Error("Solo el propietario puede cambiar el nombre del grupo.");
        }

        const oldNormalizedName = groupData.normalizedName;
        const newNormalizedName = trimmedNewName.toLowerCase();

        if (oldNormalizedName === newNormalizedName && groupData.name === trimmedNewName) {
          return;
        }
        
        if (oldNormalizedName !== newNormalizedName) {
            const newGroupNameRef = doc(db, 'groupNames', newNormalizedName);
            const newGroupNameSnap = await transaction.get(newGroupNameRef);
            if (newGroupNameSnap.exists()) {
                throw new Error(`El nombre de grupo "${trimmedNewName}" ya está en uso por otro grupo.`);
            }
            const oldGroupNameRef = doc(db, 'groupNames', oldNormalizedName);
            transaction.delete(oldGroupNameRef);
            transaction.set(newGroupNameRef, { groupId: groupId, originalName: trimmedNewName });
        }

        transaction.update(groupDocRef, {
          name: trimmedNewName,
          normalizedName: newNormalizedName
        });
      });
      if (currentGroup && currentGroup.id === groupId) {
        setCurrentGroup(prev => ({...prev, name: trimmedNewName, normalizedName: trimmedNewName.toLowerCase()}));
      }
    } catch (error) {
      console.error("Error actualizando nombre del grupo:", error);
      throw error;
    }
  };

  const removeMemberFromGroup = async (groupId, memberIdToRemove) => {
    if (!user) throw new Error("Usuario no autenticado.");
    if (user.uid === memberIdToRemove) throw new Error("No puedes eliminarte a ti mismo del grupo con esta función. Usa 'Abandonar Grupo'.");

    const groupDocRef = doc(db, 'groups', groupId);
    try {
      const groupSnap = await getDoc(groupDocRef);
      if (!groupSnap.exists()) throw new Error("El grupo no existe.");
      const groupData = groupSnap.data();

      if (groupData.owner !== user.uid) {
        throw new Error("Solo el propietario puede eliminar miembros.");
      }
      if (groupData.owner === memberIdToRemove) {
        throw new Error("El propietario no puede ser eliminado. Transfiere la propiedad primero.");
      }
      if (!groupData.members.includes(memberIdToRemove)) {
        throw new Error("El usuario no es miembro de este grupo.");
      }

      await updateDoc(groupDocRef, {
        members: arrayRemove(memberIdToRemove)
      });
      if (currentGroup && currentGroup.id === groupId) {
        setCurrentGroup(prev => ({...prev, members: prev.members.filter(uid => uid !== memberIdToRemove)}));
      }
    } catch (error) {
      console.error("Error eliminando miembro del grupo:", error);
      throw error;
    }
  };

  const transferGroupOwnership = async (groupId, newOwnerId) => {
    if (!user) throw new Error("Usuario no autenticado.");
    if (!groupId || !newOwnerId) throw new Error("ID de grupo o ID de nuevo propietario no proporcionados.");

    const groupDocRef = doc(db, 'groups', groupId);
    
    try {
      await runTransaction(db, async (transaction) => {
        const groupSnap = await transaction.get(groupDocRef);
        if (!groupSnap.exists()) {
          throw new Error("El grupo no existe.");
        }
        const groupData = groupSnap.data();

        if (groupData.owner !== user.uid) {
          throw new Error("Solo el propietario actual puede transferir la propiedad del grupo.");
        }
        if (!groupData.members.includes(newOwnerId)) {
          // Esta verificación es importante para asegurar que el nuevo propietario sea un miembro válido.
          throw new Error("El usuario seleccionado para ser el nuevo propietario no es miembro del grupo.");
        }
        if (newOwnerId === user.uid) {
          throw new Error("No puedes transferirte la propiedad a ti mismo.");
        }

        transaction.update(groupDocRef, { owner: newOwnerId });
      });

      // Actualizar localmente si es el currentGroup
      if (currentGroup && currentGroup.id === groupId) {
        setCurrentGroup(prev => ({ ...prev, owner: newOwnerId }));
      }
      // La lista de grupos en UserContext (userAppGroups) y el currentGroup global
      // se actualizarán a través de los listeners onSnapshot debido al cambio en Firestore.
    } catch (error) {
      console.error("Error transfiriendo propiedad del grupo:", error);
      throw error; // Re-lanzar para que la UI pueda manejarlo
    }
  };

  // ... (resto de funciones existentes: addReminder, deleteTask, etc. SIN CAMBIOS)
  const addReminder = async (text, reminderDateInput) => {
    if (!currentGroup) throw new Error("No hay un grupo seleccionado.");
    if (!text || typeof text !== 'string' || text.trim() === '') {
        throw new Error("El texto del recordatorio no puede estar vacío.");
    }

    const reminderDataObject = {
      text: text.trim(),
      createdAt: serverTimestamp(),
      notified: false,
      date: null 
    };

    if (reminderDateInput && reminderDateInput instanceof Date && !isNaN(reminderDateInput.getTime())) {
      reminderDataObject.date = Timestamp.fromDate(reminderDateInput);
    }
    
    try {
      const remindersColRef = collection(db, 'groups', currentGroup.id, 'reminders');
      await addDoc(remindersColRef, reminderDataObject);
    } catch (error) {
      console.error("[GroupContext] Error añadiendo recordatorio a Firestore: ", error);
      throw error;
    }
  };
  const deleteReminder = async (reminderId) => {
    if (!currentGroup) {
      console.error("[GroupContext] Intento de eliminar recordatorio sin grupo seleccionado.");
      throw new Error("No hay un grupo seleccionado.");
    }
    if (!reminderId) {
      console.error("[GroupContext] Intento de eliminar recordatorio sin ID.");
      throw new Error("ID de recordatorio no proporcionado.");
    }

    try {
      const reminderDocRef = doc(db, 'groups', currentGroup.id, 'reminders', reminderId);
      await deleteDoc(reminderDocRef);
    } catch (error) {
      console.error(`[GroupContext] Error eliminando recordatorio ${reminderId} de Firestore: `, error);
      throw error; 
    }
  };
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
      batch.update(taskDoc.ref, { roomId: null }); 
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
        approvedAt: Timestamp.now()
      });
      const paymentsQuery = query(collection(db, 'groups', groupId, 'payments'));
      const paymentsSnapshot = await getDocs(paymentsQuery);
      
      if (!paymentsSnapshot.empty) {
        const paymentBatch = writeBatch(db); 
        paymentsSnapshot.forEach(paymentDoc => {
          const paymentData = paymentDoc.data();
          const currentPayers = paymentData.payers && typeof paymentData.payers === 'object' ? paymentData.payers : {};
          
          if (!currentPayers[requestingUserId]) {
            const updatedPayers = {
              ...currentPayers,
              [requestingUserId]: {
                paid: false,
                paidAt: null,
                userName: newMemberName
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
    const groupDocSnap = await getDoc(doc(db, 'groups', currentGroup.id));
    const membersForPayment = groupDocSnap.exists() ? groupDocSnap.data().members : (currentGroup.members || []);


    if (membersForPayment && membersForPayment.length > 0) {
      for (const memberUid of membersForPayment) {
        let memberName = "Miembro";
        const userDocSnap = await getDoc(doc(db, 'users', memberUid));
        if (userDocSnap.exists() && userDocSnap.data().displayName) {
          memberName = userDocSnap.data().displayName;
        } else if (memberUid === user.uid && user.name) {
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
      
      if (user.uid !== memberUidToToggle) {
          throw new Error("Solo puedes marcar/desmarcar tu propio estado de pago.");
      }
      if (!currentPayerData) throw new Error("No estás en la lista de pagadores de este pago.");
      
      const newPaidStatus = !currentPayerData.paid;
      const newPaidAt = newPaidStatus ? serverTimestamp() : null;
      
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
        rejectedAt: Timestamp.now()
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
        createdAt: serverTimestamp(),
        order: Date.now(), 
        addedBy: user?.uid || 'unknown',
        addedByName: user?.name || user?.email || 'Unknown User'
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
        getGroupMembersDetails,
        updateGroupName,
        removeMemberFromGroup,
        transferGroupOwnership, // <--- AÑADIR NUEVA FUNCIÓN AQUÍ
        createTask,
        assignTaskToUser,
        unassignTask,
        deleteTask,
        createRoom,
        updateRoomPosition,
        updateRoomProperties,
        deleteRoom,
        addReminder,
        deleteReminder,
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
