import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CompanyTable from "@/components/company-table";
import PromptEditor from "@/components/prompt-editor";
import SearchApproaches from "@/components/search-approaches";
import { ListPlus, Search, Code2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

// Define interface for the saved state
interface SavedSearchState {
  currentQuery: string | null;
  currentResults: any[] | null;
}

export default function Home() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentQuery, setCurrentQuery] = useState<string | null>(null);
  const [currentResults, setCurrentResults] = useState<any[] | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Load state from localStorage on component mount
  useEffect(() => {
    const savedState = localStorage.getItem('searchState');
    if (savedState) {
      const parsed = JSON.parse(savedState) as SavedSearchState;
      setCurrentQuery(parsed.currentQuery);
      setCurrentResults(parsed.currentResults);
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    const stateToSave: SavedSearchState = {
      currentQuery,
      currentResults
    };
    localStorage.setItem('searchState', JSON.stringify(stateToSave));
  }, [currentQuery, currentResults]);

  const { data: searchApproaches = [] } = useQuery({
    queryKey: ["/api/search-approaches"],
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!currentQuery || !currentResults) return;
      const res = await apiRequest("POST", "/api/lists", {
        companies: currentResults,
        prompt: currentQuery
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lists"] });
      toast({
        title: "List Saved",
        description: "The search results have been saved as a new list.",
      });
      setIsSaved(true);
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

  const handleSearchResults = (query: string, results: any[]) => {
    setCurrentQuery(query);
    setCurrentResults(results);
    setIsSaved(false);
  };

  const handleSaveList = () => {
    if (!currentResults || !currentQuery) {
      toast({
        title: "Cannot Save",
        description: "Please perform a search first.",
        variant: "destructive",
      });
      return;
    }
    saveMutation.mutate();
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Business Intelligence Tool</CardTitle>
          </CardHeader>
          <CardContent>
            <PromptEditor 
              onAnalyze={() => setIsAnalyzing(true)}
              onComplete={handleAnalysisComplete}
              onSearchResults={handleSearchResults}
              isAnalyzing={isAnalyzing}
              initialPrompt={currentQuery || ""} // Pass the current query to PromptEditor
            />
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  Search Approaches
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setLocation('/api-templates')}
                  className="ml-2"
                >
                  <Code2 className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <SearchApproaches approaches={searchApproaches} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Companies Analysis</CardTitle>
                {currentResults && (
                  <Button
                    variant="outline"
                    onClick={handleSaveList}
                    disabled={isSaved || saveMutation.isPending}
                  >
                    <ListPlus className="mr-2 h-4 w-4" />
                    {isSaved ? "Saved" : "Save as List"}
                  </Button>
                )}
              </div>
              {currentQuery && (
                <p className="text-sm text-muted-foreground mt-2">
                  Search: {currentQuery}
                </p>
              )}
            </CardHeader>
            <CardContent>
              <CompanyTable companies={currentResults || []} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}