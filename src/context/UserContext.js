// FILE: src/context/UserContext.js
import React, { createContext, useState, useEffect, useRef } from 'react'; // Import useRef
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
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  query,
  where,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDocs,
  runTransaction,
  serverTimestamp
} from 'firebase/firestore';

export const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [groups, setGroups] = useState([]);
  const groupListenerUnsubscribeRef = useRef(null); // Ref to hold group listener unsubscribe function

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      // Cleanup previous group listener if it exists
      if (groupListenerUnsubscribeRef.current) {
        groupListenerUnsubscribeRef.current();
        groupListenerUnsubscribeRef.current = null;
      }

      if (u) {
        let displayNameFromDb = null;
        let userEmail = u.email;
        let selectedIconFromDb = 'person-circle-outline'; // Default icon

        try {
            const userDocRef = doc(db, 'users', u.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                displayNameFromDb = userData.displayName;
                if (userData.selectedIcon) {
                    selectedIconFromDb = userData.selectedIcon;
                }
                if (!userEmail && userData.email) { // Fallback for email
                    userEmail = userData.email;
                }
            }
        } catch (error) {
            console.error("Error fetching user details from Firestore in onAuthStateChanged:", error);
        }
        
        const resolvedName = displayNameFromDb || u.displayName || userEmail;
        const resolvedIcon = selectedIconFromDb;

        setUser({
            uid: u.uid,
            name: resolvedName,
            email: userEmail,
            icon: resolvedIcon
        });

        // Setup new group listener for the current user 'u'
        const groupsQuery = query(
          collection(db, 'groups'),
          where('members', 'array-contains', u.uid)
        );
        // Assign the new unsubscribe function to the ref
        groupListenerUnsubscribeRef.current = onSnapshot(groupsQuery, snap => {
          setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }, error => {
            console.error("Error escuchando grupos:", error);
            setGroups([]);
        });
      } else { // User is signed out
        setUser(null);
        setGroups([]); // Clear groups
        // Group listener is already cleaned up at the start of this callback or will be by useEffect cleanup
      }
    });
    
    // Cleanup function for the useEffect: Unsubscribe from auth and any active group listener
    return () => {
      unsubscribeAuth();
      if (groupListenerUnsubscribeRef.current) {
        groupListenerUnsubscribeRef.current();
      }
    };
  }, []); // Empty dependency array: effect runs once on mount, cleans up on unmount

  const register = async (name, email, password, iconName) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    
    // Update Firebase Auth profile (displayName)
    await updateProfile(cred.user, { displayName: name });

    const finalIconName = iconName || 'person-circle-outline';
    
    // Store/Update user details in Firestore (including displayName and selectedIcon)
    const userDocRef = doc(db, 'users', cred.user.uid);
    await setDoc(userDocRef, {
      uid: cred.user.uid,
      displayName: name,
      email: email,
      selectedIcon: finalIconName,
      createdAt: serverTimestamp()
    }, { merge: true });

    // Force reload of the Firebase Auth user object from server.
    // This helps ensure that auth.currentUser and the 'u' object in
    // onAuthStateChanged listeners reflect profile updates sooner.
    try {
        if (auth.currentUser) { // currentUser should be cred.user at this point
            await auth.currentUser.reload();
        }
    } catch (reloadError) {
        console.warn("User reload failed after registration:", reloadError);
    }
    
    // Explicitly set the user state in the context AFTER all backend updates.
    // This ensures the UI reflects the correct name and icon *immediately* after registration.
    setUser({
      uid: cred.user.uid,
      name: name,             // Use the definitive name passed to register
      email: email,
      icon: finalIconName     // Use the definitive icon
    });
    // The onAuthStateChanged listener will also fire and should confirm this state,
    // and it will handle setting up group listeners.
  };

  const login = async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged will handle setting user state and group listeners.
    // Consider auth.currentUser.reload() here too if experiencing staleness after login.
  };

  const logout = async () => {
    await signOut(auth);
    // onAuthStateChanged will set user to null and clear groups.
  };

  const createGroup = async (groupName) => {
    if (!user) throw new Error('Usuario no autenticado. No se puede crear el grupo.');
    if (!groupName || groupName.trim() === '') throw new Error('El nombre del grupo no puede estar vacío.');

    if (groups.length >= 5) {
      throw new Error("No puedes crear más grupos. Ya estás en el máximo de 5 grupos.");
    }

    const trimmedGroupName = groupName.trim();
    const normalizedGroupNameKey = trimmedGroupName.toLowerCase();

    try {
      const newGroupId = await runTransaction(db, async (transaction) => {
        const groupNameRef = doc(db, 'groupNames', normalizedGroupNameKey);
        const groupNameSnap = await transaction.get(groupNameRef);

        if (groupNameSnap.exists()) {
          throw new Error(`El nombre de grupo "${trimmedGroupName}" ya está en uso.`);
        }

        const newGroupRef = doc(collection(db, 'groups'));
        transaction.set(newGroupRef, {
          name: trimmedGroupName,
          normalizedName: normalizedGroupNameKey,
          members: [user.uid],
          owner: user.uid,
          createdAt: serverTimestamp(),
          pendingRequestsCount: 0 
        });

        transaction.set(groupNameRef, {
            groupId: newGroupRef.id,
            originalName: trimmedGroupName
        });
        return newGroupRef.id;
      });
      return newGroupId;
    } catch (error) {
      console.error("Error al crear grupo (transacción):", error.message);
      throw error;
    }
  };

  const joinGroup = async (groupIdToJoin, groupNameToJoin) => {
    if (!user) throw new Error('Usuario no autenticado');
    if (!groupIdToJoin) throw new Error('ID de grupo no proporcionado.');

    if (groups.length >= 5) {
      throw new Error("No puedes unirte a más grupos. Ya estás en el máximo de 5 grupos.");
    }
    
    const isAlreadyMember = groups.some(g => g.id === groupIdToJoin);
    if (isAlreadyMember) {
        throw new Error("Ya eres miembro de este grupo.");
    }

    const requestDocRef = doc(db, 'groups', groupIdToJoin, 'joinRequests', user.uid);
    try {
        const requestSnap = await getDoc(requestDocRef);
        if (requestSnap.exists() && requestSnap.data().status === 'pending') {
            throw new Error('Ya tienes una solicitud pendiente para unirte a este grupo.');
        }
        
        const currentUserNameForRequest = user.name || auth.currentUser?.displayName || user.email || "Usuario Solicitante";

        await setDoc(requestDocRef, {
            requestingUserId: user.uid,
            requestingUserName: currentUserNameForRequest,
            status: 'pending',
            requestedAt: serverTimestamp(),
            groupName: groupNameToJoin 
        });
    } catch (error) {
        console.error("Error creando solicitud de unión:", error.message);
        throw error;
    }
  };

  const leaveGroup = async (groupId) => {
    if (!user) throw new Error("Usuario no autenticado.");
    if (!groupId) throw new Error("ID de grupo no proporcionado.");

    const groupDocRef = doc(db, 'groups', groupId);
    try {
      await updateDoc(groupDocRef, {
        members: arrayRemove(user.uid)
      });
    } catch (error) {
      console.error("Error al abandonar el grupo:", error);
      throw error;
    }
  };

  const getGroupByName = async (name) => {
    if (!name || name.trim() === '') return [];
    const normalizedQueryName = name.trim().toLowerCase();
    const q = query(
      collection(db, 'groups'),
      where('normalizedName', '==', normalizedQueryName)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
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
      leaveGroup,
      getGroupByName
    }}>
      {children}
    </UserContext.Provider>
  );
}
