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

  // Log the actual configuration being used (without exposing full API key)
  console.log('Firebase Configuration Check:', {
    environment: import.meta.env.MODE,
    isProduction: import.meta.env.PROD,
    configPresent: {
      apiKey: apiKey ? `...${apiKey.slice(-6)}` : 'missing',
      projectId: projectId || 'missing',
      appId: appId ? `...${appId.slice(-6)}` : 'missing',
    },
    domain: window.location.hostname,
    origin: window.location.origin
  });

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
  console.log('Starting Firebase initialization...');

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

  // Add additional scopes for Google provider
  googleProvider.addScope('email');
  googleProvider.addScope('profile');

  // Log successful initialization with domain info
  console.log('Firebase initialized successfully:', {
    domain: window.location.hostname,
    isAuth: !!auth,
    isProvider: !!googleProvider,
    authDomain: config.authDomain
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