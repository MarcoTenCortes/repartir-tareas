// === src/context/UserContext.js ===
import React, { createContext, useState, useEffect } from 'react';
import { auth, db } from '../services/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  updateProfile,
  signOut
} from 'firebase/auth';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  doc,
  updateDoc,
  arrayUnion,
  getDocs
} from 'firebase/firestore';

export const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [groups, setGroups] = useState([]);

  // Sync auth state and fetch groups
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser({ uid: u.uid, name: u.displayName });
        // subscribe to all groups
        const groupsCol = collection(db, 'groups');
        const unsubGroups = onSnapshot(groupsCol, snap => {
          const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setGroups(all);
        });
        return () => unsubGroups();
      } else {
        setUser(null);
        setGroups([]);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // Authentication
  const register = async (name, email, password) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
  };

  const login = async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  // Group operations
  const createGroup = async (groupName) => {
    if (!user) throw new Error('Not authenticated');
    const ref = await addDoc(collection(db, 'groups'), {
      name: groupName,
      members: [user.uid]
    });
    return ref.id;
  };

  const joinGroup = async (groupId) => {
    if (!user) throw new Error('Not authenticated');
    const groupDoc = doc(db, 'groups', groupId);
    await updateDoc(groupDoc, { members: arrayUnion(user.uid) });
  };

  const getGroupByName = async (name) => {
    const q = query(collection(db, 'groups'), where('name', '==', name));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  };

  return (
    <UserContext.Provider value={{
      user,
      groups,
      register,
      login,
      logout,
      createGroup,
      joinGroup,
      getGroupByName
    }}>
      {children}
    </UserContext.Provider>
  );
}

