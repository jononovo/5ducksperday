import { createContext, ReactNode, useContext, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { auth, googleProvider } from "@/lib/firebase";
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
      if (auth) {
        try {
          await signOut(auth);
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

  // Function to get Firebase ID token and sync with backend
  const syncWithBackend = async (firebaseUser: FirebaseUser) => {
    try {
      const idToken = await firebaseUser.getIdToken();
      const res = await fetch("/api/user", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!res.ok) {
        // If user doesn't exist in our system, create one
        if (res.status === 401) {
          const createRes = await apiRequest("POST", "/api/google-auth", {
            email: firebaseUser.email,
            username: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
          });
          const user = await createRes.json();
          queryClient.setQueryData(["/api/user"], user);
        }
      } else {
          const user = await res.json();
          queryClient.setQueryData(["/api/user"], user);
      }
    } catch (error) {
      console.error("Error syncing with backend:", error);
    }
  };

  const signInWithGoogle = async () => {
    if (!auth || !googleProvider) {
      toast({
        title: "Google Sign-in unavailable",
        description: "Firebase is not properly configured. Please try using email/password login instead.",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user && result.user.email) {
        await syncWithBackend(result.user);
      }
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      toast({
        title: "Google Sign-in failed",
        description: error.message || "Please try using email/password login instead",
        variant: "destructive",
      });
    }
  };

  // Monitor Firebase auth state
  useEffect(() => {
    if (!auth) return;

    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser && firebaseUser.email) {
        await syncWithBackend(firebaseUser);
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