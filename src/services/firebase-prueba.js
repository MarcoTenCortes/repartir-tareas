//Renombrar a firebase.js

// src/services/firebase.js
import { initializeApp } from 'firebase/app';
// IMPORTA initializeAuth y getReactNativePersistence en lugar de getAuth
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_AUTH_DOMAIN",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_STORAGE_BUCKET",
  messagingSenderId: "TU_MESSAGING_SENDER_ID",
  appId: "TU_APP_ID",
  measurementId: "TU_MEASUREMENT_ID"
};

const app = initializeApp(firebaseConfig);

// Aquí inicializas Auth con persistencia en AsyncStorage:
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Firestore sigue igual:
export const db = getFirestore(app);