# 5Ducks Authentication System: Technical Implementation

*Document Date: May 24, 2025*

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Authentication Flow](#authentication-flow)
3. [Firebase Integration](#firebase-integration)
4. [User Session Management](#user-session-management)
5. [Guest User Experience](#guest-user-experience)
6. [User Data Segmentation](#user-data-segmentation)
7. [Token Management](#token-management)
8. [Security Considerations](#security-considerations)

## Architecture Overview

The 5Ducks platform implements a hybrid authentication system with multiple layers:

1. **Frontend Authentication**: Firebase Authentication client SDK for token-based auth
2. **Backend Authentication**: Express server with session management and token verification
3. **Token Transmission**: JWT tokens passed via Authorization headers
4. **Storage Layer**: User-specific data segregation in PostgreSQL via Drizzle ORM

## Authentication Flow

### Initial User Flow

1. **Landing Page Access**: 
   - No authentication required
   - User can navigate to core areas like `/app` (search) without authentication

2. **Authentication Triggers**:
   - Time-based triggers (prompting sign-up after 5 minutes of activity)
   - Feature-gated triggers (prompting when attempting to access premium features)
   - Explicit user-initiated login/registration

3. **Firebase Authentication**:
   - Email/password registration and login
   - JWT token generation with Firebase's secure infrastructure
   - Client-side token storage in localStorage with key `authToken`

4. **Token Propagation**:
   - Token added to all API requests via HTTP Authorization header: `Bearer {token}`
   - Custom logic ensures token is included in both direct axios calls and React Query fetch requests

### Code Sample: Token Attachment to Requests

```typescript
// In queryClient.ts - Ensures all React Query requests include auth token
export const getQueryFn: <T>(options: { on401: UnauthorizedBehavior }) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      // Get Firebase token from localStorage if available
      const authToken = localStorage.getItem('authToken');
      
      // Set up headers with auth token if available
      const headers: HeadersInit = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
        headers
      });

      // Error handling logic...
    }
  };
```

## Firebase Integration

### Token Verification Process

1. **Frontend Token Acquisition**:
   - On successful Firebase auth, token is retrieved via `user.getIdToken(true)`
   - Token stored in localStorage and attached to all subsequent requests

2. **Backend Token Verification**:
   - Express middleware attempts to extract token from multiple sources:
     - Authorization header (primary): `req.headers.authorization`
     - Cookies (fallback): `req.cookies.authToken`
     - Custom header (fallback): `req.headers['x-auth-token']`
   
3. **Firebase Admin Verification**:
   - Token verified using Firebase Admin SDK: `admin.auth().verifyIdToken(token)`
   - User lookup or creation in local database based on verified email
   - User object attached to request via `req.login()`

### Code Sample: Server-Side Token Verification

```typescript
async function verifyFirebaseToken(req: Request): Promise<User | null> {
  // Extract token from request
  let token: string | null = null;
  
  // Check Authorization header (primary method)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.split('Bearer ')[1];
  }
  
  // Fallback token sources
  if (!token) {
    token = req.cookies?.authToken || req.headers['x-auth-token'] as string;
  }

  if (!token) return null;
  
  try {
    // Verify token with Firebase Admin
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Get or create user in our database
    let user = await storage.getUserByEmail(decodedToken.email);
    if (!user) {
      user = await storage.createUser({
        email: decodedToken.email,
        username: decodedToken.name || decodedToken.email.split('@')[0],
        password: '',  // Not used for Firebase auth
      });
    }
    
    return user;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}
```

## User Session Management

### Session Lifecycle

1. **Session Creation**:
   - Upon successful Firebase authentication, `req.login()` establishes a server-side session
   - Session configured with 7-day expiration via cookie settings
   - Session ID stored in `connect.sid` cookie

2. **Session Validation**:
   - Each request checks authentication via `req.isAuthenticated()`
   - Authentication middleware `requireAuth` enforces auth for protected routes
   - Firebase token verification middleware runs on all routes to maintain session

3. **Session Termination**:
   - Logout via `req.logout()` destroys the server-side session
   - Logout timestamp stored in session: `req.session.logoutTime = Date.now()`
   - Client clears Firebase token from localStorage

### Code Sample: Session Configuration

```typescript
const sessionSettings: session.SessionOptions = {
  secret: process.env.SESSION_SECRET || 'temporary-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
};

app.use(session(sessionSettings));
app.use(passport.initialize());
app.use(passport.session());
```

## Guest User Experience

### Progressive Authentication

The platform implements a "try before sign up" experience through:

1. **Semi-Protected Routes**:
   - Routes like `/app` (search) allow initial access without authentication
   - After a time delay (5 seconds), authentication modal appears with contextual message
   - Modal is dismissible, allowing continued exploration

2. **Guest Data Access**:
   - Unauthenticated users see demo data (userId = 1)
   - All demo data is read-only for guests
   - Guest activity does not persist between sessions

3. **Authentication Prompts**:
   - Time-based prompts appear after 5 seconds of activity
   - Feature-gated prompts appear when attempting to save results
   - Strategic CTAs throughout the interface encourage sign-up

### Code Sample: Guest User ID Resolution

```typescript
function getUserId(req: express.Request): number {
  try {
    // First check if user is authenticated through session
    if (req.isAuthenticated && req.isAuthenticated() && req.user && (req.user as any).id) {
      return (req.user as any).id;
    }
    
    // Then check for Firebase authentication
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      if ((req as any).firebaseUser && (req as any).firebaseUser.id) {
        return (req as any).firebaseUser.id;
      }
    }
  } catch (error) {
    console.error('Error accessing user ID:', error);
  }
  
  // Check for recent logout to prevent data leakage between users
  const recentlyLoggedOut = (req.session as any)?.logoutTime && 
    (Date.now() - (req.session as any).logoutTime < 60000);
  
  if (recentlyLoggedOut) {
    return -1; // Non-existent user ID
  }
  
  // For unauthenticated users, return demo user ID
  return 1; // Demo user ID
}
```

## User Data Segmentation

### Data Isolation

All data in the system is segmented by userId to ensure proper isolation:

1. **Database Schema Design**:
   - Every table has a `userId` column for ownership
   - Foreign key constraints enforce data integrity
   - Composite indexes on (userId, id) optimize data access patterns

2. **Query Filtering**:
   - All database queries include userId filter by default
   - Storage access layer enforces user context on all CRUD operations
   - Special handling for demo data (userId = 1) for unauthenticated users

3. **List Management**:
   - Lists created by users are associated with their userId
   - When retrieving lists, server filters by the authenticated user's ID
   - Companies within lists maintain user-specific visibility

### Code Sample: User Data Segmentation in API Routes

```typescript
// Lists endpoint with user segmentation
app.get("/api/lists/:listId", requireAuth, async (req, res) => {
  const isAuthenticated = req.isAuthenticated && req.isAuthenticated() && req.user;
  const listId = parseInt(req.params.listId);
  
  let list = null;
  
  // First try to find the list for the authenticated user
  if (isAuthenticated) {
    list = await storage.getList(listId, req.user!.id);
  }
  
  // If not found or not authenticated, check if it's a demo list
  if (!list) {
    list = await storage.getList(listId, 1); // Check demo user (ID 1)
  }
  
  if (!list) {
    res.status(404).json({ message: "List not found" });
    return;
  }
  
  res.json(list);
});
```

## Token Management

### Token Lifecycle

1. **Token Generation**:
   - Firebase generates JWT tokens upon successful authentication
   - Tokens include user claims (email, uid, etc.)
   - Expiration set to Firebase default (1 hour)

2. **Token Storage**:
   - Client stores token in localStorage under key `authToken`
   - Token attached to all HTTP requests via Authorization header
   - Token refreshed automatically by Firebase SDK

3. **Token Refreshing**:
   - Firebase client SDK handles token refresh before expiration
   - On refresh, new token is stored in localStorage
   - Updated token automatically used for subsequent requests

### Code Sample: Client Token Management

```typescript
// Set up auth state change listener
if (auth) {
  onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      try {
        // Get the ID token
        const token = await user.getIdToken(true);
        currentAuthToken = token;
        
        // Store token in localStorage for added persistence
        localStorage.setItem('authToken', token);

        // Set up axios defaults for the auth header
        const axios = (await import('axios')).default;
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      } catch (error) {
        console.error('Error getting auth token:', error);
        currentAuthToken = null;
      }
    } else {
      // Clear token on logout
      currentAuthToken = null;
      localStorage.removeItem('authToken');
      const axios = (await import('axios')).default;
      delete axios.defaults.headers.common['Authorization'];
    }
  });
}
```

## Security Considerations

### Vulnerability Mitigations

1. **Cross-Site Request Forgery (CSRF) Protection**:
   - JWT tokens in Authorization header not vulnerable to CSRF
   - Session cookies set with `httpOnly` and `secure` flags
   - CORS configuration to restrict cross-origin requests

2. **Session Fixation Protection**:
   - Session regenerated on authentication state change
   - Session IDs rotated upon privilege escalation
   - Session destruction on logout with timestamp tracking

3. **Token Security**:
   - Firebase-generated JWTs with proper signature verification
   - Token storage in localStorage isolated by origin
   - Short token expiration with automatic refresh

4. **Data Leakage Prevention**:
   - All API routes enforce user context through getUserId
   - Recently logged out sessions prevented from accessing data
   - Detailed logging for authentication events for audit trail

### Code Sample: Logout Implementation with Security Features

```typescript
app.post("/api/logout", (req, res, next) => {
  // Store the logout time in the session before logout
  // This will help us prevent showing previous user data to a new user
  if (req.session) {
    (req.session as any).logoutTime = Date.now();
    console.log('Set logout timestamp:', { time: new Date().toISOString() });
  }
  
  req.logout((err) => {
    if (err) return next(err);
    res.sendStatus(200);
  });
});
```

---

This authentication system provides a robust, secure framework for user management while maintaining a smooth user experience. The "try before sign up" approach with proper data segmentation ensures that users can explore the platform's capabilities before committing, while maintaining strict data isolation between authenticated users.