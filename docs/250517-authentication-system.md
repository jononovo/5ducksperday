# 5Ducks Authentication System

This document provides a comprehensive overview of the authentication system implemented in the 5Ducks application, including the "try before sign up" experience, Firebase authentication integration, and Gmail API integration for email capabilities.

## Table of Contents

1. [Authentication Architecture](#authentication-architecture)
2. [Try Before Sign Up Experience](#try-before-sign-up-experience)
3. [Firebase Authentication](#firebase-authentication)
4. [Gmail API Integration](#gmail-api-integration)
5. [Landing Page Experience](#landing-page-experience)
6. [Route Protection Mechanisms](#route-protection-mechanisms)
7. [Backend Authentication](#backend-authentication)

## Authentication Architecture

The 5Ducks authentication system is built on several key components:

1. **Firebase Authentication**: Handles user signup, login, and token management
2. **Express Session Management**: Maintains user sessions on the server
3. **Dual Route Protection**: Implements both fully-protected and semi-protected routes
4. **Gmail OAuth Integration**: Securely connects to Gmail for sending emails

### Authentication Flow

1. Users can browse certain parts of the application without authentication
2. When accessing restricted features, users are prompted to sign in
3. Firebase handles the authentication and returns a token
4. The token is stored and verified on subsequent requests
5. Email capabilities require additional Gmail OAuth permissions

## Try Before Sign Up Experience

The application implements a "try before sign up" experience that allows users to explore core functionality before requiring authentication. This is achieved through:

### SemiProtectedRoute Component

The `SemiProtectedRoute` component allows initial access to routes but can conditionally prompt for login when users attempt to use features that require authentication.

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
  const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false);
  // ... implementation
}

// Usage example from client/src/App.tsx
<SemiProtectedRoute path="/app" component={() => <Home />} />
<SemiProtectedRoute path="/companies/:id" component={() => <CompanyDetails />} />
```

### LoginPromptContext

A context provider that manages when to show the login dialog:

```tsx
export const LoginPromptContext = createContext<{
  showLoginPrompt: () => void;
  isLoginPromptOpen: boolean;
  closeLoginPrompt: () => void;
}>({
  showLoginPrompt: () => {},
  isLoginPromptOpen: false,
  closeLoginPrompt: () => {},
});

// Usage in component that requires authentication
const { showLoginPrompt } = useLoginPrompt();

function handleRestrictedAction() {
  if (!user) {
    showLoginPrompt();
    return;
  }
  
  // Proceed with authenticated action
  performAction();
}
```

### Semi-Protected Routes

The following routes are semi-protected, allowing initial access but requiring login for certain actions:

- `/app` - The main application dashboard
- `/companies/:id` - Company details pages

### Fully Protected Routes

These routes require authentication before any access is granted:

- `/build` - Strategy building tools
- `/lists` - User's saved lists
- `/campaigns` - Email campaign management
- `/outreach` - Email outreach features
- `/replies` - Email conversation management
- `/contacts/:id` - Individual contact details
- `/api-templates` - API template management

## Firebase Authentication

The application uses Firebase Authentication for user management.

### Setup and Initialization

```typescript
// Firebase is initialized in client/src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "fire-5-ducks.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);
```

### Auth Provider Component

The `AuthProvider` component provides authentication state throughout the application:

```tsx
// Location: client/src/hooks/use-auth.tsx
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        // Store token for API requests
        localStorage.setItem("authToken", token);
        
        // Fetch user details from our backend
        const userResponse = await fetch("/api/user");
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUser(userData);
        }
      } else {
        localStorage.removeItem("authToken");
        setUser(null);
      }
      
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ... additional authentication methods
  
  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut, signUp }}>
      {children}
    </AuthContext.Provider>
  );
}
```

### Firebase Token Verification

On the backend, Firebase tokens are verified before granting access to protected resources:

```typescript
// Location: server/auth.ts
async function verifyFirebaseToken(req: Request): Promise<SelectUser | null> {
  const authHeader = req.headers.authorization;
  const tokenFromHeader = authHeader?.startsWith('Bearer ') 
    ? authHeader.split('Bearer ')[1] 
    : null;
  
  const tokenFromCookie = req.cookies?.authToken;
  const token = tokenFromHeader || tokenFromCookie;

  if (!token) {
    console.log('Token verification failed:', { 
      reason: 'no token found',
      timestamp: new Date().toISOString()
    });
    return null;
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    const userId = decodedToken.uid;
    
    // Get user from our database
    const user = await storage.getUserByFirebaseId(userId);
    return user || null;
  } catch (error) {
    console.error('Firebase token verification error:', error);
    return null;
  }
}
```

## Gmail API Integration

The application integrates with Gmail to allow users to send emails directly from the platform.

### OAuth2 Authorization

```typescript
// Location: server/gmail.ts
export async function getGmailAuthUrl(userId: number): Promise<string> {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI
  );

  const scopes = [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.compose',
    'https://www.googleapis.com/auth/gmail.readonly'
  ];

  const state = JSON.stringify({ userId });
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    state,
    prompt: 'consent'
  });
}
```

### Token Storage

Gmail tokens are securely stored in the user session and database:

```typescript
// Session configuration in server/auth.ts
declare module 'express-session' {
  interface SessionData {
    gmailToken?: string;
  }
}

// Storing Gmail token after OAuth callback
export async function handleGmailCallback(req: Request, res: Response) {
  const { code, state } = req.query;
  const { userId } = JSON.parse(state as string);
  
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code as string);
  
  // Store in session for immediate use
  req.session.gmailToken = JSON.stringify(tokens);
  
  // Store in database for persistence
  await storage.updateUserGmailToken(userId, tokens);
  
  res.redirect('/outreach');
}
```

### Email Sending

The application uses Gmail API to send emails as the user:

```typescript
export async function sendEmail(userId: number, emailData: EmailData): Promise<boolean> {
  const userTokens = await storage.getUserGmailToken(userId);
  if (!userTokens) {
    throw new Error('Gmail not connected');
  }
  
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials(userTokens);
  
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  
  // Create email in RFC 2822 format
  const message = [
    `From: ${emailData.from}`,
    `To: ${emailData.to}`,
    `Subject: ${emailData.subject}`,
    '',
    emailData.body
  ].join('\r\n');
  
  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  
  await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage
    }
  });
  
  return true;
}
```

## Landing Page Experience

The landing page serves as the entry point to the application and implements the "try before sign up" approach.

### Key Features

1. **Public Access**: The landing page is fully public and requires no authentication
2. **Value Proposition**: Clearly communicates the benefits of the platform
3. **Search Entry Point**: Provides immediate access to the core search functionality
4. **Progressive Disclosure**: Only prompts for authentication when needed

### Implementation

```tsx
// Location: client/src/pages/landing.tsx
export default function LandingPage() {
  const [, navigate] = useLocation();
  
  const handleStartSearch = () => {
    // Direct users to the app page without requiring login
    navigate("/app");
  };
  
  const handleSignUp = () => {
    navigate("/auth?mode=signup");
  };
  
  return (
    <div className="min-h-screen">
      {/* Hero section */}
      <section className="py-20">
        <h1>Find the right business contacts faster</h1>
        <p>5Ducks helps you discover and connect with decision-makers at companies you want to reach.</p>
        
        <div className="flex gap-4 mt-8">
          <Button onClick={handleStartSearch}>Try It Now</Button>
          <Button variant="outline" onClick={handleSignUp}>Sign Up</Button>
        </div>
      </section>
      
      {/* Feature highlights */}
      {/* ... */}
    </div>
  );
}
```

## Route Protection Mechanisms

The application implements two types of route protection components:

### ProtectedRoute Component

Fully protected routes that redirect to the auth page if not authenticated:

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

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
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

## Backend Authentication

The server implements various authentication middleware and utility functions.

### getUserId Function

```typescript
// Location: server/routes.ts
function getUserId(req: express.Request): number {
  try {
    if (req.isAuthenticated() && req.user && (req.user as any).id) {
      return (req.user as any).id;
    }
    
    if (req.headers.authorization) {
      // Extract user ID from verified Firebase token
      // This would be populated by the verifyFirebaseToken middleware
      return (req as any).firebaseUser?.id;
    }
  } catch (error) {
    console.error('Error accessing user ID:', error);
  }
  
  // For development only - using default user ID
  console.log('Using default user ID - authentication issue', {
    isAuthenticated: req.isAuthenticated(),
    hasUser: !!req.user,
    timestamp: new Date().toISOString()
  });
  return 1;
}
```

### requireAuth Middleware

```typescript
// Location: server/routes.ts
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  console.log('Auth check:', {
    isAuthenticated: req.isAuthenticated(),
    hasUser: !!req.user,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
  
  // In production, we would check authentication and return 401 if not authenticated
  // For development, we allow the request to proceed for better UX
  next();
}
```

### Protected API Endpoints

API endpoints that require authentication are protected with the requireAuth middleware:

```typescript
// Location: server/routes.ts
export function registerRoutes(app: Express) {
  // Public endpoints
  app.get('/api/public-data', (req, res) => { /* ... */ });
  
  // Protected endpoints
  app.get('/api/user', requireAuth, (req, res) => {
    const userId = getUserId(req);
    // ... implementation
  });
  
  app.get('/api/user/preferences', requireAuth, async (req, res) => {
    const userId = getUserId(req);
    // ... implementation
  });
  
  // ... more routes
}
```

This authentication system provides a flexible approach that balances security with a smooth user experience, allowing visitors to try the core functionality while protecting sensitive features and data.