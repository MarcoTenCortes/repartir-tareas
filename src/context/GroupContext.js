import React, { createContext, useState, useEffect, useContext } from 'react';
import { UserContext } from './UserContext';
import { db } from '../services/firebase';
import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  arrayUnion
} from 'firebase/firestore';
import * as Notifications from 'expo-notifications';

export const GroupContext = createContext();

export function GroupProvider({ children }) {
  const { groups: userGroups } = useContext(UserContext);
  const [currentGroup, setCurrentGroup] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [shoppingList, setShoppingList] = useState([]);
  const [reminders, setReminders] = useState([]);

  // Ajusta currentGroup cuando cambian los grupos del usuario
  useEffect(() => {
    if (userGroups.length > 0) {
      if (!currentGroup || !userGroups.some(g => g.id === currentGroup.id)) {
        setCurrentGroup(userGroups[0]);
      }
    } else {
      setCurrentGroup(null);
    }
  }, [userGroups]);

  // Subscripciones a sub-colecciones al cambiar de grupo
  useEffect(() => {
    if (!currentGroup) return;

    const roomsCol = collection(db, 'groups', currentGroup.id, 'rooms');
    const unsubRooms = onSnapshot(roomsCol, snap =>
      setRooms(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    const shopCol = collection(db, 'groups', currentGroup.id, 'shopping');
    const unsubShop = onSnapshot(shopCol, snap =>
      setShoppingList(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    const remCol = collection(db, 'groups', currentGroup.id, 'reminders');
    const unsubRem = onSnapshot(remCol, snap => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setReminders(items);

      // programa notificaciones locales si hay fecha y no se ha notificado
      items.forEach(item => {
        if (item.date && !item.notified) {
          Notifications.scheduleNotificationAsync({
            content: { title: 'Recordatorio', body: item.text },
            trigger: item.date.toDate()
          });
          updateDoc(
            doc(db, 'groups', currentGroup.id, 'reminders', item.id),
            { notified: true }
          );
        }
      });
    });

    return () => {
      unsubRooms();
      unsubShop();
      unsubRem();
    };
  }, [currentGroup]);

  // Funciones para mutaciones
  const createRoom = async name => { /* ... */ };
  const addTask = async (roomId, text, assignee) => { /* ... */ };
  const addReminder = async (text, date) => { /* ... */ };
  const addShoppingItem = async text => { /* ... */ };
  const toggleBought = async (itemId, bought) => { /* ... */ };

  return (
    <GroupContext.Provider
      value={{
        userGroups,
        currentGroup,
        setCurrentGroup,
        rooms,
        shoppingList,
        reminders,
        createRoom,
        addTask,
        addReminder,
        addShoppingItem,
        toggleBought
      }}
    >
      {children}
    </GroupContext.Provider>
  );
}
