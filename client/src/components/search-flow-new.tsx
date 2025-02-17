import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { SearchApproach, SearchModuleConfig } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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

  // Initialize search config
  const config = approach.config as SearchModuleConfig || {
    subsearches: {},
    searchOptions: {},
    searchSections: {},
    validationRules: {
      requiredFields: [],
      scoreThresholds: {},
      minimumConfidence: 0
    }
  };

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<SearchApproach>) => {
      if (!editedPrompt.trim()) {
        throw new Error("Prompt cannot be empty");
      }

      const response = await apiRequest("PATCH", `/api/search-approaches/${approach.id}`, updates);
      if (!response.ok) {
        throw new Error("Failed to update approach");
      }
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
      const updates: Partial<SearchApproach> = {
        active,
        config: {
          ...config,
          subsearches: {},
          searchOptions: {
            ignoreFranchises: false,
            locallyHeadquartered: false
          }
        }
      };

      const response = await apiRequest("PATCH", `/api/search-approaches/${approach.id}`, updates);
      if (!response.ok) {
        throw new Error("Failed to toggle approach");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/search-approaches"] });
    },
    onError: (error) => {
      toast({
        title: "Toggle Failed",
        description: error instanceof Error ? error.message : "Failed to toggle approach",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      prompt: editedPrompt,
      technicalPrompt: editedTechnicalPrompt || null,
      responseStructure: editedResponseStructure || null,
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedPrompt(approach.prompt);
    setEditedTechnicalPrompt(approach.technicalPrompt || "");
    setEditedResponseStructure(approach.responseStructure || "");
  };

  // Show error if module type is missing
  if (!approach.moduleType) {
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
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Configuration Warning</AlertTitle>
            <AlertDescription>
              Module type is missing for this search approach. Some features may be limited.
            </AlertDescription>
          </Alert>
        </AccordionContent>
      </AccordionItem>
    );
  }

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
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateMutation.isPending || !editedPrompt.trim()}
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{approach.prompt}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditing(true)}
            >
              Edit Prompt
            </Button>
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

export default function SearchFlowNew({ approaches }: SearchFlowNewProps) {
  // Sort approaches by order
  const sortedApproaches = [...approaches].sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <Accordion type="single" collapsible className="w-full">
      {sortedApproaches.map((approach) => (
        <ApproachEditor key={approach.id} approach={approach} />
      ))}
    </Accordion>
  );
}