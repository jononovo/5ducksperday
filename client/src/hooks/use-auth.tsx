import { createContext, ReactNode, useContext, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { firebaseAuth, firebaseGoogleProvider } from "@/lib/firebase";
import { signInWithPopup, signOut, type User as FirebaseUser } from "firebase/auth";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, InsertUser>;
  signInWithGoogle: () => Promise<void>;
};

type LoginData = Pick<InsertUser, "username" | "password">;

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      try {
        return await res.json();
      } catch (error) {
        console.error('Login JSON parsing error:', error);
        throw new Error(`Login failed: ${error instanceof Error ? error.message : 'Could not parse server response'}`);
      }
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      try {
        console.log('Submitting registration:', {
          email: credentials.email,
          hasPassword: !!credentials.password,
          timestamp: new Date().toISOString()
        });
        
        const res = await apiRequest("POST", "/api/register", credentials);
        
        try {
          return await res.json();
        } catch (parseError) {
          console.error('Registration JSON parsing error:', {
            error: parseError,
            status: res.status,
            statusText: res.statusText
          });
          
          // Get raw text for debugging
          const text = await res.clone().text();
          console.error('Raw response text that failed to parse:', {
            text: text.substring(0, 500) // Limit to 500 chars
          });
          
          throw new Error(`Registration failed: Could not parse server response`);
        }
      } catch (error) {
        console.error('Registration error:', error);
        throw error;
      }
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
      if (firebaseAuth) {
        try {
          await signOut(firebaseAuth);
        } catch (error) {
          console.error("Firebase sign out error:", error);
          // Continue with local logout even if Firebase fails
        }
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const signInWithGoogle = async () => {
    try {
      console.log('Starting Google sign-in process', {
        environment: import.meta.env.MODE,
        domain: window.location.hostname,
        origin: window.location.origin
      });

      if (!firebaseAuth || !firebaseGoogleProvider) {
        const configError = {
          auth: !!firebaseAuth,
          provider: !!firebaseGoogleProvider,
          projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
          environment: import.meta.env.MODE,
          domain: window.location.hostname
        };
        console.error('Firebase auth not initialized:', configError);
        throw new Error("Authentication service is not properly configured");
      }

      // Force re-authentication to request new scopes
      firebaseGoogleProvider.setCustomParameters({
        prompt: 'consent',
        access_type: 'offline',
        scope: [
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/userinfo.profile',
          'https://www.googleapis.com/auth/gmail.send',
          'https://www.googleapis.com/auth/gmail.compose'
        ].join(' ')
      });

      console.log('Calling signInWithPopup...');
      const result = await signInWithPopup(firebaseAuth, firebaseGoogleProvider);

      // Get the token result with detailed scope information
      const tokenResult = await result.user.getIdTokenResult();

      console.log('SignInWithPopup completed', {
        success: !!result,
        hasUser: !!result.user,
        hasEmail: !!result.user?.email,
        scopes: tokenResult.claims.scope,
        // Log OAuth credential details
        credential: result.user.providerData[0],
        timestamp: new Date().toISOString()
      });

      //Added logging for Gmail scopes verification on frontend
      console.log("Gmail API scopes granted (Frontend):", {
        hasScope: tokenResult.claims.scope !== undefined,
        scopeType: typeof tokenResult.claims.scope,
        timestamp: new Date().toISOString()
      });

      if (!result.user?.email) {
        throw new Error("No email provided from Google sign-in");
      }

      console.log('Google sign-in successful, syncing with backend', {
        email: result.user.email.split('@')[0] + '@...',
        displayName: result.user.displayName
      });

      await syncWithBackend(result.user);

    } catch (error: any) {
      console.error("Google sign-in error:", {
        error: error.message,
        code: error.code,
        domain: window.location.hostname,
        environment: import.meta.env.MODE
      });

      // Show a more user-friendly error message
      toast({
        title: "Google Sign-in failed",
        description: error.code === 'auth/popup-blocked'
          ? "Please allow popups for this site and try again"
          : "Please try again or use email/password login",
        variant: "destructive",
      });

      throw error;
    }
  };

  // Safely parse JSON with better error handling
  async function safeJsonParse(res: Response): Promise<any> {
    try {
      return await res.json();
    } catch (error) {
      console.error('JSON parsing error:', {
        status: res.status,
        statusText: res.statusText,
        url: res.url,
        error
      });
      
      // Get the text content for debugging
      try {
        const text = await res.clone().text();
        console.error('Response that failed to parse:', {
          text: text.substring(0, 500), // Log only first 500 chars to avoid huge logs
          contentType: res.headers.get('content-type')
        });
      } catch (textError) {
        console.error('Could not get response text after JSON parse error:', textError);
      }
      
      throw new Error(`Failed to parse JSON response: ${error instanceof Error ? error.message : 'Unknown parsing error'}`);
    }
  }

  // Function to get Firebase ID token and sync with backend
  const syncWithBackend = async (firebaseUser: FirebaseUser) => {
    try {
      // Get the access token for Gmail API
      const credential = firebaseUser.providerData[0];
      const accessToken = (credential as any)?.accessToken;

      console.log('Making backend sync request', {
        endpoint: '/api/google-auth',
        hasAccessToken: !!accessToken,
        domain: window.location.hostname
      });

      // Get the ID token for authentication
      const idToken = await firebaseUser.getIdToken(true);

      const createRes = await fetch("/api/google-auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({
          email: firebaseUser.email,
          username: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
          accessToken // Add the access token to the request
        })
      });

      if (!createRes.ok) {
        let errorText;
        try {
          errorText = await createRes.text();
        } catch (textError) {
          errorText = 'Could not read error response';
        }
        
        console.error('Backend sync error response:', {
          status: createRes.status,
          statusText: createRes.statusText,
          responseText: errorText
        });
        throw new Error(`Failed to sync with backend: ${createRes.status}`);
      }

      console.log('Successfully synced with backend');
      
      try {
        const user = await safeJsonParse(createRes);
        queryClient.setQueryData(["/api/user"], user);
      } catch (parseError) {
        console.error('Error parsing user data from sync response:', parseError);
        throw new Error('Failed to parse user data from backend response');
      }

    } catch (error) {
      console.error("Error syncing with backend:", {
        error,
        domain: window.location.hostname,
        environment: import.meta.env.MODE
      });
      throw error;
    }
  };

  // Monitor Firebase auth state
  useEffect(() => {
    console.log('Setting up Firebase auth state listener');

    if (!firebaseAuth) {
      console.warn('Firebase Auth not initialized in useEffect');
      return;
    }

    const unsubscribe = firebaseAuth.onAuthStateChanged(async (firebaseUser) => {
      console.log('Firebase auth state changed:', firebaseUser?.email);

      if (firebaseUser?.email) {
        try {
          await syncWithBackend(firebaseUser);
        } catch (error) {
          console.error('Error during auth state sync:', error);
          queryClient.setQueryData(["/api/user"], null);
        }
      } else {
        queryClient.setQueryData(["/api/user"], null);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        signInWithGoogle,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}