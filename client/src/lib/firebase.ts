import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth, GoogleAuthProvider } from "firebase/auth";

// WARNING: DEVELOPMENT ONLY
// These values should be moved to environment variables before deployment
const firebaseConfig = {
  apiKey: "AIzaSyBkkFF0XhNZeWuDmOfEhsgdfX1VBG7WTas",
  authDomain: "replit-auth-test.firebaseapp.com", // Firebase project domain
  projectId: "replit-auth-test",
  storageBucket: "replit-auth-test.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:1234567890abcdef"
};

// Initialize Firebase app
let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let googleProvider: GoogleAuthProvider | undefined;

try {
  console.log('Starting Firebase initialization');
  console.log('Firebase config:', {
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId,
  });

  // Log current domain for debugging
  console.log('Current domain:', window.location.hostname);
  console.log('Full URL:', window.location.href);
  console.log('Origin:', window.location.origin);

  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();

  // Add additional scopes for Google provider
  googleProvider.addScope('email');
  googleProvider.addScope('profile');

  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Firebase initialization error:', error);
}

// Export with fallbacks
export const firebaseApp = app;
export const firebaseAuth = auth;
export const firebaseGoogleProvider = googleProvider;