import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, HelpCircle } from "lucide-react";
import type { SearchModuleConfig, SearchApproach } from "@shared/schema";
import { useConfetti } from "@/hooks/use-confetti";
import { useSearchStrategy } from "@/lib/search-strategy-context";
import SearchSettingsDrawer from "./search-settings-drawer";
import SearchProgressIndicator from "./search-progress-indicator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PromptEditorProps {
  onAnalyze: () => void;
  onComplete: () => void;
  onSearchResults: (query: string, results: any[]) => void;
  onCompaniesReceived: (query: string, companies: any[]) => void; // New callback for quick results
  isAnalyzing: boolean;
  initialPrompt?: string;
  isFromLandingPage?: boolean; // Flag to indicate if user came from landing page
  onDismissLandingHint?: () => void; // Callback to dismiss landing page hint
  lastExecutedQuery?: string | null; // Last executed search query
  onInputChange?: (newValue: string) => void; // Callback for input changes
}

export default function PromptEditor({ 
  onAnalyze, 
  onComplete, 
  onSearchResults, 
  onCompaniesReceived,
  isAnalyzing,
  initialPrompt = "",
  isFromLandingPage = false,
  onDismissLandingHint,
  lastExecutedQuery = null,
  onInputChange
}: PromptEditorProps) {
  const [query, setQuery] = useState(initialPrompt);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { triggerConfetti } = useConfetti();
  
  // Track if input has changed from last executed query
  const [inputHasChanged, setInputHasChanged] = useState(false);
  
  // Track input changes to update UI accordingly
  useEffect(() => {
    if (lastExecutedQuery !== null && query !== lastExecutedQuery) {
      setInputHasChanged(true);
      if (onInputChange) {
        onInputChange(query);
      }
    }
  }, [query, lastExecutedQuery, onInputChange]);
  
  // Update the query when initialPrompt changes
  useEffect(() => {
    if (initialPrompt) {
      setQuery(initialPrompt);
    }
  }, [initialPrompt]);

  // Fetch active search flows with proper typing
  const { data: searchFlows = [] } = useQuery<Array<{
    id: number;
    name: string;
    active: boolean;
    config: SearchModuleConfig;
    completedSearches: string[];
    moduleType: string;
  }>>({
    queryKey: ["/api/search-approaches"],
  });

  // Use our search strategy context
  const { selectedStrategyId } = useSearchStrategy();
  

  
  // Mutation for workflow-based search
  const workflowSearchMutation = useMutation({
    mutationFn: async ({ 
      query, 
      strategyId, 
      provider,
      targetUrl,
      resultsUrl
    }: { 
      query: string; 
      strategyId?: number;
      provider?: string;
      targetUrl?: string;
      resultsUrl?: string;
    }) => {
      console.log(`Sending workflow search request: ${query} (Provider: ${provider || 'default'})`);
      if (targetUrl) {
        console.log(`Target URL: ${targetUrl}`);
      }
      if (resultsUrl) {
        console.log(`Results URL: ${resultsUrl}`);
      }
      
      const res = await apiRequest("POST", "/api/workflow-search", { 
        query,
        strategyId,
        provider,
        targetUrl,
        resultsUrl
      });
      return res.json();
    },
    onSuccess: (data) => {
      console.log("Workflow search started:", data);
      toast({
        title: "Search Started",
        description: `Search request sent to workflow. SearchID: ${data.searchId}`,
      });
      // Note: Results will come back through the webhook
      setIsCustomLoading(false);
      onComplete();
    },
    onError: (error: Error) => {
      toast({
        title: "Workflow Search Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsCustomLoading(false);
      onComplete();
    },
  });

  // Quick search mutation - gets companies immediately
  const quickSearchMutation = useMutation({
    mutationFn: async (searchQuery: string) => {
      console.log("Initiating company search process...");
      console.log("Sending request to company discovery API...");
      
      // Use the standard search but optimize for quick company results
      const activeFlows = searchFlows
        .filter((flow) => flow.active)
        .map((flow) => ({
          id: flow.id,
          name: flow.name,
          moduleType: flow.moduleType,
          config: flow.config,
          completedSearches: flow.completedSearches || []
        }));

      // Find the selected strategy if one is selected
      const selectedStrategy = selectedStrategyId ? 
        searchFlows.find(flow => flow.id.toString() === selectedStrategyId) : null;
      
      console.log(`Quick search with strategy: ${selectedStrategy?.name || "Default"} (ID: ${selectedStrategyId || "none"})`);

      // Get companies quickly without waiting for contact enrichment
      const res = await apiRequest("POST", "/api/companies/quick-search", { 
        query: searchQuery,
        flows: activeFlows,
        strategyId: selectedStrategyId ? parseInt(selectedStrategyId) : undefined
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      
      // Pass companies immediately to the parent component
      console.log("Processing company results...");
      console.log(`Found ${data.companies.length} companies matching your search`);
      onCompaniesReceived(data.query, data.companies);
      
      toast({
        title: "Companies Found",
        description: `Found ${data.companies.length} companies. Loading contacts...`,
      });
      
      // Start the full search with contacts
      fullContactSearchMutation.mutate(data.query);
    },
    onError: (error: Error) => {
      toast({
        title: "Company Search Failed",
        description: error.message,
        variant: "destructive",
      });
      onComplete();
    },
  });
  
  // Full search mutation - gets contacts after companies are displayed
  const fullContactSearchMutation = useMutation({
    mutationFn: async (searchQuery: string) => {
      console.log("Starting contact discovery process...");
      console.log("Searching for key decision makers and contacts...");
      
      // Use the standard search
      const activeFlows = searchFlows
        .filter((flow) => flow.active)
        .map((flow) => ({
          id: flow.id,
          name: flow.name,
          moduleType: flow.moduleType,
          config: flow.config,
          completedSearches: flow.completedSearches || []
        }));

      // Ensure proper typing for the full search request with contacts
      console.log("Sending comprehensive search request to API...");
      console.log("This process may take a moment while we find the most relevant contacts...");
      
      const res = await apiRequest("POST", "/api/companies/search", { 
        query: searchQuery,
        flows: activeFlows,
        strategyId: selectedStrategyId ? parseInt(selectedStrategyId) : undefined,
        includeContacts: true
      });
      return res.json();
    },
    onSuccess: (data) => {
      // Calculate total contacts found
      const totalContacts = data.companies.reduce((sum: number, company: any) => 
        sum + (company.contacts?.length || 0), 0);
      
      console.log("Contact discovery completed successfully");
      console.log(`Found ${totalContacts} contacts across ${data.companies.length} companies`);
      console.log("Processing and organizing results...");
      
      // Send full results with contacts to parent component
      onSearchResults(data.query, data.companies);
      
      toast({
        title: "Search Complete",
        description: "Contact discovery has been completed successfully.",
      });
      
      console.log("Search process completed!");
      
      // Trigger confetti animation on successful search
      triggerConfetti();
      onComplete();
    },
    onError: (error: Error) => {
      toast({
        title: "Contact Search Failed",
        description: error.message,
        variant: "destructive",
      });
      onComplete();
    },
  });

  const handleSearch = () => {
    if (!query.trim()) {
      toast({
        title: "Empty Query",
        description: "Please enter a search query.",
        variant: "destructive",
      });
      return;
    }
    
    // Dismiss the landing page hint if active
    if (isFromLandingPage && onDismissLandingHint) {
      onDismissLandingHint();
    }
    
    // Reset input changed state
    setInputHasChanged(false);
    
    console.log("Analyzing search query...");
    console.log("Preparing to search for companies and contacts...");
    onAnalyze();
    // Use quickSearchMutation to first get companies without waiting for contact enrichment
    quickSearchMutation.mutate(query);
  };

  // State for custom workflow configuration with localStorage persistence
  const [targetUrl, setTargetUrl] = useState<string>(() => {
    // Try to get the value from localStorage
    const savedValue = localStorage.getItem('5ducks_target_url');
    return savedValue || "";
  });
  
  const [resultsUrl, setResultsUrl] = useState<string>(() => {
    // Try to get the value from localStorage
    const savedValue = localStorage.getItem('5ducks_results_url');
    return savedValue || "";
  });
  
  const [customSelected, setCustomSelected] = useState<boolean>(false);
  
  // Separate loading states for search and custom buttons
  const [isCustomLoading, setIsCustomLoading] = useState<boolean>(false);
  
  // Save values to localStorage when they change
  useEffect(() => {
    localStorage.setItem('5ducks_target_url', targetUrl);
  }, [targetUrl]);
  
  useEffect(() => {
    localStorage.setItem('5ducks_results_url', resultsUrl);
  }, [resultsUrl]);

  // Function to handle custom workflow search
  const handleCustomWorkflowSearch = () => {
    if (!query.trim()) {
      toast({
        title: "Empty Query",
        description: "Please enter a search query.",
        variant: "destructive",
      });
      return;
    }

    if (!targetUrl.trim()) {
      toast({
        title: "Missing Target URL",
        description: "Please enter a target URL for the workflow.",
        variant: "destructive",
      });
      return;
    }

    console.log(`Executing custom workflow search with target: ${targetUrl}`);
    setCustomSelected(true);
    setIsCustomLoading(true);
    
    // Execute the search with custom URLs
    onAnalyze();
    workflowSearchMutation.mutate({ 
      query, 
      provider: 'custom',
      targetUrl,
      resultsUrl: resultsUrl.trim() || undefined
    });
  };

  return (
    <div className="pl-0 pr-1 pt-1 pb-1 shadow-none"> {/* Container with no padding */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2 pl-0">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !(isAnalyzing || quickSearchMutation.isPending || fullContactSearchMutation.isPending)) {
                e.preventDefault();
                handleSearch();
              }
            }}
            placeholder="Enter a search query (e.g., 'mid-sized plumbers in Atlanta')..."
            className="flex-1 hover:border-gray-300 focus-visible:border-gray-400"
          />
          <div className="flex items-center relative">
            {/* Improved landing page tooltip with nicer design */}
            {isFromLandingPage && !isAnalyzing && (
              <div className="absolute -top-24 left-1/3 transform -translate-x-1/3 
                   bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/90 dark:to-indigo-900/90 
                   p-4 rounded-lg shadow-lg text-sm border-none z-10 w-64 
                   animate-fade-in max-w-xs text-center">
                <div className="tooltip-arrow"></div>
                <p className="font-medium text-blue-800 dark:text-blue-200">
                  If you are happy with this prompt, click search.
                </p>
              </div>
            )}
            
            {/* Enhanced search button with dynamic styling based on state */}
            <Button 
              type="submit"
              onClick={handleSearch} 
              disabled={isAnalyzing || quickSearchMutation.isPending || fullContactSearchMutation.isPending}
              className={`
                transition-all duration-300 flex items-center gap-2
                ${lastExecutedQuery && !inputHasChanged 
                  ? 'bg-gradient-to-b from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 dark:from-gray-600 dark:to-gray-700 dark:hover:from-gray-700 dark:hover:to-gray-800 shadow-md' 
                  : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 shadow-md hover:shadow-lg'
                }
              `}
            >
              {(isAnalyzing || quickSearchMutation.isPending || fullContactSearchMutation.isPending) ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  <span>Search</span>
                </>
              )}
            </Button>
            
            {/* Settings drawer trigger with custom search props */}
            <SearchSettingsDrawer 
              approaches={searchFlows as SearchApproach[]} 
              targetUrl={targetUrl}
              setTargetUrl={setTargetUrl}
              resultsUrl={resultsUrl}
              setResultsUrl={setResultsUrl}
              customSelected={customSelected}
              isCustomLoading={isCustomLoading}
              handleCustomWorkflowSearch={handleCustomWorkflowSearch}

            />
          </div>
        </div>
        
        {/* Search Progress Indicator */}
        <SearchProgressIndicator isSearching={isAnalyzing || quickSearchMutation.isPending || fullContactSearchMutation.isPending} />
      </div>
    </div>
  );
}