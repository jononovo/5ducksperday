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
import { Edit3, Save, X, InfoIcon, AlertCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SearchFlowNewProps {
  approaches: SearchApproach[];
}

// Fixed approach order mapping
const APPROACH_ORDER = {
  'company_overview': 1,
  'decision_maker': 2,
  'email_discovery': 3,
  'email_enrichment': 4,
  'email_deepdive': 5
};

function ApproachEditor({ approach }: { approach: SearchApproach }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(approach.prompt);
  const [validationError, setValidationError] = useState<string | null>(null);
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

      if (editedPrompt.length < 10) {
        throw new Error("Prompt must be at least 10 characters long");
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
      setValidationError(null);
      toast({
        title: "Approach Updated",
        description: "Search approach updated successfully.",
      });
    },
    onError: (error) => {
      setValidationError(error instanceof Error ? error.message : "Failed to update approach");
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
        {
          active,
          config: approach.config,
        }
      );
      if (!response.ok) {
        throw new Error("Failed to toggle approach");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/search-approaches"] });
      toast({
        title: approach.active ? "Approach Disabled" : "Approach Enabled",
        description: `Search approach has been ${approach.active ? "disabled" : "enabled"}.`,
      });
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
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedPrompt(approach.prompt);
    setValidationError(null);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return "bg-emerald-500";
    if (confidence >= 70) return "bg-amber-500";
    return "bg-red-500";
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 85) return "High Confidence";
    if (confidence >= 70) return "Medium Confidence";
    return "Low Confidence";
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
                disabled={toggleMutation.isPending}
                className="dark:data-[state=unchecked]:bg-gray-200 data-[state=checked]:bg-black dark:data-[state=checked]:bg-white data-[state=unchecked]:bg-gray-200 transition-colors duration-200"
              />
            </TooltipTrigger>
            <TooltipContent>
              {approach.active ? "Disable approach" : "Enable approach"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="flex-1 space-y-1.5">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex flex-col items-start">
              <span className="font-medium text-base">{approach.name}</span>
              {minimumConfidence > 0 && (
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex items-center gap-2 flex-1 max-w-[200px]">
                    <Progress
                      value={minimumConfidence}
                      className={`h-2 ${getConfidenceColor(minimumConfidence)}`}
                    />
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-medium">
                              {minimumConfidence}%
                            </span>
                            <InfoIcon className="h-3 w-3 text-muted-foreground" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-sm">
                            {getConfidenceLabel(minimumConfidence)}: Requires {minimumConfidence}%
                            confidence in search results
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              )}
            </div>
          </AccordionTrigger>
        </div>
      </div>

      <AccordionContent className="px-4 py-2">
        {validationError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{validationError}</AlertDescription>
          </Alert>
        )}
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Search Prompt
              </label>
              <Textarea
                value={editedPrompt}
                onChange={(e) => setEditedPrompt(e.target.value)}
                placeholder="Enter the search prompt..."
                className="min-h-[100px]"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use [COMPANY] as a placeholder for the target company name
              </p>
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
              <h4 className="font-medium">Search Prompt</h4>
              <p className="text-sm text-muted-foreground">{approach.prompt}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditing(true)}
            >
              <Edit3 className="w-4 h-4 mr-2" />
              Edit Prompt
            </Button>
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

export default function SearchFlowNew({ approaches }: SearchFlowNewProps) {
  // Sort approaches by fixed order
  const sortedApproaches = [...approaches].sort((a, b) => {
    const orderA = APPROACH_ORDER[a.moduleType as keyof typeof APPROACH_ORDER] || 999;
    const orderB = APPROACH_ORDER[b.moduleType as keyof typeof APPROACH_ORDER] || 999;
    return orderA - orderB;
  });

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Search Flow Configuration</h3>
      <Accordion type="single" collapsible className="w-full">
        {sortedApproaches.map((approach) => (
          <ApproachEditor key={approach.id} approach={approach} />
        ))}
      </Accordion>
    </div>
  );
}