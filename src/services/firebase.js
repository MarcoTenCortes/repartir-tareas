// src/services/firebase.js
import { initializeApp } from 'firebase/app';
// IMPORTA initializeAuth y getReactNativePersistence en lugar de getAuth
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDzeWxQM25lYm2r6DZdLa1PjLaazs8Vcmg",
  authDomain: "pruebacompartirpiso.firebaseapp.com",
  projectId: "pruebacompartirpiso",
  storageBucket: "pruebacompartirpiso.firebasestorage.app",
  messagingSenderId: "97080498538",
  appId: "1:97080498538:web:2319072c26fdb6d9ac6d13",
  measurementId: "G-XMD8ZXEBP4"
};


const app = initializeApp(firebaseConfig);

// Aquí inicializas Auth con persistencia en AsyncStorage:
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Firestore sigue igual:
export const db = getFirestore(app);