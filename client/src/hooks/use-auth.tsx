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
      return await res.json();
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
      const res = await apiRequest("POST", "/api/register", credentials);
      return await res.json();
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
      console.log('Starting Google sign-in process');

      if (!firebaseAuth || !firebaseGoogleProvider) {
        console.error('Firebase auth not initialized:', {
          auth: !!firebaseAuth,
          provider: !!firebaseGoogleProvider,
          projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID
        });
        throw new Error("Authentication service is not properly configured");
      }

      const result = await signInWithPopup(firebaseAuth, firebaseGoogleProvider);

      if (!result.user?.email) {
        throw new Error("No email provided from Google sign-in");
      }

      console.log('Google sign-in successful, syncing with backend');
      await syncWithBackend(result.user);

    } catch (error: any) {
      console.error("Google sign-in error:", error);

      // Show a more user-friendly error message
      toast({
        title: "Google Sign-in failed",
        description: "Please try again or use email/password login",
        variant: "destructive",
      });

      // Re-throw to prevent further execution
      throw error;
    }
  };

  // Function to get Firebase ID token and sync with backend
  const syncWithBackend = async (firebaseUser: FirebaseUser) => {
    try {
      console.log('Getting ID token for backend sync');
      const idToken = await firebaseUser.getIdToken();

      console.log('Making backend sync request');
      const res = await fetch("/api/user", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!res.ok) {
        console.log('Backend sync response not OK:', res.status);

        // If user doesn't exist, create them
        if (res.status === 401) {
          console.log('Creating new user in backend');
          const createRes = await apiRequest("POST", "/api/google-auth", {
            email: firebaseUser.email,
            username: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
          });

          if (!createRes.ok) {
            throw new Error(`Failed to create user: ${createRes.status}`);
          }

          const user = await createRes.json();
          queryClient.setQueryData(["/api/user"], user);
          return;
        }

        throw new Error(`Backend sync failed: ${res.status}`);
      }

      console.log('Successfully synced with backend');
      const user = await res.json();
      queryClient.setQueryData(["/api/user"], user);

    } catch (error) {
      console.error("Error syncing with backend:", error);
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