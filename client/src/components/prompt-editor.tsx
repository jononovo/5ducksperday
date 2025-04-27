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
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
            onClick={() => handleProviderSelect('Lion')}
          >
            <span role="img" aria-label="Lion">🦁</span> Lion
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
            onClick={() => handleProviderSelect('Rabbit')}
          >
            <span role="img" aria-label="Rabbit">🐰</span> Rabbit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
            onClick={() => handleProviderSelect('Donkey')}
          >
            <span role="img" aria-label="Donkey">🐴</span> Donkey
          </Button>
        </div>
      </div>
    </Card>
  );
}