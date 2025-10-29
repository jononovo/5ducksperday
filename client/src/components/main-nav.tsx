import { Link, useLocation } from "wouter";
import { LogOut, User, Menu, LayoutDashboard, Mail, MessageCircle, Target, Headphones, Flame, PanelLeft } from "lucide-react";
import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRegistrationModal } from "@/hooks/use-registration-modal";
import { useStrategyOverlay } from "@/features/strategy-chat";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { CreditUpgradeDropdown } from "@/components/credit-upgrade-dropdown";
import { StreakButton } from "@/components/streak-button";
import { SavedSearchesDrawer } from "@/components/saved-searches-drawer";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { SearchList, Company, Contact } from "@shared/schema";
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

// Interface for ContactWithCompanyInfo
interface ContactWithCompanyInfo extends Contact {
  companyName: string;
  companyId: number;
}

// Interface for CompanyWithContacts
interface CompanyWithContacts extends Company {
  contacts?: ContactWithCompanyInfo[];
}

export function MainNav() {
  const [location, setLocation] = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
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

  const handleLoadSearch = useCallback(async (list: SearchList) => {
    try {
      // First fetch the companies
      const companies = await queryClient.fetchQuery({
        queryKey: [`/api/lists/${list.listId}/companies`]
      }) as Company[];
      
      // Then fetch contacts for each company
      const companiesWithContacts = await Promise.all(
        companies.map(async (company) => {
          try {
            const contacts = await queryClient.fetchQuery({
              queryKey: [`/api/companies/${company.id}/contacts`]
            }) as Contact[];
            // Add companyName and companyId to each contact
            const contactsWithCompanyInfo: ContactWithCompanyInfo[] = contacts.map(contact => ({
              ...contact,
              companyName: company.name,
              companyId: company.id
            }));
            return { ...company, contacts: contactsWithCompanyInfo };
          } catch (error) {
            console.error(`Failed to load contacts for company ${company.id}:`, error);
            return { ...company, contacts: [] };
          }
        })
      );
      
      // Save the search state to localStorage
      const searchState = {
        currentQuery: list.prompt,
        currentResults: companiesWithContacts,
        currentListId: list.listId,
        lastExecutedQuery: list.prompt,
        emailSearchCompleted: false
      };
      
      localStorage.setItem('searchState', JSON.stringify(searchState));
      sessionStorage.setItem('searchState', JSON.stringify(searchState));
      
      // Navigate to the app page
      setLocation('/app');
      
      const totalContacts = companiesWithContacts.reduce((sum, company) => 
        sum + (company.contacts?.length || 0), 0);
      
      toast({
        title: "Search Loaded",
        description: `Loaded "${list.prompt}" with ${list.resultCount} companies and ${totalContacts} contacts`,
      });
    } catch (error) {
      toast({
        title: "Failed to load search",
        description: "Could not load the selected search.",
        variant: "destructive"
      });
    }
  }, [queryClient, setLocation, toast]);

  const handleNewSearch = useCallback(() => {
    // Clear any existing search state for a fresh search
    localStorage.removeItem('searchState');
    sessionStorage.removeItem('searchState');
    setLocation('/app');
  }, [setLocation]);

  return (
    <>
      <nav className="flex items-center justify-between mb-2 px-4 py-1.5">
        <div className="flex items-center space-x-2">
          <Logo size="sm" className="mr-2" />
          {user && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDrawerOpen(true)}
              className="h-8 w-8 hover:bg-accent"
              title="Historic Searches"
            >
              <PanelLeft className="h-5 w-5 text-gray-500" />
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
    
    {user && (
      <SavedSearchesDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onLoadSearch={handleLoadSearch}
        onNewSearch={handleNewSearch}
      />
    )}
    </>
  );
}