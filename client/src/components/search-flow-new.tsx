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
import type { SearchApproach, SearchModuleConfig } from "@shared/schema";
import { getSectionsByModuleType } from "@/lib/search-sections";
import { useToast } from "@/hooks/use-toast";

interface SearchFlowNewProps {
  approaches: SearchApproach[];
}

function ApproachEditor({ approach }: { approach: SearchApproach }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(approach.prompt);
  const [editedTechnicalPrompt, setEditedTechnicalPrompt] = useState(approach.technicalPrompt || "");
  const [editedResponseStructure, setEditedResponseStructure] = useState(approach.responseStructure || "");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get sections based on module type
  const sections = getSectionsByModuleType(approach.moduleType || "company_overview");
  const config = approach.config as SearchModuleConfig;

  // Track subsearches state
  const [subsearches, setSubsearches] = useState<Record<string, boolean>>(
    config?.subsearches || {}
  );

  // Track search options state specifically for company_overview
  const [searchOptions, setSearchOptions] = useState({
    ignoreFranchises: config?.searchOptions?.ignoreFranchises || false,
    locallyHeadquartered: config?.searchOptions?.locallyHeadquartered || false,
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<SearchApproach>) => {
      const response = await apiRequest("PATCH", `/api/search-approaches/${approach.id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/search-approaches"] });
      setIsEditing(false);
      toast({
        title: "Approach Updated",
        description: "The search approach has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update approach",
        variant: "destructive",
      });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (active: boolean) => {
      const response = await apiRequest("PATCH", `/api/search-approaches/${approach.id}`, { active });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/search-approaches"] });
    },
  });

  const handleSave = () => {
    const newConfig: SearchModuleConfig = {
      subsearches,
      searchOptions,
      searchSections: {},
      validationRules: {
        requiredFields: [],
        scoreThresholds: {},
        minimumConfidence: 0,
      },
    };

    updateMutation.mutate({
      prompt: editedPrompt,
      technicalPrompt: editedTechnicalPrompt || null,
      responseStructure: editedResponseStructure || null,
      config: newConfig,
    });
  };

  const handleSearchOptionChange = (optionId: string, checked: boolean) => {
    setSearchOptions(prev => ({
      ...prev,
      [optionId]: checked,
    }));
  };

  const handleSubsearchChange = (searchId: string, checked: boolean) => {
    setSubsearches(prev => ({
      ...prev,
      [searchId]: checked,
    }));
  };

  return (
    <AccordionItem value={approach.id.toString()}>
      <div className="flex items-center gap-2 px-1">
        <Switch
          checked={approach.active ?? false}
          onCheckedChange={(checked) => toggleMutation.mutate(checked)}
          className="scale-75"
        />
        <AccordionTrigger className="flex-1 hover:no-underline">
          <span className="mr-4">{approach.name}</span>
        </AccordionTrigger>
      </div>
      <AccordionContent>
        {isEditing ? (
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
            <div className="space-y-4">
              {Object.entries(sections).map(([sectionId, section]) => {
                const isSearchOptions = sectionId === "search_options";

                return (
                  <div key={sectionId} className="space-y-2">
                    <h3 className="text-sm font-medium">{section.label}</h3>
                    <p className="text-sm text-muted-foreground">{section.description}</p>
                    <div className="space-y-2 pl-4">
                      {section.searches.map((search) => {
                        const checked = isSearchOptions
                          ? searchOptions[search.id.replace(/-/g, "") as keyof typeof searchOptions]
                          : subsearches[search.id] ?? false;

                        return (
                          <div key={search.id} className="flex items-start space-x-2">
                            <Checkbox
                              id={search.id}
                              checked={checked}
                              onCheckedChange={(checked) => {
                                if (isSearchOptions) {
                                  handleSearchOptionChange(
                                    search.id.replace(/-/g, ""),
                                    checked as boolean
                                  );
                                } else {
                                  handleSubsearchChange(search.id, checked as boolean);
                                }
                              }}
                              className="mt-1"
                            />
                            <div className="grid gap-1.5 leading-none">
                              <label
                                htmlFor={search.id}
                                className="text-sm font-medium leading-none"
                              >
                                {search.label}
                              </label>
                              <p className="text-sm text-muted-foreground">
                                {search.description}
                              </p>
                              {!isSearchOptions && search.implementation && (
                                <p className="text-sm text-muted-foreground italic">
                                  {search.implementation}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateMutation.isPending}
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{approach.prompt}</p>
            <div className="space-y-4">
              {Object.entries(sections).map(([sectionId, section]) => (
                <div key={sectionId} className="space-y-2">
                  <h3 className="text-sm font-medium">{section.label}</h3>
                  <div className="space-y-2 pl-4">
                    {section.searches.map((search) => {
                      const isSearchOptions = sectionId === "search_options";
                      const checked = isSearchOptions
                        ? searchOptions[search.id.replace(/-/g, "") as keyof typeof searchOptions]
                        : subsearches[search.id] ?? false;

                      return (
                        <div key={search.id} className="flex items-center space-x-2">
                          <Checkbox checked={checked} disabled className="pointer-events-none" />
                          <span className="text-sm">{search.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditing(true)}
            >
              Edit Approach
            </Button>
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

export default function SearchFlowNew({ approaches }: SearchFlowNewProps) {
  return (
    <Accordion type="single" collapsible className="w-full">
      {approaches.map((approach) => (
        <ApproachEditor key={approach.id} approach={approach} />
      ))}
    </Accordion>
  );
}