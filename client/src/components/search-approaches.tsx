import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { SearchApproach } from "@shared/schema";
import { Check, Edit2 } from "lucide-react";
import { Label } from "@/components/ui/label";

interface SearchApproachesProps {
  approaches: SearchApproach[];
}

const DEFAULT_SEARCH_SECTIONS = {
  search_options: {
    id: "search_options",
    label: "Search Options",
    description: "Configure additional search parameters",
    searches: [
      {
        id: "ignore-franchises",
        label: "Ignore Franchises",
        description: "Exclude franchise businesses from search results"
      },
      {
        id: "local-hq",
        label: "Locally Headquartered",
        description: "Only include companies with local headquarters"
      }
    ]
  },
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
  onOptionChange?: (optionId: string, checked: boolean) => void;
  searchOptions?: Record<string, boolean>;
  searchSections: typeof DEFAULT_SEARCH_SECTIONS;
  onSearchSectionsChange: (sections: typeof DEFAULT_SEARCH_SECTIONS) => void;
}

function SubSearches({
  approach,
  isEditing,
  onSubSearchChange,
  completedSearches = [],
  onOptionChange,
  searchOptions = {},
  searchSections,
  onSearchSectionsChange
}: SubSearchesProps) {
  const isCompanyOverview = approach.name.toLowerCase().includes('company overview');
  const isDecisionMaker = approach.name.toLowerCase().includes('decision-maker');
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [currentSubsearches, setCurrentSubsearches] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isEditing) {
      const defaultSubsearches = (approach.config as Record<string, unknown>)?.subsearches as Record<string, boolean> || {};
      setCurrentSubsearches(defaultSubsearches);
    }
  }, [isEditing, approach.config]);

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

  const handleSectionEdit = (sectionId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingSectionId(sectionId);
  };

  const handleSectionSave = (sectionId: string) => {
    setEditingSectionId(null);
  };

  const handleSearchOptionUpdate = (sectionId: string, searchId: string, field: 'label' | 'description', value: string) => {
    const updatedSections = {
      ...searchSections,
      [sectionId]: {
        ...searchSections[sectionId],
        searches: searchSections[sectionId].searches.map(search =>
          search.id === searchId
            ? { ...search, [field]: value }
            : search
        )
      }
    };
    onSearchSectionsChange(updatedSections);
  };

  const renderSearchSection = (section: typeof DEFAULT_SEARCH_SECTIONS.search_options) => {
    if (isCompanyOverview && section.id !== 'search_options') {
      return null;
    }

    if (isDecisionMaker && section.id === 'search_options') {
      return null;
    }

    if (!isCompanyOverview && !isDecisionMaker) {
      return null;
    }

    const allChecked = section.searches.every(search =>
      section.id === 'search_options'
        ? searchOptions?.[search.id.replace(/-/g, '')] ?? false
        : currentSubsearches[search.id] ?? false
    );
    const someChecked = section.searches.some(search =>
      section.id === 'search_options'
        ? searchOptions?.[search.id.replace(/-/g, '')] ?? false
        : currentSubsearches[search.id] ?? false
    );

    const isEditingSection = editingSectionId === section.id;

    const handleMasterCheckboxChange = (checked: boolean) => {
      if (section.id === 'search_options') {
        if (onOptionChange) {
          section.searches.forEach(search => {
            const optionId = search.id.replace(/-/g, '');
            onOptionChange(optionId, checked);
          });
        }
      } else {
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
      }
    };

    return (
      <AccordionItem key={section.id} value={section.id} className="flex flex-col">
        <div className="flex items-center">
          <Checkbox
            id={`master-${section.id}`}
            checked={allChecked}
            data-state={allChecked ? "checked" : someChecked ? "indeterminate" : "unchecked"}
            onCheckedChange={handleMasterCheckboxChange}
            className="mr-2"
          />
          <AccordionTrigger className="flex-1">
            <span className="text-sm font-medium">{section.label}</span>
          </AccordionTrigger>
          {isEditing && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={(e) => handleSectionEdit(section.id, e)}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        {section.description && (
          <p className="text-xs text-muted-foreground mt-1 ml-10 mb-2">{section.description}</p>
        )}
        <AccordionContent>
          <div className="space-y-4 pl-6">
            {section.searches.map((search) => {
              const isSearchOption = section.id === 'search_options';
              const optionId = isSearchOption ? search.id.replace(/-/g, '') : search.id;
              const checked = isSearchOption
                ? searchOptions?.[optionId] ?? false
                : currentSubsearches[search.id] ?? false;

              return (
                <div key={search.id} className="flex items-start space-x-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={search.id}
                      checked={checked}
                      onCheckedChange={(checked) => {
                        if (isSearchOption && onOptionChange) {
                          onOptionChange(optionId, checked as boolean);
                        } else {
                          handleCheckboxChange(search.id, checked as boolean);
                        }
                      }}
                      className="mt-1"
                    />
                    {completedSearches.includes(search.id) && (
                      <Check className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                  <div className="grid gap-1.5 leading-none flex-1">
                    {isEditingSection ? (
                      <>
                        <Input
                          value={search.label}
                          onChange={(e) => handleSearchOptionUpdate(section.id, search.id, 'label', e.target.value)}
                          className="h-7 text-sm"
                        />
                        <Input
                          value={search.description}
                          onChange={(e) => handleSearchOptionUpdate(section.id, search.id, 'description', e.target.value)}
                          className="h-7 text-sm text-muted-foreground"
                        />
                      </>
                    ) : (
                      <>
                        <label
                          htmlFor={search.id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {search.label}
                        </label>
                        <p className="text-sm text-muted-foreground">
                          {search.description}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            {isEditingSection && (
              <Button size="sm" onClick={() => handleSectionSave(section.id)} className="mt-4">
                Save Changes
              </Button>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
    );
  };

  return (
    <div className="mt-4">
      <Accordion type="multiple" className="w-full">
        {Object.values(searchSections).map(section => renderSearchSection(section))}
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
  const [searchOptions, setSearchOptions] = useState<Record<string, boolean>>({
    ignoreFranchises: false,
    locallyHeadquartered: false,
  });
  const [searchSections, setSearchSections] = useState(DEFAULT_SEARCH_SECTIONS);

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
      setSearchOptions({ ignoreFranchises: false, locallyHeadquartered: false });
      setSearchSections(DEFAULT_SEARCH_SECTIONS);
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
    setSearchOptions({
      ignoreFranchises: (approach.config as any)?.searchOptions?.ignoreFranchises || false,
      locallyHeadquartered: (approach.config as any)?.searchOptions?.locallyHeadquartered || false,
    });

    const savedSections = (approach.config as any)?.searchSections;
    if (savedSections) {
      setSearchSections(savedSections);
    } else {
      setSearchSections(DEFAULT_SEARCH_SECTIONS);
    }
  };

  const handleSave = (id: number) => {
    updateMutation.mutate({
      id,
      updates: {
        prompt: editedPrompt,
        technicalPrompt: editedTechnicalPrompt || null,
        responseStructure: editedResponseStructure || null,
        config: {
          subsearches: editedSubSearches,
          searchOptions: searchOptions,
          searchSections: searchSections
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

  const handleSearchOptionChange = (optionId: string, checked: boolean) => {
    setSearchOptions(prev => ({
      ...prev,
      [optionId]: checked
    }));
  };

  const handleSearchSectionsChange = (newSections: typeof DEFAULT_SEARCH_SECTIONS) => {
    setSearchSections(newSections);
  };

  return (
    <Accordion type="single" collapsible className="w-full">
      {approaches.map((approach) => {
        const currentSections = editingId === approach.id
          ? searchSections
          : ((approach.config as any)?.searchSections || DEFAULT_SEARCH_SECTIONS);

        return (
          <AccordionItem key={approach.id} value={approach.id.toString()}>
            <div className="flex items-center gap-2 px-1">
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
                <div className="space-y-4">
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
                    approach={approach}
                    isEditing={true}
                    onSubSearchChange={handleSubSearchChange}
                    completedSearches={completedSearches}
                    searchOptions={searchOptions}
                    onOptionChange={handleSearchOptionChange}
                    searchSections={searchSections}
                    onSearchSectionsChange={handleSearchSectionsChange}
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
                        setSearchOptions({ ignoreFranchises: false, locallyHeadquartered: false });
                        setSearchSections(DEFAULT_SEARCH_SECTIONS);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">{approach.prompt}</p>
                  <SubSearches
                    approach={approach}
                    isEditing={false}
                    completedSearches={completedSearches}
                    searchOptions={searchOptions}
                    onOptionChange={handleSearchOptionChange}
                    searchSections={currentSections}
                    onSearchSectionsChange={handleSearchSectionsChange}
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
        );
      })}
    </Accordion>
  );
}