import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth, GoogleAuthProvider } from "firebase/auth";

// Validate Firebase configuration
function validateFirebaseConfig() {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  const appId = import.meta.env.VITE_FIREBASE_APP_ID;

  console.log('Raw environment variables:', {
    apiKey: apiKey ? '....' + apiKey.slice(-6) : 'undefined',
    projectId: projectId || 'undefined',
    appId: appId ? '....' + appId.slice(-6) : 'undefined',
    mode: import.meta.env.MODE,
    dev: import.meta.env.DEV,
    prod: import.meta.env.PROD,
    domain: window.location.hostname
  });

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

  const config = {
    apiKey,
    authDomain: `${projectId}.firebaseapp.com`,
    projectId,
    storageBucket: `${projectId}.appspot.com`,
    messagingSenderId: projectId?.split('-')[1] || '',
    appId
  };

  console.log('Firebase Configuration:', {
    hasApiKey: !!config.apiKey,
    hasProjectId: !!config.projectId,
    hasAppId: !!config.appId,
    authDomain: config.authDomain,
    environment: import.meta.env.MODE,
    domain: window.location.hostname,
  });

  return {
    isValid: errors.length === 0,
    errors,
    config
  };
}

// Initialize Firebase app
let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let googleProvider: GoogleAuthProvider | undefined;

try {
  console.log('Starting Firebase initialization...', {
    timestamp: new Date().toISOString(),
    domain: window.location.hostname
  });

  const { isValid, errors, config } = validateFirebaseConfig();

  if (!isValid) {
    console.error('Firebase configuration validation failed:', {
      errors,
      environment: import.meta.env.MODE,
      domain: window.location.hostname
    });
    throw new Error(`Firebase configuration validation failed:\n${errors.join('\n')}`);
  }

  app = initializeApp(config);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();

  // Add required scopes for Gmail API
  googleProvider.addScope('https://www.googleapis.com/auth/gmail.send');
  googleProvider.addScope('https://www.googleapis.com/auth/gmail.compose');

  // Add basic profile scopes
  googleProvider.addScope('email');
  googleProvider.addScope('profile');

  // Log successful initialization with domain info
  console.log('Firebase initialized successfully:', {
    domain: window.location.hostname,
    isAuth: !!auth,
    isProvider: !!googleProvider,
    authDomain: config.authDomain,
    timestamp: new Date().toISOString()
  });

} catch (error) {
  console.error('Firebase initialization error:', {
    error,
    domain: window.location.hostname,
    environment: import.meta.env.MODE,
    timestamp: new Date().toISOString()
  });

  if (error instanceof Error) {
    console.error('Detailed error information:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      domain: window.location.hostname
    });
  }
}

// Export with fallbacks
export const firebaseApp = app;
export const firebaseAuth = auth;
export const firebaseGoogleProvider = googleProvider;