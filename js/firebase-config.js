// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAhCSuSWNX3cgBf8RCzpXr8zvf6IGrJIho",
  authDomain: "directory-engine-7a41f.firebaseapp.com",
  projectId: "directory-engine-7a41f",
  storageBucket: "directory-engine-7a41f.firebasestorage.app",
  messagingSenderId: "411515509449",
  appId: "1:411515509449:web:d148091695d5830b760b18"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();
const functions = firebase.functions();