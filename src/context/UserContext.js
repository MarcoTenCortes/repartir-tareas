import React, { createContext, useState, useEffect } from 'react';

export const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState({ id: null, name: '', selectedGroup: null });
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    // TODO: cargar usuario y grupos desde backend
  }, []);

  function selectGroup(groupId) {
    const grp = groups.find(g => g.id === groupId);
    setUser({ ...user, selectedGroup: grp });
  }

  return (
    <UserContext.Provider value={{ user, groups, selectGroup }}>
      {children}
    </UserContext.Provider>
  );
}
