import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { SearchApproach } from "@shared/schema";
import { Check, Loader2 } from "lucide-react";

interface SearchApproachesProps {
  approaches: SearchApproach[];
  isSearching: boolean;
}

export default function SearchApproaches({ approaches, isSearching }: SearchApproachesProps) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editedPrompt, setEditedPrompt] = useState("");
  const [editedTechnicalPrompt, setEditedTechnicalPrompt] = useState("");
  const [editedResponseStructure, setEditedResponseStructure] = useState("");

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<SearchApproach> }) => {
      const response = await apiRequest("PATCH", `/api/search-approaches/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/search-approaches"] });
      setEditingId(null);
      setEditedPrompt("");
      setEditedTechnicalPrompt("");
      setEditedResponseStructure("");
    },
  });

  const handleEdit = (approach: SearchApproach) => {
    setEditingId(approach.id);
    setEditedPrompt(approach.prompt);
    setEditedTechnicalPrompt(approach.technicalPrompt || "");
    setEditedResponseStructure(approach.responseStructure || "");
  };

  const handleSave = (id: number) => {
    updateMutation.mutate({
      id,
      updates: {
        prompt: editedPrompt,
        technicalPrompt: editedTechnicalPrompt || null,
        responseStructure: editedResponseStructure || null
      }
    });
  };

  const handleToggle = (id: number, active: boolean) => {
    updateMutation.mutate({ id, updates: { active } });
  };

  return (
    <Accordion type="multiple" className="w-full">
      {approaches.map((approach) => (
        <AccordionItem key={approach.id} value={approach.id.toString()}>
          <div className="flex items-center px-4 py-2">
            <Switch
              checked={approach.active ?? false}
              onCheckedChange={(checked) => handleToggle(approach.id, checked)}
              className="scale-75 mr-2"
            />
            <AccordionTrigger className="flex-1 hover:no-underline">
              <div className="flex justify-between items-center w-full mr-4">
                <span>{approach.name}</span>
                <Checkbox 
                  className="opacity-50 pointer-events-none" 
                  checked={false}
                />
              </div>
            </AccordionTrigger>
          </div>
          <AccordionContent>
            <div className="space-y-4 p-4">
              {editingId === approach.id ? (
                <>
                  <div>
                    <label className="text-sm font-medium mb-2 block">User-Facing Prompt</label>
                    <Textarea
                      value={editedPrompt}
                      onChange={(e) => setEditedPrompt(e.target.value)}
                      placeholder="Enter the user-facing prompt..."
                      className="min-h-[100px]"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Technical Prompt</label>
                    <Textarea
                      value={editedTechnicalPrompt}
                      onChange={(e) => setEditedTechnicalPrompt(e.target.value)}
                      placeholder="Enter the technical implementation prompt..."
                      className="min-h-[100px]"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Response Structure</label>
                    <Textarea
                      value={editedResponseStructure}
                      onChange={(e) => setEditedResponseStructure(e.target.value)}
                      placeholder="Enter the expected JSON response structure..."
                      className="min-h-[100px] font-mono"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleSave(approach.id)}
                      disabled={updateMutation.isPending}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">{approach.prompt}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(approach)}
                  >
                    Edit Prompt
                  </Button>
                  <Accordion type="multiple" className="w-full space-y-2">
                    {Object.values(SEARCH_SECTIONS).map((section) => (
                      <AccordionItem key={section.id} value={section.id}>
                        <AccordionTrigger className="px-4 py-2">
                          <div className="flex items-center justify-between w-full">
                            <span className={!approach.active ? "text-muted-foreground/50" : ""}>
                              {section.label}
                            </span>
                            <Checkbox
                              id={`master-${section.id}`}
                              checked={section.searches.every(s => ((approach.config as Record<string, unknown>)?.subsearches as Record<string, boolean> || {})[s.id])}
                              className={!approach.active ? "text-muted-foreground/50" : ""}
                              disabled={!approach.active}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pl-8 space-y-3">
                          {section.searches.map((search) => (
                            <div key={search.id} className="flex items-start gap-3">
                              <div className="flex-1">
                                <label
                                  htmlFor={search.id}
                                  className={`text-sm font-medium block ${!approach.active ? "text-muted-foreground/50" : ""}`}
                                >
                                  {search.label}
                                </label>
                                <p className={`text-sm ${!approach.active ? "text-muted-foreground/30" : "text-muted-foreground"}`}>
                                  {search.description}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 pt-1">
                                <Checkbox
                                  id={search.id}
                                  checked={((approach.config as Record<string, unknown>)?.subsearches as Record<string, boolean> || {})[search.id] || false}
                                  className={!approach.active ? "text-muted-foreground/50" : ""}
                                  disabled={!approach.active}
                                />
                                {approach.active && isSearching && ((approach.config as Record<string, unknown>)?.subsearches as Record<string, boolean> || {})[search.id] && (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                )}
                                {approach.active && !isSearching && approach.completedSearches?.includes(search.id) && (
                                  <Check className="h-4 w-4 text-green-500" />
                                )}
                              </div>
                            </div>
                          ))}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

const SEARCH_SECTIONS = {
  local: {
    id: "local",
    label: "Local Sources",
    searches: [
      {
        id: "local-news",
        label: "Local News Search",
        description: "Search local news sources for company leadership mentions and activities"
      },
      {
        id: "business-associations",
        label: "Business Associations Search",
        description: "Search local chambers of commerce and business association memberships"
      },
      {
        id: "local-events",
        label: "Local Events Search",
        description: "Search local business events, conferences, and speaking engagements"
      },
      {
        id: "local-classifieds",
        label: "Local Classifieds or Lists",
        description: "Search classifieds for company info and local classifieds"
      }
    ]
  },
  digital: {
    id: "digital",
    label: "Digital Sources",
    searches: [
      {
        id: "google-business",
        label: "Google My Business",
        description: "Search Google My Business listings and reviews"
      },
      {
        id: "yelp-search",
        label: "Yelp Search",
        description: "Check for Yelp"
      }
    ]
  },
  social: {
    id: "social",
    label: "Social Sources",
    searches: [
      {
        id: "social-linkedin",
        label: "LinkedIn Search",
        description: "Search LinkedIn for company profiles and employees"
      },
      {
        id: "social-twitter",
        label: "Twitter Search",
        description: "Search Twitter for social mentions and engagement"
      },
      {
        id: "social-facebook",
        label: "Facebook Search",
        description: "Search Facebook for social presence and community engagement"
      }
    ]
  },
  startup: {
    id: "startup",
    label: "Startup Sources",
    searches: [
      {
        id: "startup-angelist",
        label: "Angelist",
        description: "Search Angelist for startup information and funding details"
      },
      {
        id: "startup-crunchbase",
        label: "Crunchbase",
        description: "Search Crunchbase for company data and investment history"
      },
      {
        id: "startup-other",
        label: "Other Sources",
        description: "Search other startup-focused platforms and databases"
      }
    ]
  },
  sector_listings: {
    id: "sector_listings",
    label: "Sector Specific Listings",
    description: "For example, if the prompt mentions tech and education, then we would look into edtech listings sites. Select type/s of business:",
    searches: [
      {
        id: "sector-tech",
        label: "Tech Startup",
        description: "Search for technology startup listings and directories"
      },
      {
        id: "sector-small",
        label: "Small Business",
        description: "Search for small business listings and directories"
      },
      {
        id: "sector-contractor",
        label: "Contractor",
        description: "Search for contractor and service provider listings"
      }
    ]
  }
};