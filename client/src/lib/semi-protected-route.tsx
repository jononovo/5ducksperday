import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Route } from "wouter";
import { useRegistrationModal } from "@/hooks/use-registration-modal";
import { cloneElement } from "react";

// Semi-protected route that allows access but can prompt for login
export function SemiProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading } = useAuth();
  const { openForProtectedRoute } = useRegistrationModal();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  // Semi-protected action handler - shows modal after delay
  const handleSemiProtectedAction = () => {
    if (!user) {
      setTimeout(() => {
        openForProtectedRoute();
      }, 3000);
    }
  };

  return (
    <Route path={path}>
      <Component />
    </Route>
  );
}