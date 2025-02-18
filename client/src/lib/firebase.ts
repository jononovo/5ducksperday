import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_PROJECT_ID?.split('-')[1] || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID
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
    hasApiKey: !!firebaseConfig.apiKey,
    hasAppId: !!firebaseConfig.appId
  });

  // Log current domain for debugging
  console.log('Current domain:', window.location.hostname);
  console.log('Full URL:', window.location.href);
  console.log('Origin:', window.location.origin);

  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) {
    console.error('Firebase configuration is incomplete:', {
      hasApiKey: !!firebaseConfig.apiKey,
      hasProjectId: !!firebaseConfig.projectId,
      hasAppId: !!firebaseConfig.appId,
      isDevelopment: process.env.NODE_ENV === 'development'
    });
    throw new Error('Firebase configuration is incomplete');
  }

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