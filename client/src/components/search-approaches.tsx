import { useState, useEffect } from "react";
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

interface SubSearchesProps {
  approach: SearchApproach;
  isEditing: boolean;
  onSubSearchChange?: (id: string, checked: boolean) => void;
  completedSearches?: string[];
  isSearching?: boolean;
}

function SubSearches({ 
  approach, 
  isEditing, 
  onSubSearchChange, 
  completedSearches = [], 
  isSearching = false 
}: SubSearchesProps) {
  if (!approach.name.toLowerCase().includes('decision-maker')) {
    return null;
  }

  const defaultSubsearches = (approach.config as Record<string, unknown>)?.subsearches as Record<string, boolean> || {};
  const [currentSubsearches, setCurrentSubsearches] = useState<Record<string, boolean>>(defaultSubsearches);

  useEffect(() => {
    if (isEditing) {
      setCurrentSubsearches(defaultSubsearches);
    }
  }, [isEditing, defaultSubsearches]);

  const handleCheckboxChange = (id: string, checked: boolean) => {
    if (isEditing && onSubSearchChange) {
      onSubSearchChange(id, checked);
    } else {
      setCurrentSubsearches(prev => ({
        ...prev,
        [id]: checked
      }));
    }
  };

  const renderSearchSection = (section: typeof SEARCH_SECTIONS.local) => {
    const allChecked = section.searches.every(search => currentSubsearches[search.id]);
    const someChecked = section.searches.some(search => currentSubsearches[search.id]);

    const handleMasterCheckboxChange = (checked: boolean) => {
      const newState = { ...currentSubsearches };
      section.searches.forEach(search => {
        newState[search.id] = checked;
      });

      if (isEditing && onSubSearchChange) {
        section.searches.forEach(search => {
          onSubSearchChange(search.id, checked);
        });
      }
      setCurrentSubsearches(newState);
    };

    const isProcessing = (searchId: string) => 
      currentSubsearches[searchId] && isSearching && !completedSearches.includes(searchId);

    const isCompleted = (searchId: string) =>
      currentSubsearches[searchId] && completedSearches.includes(searchId);

    return (
      <AccordionItem key={section.id} value={section.id}>
        <div className="flex flex-col">
          <AccordionTrigger className="flex items-center justify-between py-2 px-4">
            <div className="flex items-center gap-2 flex-1">
              <Checkbox
                id={`master-${section.id}`}
                checked={allChecked}
                data-state={allChecked ? "checked" : someChecked ? "indeterminate" : "unchecked"}
                onCheckedChange={handleMasterCheckboxChange}
                onClick={(e) => e.stopPropagation()}
              />
              <span>{section.label}</span>
            </div>
            <div className="flex items-center gap-2">
              {section.searches.some(s => isProcessing(s.id)) && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {section.searches.some(s => isCompleted(s.id)) && (
                <Check className="h-4 w-4 text-green-500" />
              )}
            </div>
          </AccordionTrigger>
        </div>
        <AccordionContent>
          <div className="space-y-4 pl-6">
            {section.searches.map((search) => (
              <div key={search.id} className="flex items-start gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={search.id}
                    checked={currentSubsearches[search.id] || false}
                    onCheckedChange={(checked) => handleCheckboxChange(search.id, checked as boolean)}
                  />
                  {isProcessing(search.id) && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {isCompleted(search.id) && (
                    <Check className="h-4 w-4 text-green-500" />
                  )}
                </div>
                <div className="flex-1">
                  <label
                    htmlFor={search.id}
                    className="text-sm font-medium leading-none"
                  >
                    {search.label}
                  </label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {search.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    );
  };

  return (
    <div className="mt-4">
      <Accordion type="multiple" className="w-full">
        {Object.values(SEARCH_SECTIONS).map(section => renderSearchSection(section))}
      </Accordion>
    </div>
  );
}

export default function SearchApproaches({ approaches }: SearchApproachesProps) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editedPrompt, setEditedPrompt] = useState("");
  const [editedTechnicalPrompt, setEditedTechnicalPrompt] = useState("");
  const [editedResponseStructure, setEditedResponseStructure] = useState("");
  const [editedSubSearches, setEditedSubSearches] = useState<Record<string, boolean>>({});
  const [completedSearches, setCompletedSearches] = useState<string[]>([]);

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
      setEditedSubSearches({});
      setCompletedSearches([]);
    },
  });

  const handleEdit = (approach: SearchApproach) => {
    setEditingId(approach.id);
    setEditedPrompt(approach.prompt);
    setEditedTechnicalPrompt(approach.technicalPrompt || "");
    setEditedResponseStructure(approach.responseStructure || "");
    setEditedSubSearches(
      ((approach.config as Record<string, unknown>)?.subsearches as Record<string, boolean>) || {}
    );
    setCompletedSearches(approach.completedSearches || []);
  };

  const handleSave = (id: number) => {
    updateMutation.mutate({
      id,
      updates: {
        prompt: editedPrompt,
        technicalPrompt: editedTechnicalPrompt || null,
        responseStructure: editedResponseStructure || null,
        config: {
          subsearches: editedSubSearches
        },
        completedSearches
      }
    });
  };

  const handleSubSearchChange = (id: string, checked: boolean) => {
    setEditedSubSearches(prev => ({
      ...prev,
      [id]: checked
    }));
  };

  const handleToggle = (id: number, active: boolean) => {
    updateMutation.mutate({ id, updates: { active } });
  };

  return (
    <Accordion type="single" collapsible className="w-full">
      {approaches.map((approach) => (
        <AccordionItem key={approach.id} value={approach.id.toString()}>
          <div className="flex items-center gap-2 px-4">
            <Switch
              checked={approach.active ?? false}
              onCheckedChange={(checked) => handleToggle(approach.id, checked)}
              className="scale-75"
            />
            <AccordionTrigger className="flex-1 hover:no-underline">
              <span className="mr-4">{approach.name}</span>
            </AccordionTrigger>
          </div>
          <AccordionContent>
            {editingId === approach.id ? (
              <div className="space-y-4 p-4">
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
                <SubSearches
                  approach={{
                    ...approach,
                    config: { subsearches: editedSubSearches }
                  }}
                  isEditing={true}
                  onSubSearchChange={handleSubSearchChange}
                  completedSearches={completedSearches}
                  isSearching={false}
                />
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
                    onClick={() => {
                      setEditingId(null);
                      setEditedPrompt("");
                      setEditedTechnicalPrompt("");
                      setEditedResponseStructure("");
                      setEditedSubSearches({});
                      setCompletedSearches([]);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 p-4">
                <p className="text-sm text-muted-foreground">{approach.prompt}</p>
                <SubSearches 
                  approach={approach} 
                  isEditing={false} 
                  completedSearches={approach.completedSearches || []}
                  isSearching={true}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(approach)}
                >
                  Edit Prompt
                </Button>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}