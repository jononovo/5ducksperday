import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchProgress } from "@/components/search-progress";
import { LandingPageTooltip } from "@/components/ui/landing-page-tooltip";
import { TableSkeleton } from "@/components/ui/table-skeleton";

// Lazy load heavy components
const CompanyCards = lazy(() => import("@/components/company-cards"));
const PromptEditor = lazy(() => import("@/components/prompt-editor"));

// Import components with named exports directly for now
import { EmailSearchSummary } from "@/components/email-search-summary";
import { ContactDiscoveryReport } from "@/components/contact-discovery-report";
import { MainSearchSummary } from "@/components/main-search-summary";
import { OnboardingFlowOrchestrator } from "@/components/onboarding/OnboardingFlowOrchestrator";
import { EmailDrawer, useEmailDrawer } from "@/features/email-drawer";
import { TopProspectsCard } from "@/features/top-prospects";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useRegistrationModal } from "@/hooks/use-registration-modal";
import { useNotifications } from "@/features/user-account-settings";
import { useStrategyOverlay } from "@/features/strategy-chat";
import { NotificationToast } from "@/components/ui/notification-toast";
import { ExtendSearchButton } from "@/features/search-extension";
import {
  Search,
  Code2,
  UserCircle,
  Banknote,
  Eye,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  X,
  ThumbsUp,
  ThumbsDown,
  Star,
  MessageSquare,
  Gem,
  MoreHorizontal,
  Menu,
  Mail,
  Megaphone,
  Target,
  Plus,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { apiRequest } from "@/lib/queryClient";
import { EggAnimation } from "@/components/egg-animation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Company, Contact, SearchList } from "@shared/schema";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { filterTopProspects, ContactWithCompanyInfo } from "@/lib/results-analysis/prospect-filtering";
import { Checkbox } from "@/components/ui/checkbox";
import { ContactActionColumn } from "@/components/contact-action-column";
import { SearchSessionManager } from "@/lib/search-session-manager";
import { SavedSearchesDrawer } from "@/components/saved-searches-drawer";
import { useComprehensiveEmailSearch } from "@/hooks/use-comprehensive-email-search";
import { useSearchState, type SavedSearchState, type CompanyWithContacts } from "@/features/search-state";
import { useEmailSearchOrchestration } from "@/features/email-search-orchestration";

// Define SourceBreakdown interface to match EmailSearchSummary
interface SourceBreakdown {
  Perplexity: number;
  Apollo: number;
  Hunter: number;
}

export default function Home() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentQuery, setCurrentQuery] = useState<string>("");
  const [currentResults, setCurrentResults] = useState<CompanyWithContacts[] | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [currentListId, setCurrentListIdBase] = useState<number | null>(null);
  
  // Wrapper to log currentListId changes
  const setCurrentListId = (newListId: number | null) => {
    console.log('Setting currentListId:', {
      from: currentListId,
      to: newListId,
      stackTrace: new Error().stack?.split('\n').slice(2, 5).join('\n')
    });
    setCurrentListIdBase(newListId);
  };
  const [companiesViewMode, setCompaniesViewMode] = useState<'scroll' | 'slides'>('scroll');
  const [pendingContactIds, setPendingContactIds] = useState<Set<number>>(new Set());
  // State for selected contacts (for multi-select checkboxes)
  const [selectedContacts, setSelectedContacts] = useState<Set<number>>(new Set());
  // Add new state for tracking contact loading status
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [contactsLoaded, setContactsLoaded] = useState(false);
  // Track if user came from landing page
  const [isFromLandingPage, setIsFromLandingPage] = useState(false);
  // Track the last executed search query and if input has changed
  const [lastExecutedQuery, setLastExecutedQuery] = useState<string | null>(null);
  const [inputHasChanged, setInputHasChanged] = useState(false);
  // Track when to highlight the email search button and start selling button
  const [highlightEmailButton, setHighlightEmailButton] = useState(false);
  // Track current session ID for email search persistence
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showEmailTooltip, setShowEmailTooltip] = useState(false);
  const [hasShownEmailTooltip, setHasShownEmailTooltip] = useState(false);
  // Tour modal has been removed
  const [pendingHunterIds, setPendingHunterIds] = useState<Set<number>>(new Set());
  const [pendingApolloIds, setPendingApolloIds] = useState<Set<number>>(new Set());
  const [savedSearchesDrawerOpen, setSavedSearchesDrawerOpen] = useState(false);
  
  // Email drawer state management
  const emailDrawer = useEmailDrawer({
    onClose: () => {
      setSearchSectionCollapsed(false);
    }
  });
  const [searchSectionCollapsed, setSearchSectionCollapsed] = useState(false);
  
  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingSearchQuery, setOnboardingSearchQuery] = useState<string>("");
  const [onboardingSearchResults, setOnboardingSearchResults] = useState<any[]>([]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const registrationModal = useRegistrationModal();
  const auth = useAuth();
  const { notificationState, triggerNotification, closeNotification } = useNotifications();
  const { setState: setStrategyOverlayState } = useStrategyOverlay();
  
  // Use shared comprehensive email search hook
  // Handler for contact click to open email drawer
  const handleContactClick = (contact: ContactWithCompanyInfo, company: Company) => {
    // Get all contacts from the same company
    const companyContacts = currentResults
      ?.find(c => c.id === company.id)
      ?.contacts || [];
    
    // Open the drawer with the selected contact
    emailDrawer.openDrawer(contact, company, companyContacts);
    
    // Check if contact has an email and show appropriate notification
    if (contact.email) {
      toast({
        title: "Email populated",
        description: `${contact.name}'s email added to recipient field`,
      });
    } else {
      // Check if we've already searched comprehensively for this contact
      const hasSearchedComprehensively = contact.completedSearches?.includes('comprehensive_search');
      
      if (hasSearchedComprehensively) {
        toast({
          title: "No email available",
          description: `All search methods have been exhausted for ${contact.name}. Consider selecting another contact.`,
          variant: "default",
        });
      } else {
        toast({
          title: "No email found",
          description: `Click the "Find email" button to search for it.`,
          variant: "default",
        });
      }
    }
    
    // Auto-collapse search section when email drawer opens
    setSearchSectionCollapsed(true);
  };
  
  const handleEmailContactChange = (newContact: Contact | null) => {
    emailDrawer.setSelectedContact(newContact);
  };

  // Auto-collapse search section when email drawer opens or when search results exist
  useEffect(() => {
    if (emailDrawer.isOpen) {
      setSearchSectionCollapsed(true);
    } else if (currentResults && currentResults.length > 0) {
      // Also collapse when search results are shown
      setSearchSectionCollapsed(true);
    } else {
      // Expand when drawer closes and no results
      setSearchSectionCollapsed(false);
    }
  }, [emailDrawer.isOpen, currentResults]);
  
  const { 
    handleComprehensiveEmailSearch: comprehensiveSearchHook, 
    pendingSearchIds: pendingComprehensiveSearchIds 
  } = useComprehensiveEmailSearch({
    onContactUpdate: (updatedContact) => {
      // Update the contact in currentResults
      setCurrentResults(prev => {
        if (!prev) return null;
        const updatedResults = prev.map(company => ({
          ...company,
          contacts: company.contacts?.map(contact =>
            contact.id === updatedContact.id 
              ? { ...updatedContact, companyName: company.name, companyId: company.id } as ContactWithCompanyInfo
              : contact
          )
        }));
        
        // Save to localStorage for persistence
        // Save lastExecutedQuery as currentQuery to ensure consistency
        const queryToSave = lastExecutedQuery || currentQuery;
        const stateToSave = {
          currentQuery: queryToSave,
          currentResults: updatedResults,
          currentListId,
          lastExecutedQuery
        };
        localStorage.setItem('searchState', JSON.stringify(stateToSave));
        sessionStorage.setItem('searchState', JSON.stringify(stateToSave));
        
        return updatedResults;
      });
    }
  });

  // Check if user has already seen email tooltip
  useEffect(() => {
    const checkEmailTooltipStatus = async () => {
      if (auth?.user) {
        try {
          const response = await fetch('/api/notifications/status', {
            headers: {
              ...(localStorage.getItem('authToken') && { 
                'Authorization': `Bearer ${localStorage.getItem('authToken')}` 
              })
            },
            credentials: 'include'
          });
          const data = await response.json();
          if (data.notifications && data.notifications[3] === 1) {
            setHasShownEmailTooltip(true);
          }
        } catch (error) {
          console.error('Failed to check email tooltip status:', error);
        }
      }
    };
    
    checkEmailTooltipStatus();
  }, [auth?.user]);


  // Handle tooltip dismissal when clicked
  useEffect(() => {
    const handleTooltipDismiss = async () => {
      // Dismiss email discovery tooltip
      if (showEmailTooltip) {
        setShowEmailTooltip(false);
        setHasShownEmailTooltip(true); // Mark as shown
        
        // Mark email tooltip as shown for authenticated users
        if (auth?.user) {
          try {
            await fetch('/api/notifications/mark-shown', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(localStorage.getItem('authToken') && { 
                  'Authorization': `Bearer ${localStorage.getItem('authToken')}` 
                })
              },
              credentials: 'include',
              body: JSON.stringify({ notificationId: 3 })
            });
          } catch (error) {
            console.error('Failed to mark email tooltip as shown:', error);
          }
        }
      }
    };

    window.addEventListener('dismissTooltip', handleTooltipDismiss);
    return () => window.removeEventListener('dismissTooltip', handleTooltipDismiss);
  }, [showEmailTooltip, auth?.user, hasShownEmailTooltip]);
  
  // Initialize search state management hook
  const searchState = useSearchState(setCurrentResults);
  const { 
    loadSearchState, 
    persistSearchState, 
    refreshContactDataFromDatabase,
    refreshAndUpdateResults,
    isMountedRef,
    isInitializedRef,
    hasSessionRestoredDataRef,
    refreshVersionRef
  } = searchState;
  
  // Other refs for list mutations and debouncing
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const listMutationInProgressRef = useRef(false);
  const listUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);



  // Auto-refresh contact data if there was a recent email search
  const refreshContactDataIfNeeded = async (companies: CompanyWithContacts[]) => {
    try {
      // Check if there was a recent email search (within last 2 minutes)
      const lastEmailSearch = localStorage.getItem('lastEmailSearchTimestamp');
      if (lastEmailSearch) {
        const timeSinceSearch = Date.now() - parseInt(lastEmailSearch);
        if (timeSinceSearch < 120000) { // 2 minutes
          console.log('Recent email search detected, refreshing contact data...');
          
          // Use the unified refresh helper with email search timestamp clearing
          const refreshedResults = await refreshAndUpdateResults(
            companies,
            {
              currentQuery: currentQuery,
              currentListId: currentListId,
              lastExecutedQuery: lastExecutedQuery
            },
            {
              clearEmailSearchTimestamp: true
            }
          );
          
          console.log('Contact data refresh completed');
          
          // Return the refreshed results for immediate use
          return refreshedResults;
        }
      }
    } catch (error) {
      console.error('Auto-refresh failed:', error);
    }
    
    // Return original companies if no refresh was needed
    return companies;
  };

  // Helper function to check if data has complete contact information
  const hasCompleteContacts = (data: CompanyWithContacts[] | null): boolean => {
    if (!data || !Array.isArray(data)) return false;
    
    // Check if at least one company has contacts
    return data.some(company => 
      company.contacts && Array.isArray(company.contacts) && company.contacts.length > 0
    );
  };

  // Load state from localStorage on component mount
  useEffect(() => {
    // Check for pending search query from landing page
    const pendingQuery = localStorage.getItem('pendingSearchQuery');
    if (pendingQuery) {
      console.log('Found pending search query:', pendingQuery);
      setCurrentQuery(pendingQuery);
      setIsFromLandingPage(true); // Set flag when coming from landing page
      setHasShownEmailTooltip(false); // Reset tooltip flag for new session
      localStorage.removeItem('pendingSearchQuery');
      // Clear any existing search state AND list ID when starting fresh search
      localStorage.removeItem('searchState');
      sessionStorage.removeItem('searchState');
      setCurrentListId(null); // Clear any existing list ID
      setIsSaved(false);
      // No longer automatically triggering search - user must click the search button
    } else {
      // Enhanced data restoration logic with intelligent merging
      const savedState = loadSearchState();
      
      if (savedState && savedState.currentResults && !hasSessionRestoredDataRef.current) {
        console.log('Found localStorage data:', {
          query: savedState.currentQuery,
          resultsCount: savedState.currentResults?.length,
          hasContacts: hasCompleteContacts(savedState.currentResults),
          listId: savedState.currentListId
        });
        
        // Restore state variables
        const queryToRestore = savedState.currentQuery || "";
        const listIdToRestore = savedState.currentListId;
        
        console.log('[LOCALSTORAGE RESTORE] Loading saved state:', {
          queryToRestore,
          listIdToRestore,
          resultsCount: savedState.currentResults?.length,
          hasListId: !!listIdToRestore,
          savedStateKeys: Object.keys(savedState)
        });
        
        // Set state only once
        setCurrentQuery(queryToRestore);
        setCurrentListId(listIdToRestore);
        setCurrentResults(savedState.currentResults);
        setLastExecutedQuery(savedState.lastExecutedQuery || savedState.currentQuery);
        setInputHasChanged(false); // Set to false when loading saved state
        
        // Mark list as saved if we have a listId
        if (listIdToRestore) {
          setIsSaved(true);
          console.log('[LOCALSTORAGE RESTORE] Restored saved search list with ID:', listIdToRestore);
        } else {
          console.log('[LOCALSTORAGE RESTORE] No listId found in saved state - will trigger auto-create');
          // If we have results but no listId, we need to create one immediately
          // This happens when user navigated away before the 1.5s auto-create timer fired
          if (savedState.currentResults && savedState.currentResults.length > 0 && queryToRestore) {
            console.log('[LOCALSTORAGE RESTORE] Creating list immediately for orphaned results');
            // Set a flag to trigger list creation after component mounts
            setTimeout(() => {
              if (!currentListId && savedState.currentResults && savedState.currentResults.length > 0) {
                console.log('[LOCALSTORAGE RESTORE] Triggering immediate list creation for restored results');
                autoCreateListMutation.mutate({ 
                  query: queryToRestore, 
                  companies: savedState.currentResults 
                });
              }
            }, 100); // Small delay to ensure component is fully mounted
          }
        }
        
        // Always refresh contact data when restoring from localStorage to ensure emails are preserved
        console.log('Refreshing contact data from database to preserve emails after navigation');
        console.log('Companies before refresh:', savedState.currentResults.map((c: CompanyWithContacts) => ({
          name: c.name,
          contactCount: c.contacts?.length || 0,
          contactsWithEmails: c.contacts?.filter(contact => contact.email).length || 0,
          listId: listIdToRestore
        })));
        
        // Always refresh from database to ensure fresh data (including emails)
        console.log('NAVIGATION: Passing listId to refreshAndUpdateResults:', listIdToRestore);
        refreshAndUpdateResults(
          savedState.currentResults,
          {
            currentQuery: queryToRestore,
            currentListId: listIdToRestore,
            lastExecutedQuery: savedState.lastExecutedQuery || savedState.currentQuery
          },
          {
            additionalStateFields: {
              emailSearchCompleted: savedState.emailSearchCompleted || false,
              emailSearchTimestamp: savedState.emailSearchTimestamp || null,
              navigationRefreshTimestamp: Date.now()
            }
          }
        ).then(refreshedResults => {
          const emailsAfterRefresh = refreshedResults.reduce((total, company) => 
            total + (company.contacts?.filter(c => c.email && c.email.length > 0).length || 0), 0
          );
          
          console.log(`NAVIGATION: Database refresh completed with ${emailsAfterRefresh} emails`);
          console.log('NAVIGATION: Companies after refresh:', refreshedResults.map(c => ({
            name: c.name,
            contactCount: c.contacts?.length || 0,
            contactsWithEmails: c.contacts?.filter(contact => contact.email && contact.email.length > 0).length || 0
          })));
          
          if (emailsAfterRefresh > 0) {
            console.log(`NAVIGATION: Successfully restored ${emailsAfterRefresh} emails`);
          }
        }).catch(error => {
          console.error('NAVIGATION: Database refresh failed:', error);
          // Fallback to using saved state as-is
          setCurrentResults(savedState.currentResults);
        });
      } else {
        console.log('No saved search state found or session data already restored');
      }
    }

    // Registration success callback setup (only set once)
    const handleRegistrationSuccess = async () => {
      console.log('Registration success detected, triggering welcome notification');
      
      try {
        // Extract guest data BEFORE cleanup (critical timing fix)
        const savedState = loadSearchState();
        const guestData = {
          originalQuery: savedState?.currentQuery || null
        };
        
        console.log('Extracted guest data:', guestData);
        
        // Clear all guest localStorage data
        localStorage.removeItem('searchState');
        sessionStorage.removeItem('searchState');
        localStorage.removeItem('contactSearchConfig');
        localStorage.removeItem('lastEmailSearchTimestamp');
        localStorage.removeItem('pendingSearchQuery');
        
        // Clear component state
        setCurrentResults(null);
        setCurrentListId(null);
        setIsSaved(false);
        setContactsLoaded(false);
        
        // Reset search button state for clean starting point
        setLastExecutedQuery(null);
        setInputHasChanged(false);
        
        // Clear saved searches cache to remove demo user's lists
        queryClient.invalidateQueries({ queryKey: ['/api/lists'] });
        
        console.log('Guest data cleared successfully');
        
        // Restore original query to input field
        if (guestData.originalQuery) {
          setCurrentQuery(guestData.originalQuery);
          console.log('Restored guest query to input:', guestData.originalQuery);
        }
        
        // Toast removed - redundant with welcome notification system
        
        // Trigger welcome notification
        await triggerNotification('registration_complete');
      } catch (error) {
        console.error('Failed to handle registration success:', error);
      }
    };

    // Only set callback once when component mounts
    if (!isInitializedRef.current) {
      registrationModal.setRegistrationSuccessCallback(handleRegistrationSuccess);
    }
    
    // Mark component as initialized
    isInitializedRef.current = true;
    
    // Cleanup function to prevent localStorage corruption during unmount
    return () => {
      isMountedRef.current = false;
    };
  }, []); // Remove dependencies to prevent re-running

  // Listen for the drawer open event from the header
  useEffect(() => {
    const handleOpenDrawer = () => {
      setSavedSearchesDrawerOpen(true);
    };

    window.addEventListener('openSavedSearchesDrawer', handleOpenDrawer);
    
    return () => {
      window.removeEventListener('openSavedSearchesDrawer', handleOpenDrawer);
    };
  }, []);

  // Save state to localStorage whenever it changes (but prevent corruption during unmount)
  useEffect(() => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Set 1000ms delay for existing save logic
    debounceTimerRef.current = setTimeout(() => {
      // Only save if component is mounted and initialized (prevents corruption during unmount)
      if (!isMountedRef.current || !isInitializedRef.current) {
        console.log('Skipping localStorage save - component not ready or unmounting');
        return;
      }
      
      // Only save if we have meaningful data (prevents saving null states)
      if (currentQuery || (currentResults && currentResults.length > 0)) {
        // Save lastExecutedQuery as currentQuery to ensure the saved query matches the results
        // If no search has been executed yet, fall back to currentQuery
        const queryToSave = lastExecutedQuery || currentQuery;
        const stateToSave: SavedSearchState = {
          currentQuery: queryToSave,
          currentResults,
          currentListId,
          lastExecutedQuery
        };
        console.log('Saving search state:', {
          query: queryToSave,
          resultsCount: currentResults?.length,
          listId: currentListId,
          companies: currentResults?.map(c => ({ id: c.id, name: c.name }))
        });
        
        // Save to both localStorage and sessionStorage for redundancy
        const stateString = JSON.stringify(stateToSave);
        localStorage.setItem('searchState', stateString);
        sessionStorage.setItem('searchState', stateString);
      } else {
        console.log('Skipping localStorage save - no meaningful data to save');
      }
    }, 1000);
    
    // Cleanup on unmount
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [currentQuery, currentResults, currentListId, lastExecutedQuery]);





  
  // Auto-creation mutation for silent list creation after search
  const autoCreateListMutation = useMutation({
    mutationFn: async ({ query, companies }: { query: string; companies: CompanyWithContacts[] }) => {
      if (!query || !companies) return;
      
      // Get current contact search config from localStorage
      const savedConfig = localStorage.getItem('contactSearchConfig');
      let contactSearchConfig = null;
      if (savedConfig) {
        try {
          contactSearchConfig = JSON.parse(savedConfig);
        } catch (error) {
          console.error('Error parsing contact search config:', error);
        }
      }
      
      const res = await apiRequest("POST", "/api/lists", {
        companies: companies,
        prompt: query,
        contactSearchConfig: contactSearchConfig
      });
      const jsonData = await res.json();
      console.log('[AUTO-CREATE LIST] Backend response from POST /api/lists:', jsonData);
      console.log('[AUTO-CREATE LIST] Response fields:', Object.keys(jsonData));
      return jsonData;
    },
    onSuccess: (data) => {
      console.log('Backend returned data from list creation:', data); // Debug log to see exact structure
      queryClient.invalidateQueries({ queryKey: ["/api/lists"] });
      
      // FIX: Backend returns both 'id' (table PK) and 'listId' (the actual list ID we need)
      const listId = data.listId; // Use the correct field: listId not id
      setCurrentListId(listId); // Track the auto-created list
      setIsSaved(true); // Mark as saved
      listMutationInProgressRef.current = false; // Reset flag
      console.log('List created successfully with listId:', listId);
      
      // IMPORTANT: Persist the listId to localStorage immediately after creation
      persistSearchState(
        {
          currentResults: currentResults || []
        },
        {
          currentQuery: currentQuery,
          currentListId: listId, // Use the correct ID field
          lastExecutedQuery: lastExecutedQuery
        }
      );
      console.log('Persisted new listId to localStorage:', listId);
      // No toast notification (silent auto-save)
    },
    onError: (error) => {
      console.error("Auto list creation failed:", error);
      listMutationInProgressRef.current = false; // Reset flag
      // Silent failure - don't show error to user
    },
  });

  // Mutation for updating existing list
  const updateListMutation = useMutation({
    mutationFn: async ({ query, companies, listId }: { query: string; companies: CompanyWithContacts[]; listId: number }) => {
      if (!query || !companies || !listId) {
        console.error('Update list validation failed:', {
          hasQuery: !!query,
          hasResults: !!companies,
          hasListId: !!listId,
          listId
        });
        throw new Error('Missing required data for list update');
      }
      
      console.log('Starting list update:', {
        listId: listId,
        query: query,
        companyCount: companies.length,
        companyIds: companies.map(c => c.id)
      });
      
      // Get current contact search config from localStorage
      const savedConfig = localStorage.getItem('contactSearchConfig');
      let contactSearchConfig = null;
      if (savedConfig) {
        try {
          contactSearchConfig = JSON.parse(savedConfig);
        } catch (error) {
          console.error('Error parsing contact search config:', error);
        }
      }
      
      const res = await apiRequest("PUT", `/api/lists/${listId}`, {
        companies: companies,
        prompt: query,
        contactSearchConfig: contactSearchConfig
      });
      return res.json();
    },
    onSuccess: (data) => {
      console.log('List update successful:', data);
      queryClient.invalidateQueries({ queryKey: ["/api/lists"] });
      listMutationInProgressRef.current = false; // Reset flag
      // Silent update - no toast for progressive updates
    },
    onError: (error) => {
      console.error('List update failed:', error);
      listMutationInProgressRef.current = false; // Reset flag
      // Silent failure for progressive updates
    },
  });

  // Ref for tracking automated search state (needed by email orchestration hook)
  const isAutomatedSearchRef = useRef(false);

  // Initialize email search orchestration hook
  const emailOrchestration = useEmailSearchOrchestration({
    currentResults,
    currentQuery,
    currentListId,
    lastExecutedQuery,
    currentSessionId,
    setCurrentResults,
    refreshContactDataIfNeeded,
    refreshAndUpdateResults,
    updateListMutation,
    isAutomatedSearchRef
  });

  // Mutation for saving and navigating to outreach
  const saveAndNavigateMutation = useMutation({
    mutationFn: async () => {
      if (!currentQuery || !currentResults) return null;
      
      // Get current contact search config from localStorage
      const savedConfig = localStorage.getItem('contactSearchConfig');
      let contactSearchConfig = null;
      if (savedConfig) {
        try {
          contactSearchConfig = JSON.parse(savedConfig);
        } catch (error) {
          console.error('Error parsing contact search config:', error);
        }
      }
      
      const res = await apiRequest("POST", "/api/lists", {
        companies: currentResults,
        prompt: currentQuery,
        contactSearchConfig: contactSearchConfig
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/lists"] });
      toast({
        title: "List Saved",
        description: "Starting outreach process with your search results.",
      });
      setIsSaved(true);
      
      // Navigate to outreach page with the new list ID
      if (data && data.listId) {
        const outreachState = {
          selectedListId: data.listId.toString(),
          selectedContactId: null,
          emailPrompt: "",
          emailContent: "",
          toEmail: "",
          emailSubject: "",
          currentCompanyIndex: 0
        };
        localStorage.setItem('outreachState', JSON.stringify(outreachState));
        
        // Navigate to the outreach page
        setLocation("/outreach");
      }
    },
    onError: (error) => {
      toast({
        title: "Save Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAnalysisComplete = () => {
    setIsAnalyzing(false);
  };

  // Helper function to sort companies by contact count
  const sortCompaniesByContactCount = (companies: CompanyWithContacts[]): CompanyWithContacts[] => {
    return [...companies].sort((a, b) => {
      const contactsA = a.contacts?.length || 0;
      const contactsB = b.contacts?.length || 0;
      return contactsB - contactsA; // Descending order (most contacts first)
    });
  };

  // New handler for initial companies data
  const handleCompaniesReceived = (query: string, companies: Company[]) => {
    console.log('Companies received:', companies.length);
    // Mark that we've received session-restored data
    hasSessionRestoredDataRef.current = true;
    // Update the UI with just the companies data
    setCurrentQuery(query);
    // Convert Company[] to CompanyWithContacts[] with empty contacts arrays
    const companiesWithEmptyContacts = companies.map(company => ({ ...company, contacts: [] }));
    // Apply sorting even though all have 0 contacts - maintains consistency
    const sortedCompanies = sortCompaniesByContactCount(companiesWithEmptyContacts);
    setCurrentResults(sortedCompanies);
    setIsSaved(false);
    setIsLoadingContacts(true);
    setContactsLoaded(false);
  };

  // Modified search results handler for the full data with contacts
  const handleSearchResults = (query: string, results: CompanyWithContacts[]) => {
    console.log('=== PARENT COMPONENT: handleSearchResults called ===');
    console.log('Received query:', query);
    console.log('Received results count:', results.length);
    console.log('Current component state - query:', currentQuery);
    console.log('Current component state - results count:', currentResults?.length || 0);
    console.log('Complete results received with contacts:', results.length);
    
    // Detect if this is a new search (different from current query)
    const isNewSearch = currentQuery !== query;
    
    // Check if this is the user's first successful search and trigger onboarding
    const hasCompletedOnboarding = localStorage.getItem('hasCompletedOnboarding');
    const isFirstSearch = !hasCompletedOnboarding && auth?.user && results.length > 0;
    
    if (isFirstSearch && !showOnboarding) {
      console.log('First search detected - triggering onboarding flow');
      setOnboardingSearchQuery(query);
      setOnboardingSearchResults(results);
      setShowOnboarding(true);
    }
    
    // Clear any stale localStorage data that might conflict with new search results
    if (isNewSearch) {
      console.log('New search detected - clearing stale localStorage data and list ID');
      localStorage.removeItem('searchState');
      sessionStorage.removeItem('searchState');
      setCurrentListId(null);
      setIsSaved(false);
    }
    
    // Mark that we've received session-restored data
    hasSessionRestoredDataRef.current = true;
    
    // Sort companies by contact count (most contacts first)
    const sortedResults = sortCompaniesByContactCount(results);
    
    console.log('Companies reordered by contact count:', 
      sortedResults.map(c => ({ name: c.name, contacts: c.contacts?.length || 0 }))
    );
    
    setCurrentQuery(query);
    setCurrentResults(sortedResults);
    setIsSaved(false);
    setIsLoadingContacts(false);
    
    console.log('=== PARENT COMPONENT: State updated ===');
    console.log('New state - query:', query);
    console.log('New state - results count:', sortedResults.length);
    console.log('handleSearchResults completed');
    setContactsLoaded(true);
    setLastExecutedQuery(query); // Store the last executed query
    setInputHasChanged(false); // Reset the input changed flag
    
    // Show contact discovery report for any search with companies
    const companiesWithContacts = results.filter(company => 
      company.contacts && company.contacts.length > 0
    ).length;
    
    console.log("Companies with contacts:", companiesWithContacts, "of", results.length);
    
    // Don't show the report during progressive updates - let it be shown when search completes
    // The report will be shown via onSearchMetricsUpdate callback from PromptEditor
    
    // Auto-create/update list after search completes with contacts
    // Clear any pending timeout to prevent duplicate calls
    if (listUpdateTimeoutRef.current) {
      clearTimeout(listUpdateTimeoutRef.current);
    }
    
    if (sortedResults.length > 0) {
      // Capture values at timeout creation to avoid race conditions
      const queryAtTimeOfResults = query;
      const resultsAtTimeOfResults = sortedResults;
      // IMPORTANT: For new searches, always create a new list
      // Don't use currentListId if this is a new search - force null to create new list
      const listIdAtTimeOfResults = isNewSearch ? null : currentListId;
      
      // Debounce list creation/update to prevent duplicate calls during progressive updates
      listUpdateTimeoutRef.current = setTimeout(() => {
        console.log('[LIST CREATION TIMER] Timer fired after 1.5s:', {
          listIdAtTimeOfResults,
          queryAtTimeOfResults,
          resultsCount: resultsAtTimeOfResults.length,
          mutationInProgress: listMutationInProgressRef.current
        });
        
        // Check if a mutation is already in progress
        if (listMutationInProgressRef.current) {
          console.log('[LIST CREATION TIMER] List mutation already in progress, skipping duplicate call');
          return;
        }
        
        if (!listIdAtTimeOfResults) {
          // Create new list (for new searches or when no list exists)
          console.log('[LIST CREATION TIMER] Creating new list for search results (new search or no existing list)');
          listMutationInProgressRef.current = true;
          autoCreateListMutation.mutate({ 
            query: queryAtTimeOfResults, 
            companies: resultsAtTimeOfResults 
          });
        } else {
          // Update existing list (only for progressive updates of same search)
          console.log('[LIST CREATION TIMER] Updating existing list:', listIdAtTimeOfResults);
          listMutationInProgressRef.current = true;
          updateListMutation.mutate({ 
            query: queryAtTimeOfResults, 
            companies: resultsAtTimeOfResults,
            listId: listIdAtTimeOfResults
          });
        }
      }, 1500); // 1.5 second delay to allow progressive updates to settle
    }
    
    // Keep isFromLandingPage true until email button is clicked
    // (removed automatic reset to allow email tooltip to show)
  };

  

  // Get top prospects from all companies
  const getTopProspects = (): ContactWithCompanyInfo[] => {
    if (!currentResults) return [];

    const allContacts: ContactWithCompanyInfo[] = [];
    currentResults.forEach(company => {
      if (company.contacts) {
        allContacts.push(...company.contacts);
      }
    });

    // Use the filtering logic
    return filterTopProspects(allContacts, {
      maxPerCompany: 3,
      minProbability: 50
    });
  };

  // Updated navigation handlers
  const handleContactView = (contactId: number) => {
    if (typeof contactId !== 'number') {
      console.error('Invalid contact ID:', contactId);
      return;
    }
    console.log('Navigating to contact:', contactId);
    setLocation(`/contacts/${contactId}`);
  };

  const handleCompanyView = (companyId: number) => {
    if (typeof companyId !== 'number') {
      console.error('Invalid company ID:', companyId);
      return;
    }
    console.log('Navigating to company:', { companyId });
    setLocation(`/companies/${companyId}`);
  };


  const enrichContactMutation = useMutation({
    mutationFn: async ({ contactId, silent = false, searchContext = 'manual' }: { contactId: number; silent?: boolean; searchContext?: 'manual' | 'automated' }) => {
      // Add this contact ID to the set of pending contacts
      setPendingContactIds(prev => {
        const newSet = new Set(prev);
        newSet.add(contactId);
        return newSet;
      });
      const response = await apiRequest("POST", `/api/contacts/${contactId}/enrich`);
      return {data: await response.json(), contactId, silent, searchContext};
    },
    onSuccess: async (result) => {
      // The data, contactId, silent flag, and searchContext that was processed
      const {data, contactId, silent = false, searchContext = 'manual'} = result;
      
      // Update the currentResults with the enriched contact - use a safer update pattern
      setCurrentResults(prev => {
        if (!prev) return null;
        
        // Make sure we're only updating this specific contact without disturbing other state
        return prev.map(company => {
          // Only update the company that contains this contact
          if (!company.contacts?.some(c => c.id === data.id)) {
            return company;
          }
          
          return {
            ...company,
            contacts: company.contacts?.map(contact =>
              contact.id === data.id ? data : contact
            )
          };
        });
      });
      
      // Remove this contact ID from the set of pending contacts
      setPendingContactIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(contactId);
        return newSet;
      });
      
      // Mark list as needing update since contact data changed
      if (currentListId) {
        setIsSaved(false);
      }

      // CREDIT BILLING ON EMAIL SUCCESS (only for manual searches, not automated/comprehensive)
      if (data.email && searchContext === 'manual') {
        try {
          const creditResponse = await apiRequest("POST", "/api/credits/deduct-individual-email", {
            contactId,
            searchType: 'perplexity',
            emailFound: true
          });
          const creditResult = await creditResponse.json();
          
          console.log('Perplexity credit billing result:', creditResult);

          // Refresh credits display
          if (creditResult.success) {
            await queryClient.invalidateQueries({ queryKey: ['/api/credits'] });
          }
        } catch (error) {
          console.error('Perplexity credit billing failed:', error);
        }
      }
      
      // Only show notifications if not silent
      if (!silent) {
        if (!emailOrchestration.isSearching && !isAutomatedSearchRef.current) {
          toast({
            title: "Email Search Complete",
            description: `${data.name}: ${data.email 
              ? "Successfully found email address."
              : "No email found for this contact."}`,
          });
        } else if (emailOrchestration.isSearching && data.email) {
          // During consolidated search, only show when we find an email
          toast({
            title: "Email Search Complete",
            description: `${data.name}: Successfully found email address.`,
          });
        }
      }
    },
    onError: (error, variables) => {
      const { contactId, silent = false } = variables; // Destructure from variables
      
      // Remove this contact ID from the set of pending contacts
      setPendingContactIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(contactId as number);
        return newSet;
      });
      
      if (!silent) {
        toast({
          title: "Email Search Failed",
          description: error instanceof Error ? error.message : "Failed to find contact's email",
          variant: "destructive",
        });
      }
    },
  });

  // PRE-SEARCH CREDIT CHECK (same as other APIs)
  const handleEnrichContact = async (contactId: number, silent: boolean = false, searchContext: 'manual' | 'automated' = 'manual') => {
    // Only prevent if this specific contact is already being processed
    if (pendingContactIds.has(contactId)) return;
    
    // Check credits before manual search (automated searches bypass this)
    if (!isAutomatedSearchRef.current) {
      try {
        const creditResponse = await apiRequest("GET", "/api/credits");
        const creditData = await creditResponse.json();
        
        if (creditData.isBlocked || creditData.balance < 20) {
          toast({
            title: "Insufficient Credits",
            description: `You need 20 credits for individual email search. Current balance: ${creditData.balance}`,
            variant: "destructive"
          });
          return;
        }
      } catch (error) {
        console.error('Credit check failed:', error);
        // Continue with search if credit check fails
      }
    }
    
    enrichContactMutation.mutate({ contactId, silent, searchContext });
  };

  const isContactEnriched = (contact: Contact) => {
    // Consider a contact "enriched" if it's been processed, even if no data was found
    return contact.completedSearches?.includes('contact_enrichment') || false;
  };

  const isContactPending = (contactId: number) => {
    return pendingContactIds.has(contactId);
  };

  // Add mutation for contact feedback
  const feedbackMutation = useMutation({
    mutationFn: async ({ contactId, feedbackType }: { contactId: number; feedbackType: string }) => {
      const response = await apiRequest("POST", `/api/contacts/${contactId}/feedback`, {
        feedbackType,
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Update the contact in the results
      setCurrentResults((prev) => {
        if (!prev) return null;
        return prev.map((company) => ({
          ...company,
          contacts: company.contacts?.map((contact) =>
            contact.id === data.contactId
              ? {
                  ...contact,
                  userFeedbackScore: data.userFeedbackScore,
                  feedbackCount: data.feedbackCount,
                }
              : contact
          ),
        }));
      });

      toast({
        title: "Feedback Recorded",
        description: "Thank you for helping improve our contact validation!",
      });
    },
    onError: (error) => {
      toast({
        title: "Feedback Failed",
        description: error instanceof Error ? error.message : "Failed to record feedback",
        variant: "destructive",
      });
    },
  });

  const handleContactFeedback = (contactId: number, feedbackType: string) => {
    feedbackMutation.mutate({ contactId, feedbackType });
  };

  const handleEnrichProspects = async (prospects: ContactWithCompanyInfo[]) => {
    if (prospects.length === 0) {
      toast({
        title: "No Prospects",
        description: "There are no high-probability prospects to enrich.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get all contact IDs regardless of company
      const contactIds = prospects.map(contact => contact.id);

      // Send all contacts for enrichment in a single request
      const response = await apiRequest("POST", `/api/enrich-contacts`, {
        contactIds
      });
      const data = await response.json();

      toast({
        title: "Email Search Started",
        description: `Searching for emails for ${contactIds.length} top prospects`,
      });

      // Start polling for completion
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await apiRequest("GET", `/api/enrichment/${data.queueId}/status`);
          const statusData = await statusResponse.json();

          if (statusData.status === 'completed') {
            clearInterval(pollInterval);
            // Refresh all contacts that were enriched
            const updatedContacts = await Promise.all(
              contactIds.map(async (id) => {
                const contactResponse = await apiRequest("GET", `/api/contacts/${id}`);
                return contactResponse.json();
              })
            );

            // Update the currentResults with the enriched contacts
            setCurrentResults(prev => {
              if (!prev) return null;
              return prev.map(company => ({
                ...company,
                contacts: company.contacts?.map(contact =>
                  updatedContacts.find(uc => uc.id === contact.id) || contact
                )
              }));
            });

            toast({
              title: "Email Search Complete",
              description: `Successfully found emails for ${statusData.completedItems} contacts`,
            });
          } else if (statusData.status === 'failed') {
            clearInterval(pollInterval);
            toast({
              title: "Email Search Failed",
              description: "Failed to complete email search",
              variant: "destructive",
            });
          }
        } catch (error) {
          clearInterval(pollInterval);
          console.error('Status check error:', error);
        }
      }, 2000); // Check every 2 seconds

      // Clear interval after 5 minutes to prevent infinite polling
      setTimeout(() => clearInterval(pollInterval), 300000);

    } catch (error) {
      toast({
        title: "Email Search Failed",
        description: error instanceof Error ? error.message : "Failed to start email search",
        variant: "destructive",
      });
    }
  };

  // Handle loading a saved search from the drawer
  const handleLoadSavedSearch = async (list: SearchList) => {
    console.log('Loading saved search:', {
      searchName: list.prompt,
      listId: list.listId,
      resultCount: list.resultCount
    });
    
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
      
      // Set all state for loaded search
      setCurrentQuery(list.prompt);
      setLastExecutedQuery(list.prompt); // Update lastExecutedQuery to sync the search input
      setCurrentResults(companiesWithContacts);
      setCurrentListId(list.listId);
      setIsSaved(true);
      setSavedSearchesDrawerOpen(false);
      
      console.log('Saved search loaded successfully:', {
        query: list.prompt,
        listId: list.listId,
        companiesLoaded: companiesWithContacts.length,
        totalContacts: companiesWithContacts.reduce((sum, c) => sum + (c.contacts?.length || 0), 0)
      });
      
      // Force input change flag to false after a small delay to ensure proper state update
      setTimeout(() => {
        setInputHasChanged(false);
      }, 0);
      
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
  };

  // Handle starting a new search - resets to clean state
  const handleNewSearch = () => {
    // Clear all search state
    setCurrentQuery("");
    setCurrentResults(null);
    setCurrentListId(null);
    setLastExecutedQuery(null);
    setIsSaved(false);
    setInputHasChanged(false);
    setSelectedContacts(new Set());
    setHighlightEmailButton(false);
    setContactsLoaded(false);
    
    // Expand the search section
    setSearchSectionCollapsed(false);
    
    // Clear localStorage saved state
    localStorage.removeItem('searchState');
    
    // Close the drawer
    setSavedSearchesDrawerOpen(false);
  };

  //New function added here
  const getEnrichButtonText = (contact: Contact) => {
    if (isContactPending(contact.id)) return "Processing...";
    if (isContactEnriched(contact)) {
      const hasEnrichedData = contact.email || contact.linkedinUrl || contact.phoneNumber || contact.department;
      return hasEnrichedData ? "Enriched" : "No Data Found";
    }
    return "Enrich";
  };

  const getEnrichButtonClass = (contact: Contact) => {
    if (isContactEnriched(contact)) {
      const hasEnrichedData = contact.email || contact.linkedinUrl || contact.phoneNumber || contact.department;
      return hasEnrichedData ? "text-green-500" : "text-muted-foreground opacity-50";
    }
    return "";
  };

  // Enhanced Hunter.io mutation with improved error handling
  const hunterMutation = useMutation({
    mutationFn: async ({ contactId, searchContext = 'manual', silent = false }: { contactId: number; searchContext?: 'manual' | 'automated'; silent?: boolean }) => {
      // Add this contact ID to the set of pending searches
      setPendingHunterIds(prev => {
        const newSet = new Set(prev);
        newSet.add(contactId);
        return newSet;
      });
      
      const response = await apiRequest("POST", `/api/contacts/${contactId}/hunter`);
      const responseData = await response.json();
      
      // Handle both success and "no email found" responses
      if (response.status === 422) {
        // 422 means search completed but no email found
        return {
          data: responseData.contact,
          contactId,
          searchContext,
          silent,
          searchMetadata: responseData.searchMetadata,
          success: true,
          emailFound: false
        };
      } else if (!response.ok) {
        throw new Error(responseData.message || "Search failed");
      }
      
      return {
        data: responseData,
        contactId,
        searchContext,
        silent,
        success: true,
        emailFound: !!responseData.email
      };
    },
    onSuccess: async (result) => {
      const {data, contactId, searchContext, searchMetadata, emailFound, silent = false} = result;
      
      // Process credit billing for successful email discoveries (only for manual searches)
      if (emailFound && searchContext === 'manual') {
        try {
          const creditResponse = await apiRequest("POST", "/api/credits/deduct-individual-email", {
            contactId,
            searchType: 'hunter',
            emailFound: true
          });
          
          const creditResult = await creditResponse.json();
          console.log('Hunter credit billing result:', creditResult);
          
          // Refresh credits display
          if (creditResult.success) {
            queryClient.invalidateQueries({ queryKey: ['/api/credits'] });
          }
        } catch (creditError) {
          console.error('Hunter credit billing failed:', creditError);
          // Don't block user experience for billing errors
        }
      }
      
      // Update the contact in the results
      let updatedResults: CompanyWithContacts[] | null = null;
      setCurrentResults(prev => {
        if (!prev) return null;
        
        updatedResults = prev.map(company => {
          if (!company.contacts?.some(c => c.id === data.id)) {
            return company;
          }
          
          return {
            ...company,
            contacts: company.contacts?.map(contact =>
              contact.id === data.id ? data : contact
            )
          };
        });
        
        return updatedResults;
      });
      
      // Immediately update localStorage to prevent losing emails on quick navigation
      if (updatedResults) {
        // Save lastExecutedQuery as currentQuery to ensure consistency
        const queryToSave = lastExecutedQuery || currentQuery;
        const stateToSave: SavedSearchState = {
          currentQuery: queryToSave,
          currentResults: updatedResults,
          currentListId,
          lastExecutedQuery
        };
        localStorage.setItem('searchState', JSON.stringify(stateToSave));
        sessionStorage.setItem('searchState', JSON.stringify(stateToSave));
        console.log('Hunter.io: Immediately saved email to localStorage for persistence');
      }
      
      // If we have a saved list, update it in the database to ensure persistence
      if (currentListId && updatedResults) {
        console.log('Hunter.io: Updating list in database with new email');
        // Use silent update without toast notification
        apiRequest("PUT", `/api/lists/${currentListId}`, {
          companies: updatedResults,
          prompt: currentQuery,
          contactSearchConfig: (() => {
            const savedConfig = localStorage.getItem('contactSearchConfig');
            if (savedConfig) {
              try {
                return JSON.parse(savedConfig);
              } catch (error) {
                return null;
              }
            }
            return null;
          })()
        }).then(() => {
          console.log('Hunter.io: List updated in database successfully');
        }).catch(error => {
          console.error('Hunter.io: Failed to update list in database:', error);
        });
      }
      
      // Remove this contact ID from the set of pending searches
      setPendingHunterIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(contactId);
        return newSet;
      });
      
      // Enhanced toast notifications with search metadata
      if (!silent) {
        if (searchContext === 'manual') {
          const confidence = searchMetadata?.confidence || data.nameConfidenceScore;
          const retryInfo = searchMetadata?.retryCount > 0 ? ` (${searchMetadata.retryCount + 1} attempts)` : '';
          
          toast({
            title: "Hunter.io Search Complete",
            description: `${data.name}: ${emailFound 
              ? `Found email with ${confidence || 'unknown'} confidence${retryInfo}.`
              : `No email found${retryInfo}.`}`,
          });
        } else if (searchContext === 'automated' && emailFound) {
          toast({
            title: "Email Found",
            description: `${data.name}: Successfully found email address.`,
          });
        }
      }
    },
    onError: (error, variables) => {
      const { contactId, searchContext, silent = false } = variables;
      
      // Remove this contact ID from the set of pending searches
      setPendingHunterIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(contactId);
        return newSet;
      });
      
      // Enhanced error handling with retry suggestions
      if (!silent) {
        if (searchContext === 'manual') {
          const isRetryable = error instanceof Error && 
            (error.message.includes('rate limit') || error.message.includes('network'));
          
          toast({
            title: "Hunter.io Search Failed",
            description: `${error instanceof Error ? error.message : "Failed to find contact email"}${
              isRetryable ? ' - You can try again in a moment.' : ''
            }`,
            variant: "destructive",
          });
        }
      }
    },
  });
  
  // Handler for Hunter.io search with credit checking
  const handleHunterSearch = async (contactId: number, searchContext: 'manual' | 'automated' = 'manual', silent: boolean = false) => {
    // Allow multiple searches to run in parallel
    if (pendingHunterIds.has(contactId)) return; // Only prevent if this specific contact is already being processed
    
    // Check credits before starting search (only for manual searches)
    if (searchContext === 'manual') {
      try {
        const creditsResponse = await apiRequest("GET", "/api/credits");
        const creditsData = await creditsResponse.json();
        
        if (creditsData.currentBalance < 20) { // 20 credits needed for individual email search
          toast({
            title: "Insufficient Credits",
            description: `You need 20 credits for Hunter email search. Current balance: ${creditsData.currentBalance}`,
            variant: "destructive",
          });
          return;
        }
      } catch (error) {
        console.error('Credit check failed:', error);
        // Continue with search if credit check fails to avoid blocking user
      }
    }
    
    hunterMutation.mutate({ contactId, searchContext, silent });
  };
  
  // Hunter.io helpers
  const isHunterSearchComplete = (contact: Contact) => {
    return contact.completedSearches?.includes('hunter_search') || false;
  };

  const isHunterPending = (contactId: number) => {
    return pendingHunterIds.has(contactId);
  };

  const getHunterButtonClass = (contact: Contact) => {
    if (isHunterSearchComplete(contact)) {
      return contact.email ? "text-blue-500" : "text-muted-foreground opacity-50";
    }
    return "";
  };
  
  // Apollo.io helpers
  const isApolloSearchComplete = (contact: Contact) => {
    return contact.completedSearches?.includes('apollo_search') || false;
  };

  const isApolloPending = (contactId: number) => {
    return pendingApolloIds.has(contactId);
  };
  
  // State for other UI components not handled by extracted hooks
  const [contactReportVisible, setContactReportVisible] = useState(false);
  const [mainSummaryVisible, setMainSummaryVisible] = useState(false);
  const [mainSearchMetrics, setMainSearchMetrics] = useState({
    query: "",
    totalCompanies: 0,
    totalContacts: 0,
    totalEmails: 0,
    searchDuration: 0,
    companies: [] as any[]
  });
  

  // Email tooltip timing effect
  useEffect(() => {
    // Show email tooltip 5 seconds after first search completes (only once per session)
    if (currentResults && currentResults.length > 0 && !isAnalyzing && !hasShownEmailTooltip) {
      const timer = setTimeout(async () => {
        setShowEmailTooltip(true);
        setHasShownEmailTooltip(true); // Mark as shown
        
        // Mark email tooltip as shown for authenticated users
        if (auth?.user) {
          try {
            await fetch('/api/notifications/mark-shown', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(localStorage.getItem('authToken') && { 
                  'Authorization': `Bearer ${localStorage.getItem('authToken')}` 
                })
              },
              credentials: 'include',
              body: JSON.stringify({ notificationId: 3 })
            });
          } catch (error) {
            console.error('Failed to mark email tooltip as shown:', error);
          }
        }
        
        setTimeout(() => {
          setShowEmailTooltip(false);
        }, 5000);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [currentResults, isAnalyzing, hasShownEmailTooltip, auth?.user]);

  // Helper to get a contact by ID from current results
  const getCurrentContact = (contactId: number) => {
    if (!currentResults) return null;
    
    for (const company of currentResults) {
      const contact = company.contacts?.find(c => c.id === contactId);
      if (contact) return contact;
    }
    return null;
  };

  // Helper to get the best contact from a company for email search
  const getBestContact = (company: any) => {
    return emailOrchestration.getTopContacts(company, 1)[0];
  };

  // Helper function to finish search with cache invalidation
  const finishSearch = async () => {
    try {
      // Clear browser cache to force fresh requests
      Object.keys(localStorage).forEach(key => {
        if (key.includes('contact') || key.includes('company') || key.includes('search')) {
          localStorage.removeItem(key);
        }
      });
      sessionStorage.clear();
      
      // Fetch fresh contact data with cache-busting timestamp
      const cacheTimestamp = Date.now();
      
      if (currentResults && currentResults.length > 0) {
        // Use unified refresh helper with UI reset for animation effects
        await refreshAndUpdateResults(
          currentResults,
          {
            currentQuery: currentQuery,
            currentListId: currentListId,
            lastExecutedQuery: lastExecutedQuery
          },
          {
            forceUiReset: true,  // Force UI re-render for animations
            forceFresh: true  // Enable cache-busting
          }
        );
        
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (error) {
      console.error("Cache refresh failed:", error);
    }
    
    // Reset automated search flag
    isAutomatedSearchRef.current = false;
  };

  // Helper function to finish search without triggering list creation
  const finishSearchWithoutSave = async () => {
    try {
      // All the cache refresh logic from finishSearch() but without save operations
      if (currentResults && currentResults.length > 0) {
        // Use unified refresh helper with UI reset for animation effects
        await refreshAndUpdateResults(
          currentResults,
          {
            currentQuery: currentQuery,
            currentListId: currentListId,
            lastExecutedQuery: lastExecutedQuery
          },
          {
            forceUiReset: true,  // Force UI re-render for animations
            forceFresh: true  // Enable cache-busting
          }
        );
        
        console.log('finishSearchWithoutSave: Updated localStorage with refreshed data');
        
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (error) {
      console.error("Cache refresh failed:", error);
    }
    
    // Reset automated search flag
    isAutomatedSearchRef.current = false;
  };

  // Add delay helper for throttling API requests
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const getApolloButtonClass = (contact: Contact) => {
    if (isApolloSearchComplete(contact)) {
      return contact.email ? "text-purple-500" : "text-muted-foreground opacity-50";
    }
    return "";
  };
  
  // Enhanced Apollo.io mutation with improved error handling
  const apolloMutation = useMutation({
    mutationFn: async ({ contactId, searchContext = 'manual', silent = false }: { contactId: number; searchContext?: 'manual' | 'automated'; silent?: boolean }) => {
      // Add this contact ID to the set of pending searches
      setPendingApolloIds(prev => {
        const newSet = new Set(prev);
        newSet.add(contactId);
        return newSet;
      });
      
      const response = await apiRequest("POST", `/api/contacts/${contactId}/apollo`);
      const responseData = await response.json();
      
      // Handle both success and "no email found" responses
      if (response.status === 422) {
        // 422 means search completed but no email found
        return {
          data: responseData.contact,
          contactId,
          searchContext,
          silent,
          searchMetadata: responseData.searchMetadata,
          success: true,
          emailFound: false
        };
      } else if (!response.ok) {
        throw new Error(responseData.message || "Search failed");
      }
      
      return {
        data: responseData,
        contactId,
        searchContext,
        silent,
        success: true,
        emailFound: !!responseData.email
      };
    },
    onSuccess: async (result) => {
      const {data, contactId, searchContext, searchMetadata, emailFound, silent = false} = result;
      
      // Process credit billing for successful email discoveries (only for manual searches)
      if (emailFound && searchContext === 'manual') {
        try {
          const creditResponse = await apiRequest("POST", "/api/credits/deduct-individual-email", {
            contactId,
            searchType: 'apollo',
            emailFound: true
          });
          
          const creditResult = await creditResponse.json();
          console.log('Apollo credit billing result:', creditResult);
          
          // Refresh credits display
          if (creditResult.success) {
            queryClient.invalidateQueries({ queryKey: ['/api/credits'] });
          }
        } catch (creditError) {
          console.error('Apollo credit billing failed:', creditError);
          // Don't block user experience for billing errors
        }
      }
      
      // Update the contact in the results
      let updatedResults: CompanyWithContacts[] | null = null;
      setCurrentResults(prev => {
        if (!prev) return null;
        
        updatedResults = prev.map(company => {
          if (!company.contacts?.some(c => c.id === data.id)) {
            return company;
          }
          
          return {
            ...company,
            contacts: company.contacts?.map(contact =>
              contact.id === data.id ? data : contact
            )
          };
        });
        
        return updatedResults;
      });
      
      // Immediately update localStorage to prevent losing emails on quick navigation
      if (updatedResults) {
        // Save lastExecutedQuery as currentQuery to ensure consistency
        const queryToSave = lastExecutedQuery || currentQuery;
        const stateToSave: SavedSearchState = {
          currentQuery: queryToSave,
          currentResults: updatedResults,
          currentListId,
          lastExecutedQuery
        };
        localStorage.setItem('searchState', JSON.stringify(stateToSave));
        sessionStorage.setItem('searchState', JSON.stringify(stateToSave));
        console.log('Apollo.io: Immediately saved email to localStorage for persistence');
      }
      
      // If we have a saved list, update it in the database to ensure persistence
      if (currentListId && updatedResults) {
        console.log('Apollo.io: Updating list in database with new email');
        // Use silent update without toast notification
        apiRequest("PUT", `/api/lists/${currentListId}`, {
          companies: updatedResults,
          prompt: currentQuery,
          contactSearchConfig: (() => {
            const savedConfig = localStorage.getItem('contactSearchConfig');
            if (savedConfig) {
              try {
                return JSON.parse(savedConfig);
              } catch (error) {
                return null;
              }
            }
            return null;
          })()
        }).then(() => {
          console.log('Apollo.io: List updated in database successfully');
        }).catch(error => {
          console.error('Apollo.io: Failed to update list in database:', error);
        });
      }
      
      // Remove this contact ID from the set of pending searches
      setPendingApolloIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(contactId);
        return newSet;
      });
      
      // Enhanced toast notifications with search metadata
      if (!silent) {
        if (searchContext === 'manual') {
          const confidence = searchMetadata?.confidence || data.nameConfidenceScore;
          const retryInfo = searchMetadata?.retryCount > 0 ? ` (${searchMetadata.retryCount + 1} attempts)` : '';
          const additionalData = data.linkedinUrl || data.phoneNumber ? ' + profile data' : '';
          
          toast({
            title: "Apollo.io Search Complete",
            description: `${data.name}: ${emailFound 
              ? `Found email with ${confidence || 'unknown'} confidence${additionalData}${retryInfo}.`
              : `No email found${additionalData ? ', but found other profile data' : ''}${retryInfo}.`}`,
          });
        } else if (searchContext === 'automated' && emailFound) {
          toast({
            title: "Email Found",
            description: `${data.name}: Successfully found email address.`,
          });
        }
      }
    },
    onError: (error, variables) => {
      const { contactId, searchContext, silent = false } = variables;
      
      // Remove this contact ID from the set of pending searches
      setPendingApolloIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(contactId);
        return newSet;
      });
      
      // Enhanced error handling with retry suggestions
      if (!silent) {
        if (searchContext === 'manual') {
          const isRetryable = error instanceof Error && 
            (error.message.includes('rate limit') || error.message.includes('network'));
          
          toast({
            title: "Apollo.io Search Failed",
            description: `${error instanceof Error ? error.message : "Failed to find contact email"}${
              isRetryable ? ' - You can try again in a moment.' : ''
            }`,
            variant: "destructive",
          });
        }
      }
    },
  });
  
  // Handler for Apollo.io search with credit checking
  const handleApolloSearch = async (contactId: number, searchContext: 'manual' | 'automated' = 'manual', silent: boolean = false) => {
    // Allow multiple searches to run in parallel
    if (pendingApolloIds.has(contactId)) return; // Only prevent if this specific contact is already being processed
    
    // Check credits before starting search (only for manual searches)
    if (searchContext === 'manual') {
      try {
        const creditsResponse = await apiRequest("GET", "/api/credits");
        const creditsData = await creditsResponse.json();
        
        if (creditsData.currentBalance < 20) { // 20 credits needed for individual email search
          toast({
            title: "Insufficient Credits",
            description: `You need 20 credits for Apollo email search. Current balance: ${creditsData.currentBalance}`,
            variant: "destructive",
          });
          return;
        }
      } catch (error) {
        console.error('Credit check failed:', error);
        // Continue with search if credit check fails to avoid blocking user
      }
    }
    
    apolloMutation.mutate({ contactId, searchContext, silent });
  };

  // Wrapper function for comprehensive email search using the shared hook
  const handleComprehensiveEmailSearch = async (contactId: number) => {
    // Get contact data from current results
    const contact = currentResults?.flatMap(c => c.contacts || []).find(ct => ct.id === contactId);
    if (!contact) return;
    
    // Get company data for search context
    const company = currentResults?.find(c => c.contacts?.some(ct => ct.id === contactId));
    
    // Call the shared hook function
    await comprehensiveSearchHook(contactId, contact, {
      companyName: company?.name,
      companyWebsite: company?.website || undefined,
      companyDescription: company?.description || undefined
    });
  };
  
  // Functions for checkbox selection
  const handleCheckboxChange = (contactId: number) => {
    setSelectedContacts(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(contactId)) {
        newSelected.delete(contactId);
      } else {
        newSelected.add(contactId);
      }
      return newSelected;
    });
  };

  const isContactSelected = (contactId: number) => {
    return selectedContacts.has(contactId);
  };

  const handleSelectAllContacts = () => {
    const prospects = getTopProspects();
    if (prospects.length === 0) return;
    
    // If all are already selected, deselect all
    if (prospects.every(contact => selectedContacts.has(contact.id))) {
      setSelectedContacts(new Set());
    } else {
      // Otherwise select all
      setSelectedContacts(new Set(prospects.map(contact => contact.id)));
    }
  };

  // Get selected contacts for batch operations
  const getSelectedProspects = () => {
    return getTopProspects().filter(contact => selectedContacts.has(contact.id));
  };

  return (
    <>
      {/* Main Search Summary Modal - Rendered at root level to avoid overflow clipping */}
      <MainSearchSummary
        query={mainSearchMetrics.query}
        totalCompanies={mainSearchMetrics.totalCompanies}
        totalContacts={mainSearchMetrics.totalContacts}
        totalEmails={mainSearchMetrics.totalEmails}
        searchDuration={mainSearchMetrics.searchDuration}
        isVisible={mainSummaryVisible}
        onClose={() => setMainSummaryVisible(false)}
        companies={mainSearchMetrics.companies}
      />
      
      <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden relative">
        {/* Backdrop for mobile */}
      {emailDrawer.isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => {
            emailDrawer.closeDrawer();
          }}
        />
      )}
      
      {/* Main Content Container - will be compressed when drawer opens on desktop */}
      <div className={`flex-1 overflow-y-auto main-content-compressed ${emailDrawer.isOpen ? 'compressed-view' : ''}`}>
        <div className="container mx-auto py-6 px-0 md:px-6">
          {/* Intro tour modal has been removed */}

          <div className="grid grid-cols-12 gap-3 md:gap-6">
            {/* Main Content Area - full width */}
            <div className="col-span-12 space-y-2 md:space-y-4 mt-[-10px]">
          {/* Search Section - Collapsible with Focus State */}
          <div className="relative transition-all duration-300 ease-in-out">
            {/* Collapsed Header - Only visible when collapsed */}
            {searchSectionCollapsed && (
              <button
                onClick={() => setSearchSectionCollapsed(false)}
                className="w-full px-3 md:px-6 py-2 bg-background border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors flex items-center justify-between group mb-2"
                data-testid="button-expand-search"
              >
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  {currentQuery && (
                    <span className="text-sm text-muted-foreground truncate max-w-[200px] md:max-w-[400px]">
                      {currentQuery}
                    </span>
                  )}
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>
            )}
            
            {/* Expandable Search Content */}
            <div 
              className={`transition-all duration-300 ease-in-out overflow-hidden ${
                searchSectionCollapsed 
                  ? 'max-h-0 opacity-0 pointer-events-none' 
                  : 'max-h-[500px] opacity-100'
              }`}
            >
              <div className="px-3 md:px-6 py-1"> {/* Reduced mobile padding, matched desktop padding with CardHeader (p-6) */}
                {/* Collapse button when expanded */}
                {!searchSectionCollapsed && (emailDrawer.isOpen || (currentResults && currentResults.length > 0)) && (
                  <button
                    onClick={() => setSearchSectionCollapsed(true)}
                    className="absolute right-3 md:right-6 top-2 z-10 p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                    data-testid="button-collapse-search"
                    title="Minimize search"
                  >
                    <ChevronUp className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                  </button>
                )}
                
                {!currentResults && (
                  <div className="flex flex-col-reverse md:flex-row items-center gap-4 mb-3">
                    <div className="flex items-center gap-3">
                      <EggAnimation />
                      <h2 className="text-2xl mt-2 md:mt-0">Search for target businesses</h2>
                    </div>
                  </div>
                )}
                <Suspense fallback={<div className="h-32 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse"></div>}>
                  <PromptEditor
                    onAnalyze={() => {
                      setIsAnalyzing(true);
                      // Clear list ID when starting a NEW search (different query)
                      if (currentQuery && currentQuery !== lastExecutedQuery) {
                        console.log('Starting new search - clearing list ID for query:', currentQuery);
                        setCurrentListId(null);
                        setIsSaved(false);
                      }
                    }}
                    onComplete={handleAnalysisComplete}
                    onSearchResults={handleSearchResults}
                    onCompaniesReceived={handleCompaniesReceived}
                    isAnalyzing={isAnalyzing}
                    value={currentQuery || ""}
                    onChange={(newValue) => {
                      setCurrentQuery(newValue);
                      setInputHasChanged(newValue !== lastExecutedQuery);
                    }}
                    isFromLandingPage={isFromLandingPage}
                    onDismissLandingHint={() => setIsFromLandingPage(false)}
                    lastExecutedQuery={lastExecutedQuery}
                    onSearchSuccess={() => {
                      const selectedSearchType = localStorage.getItem('searchType') || 'contacts';
                      if (selectedSearchType === 'emails') {
                        // Auto-trigger email search for full flow
                        setTimeout(() => emailOrchestration.runEmailSearch(), 500);
                      } else {
                        // Standard behavior - highlight email button
                        setHighlightEmailButton(true);
                        setTimeout(() => setHighlightEmailButton(false), 25000);
                      }
                    }}
                    hasSearchResults={currentResults ? currentResults.length > 0 : false}
                    onSessionIdChange={setCurrentSessionId}
                    hideRoleButtons={!!(currentResults && currentResults.length > 0 && !inputHasChanged)}
                    onSearchMetricsUpdate={(metrics, showSummary) => {
                      setMainSearchMetrics(metrics);
                      setMainSummaryVisible(showSummary);
                      // Show contact report only when search completes and has actual contacts
                      if (showSummary && metrics.totalCompanies > 0 && metrics.totalContacts > 0) {
                        setContactReportVisible(true);
                        // Show email summary if search type was 'emails' and emails were found
                        if (metrics.searchType === 'emails' && metrics.totalEmails && metrics.totalEmails > 0) {
                          emailOrchestration.updateEmailSearchMetrics(
                            metrics.totalEmails,
                            metrics.sourceBreakdown || { Perplexity: metrics.totalEmails, Apollo: 0, Hunter: 0 }
                          );
                        }
                      }
                    }}
                  />
                </Suspense>
                
                {/* Action buttons menu - Moved here from search results, Hidden in focus mode and active search state */}
                {currentResults && currentResults.length > 0 && !inputHasChanged && !emailDrawer.isOpen && (
                  <div className="px-0 py-3 flex items-center justify-between bg-white dark:bg-transparent transition-all duration-300">
                    <div className="flex items-center gap-2">
                    <div className="relative">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className={`flex items-center gap-1 h-8 ${
                          highlightEmailButton 
                            ? 'email-button-highlight' 
                            : 'opacity-45 hover:opacity-100 hover:bg-white'
                        } transition-all`}
                        onClick={() => {
                          try {
                            if (isFromLandingPage && setIsFromLandingPage) {
                              setIsFromLandingPage(false);
                            }
                          } catch (e) {
                            // Silent fail - prevents error from showing to users
                          }
                          emailOrchestration.runEmailSearch();
                        }}
                        disabled={emailOrchestration.isSearching}
                      >
                        <Mail className={`h-4 w-4 ${emailOrchestration.isSearching ? "animate-spin" : ""}`} />
                        <span>{emailOrchestration.isSearching ? "Searching..." : "Find Key Emails"}</span>
                      </Button>
                      
                      <LandingPageTooltip
                        message="Click here to find Egg-cellent emails of wonderful people."
                        visible={showEmailTooltip && !(isAnalyzing || emailOrchestration.isSearching)}
                        position="custom"
                        offsetX={-10}
                      />
                    </div>
                    
                    <ExtendSearchButton
                      query={currentQuery || ''}
                      currentResults={currentResults || []}
                      onResultsExtended={handleSearchResults}
                      onLoginRequired={() => registrationModal.openModal()}
                      isAuthenticated={!!auth.user}
                      className="opacity-45 hover:opacity-100 hover:bg-white transition-all"
                    />
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex items-center gap-1 h-8 opacity-45 hover:opacity-100 hover:bg-white transition-all"
                          >
                            <ChevronDown className="h-4 w-4" />
                            <span className="hidden md:inline">Expand</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p className="text-xs">Expand or collapse all company rows of contacts</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Companies Analysis Section - Moved to top */}
          {currentResults && currentResults.length > 0 ? (
            <Card className={`w-full rounded-none md:rounded-lg border-0 transition-all duration-300 ${emailDrawer.isOpen ? 'shadow-none' : ''}`}>
              
              {/* Contact Discovery Report - with reduced padding */}
              {contactReportVisible && (
                <div className="px-0 md:px-4 pt-0 pb-2">
                  <ContactDiscoveryReport 
                    companiesWithContacts={currentResults?.filter(company => 
                      company.contacts && company.contacts.length > 0).length || 0}
                    totalCompanies={currentResults?.length || 0}
                    totalContacts={currentResults?.reduce((sum, company) => 
                      sum + (company.contacts?.length || 0), 0) || 0}
                    onClose={() => setContactReportVisible(false)}
                    isVisible={contactReportVisible}
                  />
                </div>
              )}

              {/* Email Search Summary - with reduced padding */}
              {emailOrchestration.summaryVisible && (
                <div className="px-0 md:px-4 pt-1 pb-0">
                  <EmailSearchSummary 
                    companiesWithEmails={currentResults?.filter(company => 
                      emailOrchestration.getTopContacts(company, 3).some(contact => contact.email && contact.email.length > 5)).length || 0}
                    totalCompanies={currentResults?.length || 0}
                    totalEmailsFound={emailOrchestration.lastEmailSearchCount || currentResults?.reduce((total, company) => 
                      total + (emailOrchestration.getTopContacts(company, 3).filter(contact => contact.email && contact.email.length > 5).length), 0) || 0}
                    sourceBreakdown={emailOrchestration.lastSourceBreakdown || undefined}
                    onClose={() => emailOrchestration.closeSummary()}
                    isVisible={emailOrchestration.summaryVisible}
                  />
                </div>
              )}
              
              {/* Email Search Progress - with reduced padding */}
              {emailOrchestration.isSearching && (
                <div className="px-0 md:px-4 pt-0 pb-3">
                  <SearchProgress 
                    phase={emailOrchestration.searchProgress.phase}
                    completed={emailOrchestration.searchProgress.completed}
                    total={emailOrchestration.searchProgress.total}
                    isVisible={emailOrchestration.isSearching}
                  />
                </div>
              )}
              
              <CardContent className="p-0">
                <div className="px-0 md:px-4 pb-4">
                  <Suspense fallback={<TableSkeleton />}>
                    <CompanyCards
                      companies={currentResults || []}
                      handleCompanyView={handleCompanyView}
                      handleHunterSearch={handleHunterSearch}
                      handleApolloSearch={handleApolloSearch}
                      handleEnrichContact={handleEnrichContact}
                      handleComprehensiveEmailSearch={handleComprehensiveEmailSearch}
                      pendingHunterIds={pendingHunterIds}
                      pendingApolloIds={pendingApolloIds}
                      pendingContactIds={pendingContactIds}
                      pendingComprehensiveSearchIds={pendingComprehensiveSearchIds}
                      onContactClick={handleContactClick}
                      onViewModeChange={setCompaniesViewMode}
                      selectedEmailContact={emailDrawer.selectedContact}
                  />
                  </Suspense>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Top Prospects Section - Modular component */}
          <TopProspectsCard
            prospects={getTopProspects()}
            selectedContacts={selectedContacts}
            pendingContactIds={pendingContactIds}
            pendingHunterIds={pendingHunterIds}
            pendingApolloIds={pendingApolloIds}
            isVisible={!!(currentResults && currentResults.length > 0 && companiesViewMode !== 'slides')}
            onEnrichProspects={handleEnrichProspects}
            onSelectAll={handleSelectAllContacts}
            onCheckboxChange={handleCheckboxChange}
            onContactView={handleContactView}
            onEnrichContact={handleEnrichContact}
            onHunterSearch={handleHunterSearch}
            onApolloSearch={handleApolloSearch}
            onContactFeedback={handleContactFeedback}
          />
            </div>

            {/* API Templates Button moved to settings drawer */}
          </div>

          {/* Fixed position saved searches drawer */}
          <SavedSearchesDrawer 
            open={savedSearchesDrawerOpen}
            onOpenChange={setSavedSearchesDrawerOpen}
            onLoadSearch={handleLoadSavedSearch}
            onNewSearch={handleNewSearch}
          />
        </div>
      </div>
      
      {/* Email Drawer - New modular component */}
      <EmailDrawer
        open={emailDrawer.isOpen}
        mode={emailDrawer.mode}
        selectedContact={emailDrawer.selectedContact}
        selectedCompany={emailDrawer.selectedCompany}
        selectedCompanyContacts={emailDrawer.selectedCompanyContacts}
        width={emailDrawer.drawerWidth}
        isResizing={emailDrawer.isResizing}
        currentListId={currentListId}
        currentQuery={currentQuery}
        onClose={emailDrawer.closeDrawer}
        onModeChange={emailDrawer.setMode}
        onContactChange={handleEmailContactChange}
        onResizeStart={() => emailDrawer.handleMouseDown({} as React.MouseEvent)}
      />

      {/* Notification System - Outside flex container */}
      <NotificationToast
        notificationState={notificationState}
        onClose={closeNotification}
      />
      
      {/* Onboarding Flow */}
      {showOnboarding && (
        <OnboardingFlowOrchestrator
          searchQuery={onboardingSearchQuery}
          searchResults={onboardingSearchResults}
          onComplete={() => {
            setShowOnboarding(false);
            localStorage.setItem('hasCompletedOnboarding', 'true');
            toast({
              title: "Setup complete!",
              description: "Your campaign is now active and ready to start generating leads.",
            });
          }}
          onClose={() => {
            setShowOnboarding(false);
          }}
        />
      )}
    </div>
    </>
  );
}