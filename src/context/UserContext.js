// src/context/UserContext.js
import React, { createContext, useState, useEffect } from 'react';
import { auth, db } from '../services/firebase'; // Asegúrate que firebase.js esté configurado para web y nativo
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
  setDoc, // Para crear documentos con ID específico o sobrescribir
  getDoc, // Para leer dentro de la transacción
  onSnapshot,
  query,
  where,
  updateDoc,
  arrayUnion,
  getDocs,
  runTransaction, // Importar runTransaction
  serverTimestamp // Para createdAt y otras marcas de tiempo
} from 'firebase/firestore';

export const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [groups, setGroups] = useState([]);

  // Sincronizar estado de autenticación y obtener grupos del usuario
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser({ uid: u.uid, name: u.displayName, email: u.email });
        const groupsQuery = query(
          collection(db, 'groups'),
          where('members', 'array-contains', u.uid)
        );
        // Listener para los grupos del usuario
        const unsubGroups = onSnapshot(groupsQuery, snap => {
          const myGroups = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setGroups(myGroups);
        }, error => {
            console.error("Error escuchando grupos:", error);
            setGroups([]); // Limpiar grupos en caso de error
        });
        return () => unsubGroups(); // Limpiar listener de grupos al desmontar o cambiar usuario
      } else {
        setUser(null);
        setGroups([]);
      }
    });
    return () => unsubscribeAuth(); // Limpiar listener de autenticación
  }, []);

  // Métodos de autenticación
  const register = async (name, email, password) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    // El estado local del usuario se actualizará a través de onAuthStateChanged
  };

  const login = async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged se encargará de actualizar el estado
  };

  const logout = async () => {
    await signOut(auth);
  };

  // Operaciones de Grupo
  const createGroup = async (groupName) => {
    if (!user) throw new Error('Usuario no autenticado. No se puede crear el grupo.');
    if (!groupName || groupName.trim() === '') throw new Error('El nombre del grupo no puede estar vacío.');

    const trimmedGroupName = groupName.trim();
    // Normalizar nombre para clave de unicidad (insensible a mayúsculas/minúsculas)
    const normalizedGroupNameKey = trimmedGroupName.toLowerCase();

    try {
      const newGroupId = await runTransaction(db, async (transaction) => {
        // 1. Referencia al documento en la colección de nombres (para bloqueo)
        const groupNameRef = doc(db, 'groupNames', normalizedGroupNameKey);
        // 2. Leer el documento de bloqueo DENTRO de la transacción
        const groupNameSnap = await transaction.get(groupNameRef);

        // 3. Verificar si el nombre ya existe
        if (groupNameSnap.exists()) {
          throw new Error(`El nombre de grupo "${trimmedGroupName}" ya está en uso. Por favor, elige otro.`);
        }

        // 4. Si no existe, proceder a crear el grupo y el documento de bloqueo
        // Crear el nuevo grupo en la colección 'groups'
        const newGroupRef = doc(collection(db, 'groups')); // Firestore genera un ID único
        transaction.set(newGroupRef, {
          name: trimmedGroupName, // Nombre original
          normalizedName: normalizedGroupNameKey, // Nombre normalizado para búsquedas
          members: [user.uid],    // El creador es el primer miembro
          owner: user.uid,        // El creador es el propietario
          createdAt: serverTimestamp(), // Fecha de creación
          pendingRequestsCount: 0 // Inicializar contador de solicitudes
        });

        // Registrar el nombre en la colección 'groupNames' para asegurar unicidad
        // El ID de este documento es el nombre normalizado del grupo.
        transaction.set(groupNameRef, {
            groupId: newGroupRef.id,      // ID del grupo recién creado
            originalName: trimmedGroupName // Nombre original para referencia
        });

        return newGroupRef.id; // Devolver el ID del nuevo grupo
      });
      return newGroupId; // `newGroupId` es el ID del grupo creado
    } catch (error) {
      console.error("Error al crear grupo (transacción):", error.message);
      // Re-lanzar el error para que sea manejado por la UI (ej. GroupCreateScreen)
      throw error;
    }
  };

  const joinGroup = async (groupIdToJoin, groupNameToJoin) => {
    if (!user) throw new Error('Usuario no autenticado');
    if (!groupIdToJoin) throw new Error('ID de grupo no proporcionado.');

    // La ID de la solicitud será el UID del usuario para evitar duplicados por el mismo usuario
    const requestDocRef = doc(db, 'groups', groupIdToJoin, 'joinRequests', user.uid);

    try {
        const requestSnap = await getDoc(requestDocRef);
        if (requestSnap.exists() && requestSnap.data().status === 'pending') {
            throw new Error('Ya tienes una solicitud pendiente para unirte a este grupo.');
        }
        // Aquí podrías añadir lógica para otros estados (ej. si fue rechazada recientemente)

        await setDoc(requestDocRef, {
            requestingUserId: user.uid,
            requestingUserName: user.name || user.email, // Nombre del solicitante
            status: 'pending',         // Estado inicial de la solicitud
            requestedAt: serverTimestamp(), // Fecha de la solicitud
            groupName: groupNameToJoin // Nombre del grupo al que se solicita unirse
        });
        // Opcional: Incrementar un contador de solicitudes en el documento del grupo (requiere otra transacción o Cloud Function)
        // const groupDocRef = doc(db, 'groups', groupIdToJoin);
        // await updateDoc(groupDocRef, { pendingRequestsCount: increment(1) }); // Necesitarías importar 'increment'
    } catch (error) {
        console.error("Error creando solicitud de unión:", error.message);
        throw error;
    }
  };

  const getGroupByName = async (name) => {
    if (!name || name.trim() === '') return [];
    const normalizedQueryName = name.trim().toLowerCase();
    // Buscar por nombre normalizado para insensibilidad a mayúsculas/minúsculas
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
      getGroupByName
    }}>
      {children}
    </UserContext.Provider>
  );
}
