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
  deleteDoc, // <--- Importar deleteDoc
  arrayUnion,
  Timestamp,
  query,
  where
} from 'firebase/firestore';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const GroupContext = createContext();

export function GroupProvider({ children }) {
  const { user } = useContext(UserContext);
  const { groups: userGroups } = useContext(UserContext); // Renombrado para claridad, si es necesario
  const [currentGroup, setCurrentGroup] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [shoppingList, setShoppingList] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);

  useEffect(() => {
    if (userGroups.length > 0) {
      if (!currentGroup || !userGroups.some(g => g.id === currentGroup.id)) {
        setCurrentGroup(userGroups[0]);
      }
    } else {
      setCurrentGroup(null);
    }
  }, [userGroups, currentGroup]); //Añadido currentGroup a las dependencias por si se deselecciona

  useEffect(() => {
    if (!currentGroup) {
      setRooms([]);
      setShoppingList([]);
      setReminders([]);
      setJoinRequests([]);
      return () => {};
    }

    const roomsCol = collection(db, 'groups', currentGroup.id, 'rooms');
    const unsubRooms = onSnapshot(roomsCol, snap =>
      setRooms(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    const shopCol = collection(db, 'groups', currentGroup.id, 'shopping');
    const unsubShop = onSnapshot(shopCol, snap =>
      setShoppingList(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => {
        // Ordenar: no comprados primero, luego por fecha de creación descendente
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
    if (currentGroup.members && user && currentGroup.members.includes(user.uid)) { // Asegurar que user exista
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

    return () => {
      unsubRooms();
      unsubShop();
      unsubRem();
      unsubJoinRequests();
    };
  }, [currentGroup, user]);

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

  const createRoom = async name => { console.warn('createRoom no implementado', name); };
  const addTask = async (roomId, text, assignee) => { console.warn('addTask no implementado', roomId, text, assignee); };
  
  const addShoppingItem = async (itemText) => {
    if (!currentGroup) throw new Error("No hay un grupo seleccionado para añadir a la compra.");
    if (!itemText.trim()) throw new Error("El texto del artículo no puede estar vacío.");
    try {
      const shopColRef = collection(db, 'groups', currentGroup.id, 'shopping');
      await addDoc(shopColRef, {
        text: itemText.trim(),
        bought: false,
        createdAt: Timestamp.now(), // Guardar fecha de creación para posible ordenación
        addedBy: user?.uid || 'unknown', // Opcional: quién lo añadió
        addedByName: user?.name || user?.email || 'Unknown User' // Opcional
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

  // --- NUEVA FUNCIÓN ---
  const deleteShoppingItem = async (itemId) => {
    if (!currentGroup) throw new Error("No hay un grupo seleccionado.");
    try {
      const itemDocRef = doc(db, 'groups', currentGroup.id, 'shopping', itemId);
      await deleteDoc(itemDocRef);
    } catch (error) {
      console.error("Error deleting shopping item: ", error);
      throw error; // Re-lanzar para que la UI pueda manejarlo (e.g., mostrar un Alert)
    }
  };
  // --- FIN NUEVA FUNCIÓN ---


  const approveJoinRequest = async (groupId, requestingUserId) => {
    if (!user || !currentGroup || currentGroup.id !== groupId) throw new Error("Operación no permitida o grupo incorrecto.");
    const groupDocRef = doc(db, 'groups', groupId);
    const requestDocRef = doc(db, 'groups', groupId, 'joinRequests', requestingUserId);
    try {
      await updateDoc(groupDocRef, { members: arrayUnion(requestingUserId) });
      await updateDoc(requestDocRef, {
        status: 'approved',
        approvedBy: user.uid,
        approvedAt: Timestamp.now()
      });
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
        status: 'rejected',
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
        joinRequests,
        createRoom,
        addTask,
        addReminder,
        addShoppingItem,
        toggleBought,
        deleteShoppingItem, // <--- Exponer la nueva función
        approveJoinRequest,
        rejectJoinRequest
      }}
    >
      {children}
    </GroupContext.Provider>
  );
}
