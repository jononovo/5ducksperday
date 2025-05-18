import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Route } from "wouter";
import { createContext, useContext, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

// Create a context to track if a login prompt should be shown
export const LoginPromptContext = createContext<{
  showLoginPrompt: () => void;
  isLoginPromptOpen: boolean;
  closeLoginPrompt: () => void;
}>({
  showLoginPrompt: () => {},
  isLoginPromptOpen: false,
  closeLoginPrompt: () => {},
});

// Hook to use the login prompt context
export const useLoginPrompt = () => useContext(LoginPromptContext);

// Semi-protected route that allows access but can prompt for login
export function SemiProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading } = useAuth();
  const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false);
  const [, navigate] = useLocation();

  const showLoginPrompt = () => {
    setIsLoginPromptOpen(true);
  };

  const closeLoginPrompt = () => {
    setIsLoginPromptOpen(false);
  };

  const handleLogin = () => {
    navigate("/auth");
  };

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  return (
    <Route path={path}>
      <LoginPromptContext.Provider value={{ showLoginPrompt, isLoginPromptOpen, closeLoginPrompt }}>
        <Component />
        
        {/* Login dialog that appears when showLoginPrompt is called */}
        <Dialog open={isLoginPromptOpen} onOpenChange={setIsLoginPromptOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Login Required</DialogTitle>
              <DialogDescription>
                To access this feature, you need to create an account or log in.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={closeLoginPrompt}>
                Cancel
              </Button>
              <Button onClick={handleLogin}>
                Login / Register
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </LoginPromptContext.Provider>
    </Route>
  );
}