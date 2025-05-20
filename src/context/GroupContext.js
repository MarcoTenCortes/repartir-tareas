// src/context/GroupContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import { UserContext } from './UserContext';
import { db } from '../services/firebase';
import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  arrayUnion,
  Timestamp, // Asegúrate de que Timestamp está importado
  query, // Para la nueva colección de solicitudes
  where // Para la nueva colección de solicitudes
} from 'firebase/firestore';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native'; // Asegúrate de que Platform está importado

export const GroupContext = createContext();

export function GroupProvider({ children }) {
  const { user } = useContext(UserContext); // Necesitamos 'user' para las solicitudes
  const { groups: userGroups } = useContext(UserContext);
  const [currentGroup, setCurrentGroup] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [shoppingList, setShoppingList] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]); // Nuevo estado para solicitudes

  useEffect(() => {
    if (userGroups.length > 0) {
      if (!currentGroup || !userGroups.some(g => g.id === currentGroup.id)) {
        setCurrentGroup(userGroups[0]);
      }
    } else {
      setCurrentGroup(null);
    }
  }, [userGroups]);

  useEffect(() => {
    if (!currentGroup) {
      setRooms([]);
      setShoppingList([]);
      setReminders([]);
      setJoinRequests([]); // Limpiar solicitudes si no hay grupo
      return () => {};
    }

    // Listener para salas
    const roomsCol = collection(db, 'groups', currentGroup.id, 'rooms');
    const unsubRooms = onSnapshot(roomsCol, snap =>
      setRooms(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    // Listener para lista de la compra
    const shopCol = collection(db, 'groups', currentGroup.id, 'shopping');
    const unsubShop = onSnapshot(shopCol, snap =>
      setShoppingList(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    
    // Listener para recordatorios
    const remCol = collection(db, 'groups', currentGroup.id, 'reminders');
    const unsubRem = onSnapshot(remCol, snap => {
      const items = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          date: data.date && data.date.toDate ? data.date.toDate() : null, // Manejar 'date' nulo
          notified: data.notified !== undefined ? data.notified : false,
        };
      });
      setReminders(items.sort((a,b) => {
        if (a.date && b.date) return a.date.getTime() - b.date.getTime();
        if (a.date && !b.date) return -1; // Recordatorios con fecha primero
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

    // Listener para solicitudes de unión (joinRequests)
    // Solo si el usuario actual es miembro del grupo (o el dueño, si se define un rol)
    // Por ahora, asumimos que cualquier miembro puede ver las solicitudes (se puede refinar luego)
    let unsubJoinRequests = () => {};
    if (currentGroup.members && currentGroup.members.includes(user?.uid)) {
        const requestsQuery = query(
            collection(db, 'groups', currentGroup.id, 'joinRequests'),
            where('status', '==', 'pending') // Solo solicitudes pendientes
        );
        unsubJoinRequests = onSnapshot(requestsQuery, snap => {
            setJoinRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
    } else {
        setJoinRequests([]); // Si no es miembro, no hay solicitudes que ver para este grupo
    }


    return () => {
      unsubRooms();
      unsubShop();
      unsubRem();
      unsubJoinRequests(); // Limpiar listener de solicitudes
    };
  }, [currentGroup, user]); // Añadir user como dependencia

  const addReminder = async (text, reminderDate) => { // reminderDate puede ser null
    if (!currentGroup) throw new Error("No hay un grupo seleccionado.");
    if (!text || typeof text !== 'string' || text.trim() === '') {
        throw new Error("El texto del recordatorio no puede estar vacío.");
    }

    const reminderData = {
      text: text.trim(),
      createdAt: Timestamp.now(),
      notified: false,
    };

    if (reminderDate && reminderDate instanceof Date && !isNaN(reminderDate.getTime())) {
      reminderData.date = Timestamp.fromDate(reminderDate); // Solo añadir si es una fecha válida
    } else {
      reminderData.date = null; // explícitamente null si no hay fecha o es inválida
    }

    try {
      const remindersColRef = collection(db, 'groups', currentGroup.id, 'reminders');
      await addDoc(remindersColRef, reminderData);
    } catch (error) {
      console.error("Error adding reminder to Firestore: ", error);
      throw error;
    }
  };

  // ... (otras funciones como createRoom, addTask, addShoppingItem, toggleBought)
  // Implementaciones de ejemplo para que no sean placeholders
  const createRoom = async name => { console.log('createRoom no implementado', name); };
  const addTask = async (roomId, text, assignee) => { console.log('addTask no implementado', roomId, text, assignee); };
  const addShoppingItem = async (itemText) => {
    if (!currentGroup) throw new Error("No hay un grupo seleccionado para añadir a la compra.");
    if (!itemText.trim()) throw new Error("El texto del artículo no puede estar vacío.");
    try {
      const shopColRef = collection(db, 'groups', currentGroup.id, 'shopping');
      await addDoc(shopColRef, {
        text: itemText.trim(),
        bought: false,
        createdAt: Timestamp.now()
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

  // Funciones para gestionar solicitudes de unión
  const approveJoinRequest = async (groupId, requestingUserId) => {
    if (!user || !currentGroup || currentGroup.id !== groupId) throw new Error("Operación no permitida o grupo incorrecto.");
    // Aquí se podría añadir una verificación de si el `user` actual tiene permisos para aprobar

    const groupDocRef = doc(db, 'groups', groupId);
    const requestDocRef = doc(db, 'groups', groupId, 'joinRequests', requestingUserId);

    try {
      // Idealmente, esto debería ser una transacción, pero por simplicidad
      // para la respuesta, se hacen operaciones separadas.
      await updateDoc(groupDocRef, {
        members: arrayUnion(requestingUserId) // Añadir usuario a miembros
      });
      await updateDoc(requestDocRef, {
        status: 'approved', // Marcar solicitud como aprobada
        approvedBy: user.uid,
        approvedAt: Timestamp.now()
      });
      // El listener de onSnapshot actualizará la lista de joinRequests
    } catch (error) {
      console.error("Error aprobando solicitud:", error);
      throw error;
    }
  };

  const rejectJoinRequest = async (groupId, requestingUserId) => {
    if (!user || !currentGroup || currentGroup.id !== groupId) throw new Error("Operación no permitida o grupo incorrecto.");
    
    const requestDocRef = doc(db, 'groups', groupId, 'joinRequests', requestingUserId);
    try {
      await updateDoc(requestDocRef, {
        status: 'rejected', // Marcar solicitud como rechazada
        rejectedBy: user.uid,
        rejectedAt: Timestamp.now()
      });
    } catch (error) {
      console.error("Error rechazando solicitud:", error);
      throw error;
    }
  };


  return (
    <GroupContext.Provider
      value={{
        userGroups,
        currentGroup,
        setCurrentGroup,
        rooms,
        shoppingList,
        reminders,
        joinRequests, // Exponer solicitudes
        createRoom,
        addTask,
        addReminder,
        addShoppingItem,
        toggleBought,
        approveJoinRequest, // Exponer funciones de gestión de solicitudes
        rejectJoinRequest
      }}
    >
      {children}
    </GroupContext.Provider>
  );
}
