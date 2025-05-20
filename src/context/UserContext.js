// src/context/UserContext.js
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
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  query,
  where,
  updateDoc,
  arrayUnion,
  arrayRemove, // Asegúrate de que arrayRemove esté aquí si se usa en leaveGroup
  getDocs,
  runTransaction,
  serverTimestamp
} from 'firebase/firestore';

export const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      if (u) {
        let displayNameFromDb = null;
        let userEmail = u.email; // Captura el email del objeto 'u'

        // Intenta obtener el displayName de Firestore como fuente prioritaria tras login/registro
        // ya que u.displayName puede tardar en actualizarse después de updateProfile.
        try {
            const userDocRef = doc(db, 'users', u.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists() && userDocSnap.data().displayName) {
                displayNameFromDb = userDocSnap.data().displayName;
                // Si el email no estaba en 'u', pero sí en la BD (menos probable pero posible)
                if (!userEmail && userDocSnap.data().email) {
                    userEmail = userDocSnap.data().email;
                }
            }
        } catch (error) {
            console.error("Error fetching user details from Firestore in onAuthStateChanged:", error);
        }
        
        // Establecer el estado del usuario
        // Prioridad: 1. Nombre de Firestore, 2. Nombre de Firebase Auth, 3. Email (como fallback de nombre)
        setUser({
            uid: u.uid,
            name: displayNameFromDb || u.displayName || userEmail, // El 'name' aquí es crucial
            email: userEmail
        });

        // Listener para los grupos del usuario
        const groupsQuery = query(
          collection(db, 'groups'),
          where('members', 'array-contains', u.uid)
        );
        const unsubGroups = onSnapshot(groupsQuery, snap => {
          setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }, error => {
            console.error("Error escuchando grupos:", error);
            setGroups([]);
        });
        return () => unsubGroups();
      } else {
        setUser(null);
        setGroups([]);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  const register = async (name, email, password) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });

    const userDocRef = doc(db, 'users', cred.user.uid);
    await setDoc(userDocRef, {
      uid: cred.user.uid,
      displayName: name,
      email: email,
      createdAt: serverTimestamp()
    }, { merge: true });
    // onAuthStateChanged se encargará de actualizar el estado global del usuario.
  };

  const login = async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged se encargará de actualizar el estado.
  };

  const logout = async () => {
    await signOut(auth);
  };

  const createGroup = async (groupName) => {
    if (!user) throw new Error('Usuario no autenticado. No se puede crear el grupo.');
    if (!groupName || groupName.trim() === '') throw new Error('El nombre del grupo no puede estar vacío.');

    if (groups.length >= 5) { // Límite de grupos
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

    if (groups.length >= 5) { // Límite de grupos
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
        
        // Asegurarse de que user.name para requestingUserName esté bien definido
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
