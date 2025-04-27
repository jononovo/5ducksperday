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
    mutationFn: async ({ query, strategyId }: { query: string; strategyId?: number }) => {
      console.log(`Sending workflow search request: ${query}`);
      const res = await apiRequest("POST", "/api/workflow-search", { 
        query,
        strategyId
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
        const providersMap: Record<string, number> = {
          'Lion': 10, // Use appropriate strategy IDs
          'Rabbit': 11,
          'Donkey': 12
        };
        
        const strategyId = providersMap[selectedProvider];
        return workflowSearchMutation.mutateAsync({ query: searchQuery, strategyId });
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
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 1C7.4087 1 5.88258 1.63214 4.75736 2.75736C3.63214 3.88258 3 5.4087 3 7C3 10 9 15 9 15C9 15 15 10 15 7C15 5.4087 14.3679 3.88258 13.2426 2.75736C12.1174 1.63214 10.5913 1 9 1Z" 
                fill={selectedProvider === 'Lion' ? 'currentColor' : 'none'} 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"/>
            </svg>
            Lion
          </Button>
          <Button
            variant={selectedProvider === 'Rabbit' ? 'default' : 'outline'}
            size="sm"
            className="flex items-center gap-1"
            onClick={() => handleProviderSelect('Rabbit')}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 8V13M14 8V13M7 5C7 3.89543 7.89543 3 9 3C10.1046 3 11 3.89543 11 5M4 8H7C7 9.10457 7.89543 10 9 10C10.1046 10 11 9.10457 11 8H14M4 8C4 6.89543 4.89543 6 6 6H12C13.1046 6 14 6.89543 14 8M7 13L9 15L11 13"
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"/>
            </svg>
            Rabbit
          </Button>
          <Button
            variant={selectedProvider === 'Donkey' ? 'default' : 'outline'}
            size="sm"
            className="flex items-center gap-1"
            onClick={() => handleProviderSelect('Donkey')}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 1.5V4.5M1.5 9H4.5M9 16.5V13.5M16.5 9H13.5M3.6 3.6L5.7 5.7M3.6 14.4L5.7 12.3M14.4 3.6L12.3 5.7M14.4 14.4L12.3 12.3M9 11.25C10.2426 11.25 11.25 10.2426 11.25 9C11.25 7.75736 10.2426 6.75 9 6.75C7.75736 6.75 6.75 7.75736 6.75 9C6.75 10.2426 7.75736 11.25 9 11.25Z"
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"/>
            </svg>
            Donkey
          </Button>
        </div>
      </div>
    </Card>
  );
}