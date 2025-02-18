import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth, GoogleAuthProvider } from "firebase/auth";

// Validate Firebase configuration
function validateFirebaseConfig() {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  const appId = import.meta.env.VITE_FIREBASE_APP_ID;

  const errors = [];

  if (!apiKey) {
    errors.push('VITE_FIREBASE_API_KEY is missing');
  } else if (!apiKey.startsWith('AIza')) {
    errors.push('VITE_FIREBASE_API_KEY appears to be malformed (should start with "AIza")');
  }

  if (!projectId) {
    errors.push('VITE_FIREBASE_PROJECT_ID is missing');
  }

  if (!appId) {
    errors.push('VITE_FIREBASE_APP_ID is missing');
  } else if (!appId.includes(':')) {
    errors.push('VITE_FIREBASE_APP_ID appears to be malformed (should contain ":")');
  }

  return {
    isValid: errors.length === 0,
    errors,
    config: {
      apiKey,
      authDomain: `${projectId}.firebaseapp.com`,
      projectId,
      storageBucket: `${projectId}.appspot.com`,
      messagingSenderId: projectId?.split('-')[1] || '',
      appId
    }
  };
}

// Initialize Firebase app
let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let googleProvider: GoogleAuthProvider | undefined;

try {
  console.log('Starting Firebase initialization');

  const { isValid, errors, config } = validateFirebaseConfig();

  console.log('Environment validation:', {
    isValid,
    errors,
    domain: window.location.hostname,
    fullUrl: window.location.href,
    origin: window.location.origin,
    configPresent: {
      hasApiKey: !!config.apiKey,
      hasProjectId: !!config.projectId,
      hasAppId: !!config.appId,
      apiKeyLastChars: config.apiKey ? `...${config.apiKey.slice(-4)}` : 'undefined'
    }
  });

  if (!isValid) {
    throw new Error(`Firebase configuration validation failed:\n${errors.join('\n')}`);
  }

  app = initializeApp(config);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();

  // Add additional scopes for Google provider
  googleProvider.addScope('email');
  googleProvider.addScope('profile');

  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Firebase initialization error:', error);
  // Log more details about the error
  if (error instanceof Error) {
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
  }
}

// Export with fallbacks
export const firebaseApp = app;
export const firebaseAuth = auth;
export const firebaseGoogleProvider = googleProvider;