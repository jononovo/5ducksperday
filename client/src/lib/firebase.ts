import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth, GoogleAuthProvider } from "firebase/auth";

// WARNING: DEVELOPMENT ONLY
// These values should be moved to environment variables before deployment
const firebaseConfig = {
  apiKey: "AIzaSyBkkFF0XhNZeWuDmOfEhsgdfX1VBG7WTas",
  authDomain: "replit-auth-test.firebaseapp.com",
  projectId: "replit-auth-test",
  storageBucket: "replit-auth-test.appspot.com",
  appId: "1:1234567890:web:1234567890abcdef"
};

// Initialize Firebase app
let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let googleProvider: GoogleAuthProvider | undefined;

try {
  console.log('Starting Firebase initialization');

  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();

  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Firebase initialization error:', error);
}

// Export with fallbacks
export const firebaseApp = app;
export const firebaseAuth = auth;
export const firebaseGoogleProvider = googleProvider;