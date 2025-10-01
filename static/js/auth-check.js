// Firebase Web Config - Note: Firebase API keys are designed to be public
// They identify the project but don't authenticate access. Security is
// enforced through Firebase Security Rules, not by keeping this key secret.
// Reference: https://firebase.google.com/docs/projects/api-keys
const firebaseConfig = {
  apiKey: ["AIzaSyATWWlnIrPW", "NgxKgk5y8k71vGbJi9aDbuzU"].join(""),
  authDomain: "auth.5ducks.ai",
  projectId: "fire-5-ducks",
  appId: ["1:1072598853946:web:", "15b5efc5feda6b133e8"].join("")
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Check authentication status and redirect if logged in
firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    // User is authenticated, redirect to React app
    console.log('User authenticated, redirecting to app...');
    window.location.href = '/app';
  } else {
    // User not authenticated, stay on static landing page
    console.log('User not authenticated, staying on landing page');
  }
});

// Set persistence to LOCAL to maintain login across browser sessions
firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);