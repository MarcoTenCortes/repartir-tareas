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

  // Cuando cargan los grupos del usuario, selecciona el primero si no hay ninguno
  useEffect(() => {
    if (userGroups.length > 0 && !currentGroup) {
      setCurrentGroup(userGroups[0]);
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
          // y marca como notificado
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
  const createRoom = async name => {
    if (!currentGroup) throw new Error('Selecciona primero un grupo');
    await addDoc(
      collection(db, 'groups', currentGroup.id, 'rooms'),
      { name, tasks: [] }
    );
  };

  const addTask = async (roomId, text, assignee) => {
    if (!currentGroup) throw new Error('Selecciona primero un grupo');
    const roomRef = doc(db, 'groups', currentGroup.id, 'rooms', roomId);
    await updateDoc(roomRef, {
      tasks: arrayUnion({ id: Date.now().toString(), text, assignee })
    });
  };

  const addReminder = async (text, date) => {
    if (!currentGroup) throw new Error('Selecciona primero un grupo');
    await addDoc(
      collection(db, 'groups', currentGroup.id, 'reminders'),
      { text, date, notified: false }
    );
  };

  const addShoppingItem = async text => {
    if (!currentGroup) throw new Error('Selecciona primero un grupo');
    await addDoc(
      collection(db, 'groups', currentGroup.id, 'shopping'),
      { text, bought: false }
    );
  };

  const toggleBought = async (itemId, bought) => {
    if (!currentGroup) throw new Error('Selecciona primero un grupo');
    await updateDoc(
      doc(db, 'groups', currentGroup.id, 'shopping', itemId),
      { bought }
    );
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
