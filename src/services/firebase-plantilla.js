// src/services/firebase.js

// Importaciones necesarias
import { initializeApp } from 'firebase/app';
import { Platform } from 'react-native'; // Para detectar la plataforma (web, iOS, Android)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';
import {
  initializeAuth,
  getReactNativePersistence,
  browserLocalPersistence,
  // browserSessionPersistence // Alternativa para sesión en navegador
} from 'firebase/auth';

// ⚠️ IMPORTANTE:
// NO expongas tus credenciales directamente en el código fuente.
// Utiliza variables de entorno (.env) y bibliotecas como `react-native-dotenv` o `dotenv` según el entorno.

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,                 // 🔐 Tu clave API
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,         // 🔐 Dominio de autenticación
  projectId: process.env.FIREBASE_PROJECT_ID,           // 🔐 ID del proyecto
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,   // 🔐 Bucket de almacenamiento
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID, // 🔐 ID del remitente de mensajes
  appId: process.env.FIREBASE_APP_ID,                   // 🔐 ID de la aplicación
  measurementId: process.env.FIREBASE_MEASUREMENT_ID    // (Opcional) 🔐 ID de medición
};

// Inicializa la app de Firebase
const app = initializeApp(firebaseConfig);

let authInstance;

// Configuración de autenticación dependiendo de la plataforma
if (Platform.OS === 'web') {
  authInstance = initializeAuth(app, {
    persistence: browserLocalPersistence
  });
} else {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
}

// Exporta los servicios de autenticación y base de datos
export const auth = authInstance;
export const db = getFirestore(app);
