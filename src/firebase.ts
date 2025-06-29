

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBVHspi1uA3wK_85ZIESkZKOASa3-urERk",
  authDomain: "synapticinfo-chatbot.firebaseapp.com",
  projectId: "synapticinfo-chatbot",
  storageBucket: "synapticinfo-chatbot.firebasestorage.app",
  messagingSenderId: "663522529142",
  appId: "1:663522529142:web:d9fbe56b971cbf6f8bb457"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the services you need in other components
export const auth = getAuth(app);
export const db = getFirestore(app);
