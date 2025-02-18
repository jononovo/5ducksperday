import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Debug environment variables (values will be masked)
console.log("Firebase environment variables status:", {
  VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY ? "✓ present" : "✗ missing",
  VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID ? "✓ present" : "✗ missing",
  VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID ? "✓ present" : "✗ missing"
});

let app = null;
let auth = null;
let googleProvider = null;

try {
  if (!firebaseConfig.apiKey) {
    throw new Error("Missing VITE_FIREBASE_API_KEY environment variable");
  }
  if (!firebaseConfig.projectId) {
    throw new Error("Missing VITE_FIREBASE_PROJECT_ID environment variable");
  }
  if (!firebaseConfig.appId) {
    throw new Error("Missing VITE_FIREBASE_APP_ID environment variable");
  }

  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Firebase initialization error:", error);
  // Continue with local auth even if Firebase fails
}

export { app, auth, googleProvider };