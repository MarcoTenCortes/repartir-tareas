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
  Timestamp,
  serverTimestamp,
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
  const [tasks, setTasks] = useState([]); // <--- NUEVO ESTADO PARA TAREAS
  const [shoppingList, setShoppingList] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [payments, setPayments] = useState([]);

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
    if (!currentGroup) {
      setTasks([]); // Limpiar tareas si no hay grupo
      setShoppingList([]);
      setReminders([]);
      setJoinRequests([]);
      setPayments([]);
      return () => {};
    }

    // Listener para TAREAS
    const tasksColRef = collection(db, 'groups', currentGroup.id, 'tasks');
    const tasksQuery = query(tasksColRef, orderBy('createdAt', 'desc'));
    const unsubTasks = onSnapshot(tasksQuery, snap => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // ... (listeners existentes para shopping, reminders, joinRequests, payments sin cambios) ...
    const shopCol = collection(db, 'groups', currentGroup.id, 'shopping');
    const unsubShop = onSnapshot(shopCol, snap =>
      setShoppingList(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => {
        if (a.bought === b.bought) {
          return (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0);
        }
        return a.bought ? 1 : -1;
      }))
    );
    
    const remCol = collection(db, 'groups', currentGroup.id, 'reminders');
    const unsubRem = onSnapshot(remCol, snap => {
      const items = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          date: data.date && data.date.toDate ? data.date.toDate() : null,
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
              }).catch(e => console.error("Error scheduling notification:", e));
              
              updateDoc(
                doc(db, 'groups', currentGroup.id, 'reminders', item.id),
                { notified: true }
              ).catch(error => console.error("Error updating reminder notification status:", error));
            }
          }
        });
      }
    });

    let unsubJoinRequests = () => {};
    if (currentGroup.members && user && currentGroup.members.includes(user.uid) && currentGroup.owner === user.uid) {
        const requestsQuery = query(
            collection(db, 'groups', currentGroup.id, 'joinRequests'),
            where('status', '==', 'pending')
        );
        unsubJoinRequests = onSnapshot(requestsQuery, snap => {
            setJoinRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
    } else {
        setJoinRequests([]);
    }

    const paymentsCol = collection(db, 'groups', currentGroup.id, 'payments');
    const paymentsQuery = query(paymentsCol, orderBy('createdAt', 'desc')); 
    const unsubPayments = onSnapshot(paymentsQuery, snap => {
      setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });


    return () => {
      unsubTasks(); // Desuscribirse del listener de tareas
      unsubShop();
      unsubRem();
      unsubJoinRequests();
      unsubPayments();
    };
  }, [currentGroup, user]);

  // --- NUEVAS FUNCIONES PARA TAREAS ---
  const createTask = async (taskName) => {
    if (!currentGroup || !user) throw new Error("Grupo o usuario no disponibles.");
    if (!taskName.trim()) throw new Error("El nombre de la tarea no puede estar vacío.");

    const tasksColRef = collection(db, 'groups', currentGroup.id, 'tasks');
    await addDoc(tasksColRef, {
      name: taskName.trim(),
      assignedTo: null, // UID del usuario asignado
      assignedToName: null, // Nombre del usuario asignado para mostrar
      createdAt: serverTimestamp(),
      createdBy: user.uid, // UID del creador de la tarea
      createdByName: user.name || user.email || "Usuario Desconocido", // Nombre del creador
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
      assignedAt: serverTimestamp(), // Opcional: guardar cuándo se asignó
    });
  };

  const unassignTask = async (taskId) => {
    if (!currentGroup) throw new Error("No hay un grupo seleccionado.");
    if (!taskId) throw new Error("ID de tarea no proporcionado.");

    const taskDocRef = doc(db, 'groups', currentGroup.id, 'tasks', taskId);
    await updateDoc(taskDocRef, {
      assignedTo: null,
      assignedToName: null,
      assignedAt: null // Opcional: limpiar o quitar el campo
    });
  };

  const deleteTask = async (taskId) => {
    if (!currentGroup) throw new Error("No hay un grupo seleccionado.");
    if (!taskId) throw new Error("ID de tarea no proporcionado.");

    const taskDocRef = doc(db, 'groups', currentGroup.id, 'tasks', taskId);
    await deleteDoc(taskDocRef);
  };
  // --- FIN NUEVAS FUNCIONES PARA TAREAS ---


  // ... (resto de funciones existentes: approveJoinRequest, addPayment, etc. sin cambios)
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
        const batch = writeBatch(db);
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
            batch.update(paymentDoc.ref, { payers: updatedPayers });
          }
        });
        await batch.commit();
        console.log("Pagos existentes actualizados con el nuevo miembro.");
      }

    } catch (error) {
      console.error("Error aprobando solicitud y actualizando pagos:", error);
      throw error;
    }
  };

  const addPayment = async (description, amount = null) => {
    if (!currentGroup || !user) throw new Error("Grupo o usuario no disponibles.");
    if (!description.trim()) throw new Error("La descripción del pago no puede estar vacía.");

    const initialPayers = {};
    const groupDocSnap = await getDoc(doc(db, 'groups', currentGroup.id));
    const membersForPayment = groupDocSnap.exists() ? groupDocSnap.data().members : currentGroup.members;

    if (membersForPayment && membersForPayment.length > 0) {
      for (const memberUid of membersForPayment) {
        let memberName;
        if (memberUid === user.uid) {
            if (user.name && user.name.trim() !== "") memberName = user.name;
            else if (auth.currentUser && auth.currentUser.displayName && auth.currentUser.displayName.trim() !== "") memberName = auth.currentUser.displayName;
            else {
                try {
                    const userDocSnap = await getDoc(doc(db, 'users', user.uid));
                    memberName = (userDocSnap.exists() && userDocSnap.data().displayName && userDocSnap.data().displayName.trim() !== "") ? userDocSnap.data().displayName : (user.email || "Tú (Nombre no disponible)");
                } catch (dbError) { memberName = user.email || "Tú (Error DB)"; }
            }
        } else {
            try {
                const userDocSnap = await getDoc(doc(db, 'users', memberUid));
                memberName = (userDocSnap.exists() && userDocSnap.data().displayName && userDocSnap.data().displayName.trim() !== "") ? userDocSnap.data().displayName : "Otro Miembro (Nombre no disponible)";
            } catch (e) { memberName = "Error al cargar nombre"; }
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
      console.error("Error añadiendo pago:", error);
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
      console.error("Error eliminando pago:", error);
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
      const updatePath = `payers.${memberUidToToggle}.paid`;
      const updatePathTimestamp = `payers.${memberUidToToggle}.paidAt`;
      await updateDoc(paymentDocRef, {
        [updatePath]: newPaidStatus,
        [updatePathTimestamp]: newPaidAt
      });
    } catch (error) {
      console.error("Error actualizando estado de pago:", error);
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
      console.error("Error rechazando solicitud:", error);
      throw error;
    }
  };

  const addReminder = async (text, reminderDate) => {
    if (!currentGroup) throw new Error("No hay un grupo seleccionado.");
    if (!text || typeof text !== 'string' || text.trim() === '') {
        throw new Error("El texto del recordatorio no puede estar vacío.");
    }
    const reminderData = {
      text: text.trim(),
      createdAt: Timestamp.now(),
      notified: false,
      ...(reminderDate && reminderDate instanceof Date && !isNaN(reminderDate.getTime()) 
          ? { date: Timestamp.fromDate(reminderDate) } 
          : { date: null })
    };
    try {
      const remindersColRef = collection(db, 'groups', currentGroup.id, 'reminders');
      await addDoc(remindersColRef, reminderData);
    } catch (error) {
      console.error("Error adding reminder to Firestore: ", error);
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
        createdAt: Timestamp.now(),
        addedBy: user?.uid || 'unknown',
        addedByName: user?.name || user?.email || 'Unknown User'
      });
    } catch (error) {
      console.error("Error adding shopping item to Firestore: ", error);
      throw error;
    }
  };

  const toggleBought = async (itemId, bought) => {
    if (!currentGroup) throw new Error("No hay un grupo seleccionado.");
    try {
      const itemDocRef = doc(db, 'groups', currentGroup.id, 'shopping', itemId);
      await updateDoc(itemDocRef, { bought });
    } catch (error) {
      console.error("Error updating bought status: ", error);
      throw error;
    }
  };

  const deleteShoppingItem = async (itemId) => {
    if (!currentGroup) throw new Error("No hay un grupo seleccionado.");
    try {
      const itemDocRef = doc(db, 'groups', currentGroup.id, 'shopping', itemId);
      await deleteDoc(itemDocRef);
    } catch (error) {
      console.error("Error deleting shopping item: ", error);
      throw error;
    }
  };

  // Quitar createRoom y addTask si no se usan para tareas, o redefinirlas.
  // Las nuevas funciones de tareas las reemplazarán.

  return (
    <GroupContext.Provider
      value={{
        userGroups: userGroupsFromUserContext,
        currentGroup,
        setCurrentGroup,
        tasks, // <--- Exponer nuevo estado
        shoppingList,
        reminders,
        joinRequests,
        payments,
        createTask, // <--- Exponer nueva función
        assignTaskToUser, // <--- Exponer nueva función
        unassignTask, // <--- Exponer nueva función
        deleteTask, // <--- Exponer nueva función
        addReminder,
        addShoppingItem,
        toggleBought,
        deleteShoppingItem,
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
