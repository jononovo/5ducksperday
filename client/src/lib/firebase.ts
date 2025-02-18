import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Add console logs for debugging
console.log("Firebase config:", {
  ...firebaseConfig,
  apiKey: firebaseConfig.apiKey ? "[PRESENT]" : "[MISSING]",
});

// Validate required environment variables
if (!firebaseConfig.apiKey) {
  console.error("Missing VITE_FIREBASE_API_KEY environment variable");
}
if (!firebaseConfig.projectId) {
  console.error("Missing VITE_FIREBASE_PROJECT_ID environment variable");
}
if (!firebaseConfig.appId) {
  console.error("Missing VITE_FIREBASE_APP_ID environment variable");
}

let app = null;
let auth = null;
let googleProvider = null;

// Only initialize Firebase if we have all required config
if (firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
  } catch (error) {
    console.error("Firebase initialization error:", error);
  }
} else {
  console.error("Firebase initialization skipped due to missing configuration");
}

export { app, auth, googleProvider };