import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth, GoogleAuthProvider } from "firebase/auth";

// Initialize Firebase app
let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let googleProvider: GoogleAuthProvider | undefined;

function validateFirebaseConfig(config: any) {
  if (!config.apiKey?.startsWith('AIza')) {
    throw new Error('Invalid API key format. API key should start with "AIza"');
  }

  if (!config.projectId?.trim()) {
    throw new Error('Project ID is required');
  }

  if (!config.appId?.startsWith('1:')) {
    throw new Error('Invalid App ID format. App ID should start with "1:"');
  }

  return true;
}

try {
  console.log('Starting Firebase initialization');

  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY?.trim(),
    authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim()}.firebaseapp.com`,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim(),
    storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim()}.appspot.com`,
    appId: import.meta.env.VITE_FIREBASE_APP_ID?.trim(),
  };

  // Log config presence (not values) for debugging
  console.log('Firebase configuration check:', {
    apiKey: {
      exists: !!firebaseConfig.apiKey,
      length: firebaseConfig.apiKey?.length,
      startsWithAIza: firebaseConfig.apiKey?.startsWith('AIza'),
    },
    projectId: {
      exists: !!firebaseConfig.projectId,
      length: firebaseConfig.projectId?.length,
    },
    appId: {
      exists: !!firebaseConfig.appId,
      length: firebaseConfig.appId?.length,
      startsWithOne: firebaseConfig.appId?.startsWith('1:'),
    },
    authDomain: firebaseConfig.authDomain,
  });

  // Validate config before initializing
  validateFirebaseConfig(firebaseConfig);

  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();

  console.log('Firebase initialized successfully');

} catch (error) {
  console.error('Firebase initialization error:', error);
  console.log('Environment variables presence check:', {
    apiKey: !!import.meta.env.VITE_FIREBASE_API_KEY,
    projectId: !!import.meta.env.VITE_FIREBASE_PROJECT_ID,
    appId: !!import.meta.env.VITE_FIREBASE_APP_ID
  });
}

// Export with fallbacks
export const firebaseApp = app;
export const firebaseAuth = auth;
export const firebaseGoogleProvider = googleProvider;