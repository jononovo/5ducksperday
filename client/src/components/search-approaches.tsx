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

interface SearchApproachesProps {
  approaches: SearchApproach[];
}

const SUB_SEARCHES = [
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
  }
];

interface SubSearchesProps {
  approach: SearchApproach;
  isEditing: boolean;
  onSubSearchChange?: (id: string, checked: boolean) => void;
}

function SubSearches({ approach, isEditing, onSubSearchChange }: SubSearchesProps) {
  if (!approach.name.toLowerCase().includes('leadership')) {
    return null;
  }

  // Parse the existing subsearches from the approach config
  const subsearches = (approach.config as Record<string, unknown>)?.subsearches as Record<string, boolean> || {};

  return (
    <div className="mt-4 space-y-4">
      <h4 className="text-sm font-medium">Additional Search Areas:</h4>
      <div className="space-y-4">
        {SUB_SEARCHES.map((search) => (
          <div key={search.id} className="flex items-start space-x-2">
            <Checkbox
              id={search.id}
              checked={subsearches[search.id] || false}
              disabled={!isEditing}
              onCheckedChange={isEditing && onSubSearchChange ? 
                (checked) => onSubSearchChange(search.id, checked as boolean) : 
                undefined
              }
              className="mt-1"
            />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor={search.id}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {search.label}
              </label>
              <p className="text-sm text-muted-foreground">
                {search.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SearchApproaches({ approaches }: SearchApproachesProps) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editedPrompt, setEditedPrompt] = useState("");
  const [editedSubSearches, setEditedSubSearches] = useState<Record<string, boolean>>({});

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<SearchApproach> }) => {
      const res = await apiRequest("PATCH", `/api/search-approaches/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/search-approaches"] });
      setEditingId(null);
      setEditedSubSearches({});
    },
  });

  const handleEdit = (approach: SearchApproach) => {
    setEditingId(approach.id);
    setEditedPrompt(approach.prompt);
    // Initialize subsearches from existing config
    setEditedSubSearches(
      ((approach.config as Record<string, unknown>)?.subsearches as Record<string, boolean>) || {}
    );
  };

  const handleSave = (id: number) => {
    updateMutation.mutate({
      id,
      updates: {
        prompt: editedPrompt,
        config: {
          ...((approaches.find(a => a.id === id)?.config || {}) as Record<string, unknown>),
          subsearches: editedSubSearches
        }
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
                <Textarea
                  value={editedPrompt}
                  onChange={(e) => setEditedPrompt(e.target.value)}
                  className="min-h-[100px]"
                />
                <SubSearches 
                  approach={{
                    ...approach,
                    config: { 
                      ...approach.config,
                      subsearches: editedSubSearches
                    }
                  }}
                  isEditing={true}
                  onSubSearchChange={handleSubSearchChange}
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
                      setEditedSubSearches({});
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">{approach.prompt}</p>
                <SubSearches approach={approach} isEditing={false} />
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