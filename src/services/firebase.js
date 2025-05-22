// src/services/firebase.js
import { initializeApp } from 'firebase/app';
import { Platform } from 'react-native'; // Necesario para detectar la plataforma
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';
import {
  initializeAuth,
  getReactNativePersistence,    // Para React Native (iOS, Android)
  browserLocalPersistence,    // Para Web (persistencia local similar a AsyncStorage)
  // browserSessionPersistence // Alternativa para Web (persistencia solo en la sesión actual)
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDzeWxQM25lYm2r6DZdLa1PjLaazs8Vcmg",
  authDomain: "pruebacompartirpiso.firebaseapp.com",
  projectId: "pruebacompartirpiso",
  storageBucket: "pruebacompartirpiso.firebasestorage.app",
  messagingSenderId: "97080498538",
  appId: "1:97080498538:web:82f172f6cc955f96ac6d13",
  measurementId: "G-VDX8P7HBF9"
};


const app = initializeApp(firebaseConfig);

let authInstance;

if (Platform.OS === 'web') {
  // Configuración para el entorno web
  authInstance = initializeAuth(app, {
    persistence: browserLocalPersistence // Utiliza la persistencia local del navegador
    // También podrías usar browserSessionPersistence si prefieres que la sesión
    // se cierre al cerrar la pestaña/navegador.
  });
} else {
  // Configuración para entornos nativos (iOS, Android)
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
}

export const auth = authInstance;
export const db = getFirestore(app);