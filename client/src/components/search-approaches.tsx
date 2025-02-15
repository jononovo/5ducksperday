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
import type { SearchApproach, SearchModuleConfig, SearchSection } from "@shared/schema";
import { Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import { getSectionsByModuleType, SEARCH_SUBSECTIONS, getAllSearchIds } from "@/lib/search-sections";

interface SearchApproachesProps {
  approaches: SearchApproach[];
}

interface SubSearchesProps {
  approach: SearchApproach;
  isEditing: boolean;
  onSubSearchChange?: (id: string, checked: boolean) => void;
  completedSearches?: string[];
}

function SubSearches({
  approach,
  isEditing,
  onSubSearchChange,
  completedSearches = []
}: SubSearchesProps) {
  const config = approach.config as SearchModuleConfig;
  const searchSections = getSectionsByModuleType(approach.moduleType);

  // Track subsearches and options independently
  const [subsearches, setSubsearches] = useState<Record<string, boolean>>(config?.subsearches || {});
  const [searchOptions, setSearchOptions] = useState<Record<string, boolean>>(config?.searchOptions || {});

  useEffect(() => {
    // Initialize from approach config
    setSubsearches(config?.subsearches || {});
    setSearchOptions(config?.searchOptions || {});
  }, [config, approach.moduleType]);

  const handleSubsearchChange = (id: string, checked: boolean) => {
    if (onSubSearchChange) {
      onSubSearchChange(id, checked);
    }
  };

  const handleOptionChange = (id: string, checked: boolean) => {
    setSearchOptions(prev => ({
      ...prev,
      [id.replace(/-/g, '')]: checked
    }));
  };

  const handleMasterCheckboxChange = (checked: boolean, section: SearchSection) => {
    const isSearchOption = section.id === 'search_options';
    section.searches.forEach(search => {
      if (isSearchOption) {
        handleOptionChange(search.id, checked);
      } else {
        handleSubsearchChange(search.id, checked);
      }
    });
  };

  const renderSection = (section: SearchSection) => {
    const isSearchOption = section.id === 'search_options';

    // Filter sections based on module type
    if (approach.moduleType === 'company_overview' && !isSearchOption) return null;
    if (approach.moduleType === 'decision_maker' && isSearchOption) return null;

    const allChecked = section.searches.every(search => {
      if (isSearchOption) {
        return searchOptions[search.id.replace(/-/g, '')] ?? false;
      }
      return subsearches[search.id] ?? false;
    });

    const someChecked = section.searches.some(search => {
      if (isSearchOption) {
        return searchOptions[search.id.replace(/-/g, '')] ?? false;
      }
      return subsearches[search.id] ?? false;
    });

    return (
      <AccordionItem key={section.id} value={section.id}>
        <div className="flex items-center">
          <Checkbox
            id={`master-${section.id}`}
            checked={allChecked}
            data-state={allChecked ? "checked" : someChecked ? "indeterminate" : "unchecked"}
            onCheckedChange={(checked) => handleMasterCheckboxChange(checked as boolean, section)}
            className="mr-2"
          />
          <AccordionTrigger className="flex-1">
            <span className="text-sm font-medium">{section.label}</span>
          </AccordionTrigger>
        </div>
        {section.description && (
          <p className="text-xs text-muted-foreground mt-1 ml-10 mb-2">{section.description}</p>
        )}
        <AccordionContent>
          <div className="space-y-4 pl-6">
            {section.searches.map((search) => {
              const checked = isSearchOption
                ? searchOptions[search.id.replace(/-/g, '')] ?? false
                : subsearches[search.id] ?? false;

              return (
                <div key={search.id} className="flex items-start space-x-2">
                  <Checkbox
                    id={search.id}
                    checked={checked}
                    onCheckedChange={(checked) => {
                      if (isSearchOption) {
                        handleOptionChange(search.id, checked as boolean);
                      } else {
                        handleSubsearchChange(search.id, checked as boolean);
                      }
                    }}
                    className="mt-1"
                  />
                  <div className="grid gap-1.5 leading-none flex-1">
                    <label
                      htmlFor={search.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {search.label}
                    </label>
                    <p className="text-sm text-muted-foreground">
                      {search.description}
                    </p>
                    {!isSearchOption && search.implementation && (
                      <p className="text-sm text-muted-foreground italic">
                        {search.implementation}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </AccordionContent>
      </AccordionItem>
    );
  };

  return (
    <div className="mt-4">
      <Accordion type="multiple" className="w-full">
        {Object.values(searchSections).map(renderSection)}
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
  const [searchOptions, setSearchOptions] = useState<Record<string, boolean>>({});

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
      setSearchOptions({});
    },
  });

  const handleEdit = (approach: SearchApproach) => {
    const config = approach.config as SearchModuleConfig;

    setEditingId(approach.id);
    setEditedPrompt(approach.prompt);
    setEditedTechnicalPrompt(approach.technicalPrompt || "");
    setEditedResponseStructure(approach.responseStructure || "");
    setEditedSubSearches(config?.subsearches || {});
    setSearchOptions(config?.searchOptions || {});
  };

  const handleSave = (id: number) => {
    const config: SearchModuleConfig = {
      subsearches: editedSubSearches,
      searchOptions,
      searchSections: {},
      validationRules: {
        requiredFields: [],
        scoreThresholds: {},
        minimumConfidence: 0
      }
    };

    updateMutation.mutate({
      id,
      updates: {
        prompt: editedPrompt,
        technicalPrompt: editedTechnicalPrompt || null,
        responseStructure: editedResponseStructure || null,
        config
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
                  completedSearches={approach.completedSearches}
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
                      setSearchOptions({});
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
                  completedSearches={approach.completedSearches}
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