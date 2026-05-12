// firebase.js — Single source of truth for Firebase setup
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore }   from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBHSoPxEkZL9KmmlSZCc8LKU_78gyXSOyE",
  authDomain: "appointment-ai-e0969.firebaseapp.com",
  projectId: "appointment-ai-e0969",
  storageBucket: "appointment-ai-e0969.firebasestorage.app",
  messagingSenderId: "1066741718362",
  appId: "1:1066741718362:web:7ef804df76b46de96e6763"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);