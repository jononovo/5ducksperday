import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search } from "lucide-react";

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

  // Fetch active search flows
  const { data: searchFlows = [] } = useQuery({
    queryKey: ["/api/search-approaches"],
  });

  const searchMutation = useMutation({
    mutationFn: async (searchQuery: string) => {
      // Get active flows and their configurations
      const activeFlows = searchFlows
        .filter((flow: any) => flow.active)
        .map((flow: any) => ({
          id: flow.id,
          name: flow.name,
          config: flow.config,
          completedSearches: flow.completedSearches || []
        }));

      // Include active flows in the search request
      const res = await apiRequest("POST", "/api/companies/search", { 
        query: searchQuery,
        flows: activeFlows
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      onSearchResults(data.query, data.companies);
      toast({
        title: "Search Complete",
        description: "Company analysis has been completed successfully.",
      });
      onComplete();
    },
    onError: (error) => {
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

  return (
    <Card className="p-3">
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
    </Card>
  );
}