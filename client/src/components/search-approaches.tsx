import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
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
    mutationFn: async ({ id, prompt }: { id: number; prompt: string }) => {
      const res = await apiRequest("PATCH", `/api/search-approaches/${id}`, { prompt });
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
    updateMutation.mutate({ id, prompt: editedPrompt });
  };

  return (
    <Accordion type="single" collapsible className="w-full">
      {approaches.map((approach) => (
        <AccordionItem key={approach.id} value={approach.id.toString()}>
          <AccordionTrigger>{approach.name}</AccordionTrigger>
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
