import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
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
export const auth = getAuth(app);
export const db = getFirestore(app);
