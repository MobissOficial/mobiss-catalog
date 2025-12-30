// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCO0b0gH6N5UmPst8QBgpArVrN2xBD0fRg",
  authDomain: "mobiss-catalog.firebaseapp.com",
  projectId: "mobiss-catalog",
  storageBucket: "mobiss-catalog.firebasestorage.app",
  messagingSenderId: "1077062591794",
  appId: "1:1077062591794:web:25732da63f2d07c4d1232b"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
