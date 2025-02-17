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
import { Progress } from "@/components/ui/progress";
import type { SearchApproach, SearchModuleConfig } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle2, Edit3, Save, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SearchFlowNewProps {
  approaches: SearchApproach[];
}

function ApproachEditor({ approach }: { approach: SearchApproach }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(approach.prompt);
  const [editedTechnicalPrompt, setEditedTechnicalPrompt] = useState(
    approach.technicalPrompt || ""
  );
  const [editedResponseStructure, setEditedResponseStructure] = useState(
    approach.responseStructure || ""
  );
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const config = approach.config as SearchModuleConfig || {
    subsearches: {},
    searchOptions: {},
    searchSections: {},
    validationRules: {
      requiredFields: [],
      scoreThresholds: {},
      minimumConfidence: 0,
    },
  };

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<SearchApproach>) => {
      if (!editedPrompt.trim()) {
        throw new Error("Prompt cannot be empty");
      }

      const response = await apiRequest(
        "PATCH",
        `/api/search-approaches/${approach.id}`,
        updates
      );
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
        description: "Search approach updated successfully.",
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
      const response = await apiRequest(
        "PATCH",
        `/api/search-approaches/${approach.id}`,
        { active }
      );
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

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return "bg-green-500";
    if (confidence >= 70) return "bg-yellow-500";
    return "bg-red-500";
  };

  const minimumConfidence = config.validationRules?.minimumConfidence || 0;

  return (
    <AccordionItem value={approach.id.toString()} className="border-b">
      <div className="flex items-center gap-4 px-4 py-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Switch
                checked={approach.active ?? false}
                onCheckedChange={(checked) => toggleMutation.mutate(checked)}
                className="scale-75"
              />
            </TooltipTrigger>
            <TooltipContent>
              {approach.active ? "Disable approach" : "Enable approach"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <AccordionTrigger className="flex-1 hover:no-underline">
          <div className="flex items-center gap-4">
            <span className="font-semibold">{approach.name}</span>
            <Badge variant="outline" className="ml-2">
              Step {approach.order}
            </Badge>
            {minimumConfidence > 0 && (
              <div className="flex items-center gap-2">
                <Progress
                  value={minimumConfidence}
                  className={`w-24 h-2 ${getConfidenceColor(minimumConfidence)}`}
                />
                <span className="text-xs text-muted-foreground">
                  {minimumConfidence}% threshold
                </span>
              </div>
            )}
          </div>
        </AccordionTrigger>
      </div>

      <AccordionContent className="px-4 py-2">
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                User-Facing Prompt
              </label>
              <Textarea
                value={editedPrompt}
                onChange={(e) => setEditedPrompt(e.target.value)}
                placeholder="Enter the user-facing prompt..."
                className="min-h-[100px]"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Technical Implementation
              </label>
              <Textarea
                value={editedTechnicalPrompt}
                onChange={(e) => setEditedTechnicalPrompt(e.target.value)}
                placeholder="Enter the technical implementation details..."
                className="min-h-[100px] font-mono text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Response Structure
              </label>
              <Textarea
                value={editedResponseStructure}
                onChange={(e) => setEditedResponseStructure(e.target.value)}
                placeholder="Enter the expected JSON response structure..."
                className="min-h-[100px] font-mono text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateMutation.isPending || !editedPrompt.trim()}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">Description</h4>
              <p className="text-sm text-muted-foreground">{approach.prompt}</p>
            </div>

            {approach.technicalPrompt && (
              <div className="space-y-2">
                <h4 className="font-medium">Technical Details</h4>
                <p className="text-sm text-muted-foreground font-mono">
                  {approach.technicalPrompt}
                </p>
              </div>
            )}

            {approach.responseStructure && (
              <div className="space-y-2">
                <h4 className="font-medium">Expected Response</h4>
                <pre className="text-sm bg-muted p-2 rounded-md font-mono">
                  {approach.responseStructure}
                </pre>
              </div>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditing(true)}
            >
              <Edit3 className="w-4 h-4 mr-2" />
              Edit Approach
            </Button>
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

export default function SearchFlowNew({ approaches }: SearchFlowNewProps) {
  // Sort approaches by order
  const sortedApproaches = [...approaches].sort(
    (a, b) => (a.order || 0) - (b.order || 0)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle2 className="w-5 h-5 text-green-500" />
        <h3 className="font-semibold">Search Flow Steps</h3>
      </div>

      <Accordion type="single" collapsible className="w-full">
        {sortedApproaches.map((approach) => (
          <ApproachEditor key={approach.id} approach={approach} />
        ))}
      </Accordion>
    </div>
  );
}