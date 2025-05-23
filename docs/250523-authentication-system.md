# 5Ducks Authentication System

This document provides a comprehensive overview of the authentication system implemented in the 5Ducks application, including the "try before sign up" experience, modal-based authentication, and the dual approach with local and Firebase authentication.

## Table of Contents

1. [Authentication Architecture](#authentication-architecture)
2. [Try Before Sign Up Experience](#try-before-sign-up-experience)
3. [Authentication Approaches](#authentication-approaches)
4. [Route Protection Mechanisms](#route-protection-mechanisms)
5. [User Experience Flows](#user-experience-flows)
6. [Modal-Based Authentication](#modal-based-authentication)
7. [Backend Authentication](#backend-authentication)

## Authentication Architecture

The 5Ducks authentication system is built on several key components:

1. **Dual Authentication System**: Combines local authentication (email/password) and Firebase authentication (for social logins)
2. **Modal-Based Authentication**: Uses overlay modals instead of page redirects for authentication prompts
3. **Progressive Disclosure**: Shows authentication prompts only when necessary
4. **Dual Route Protection**: Implements both fully-protected and semi-protected routes
5. **Persistent Auth State**: Maintains consistent authentication state across the application using React Query

### Authentication Flow

1. Users can browse certain parts of the application without authentication
2. When accessing restricted features, users are presented with an overlay authentication modal
3. After successful authentication, users continue their journey from the same page
4. Authentication state is maintained consistently across the application

## Try Before Sign Up Experience

The application implements a "try before sign up" experience that allows users to explore core functionality before requiring authentication. This is achieved through:

### SemiProtectedRoute Component

The `SemiProtectedRoute` component allows initial access to routes but can conditionally prompt for login when users attempt to use features that require authentication or after a configurable delay.

```tsx
// Location: client/src/lib/semi-protected-route.tsx

export function SemiProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading } = useAuth();
  const { openModal } = useRegistrationModal();
  const [shouldShowModal, setShouldShowModal] = useState(false);
  
  // Set a timer to show the registration modal after a delay
  useEffect(() => {
    if (!user && !isLoading) {
      const timer = setTimeout(() => {
        setShouldShowModal(true);
      }, 5000); // 5-second delay
      
      return () => clearTimeout(timer);
    }
  }, [user, isLoading]);
  
  // Show registration modal when timer completes
  useEffect(() => {
    if (shouldShowModal) {
      openModal("saveSearch"); // Context-specific message
    }
  }, [shouldShowModal]);
  
  return <Route path={path} component={Component} />;
}

// Usage example from client/src/App.tsx
<SemiProtectedRoute path="/app" component={() => <Home />} />
<SemiProtectedRoute path="/companies/:id" component={() => <CompanyDetails />} />
```

### Registration Modal Context

A context provider that manages when and how to show the authentication modal:

```tsx
// Location: client/src/hooks/use-registration-modal.tsx
export function useRegistrationModal() {
  const context = useContext(RegistrationModalContext);
  
  if (!context) {
    throw new Error("useRegistrationModal must be used within a RegistrationModalProvider");
  }
  
  return context;
}

// Usage in component that requires authentication
const { openModal } = useRegistrationModal();

function handleRestrictedAction() {
  if (!user) {
    openModal("restrictedAction");
    return;
  }
  
  // Proceed with authenticated action
  performAction();
}
```

## Authentication Approaches

The application implements a dual authentication approach:

### Local Authentication

Email and password authentication handled by the application's own backend:

```typescript
// Location: client/src/lib/local-auth.ts
export async function loginWithEmailPassword(email: string, password: string) {
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }
    
    const userData = await response.json();
    
    // Update React Query cache to maintain auth state
    queryClient.setQueryData(['user'], userData);
    
    return userData;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}
```

### Firebase Authentication

Used primarily for social login options (Gmail, Outlook):

```typescript
// Location: client/src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithRedirect } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Social login handlers
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  return signInWithRedirect(auth, provider);
}
```

## Route Protection Mechanisms

The application implements two types of route protection components:

### ProtectedRoute Component

Fully protected routes that show an authentication modal if not authenticated:

```tsx
// Location: client/src/lib/protected-route.tsx
export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading } = useAuth();
  const { openModal } = useRegistrationModal();

  useEffect(() => {
    if (!isLoading && !user) {
      openModal("protectedRoute");
    }
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}
```

### SemiProtectedRoute Component

Routes that allow initial access but can prompt for login with a modal:

```tsx
// Location: client/src/lib/semi-protected-route.tsx
// Expanded implementation details above in the "Try Before Sign Up Experience" section
```

## User Experience Flows

### Landing Page Flow

1. User visits the landing page (`/`)
2. User can click "Try It Now" to access the search page (`/app`) without logging in
3. User can click "Login" button to be directed to the outreach page (`/outreach`) which immediately shows the authentication modal

### Search Page Flow (Semi-Protected)

1. User accesses the search page (`/app`) without authentication
2. Search functionality works immediately
3. After 5 seconds, a registration modal appears with "Save Your Search Results" message
4. User can dismiss the modal and continue searching
5. Certain actions (like accessing contact details) will prompt for authentication again

### Protected Page Flow

1. User attempts to access a fully protected page (e.g., `/outreach`, `/campaigns`)
2. Authentication modal immediately appears with "Sign In Required" message
3. After successful authentication, user continues on the same page
4. If authentication is canceled, user remains on the page but with limited functionality

### Company/Contact Details Flow

1. User can view company information without authentication
2. When attempting to access contact details, authentication modal appears
3. After authentication, contact information is immediately displayed

## Modal-Based Authentication

The authentication modal is a key component that replaces the traditional redirect to `/auth` page:

### RegistrationModal Component

```tsx
// Location: client/src/components/registration-modal.tsx
export function RegistrationModal() {
  const { isOpen, closeModal, context } = useRegistrationModal();
  const [currentView, setCurrentView] = useState<'main' | 'emailRegistration' | 'login'>('main');

  // Dynamic modal title based on context
  const getModalTitle = () => {
    switch (context) {
      case 'protectedRoute':
        return 'Sign In Required';
      case 'saveSearch':
        return 'Save Your Search Results';
      case 'contactDetails':
        return 'View Contact Details';
      default:
        return 'Sign In to Continue';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={closeModal}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{getModalTitle()}</DialogTitle>
          <DialogDescription>
            {context === 'saveSearch' 
              ? 'Create an account to save your searches and access more features.'
              : 'Sign in to access this feature.'}
          </DialogDescription>
        </DialogHeader>
        
        {currentView === 'main' && (
          <div className="flex flex-col gap-4">
            <Button variant="outline" disabled>
              <Mail className="mr-2 h-4 w-4" />
              Gmail
              <Badge variant="outline" className="ml-2">Coming Soon</Badge>
            </Button>
            
            <Button variant="outline" disabled>
              <Mail className="mr-2 h-4 w-4" />
              Outlook
              <Badge variant="outline" className="ml-2">Coming Soon</Badge>
            </Button>
            
            <Button onClick={() => setCurrentView('emailRegistration')}>
              <Mail className="mr-2 h-4 w-4" />
              Other Email
            </Button>
            
            <div className="text-center">
              Already have an account?{" "}
              <Button variant="link" onClick={() => setCurrentView('login')}>
                Login
              </Button>
            </div>
          </div>
        )}
        
        {currentView === 'emailRegistration' && (
          <EmailRegistrationForm 
            onBack={() => setCurrentView('main')}
            onSuccess={closeModal}
          />
        )}
        
        {currentView === 'login' && (
          <LoginForm 
            onBack={() => setCurrentView('main')}
            onSuccess={closeModal}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
```

### Registration Modal Design

- Uses a semi-transparent black background with blur effect
- Presents different messaging based on the context
- Provides back navigation between registration steps
- Auto-focuses the first input field for a streamlined experience

## Backend Authentication

The server implements various authentication middleware and utility functions.

### Local Authentication Endpoints

```typescript
// Location: server/routes.ts
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    // Check if user already exists
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }
    
    // Create user in database
    const newUser = await storage.createUser({ email, password, name });
    
    // Set user in session
    req.session.userId = newUser.id;
    
    return res.json(newUser);
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate credentials
    const user = await storage.getUserByEmail(email);
    if (!user || !verifyPassword(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Set user in session
    req.session.userId = user.id;
    
    // Return user data (excluding password)
    const { password: _, ...userData } = user;
    return res.json(userData);
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Login failed' });
  }
});
```

### Firebase Token Verification

```typescript
// Location: server/auth.ts
async function verifyFirebaseToken(req: Request): Promise<User | null> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') 
    ? authHeader.split('Bearer ')[1] 
    : null;
  
  if (!token) {
    console.log('Token verification failed:', { 
      reason: 'no token found',
      timestamp: new Date().toISOString()
    });
    return null;
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    const firebaseUserId = decodedToken.uid;
    
    // Get user from our database
    const user = await storage.getUserByFirebaseId(firebaseUserId);
    
    // If user doesn't exist in our DB but exists in Firebase,
    // create a new user in our database
    if (!user && decodedToken.email) {
      const newUser = await storage.createUser({
        email: decodedToken.email,
        name: decodedToken.name || decodedToken.email.split('@')[0],
        firebaseId: firebaseUserId,
      });
      
      return newUser;
    }
    
    return user;
  } catch (error) {
    console.error('Firebase token verification error:', error);
    return null;
  }
}
```

### Protected API Middleware

```typescript
// Location: server/middleware.ts
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Check if user is authenticated via session
  if (req.session.userId) {
    return next();
  }
  
  // Check if user is authenticated via Firebase token
  verifyFirebaseToken(req).then(user => {
    if (user) {
      req.user = user;
      return next();
    }
    
    // Not authenticated
    return res.status(401).json({ error: 'Not authenticated' });
  }).catch(error => {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication error' });
  });
}
```

### Semi-Protected API Middleware

```typescript
// Location: server/middleware.ts
export function semiProtectResource(req: Request, res: Response, next: NextFunction) {
  // Always allow the request to proceed
  next();
  
  // Log analytics about unauthenticated access
  if (!req.session.userId && !req.headers.authorization) {
    console.log('Semi-protected resource accessed without auth:', {
      path: req.path,
      timestamp: new Date().toISOString()
    });
  }
}
```

This authentication system provides a flexible approach that balances security with a smooth user experience, allowing visitors to try the core functionality while protecting sensitive features and data.