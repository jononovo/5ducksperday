import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search } from "lucide-react";
import type { SearchModuleConfig } from "@shared/schema";
import { useConfetti } from "@/hooks/use-confetti";
import { useSearchStrategy } from "@/lib/search-strategy-context";

interface PromptEditorProps {
  onAnalyze: () => void;
  onComplete: () => void;
  onSearchResults: (query: string, results: any[]) => void;
  isAnalyzing: boolean;
  initialPrompt?: string;
}

export default function PromptEditor({ 
  onAnalyze, 
  onComplete, 
  onSearchResults, 
  isAnalyzing,
  initialPrompt = ""
}: PromptEditorProps) {
  const [query, setQuery] = useState(initialPrompt);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { triggerConfetti } = useConfetti();

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
      provider 
    }: { 
      query: string; 
      strategyId?: number;
      provider?: string;
    }) => {
      console.log(`Sending workflow search request: ${query} (Provider: ${provider || 'default'})`);
      const res = await apiRequest("POST", "/api/workflow-search", { 
        query,
        strategyId,
        provider
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
      onComplete();
    },
    onError: (error: Error) => {
      toast({
        title: "Workflow Search Failed",
        description: error.message,
        variant: "destructive",
      });
      onComplete();
    },
  });

  // Original search mutation
  const searchMutation = useMutation({
    mutationFn: async (searchQuery: string) => {
      // If a provider is selected, use the workflow search instead
      if (selectedProvider) {
        // Map animal providers to actual search approaches in the database
        const providersMap: Record<string, number> = {
          'Lion': 17, // Advanced Key Contact Discovery
          'Rabbit': 11, // Small Business Contacts
          'Donkey': 15  // Enhanced Contact Discovery
        };
        
        const strategyId = providersMap[selectedProvider];
        const providerName = selectedProvider.toLowerCase();
        return workflowSearchMutation.mutateAsync({ 
          query: searchQuery, 
          strategyId, 
          provider: providerName 
        });
      }
      
      // Otherwise use the standard search
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
      
      console.log(`Searching with strategy: ${selectedStrategy?.name || "Default"} (ID: ${selectedStrategyId || "none"})`);

      // Ensure proper typing for the search request
      const res = await apiRequest("POST", "/api/companies/search", { 
        query: searchQuery,
        flows: activeFlows,
        strategyId: selectedStrategyId ? parseInt(selectedStrategyId) : undefined
      });
      return res.json();
    },
    onSuccess: (data) => {
      // Skip processing if we used the workflow search
      if (selectedProvider) return;
      
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      onSearchResults(data.query, data.companies);
      toast({
        title: "Search Complete",
        description: "Company analysis has been completed successfully.",
      });
      // Trigger confetti animation on successful search
      triggerConfetti();
      onComplete();
    },
    onError: (error: Error) => {
      // Skip if this was a workflow search error
      if (selectedProvider) return;
      
      toast({
        title: "Search Failed",
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
    onAnalyze();
    searchMutation.mutate(query);
  };

  // State to track the currently selected workflow provider
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  // Function to handle workflow provider selection
  const handleProviderSelect = (provider: string) => {
    console.log(`Selected provider: ${provider}`);
    setSelectedProvider(provider);
    
    toast({
      title: `Selected ${provider} provider`,
      description: `Using the ${provider} workflow for this search.`,
    });
  };

  return (
    <Card className="p-3">
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter a search query (e.g., 'mid-sized plumbers in Atlanta')..."
            className="flex-1"
          />
          <Button 
            onClick={handleSearch} 
            disabled={isAnalyzing || searchMutation.isPending}
          >
            {(isAnalyzing || searchMutation.isPending) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            <Search className="mr-2 h-4 w-4" />
            Search
          </Button>
        </div>
        
        {/* Workflow Provider Selection Buttons */}
        <div className="flex gap-2 mt-2">
          <Button
            variant={selectedProvider === 'Lion' ? 'default' : 'outline'}
            size="sm"
            className="flex items-center gap-1"
            onClick={() => handleProviderSelect('Lion')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 5C8 3.34315 9.34315 2 11 2H13C14.6569 2 16 3.34315 16 5V6C16 7.10457 15.1046 8 14 8H10C8.89543 8 8 7.10457 8 6V5Z" 
                fill={selectedProvider === 'Lion' ? 'currentColor' : 'none'} 
                stroke="currentColor" 
                strokeWidth="1.5"/>
              <path d="M5 10C5 8.89543 5.89543 8 7 8H17C18.1046 8 19 8.89543 19 10V16C19 18.2091 17.2091 20 15 20H9C6.79086 20 5 18.2091 5 16V10Z" 
                fill={selectedProvider === 'Lion' ? 'currentColor' : 'none'} 
                stroke="currentColor" 
                strokeWidth="1.5"/>
              <path d="M10 11H10.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M14 11H14.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M9 16H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Lion
          </Button>
          <Button
            variant={selectedProvider === 'Rabbit' ? 'default' : 'outline'}
            size="sm"
            className="flex items-center gap-1"
            onClick={() => handleProviderSelect('Rabbit')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 8C6 8 6 3 12 3C18 3 18 8 18 8" 
                stroke="currentColor" 
                strokeWidth="1.5"
                strokeLinecap="round"/>
              <path d="M6 16C6 16 6 21 12 21C18 21 18 16 18 16" 
                stroke="currentColor" 
                strokeWidth="1.5"
                strokeLinecap="round"/>
              <rect x="6" y="8" width="12" height="8" rx="4" 
                fill={selectedProvider === 'Rabbit' ? 'currentColor' : 'none'} 
                stroke="currentColor" 
                strokeWidth="1.5"/>
              <circle cx="9" cy="11" r="1" fill="currentColor"/>
              <circle cx="15" cy="11" r="1" fill="currentColor"/>
              <path d="M10 14H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Rabbit
          </Button>
          <Button
            variant={selectedProvider === 'Donkey' ? 'default' : 'outline'}
            size="sm"
            className="flex items-center gap-1"
            onClick={() => handleProviderSelect('Donkey')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 7L4 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M20 7L20 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M4 7C4 7 4 4 12 4C20 4 20 7 20 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M12 7L12 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path 
                d="M4 17C4 17 8 21 12 21C16 21 20 17 20 17" 
                fill={selectedProvider === 'Donkey' ? 'currentColor' : 'none'} 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round"/>
              <circle cx="8" cy="11" r="1" fill="currentColor"/>
              <circle cx="16" cy="11" r="1" fill="currentColor"/>
              <path d="M12 16L10 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M12 16L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Donkey
          </Button>
        </div>
      </div>
    </Card>
  );
}