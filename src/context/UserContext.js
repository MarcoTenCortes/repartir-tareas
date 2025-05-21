// FILE: src/context/UserContext.js
import React, { createContext, useState, useEffect, useRef } from 'react';
import { auth, db } from '../services/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  updateProfile,
  signOut,
  EmailAuthProvider, 
  reauthenticateWithCredential, 
  updatePassword 
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
  serverTimestamp,
  writeBatch // Added for deleteGroup
} from 'firebase/firestore';

export const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [groups, setGroups] = useState([]);
  const groupListenerUnsubscribeRef = useRef(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      if (groupListenerUnsubscribeRef.current) {
        groupListenerUnsubscribeRef.current();
        groupListenerUnsubscribeRef.current = null;
      }

      if (u) {
        let displayNameFromDb = null;
        let userEmail = u.email;
        let selectedIconFromDb = 'person-circle-outline'; 

        try {
            const userDocRef = doc(db, 'users', u.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                displayNameFromDb = userData.displayName;
                if (userData.selectedIcon) {
                    selectedIconFromDb = userData.selectedIcon;
                }
                if (!userEmail && userData.email) { 
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

        const groupsQuery = query(
          collection(db, 'groups'),
          where('members', 'array-contains', u.uid)
        );
        groupListenerUnsubscribeRef.current = onSnapshot(groupsQuery, snap => {
          setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }, error => {
            console.error("Error escuchando grupos:", error);
            setGroups([]);
        });
      } else { 
        setUser(null);
        setGroups([]); 
      }
    });
    
    return () => {
      unsubscribeAuth();
      if (groupListenerUnsubscribeRef.current) {
        groupListenerUnsubscribeRef.current();
      }
    };
  }, []);

  const register = async (name, email, password, iconName) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    const finalIconName = iconName || 'person-circle-outline';
    const userDocRef = doc(db, 'users', cred.user.uid);
    await setDoc(userDocRef, {
      uid: cred.user.uid,
      displayName: name,
      email: email,
      selectedIcon: finalIconName,
      createdAt: serverTimestamp()
    }, { merge: true });
    try {
        if (auth.currentUser) {
            await auth.currentUser.reload();
        }
    } catch (reloadError) {
        console.warn("User reload failed after registration:", reloadError);
    }
    setUser({
      uid: cred.user.uid,
      name: name,
      email: email,
      icon: finalIconName
    });
  };

  const login = async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const updateUserProfile = async (profileData) => {
    if (!auth.currentUser) throw new Error("No hay usuario autenticado.");
    
    const updates = {};
    const firestoreUpdates = {};

    if (profileData.name) {
      await updateProfile(auth.currentUser, { displayName: profileData.name });
      firestoreUpdates.displayName = profileData.name;
      updates.name = profileData.name;
    }
    if (profileData.iconName) {
      firestoreUpdates.selectedIcon = profileData.iconName;
      updates.icon = profileData.iconName;
    }
    if (Object.keys(firestoreUpdates).length > 0) {
      const userDocRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userDocRef, firestoreUpdates);
    }
    
    setUser(prevUser => ({ ...prevUser, ...updates }));
  };

  const changeUserPassword = async (currentPassword, newPassword) => {
    if (!auth.currentUser) throw new Error("No hay usuario autenticado.");
    if (!currentPassword || !newPassword) throw new Error("Se requieren la contraseña actual y la nueva.");

    const userAuth = auth.currentUser;
    const credential = EmailAuthProvider.credential(userAuth.email, currentPassword);

    try {
      await reauthenticateWithCredential(userAuth, credential);
      await updatePassword(userAuth, newPassword);
    } catch (error) {
      console.error("Error changing password:", error);
      if (error.code === 'auth/wrong-password') {
        throw new Error("La contraseña actual es incorrecta.");
      } else if (error.code === 'auth/requires-recent-login') {
        throw new Error("Esta operación es sensible y requiere autenticación reciente. Por favor, vuelve a iniciar sesión.");
      }
      throw new Error("Error al cambiar la contraseña: " + error.message);
    }
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
      // Additional check: owner cannot leave if there are other members.
      // They must delete the group or transfer ownership (not implemented).
      const groupSnap = await getDoc(groupDocRef);
      if (groupSnap.exists()) {
          const groupData = groupSnap.data();
          if (groupData.owner === user.uid && groupData.members.length > 1) {
              throw new Error("Como propietario, no puedes abandonar el grupo si hay otros miembros. Considera eliminar el grupo o transferir la propiedad.");
          }
          // If owner is the last member, they should use deleteGroup.
          if (groupData.owner === user.uid && groupData.members.length === 1) {
              throw new Error("Eres el único miembro y propietario. Utiliza la opción 'Eliminar Grupo'.");
          }
      } else {
          throw new Error("El grupo no existe.");
      }

      await updateDoc(groupDocRef, {
        members: arrayRemove(user.uid)
      });
      // If the user was the owner and the last member, the group still exists but is empty.
      // This scenario is less common if deleteGroup is used by the owner.
    } catch (error) {
      console.error("Error al abandonar el grupo:", error);
      throw error;
    }
  };

  const deleteGroup = async (groupId) => {
    if (!user) throw new Error("Usuario no autenticado.");
    if (!groupId) throw new Error("ID de grupo no proporcionado.");

    const groupDocRef = doc(db, 'groups', groupId);
    try {
        const groupSnap = await getDoc(groupDocRef);
        if (!groupSnap.exists()) throw new Error("El grupo no existe.");

        const groupData = groupSnap.data();
        if (groupData.owner !== user.uid) {
            throw new Error("Solo el propietario puede eliminar el grupo.");
        }

        const batch = writeBatch(db);
        
        // 1. Delete the group document itself
        batch.delete(groupDocRef);

        // 2. Delete the entry in groupNames collection
        if (groupData.normalizedName) {
            const groupNameDocRef = doc(db, 'groupNames', groupData.normalizedName);
            batch.delete(groupNameDocRef);
        }
        
        // Note: Deleting subcollections (tasks, shopping, reminders, etc.)
        // client-side is complex and error-prone for large amounts of data.
        // This is typically best handled by a Cloud Function triggered on group deletion.
        // For this scope, we are only deleting the main group doc and its name entry.
        // Consider your data retention and cleanup strategy.

        await batch.commit();
        // Local state updates (groups, currentGroup) will be handled by onSnapshot listeners.
    } catch (error) {
        console.error("Error al eliminar el grupo:", error);
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
      updateUserProfile,
      changeUserPassword,
      createGroup,
      joinGroup,
      leaveGroup,
      deleteGroup, // << AÑADIDO
      getGroupByName
    }}>
      {children}
    </UserContext.Provider>
  );
}
