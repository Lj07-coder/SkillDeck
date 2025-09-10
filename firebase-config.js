// Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-storage.js";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBYs9MYT6es7cjKtjl6BQ5sK5DHtW3U9HE",
  authDomain: "stuhub-e3ff3.firebaseapp.com",
  projectId: "stuhub-e3ff3",
  storageBucket: "stuhub-e3ff3.appspot.com",
  messagingSenderId: "540260417852",
  appId: "1:540260417852:web:3a5f1963d128e81212de39"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
