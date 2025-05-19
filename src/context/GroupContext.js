import React, { createContext, useState } from 'react';

export const GroupContext = createContext();

export function GroupProvider({ children }) {
  const [members, setMembers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [shoppingList, setShoppingList] = useState([]);
  const [reminders, setReminders] = useState([]);

  return (
    <GroupContext.Provider value={{ members, rooms, shoppingList, reminders }}>
      {children}
    </GroupContext.Provider>
  );
}
