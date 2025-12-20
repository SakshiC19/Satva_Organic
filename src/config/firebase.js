// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyCzLwsR4AXu9CVlee2w6FSRkvkcplCZ_XQ",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "satva-organics.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "satva-organics",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "satva-organics.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "1079181867546",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:1079181867546:web:ab2b5d42773845b96f2fa3",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-7SRCR0M3MK"
};

// Check if config is valid
if (!firebaseConfig.apiKey) {
  console.error('Firebase config is missing! Make sure .env file is present and server is restarted.');
} else {
  console.log('Firebase config loaded successfully');
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Initialize Analytics safely
export const analytics = isSupported().then(yes => yes ? getAnalytics(app) : null);

export default app;
