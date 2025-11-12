import { Link, useLocation } from "wouter";
import { LogOut, User, Menu, LayoutDashboard, Mail, MessageCircle, Target, Headphones, Flame, PanelLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useRegistrationModal } from "@/hooks/use-registration-modal";
import { useStrategyOverlay } from "@/features/strategy-chat";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { CreditUpgradeDropdown } from "@/components/credit-upgrade-dropdown";
import { StreakButton } from "@/components/streak-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navigation = [
  // Navigation items removed - now in hamburger menu
];

export function MainNav() {
  const [location, setLocation] = useLocation();
  
  // Safe auth hook usage with error handling
  let user = null;
  let logoutMutation = null;
  let openRegistrationModal = null;
  let strategyOverlay = null;
  
  try {
    const auth = useAuth();
    user = auth.user;
    logoutMutation = auth.logoutMutation;
    
    // Registration modal for login functionality
    const { openModal } = useRegistrationModal();
    openRegistrationModal = openModal;
    
    // Strategy overlay for chat trigger
    strategyOverlay = useStrategyOverlay();
  } catch (error) {
    // MainNav is being rendered outside AuthProvider context
    // This is acceptable for public routes - just don't show user menu
  }

  const handleDrawerClick = () => {
    // Trigger the drawer open event on any page
    window.dispatchEvent(new CustomEvent('openSavedSearchesDrawer'));
  };

  return (
    <nav className="flex items-center justify-between mb-2 px-4 py-1.5">
        <div className="flex items-center space-x-2">
          <Logo size="sm" className="mr-2" />
          {user && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDrawerClick}
              className="h-8 w-8 hover:bg-accent"
              title="Historic Searches"
            >
              <PanelLeft 
                className="text-gray-500" 
                style={{ width: '22px', height: '22px' }}
                strokeWidth={1.5}
              />
            </Button>
          )}
        </div>
      <div className="flex items-center ml-auto gap-3">
        {user ? (
          <>
            <StreakButton />
            <CreditUpgradeDropdown />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Menu className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <Link href="/outreach">
                  <DropdownMenuItem>
                    <Mail className="h-4 w-4 mr-2" />
                    <span>Outreach</span>
                  </DropdownMenuItem>
                </Link>
                <Link href="/streak">
                  <DropdownMenuItem>
                    <Flame className="h-4 w-4 mr-2" />
                    <span>Streak</span>
                  </DropdownMenuItem>
                </Link>
                <Link href="/contacts">
                  <DropdownMenuItem>
                    <User className="h-4 w-4 mr-2" />
                    <span>Contacts</span>
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                <Link href="/account">
                  <DropdownMenuItem>
                    <User className="h-4 w-4 mr-2" />
                    <span>Account</span>
                  </DropdownMenuItem>
                </Link>
                <Link href="/strategy">
                  <DropdownMenuItem>
                    <Target className="h-4 w-4 mr-2" />
                    <span>Strategy</span>
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuItem
                  onClick={() => window.open('/contact', '_blank')}
                  className="cursor-pointer"
                >
                  <Headphones className="h-4 w-4 mr-2" />
                  <span>Contact</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {logoutMutation && (
                  <DropdownMenuItem onClick={() => logoutMutation.mutate()}>
                    <LogOut className="h-4 w-4 mr-2" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          openRegistrationModal && (
            <Button 
              variant="outline" 
              onClick={openRegistrationModal}
              className="h-8 px-4 text-sm text-muted-foreground hover:text-foreground"
            >
              Login
            </Button>
          )
        )}
      </div>
    </nav>
  );
}