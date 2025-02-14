import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CompanyTable from "@/components/company-table";
import PromptEditor from "@/components/prompt-editor";
import SearchApproaches from "@/components/search-approaches";
import { ListPlus, Search, Code2, UserCircle, Banknote, Eye } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Company, Contact } from "@shared/schema";

// Extend Company type to include contacts
interface CompanyWithContacts extends Company {
  contacts?: (Contact & { companyName?: string })[];
}

// Define interface for the saved state
interface SavedSearchState {
  currentQuery: string | null;
  currentResults: CompanyWithContacts[] | null;
}

export default function Home() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentQuery, setCurrentQuery] = useState<string | null>(null);
  const [currentResults, setCurrentResults] = useState<CompanyWithContacts[] | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [pendingContactId, setPendingContactId] = useState<number | null>(null);
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

  const handleSearchResults = (query: string, results: CompanyWithContacts[]) => {
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

  // Get top prospects from all companies
  const getTopProspects = () => {
    if (!currentResults) return [];

    const allContacts: (Contact & { companyName: string })[] = [];
    currentResults.forEach(company => {
      if (company.contacts) {
        allContacts.push(...company.contacts.map(contact => ({
          ...contact,
          companyName: company.name
        })));
      }
    });

    // Sort by probability (higher is better) and take top 10
    return allContacts
      .filter(contact => contact.probability && contact.probability >= 50) // Only show contacts with 50%+ probability
      .sort((a, b) => (b.probability || 0) - (a.probability || 0))
      .slice(0, 10);
  };

  // Add mutation for enriching contacts
  const enrichContactMutation = useMutation({
    mutationFn: async (contactId: number) => {
      setPendingContactId(contactId);
      const response = await apiRequest("POST", `/api/contacts/${contactId}/enrich`);
      return response.json();
    },
    onSuccess: (data) => {
      // Update the currentResults with the enriched contact
      setCurrentResults(prev => {
        if (!prev) return null;
        return prev.map(company => ({
          ...company,
          contacts: company.contacts?.map(contact =>
            contact.id === data.id ? data : contact
          )
        }));
      });
      toast({
        title: "Contact Enriched",
        description: "Successfully updated contact information.",
      });
      setPendingContactId(null);
    },
    onError: (error) => {
      toast({
        title: "Enrichment Failed",
        description: error instanceof Error ? error.message : "Failed to enrich contact information",
        variant: "destructive",
      });
      setPendingContactId(null);
    },
  });

  const handleEnrichContact = (contactId: number) => {
    enrichContactMutation.mutate(contactId);
  };

  const isContactEnriched = (contact: Contact) => {
    return contact.completedSearches?.includes('contact_enrichment') || false;
  };

  const isContactPending = (contactId: number) => {
    return pendingContactId === contactId;
  };

  return (
    <div className="container mx-auto py-6">
      <div className="grid grid-cols-12 gap-4">
        {/* Main Content Area - 9 columns */}
        <div className="col-span-9 space-y-4">
          {/* Search Section */}
          <Card>
            <CardHeader>
              <CardTitle>Search for target businesses</CardTitle>
            </CardHeader>
            <CardContent>
              <PromptEditor
                onAnalyze={() => setIsAnalyzing(true)}
                onComplete={handleAnalysisComplete}
                onSearchResults={handleSearchResults}
                isAnalyzing={isAnalyzing}
                initialPrompt={currentQuery || ""}
              />
            </CardContent>
          </Card>

          {/* Results Section */}
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
            <CardContent className="p-3">
              <CompanyTable companies={currentResults || []} />
            </CardContent>
          </Card>

          {/* Top Prospects Section */}
          {currentResults && currentResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCircle className="w-5 h-5" />
                  Top Prospects
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Highest probability contacts across all companies
                </p>
              </CardHeader>
              <CardContent className="p-3">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getTopProspects().map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell className="font-medium">{contact.name}</TableCell>
                        <TableCell>{contact.companyName}</TableCell>
                        <TableCell>{contact.role || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant={
                            (contact.probability || 0) >= 90 ? "default" :
                            (contact.probability || 0) >= 70 ? "secondary" : "outline"
                          }>
                            {contact.probability || 0}
                          </Badge>
                        </TableCell>
                        <TableCell>{contact.email || 'N/A'}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setLocation(`/contacts/${contact.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEnrichContact(contact.id)}
                              disabled={isContactPending(contact.id) || isContactEnriched(contact)}
                              className={isContactEnriched(contact) ? "text-muted-foreground" : ""}
                            >
                              <Banknote className={`w-4 h-4 mr-2 ${isContactPending(contact.id) ? 'animate-spin' : ''}`} />
                              {isContactEnriched(contact) ? 'Enriched' : 'Enrich'}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {getTopProspects().length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No high-probability contacts found in the search results
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Search Flow Section - 3 columns */}
        <div className="col-span-3">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Search className="w-4 h-4" />
                  Search Flow
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setLocation('/api-templates')}
                  className="ml-2"
                >
                  <Code2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-2">
              <SearchApproaches approaches={searchApproaches} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}