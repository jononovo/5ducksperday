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
import type { SearchApproach } from "@shared/schema";

interface SearchApproachesProps {
  approaches: SearchApproach[];
}

export default function SearchApproaches({ approaches }: SearchApproachesProps) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editedPrompt, setEditedPrompt] = useState("");

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<SearchApproach> }) => {
      const res = await apiRequest("PATCH", `/api/search-approaches/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/search-approaches"] });
      setEditingId(null);
    },
  });

  const handleEdit = (approach: SearchApproach) => {
    setEditingId(approach.id);
    setEditedPrompt(approach.prompt);
  };

  const handleSave = (id: number) => {
    updateMutation.mutate({ id, updates: { prompt: editedPrompt } });
  };

  const handleToggle = (id: number, active: boolean) => {
    updateMutation.mutate({ id, updates: { active } });
  };

  return (
    <Accordion type="single" collapsible className="w-full">
      {approaches.map((approach) => (
        <AccordionItem key={approach.id} value={approach.id.toString()}>
          <div className="flex items-center justify-between px-4">
            <Switch
              checked={approach.active ?? false}
              onCheckedChange={(checked) => handleToggle(approach.id, checked)}
              className="my-4"
            />
            <AccordionTrigger className="flex-1">{approach.name}</AccordionTrigger>
          </div>
          <AccordionContent>
            {editingId === approach.id ? (
              <div className="space-y-4">
                <Textarea
                  value={editedPrompt}
                  onChange={(e) => setEditedPrompt(e.target.value)}
                  className="min-h-[100px]"
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
                    onClick={() => setEditingId(null)}
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