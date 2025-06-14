import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FileText, Save, Plus } from "lucide-react";
import type { EmailTemplate } from "@shared/schema";
import MergeFieldDialog from "./merge-field-dialog";

interface QuickTemplatesProps {
  onSelectTemplate: (template: EmailTemplate) => void;
  onSaveTemplate?: () => void;
}

export default function QuickTemplates({ onSelectTemplate, onSaveTemplate }: QuickTemplatesProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>();
  const [mergeFieldDialogOpen, setMergeFieldDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/email-templates"],
    staleTime: 0, // Don't use cached data
    cacheTime: 0, // Don't cache the response
    retry: false, // Don't retry failed requests
    refetchOnMount: true, // Always refetch when component mounts
  });

  console.log('QuickTemplates - Loaded templates:', templates.map(t => ({ id: t.id, name: t.name })));

  const handleInsertTemplate = () => {
    if (!selectedTemplateId) return;
    const template = templates.find(t => t.id.toString() === selectedTemplateId);
    if (template) {
      console.log('QuickTemplates - Selected template:', { id: template.id, name: template.name });
      onSelectTemplate(template);
    }
  };



  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Quick Templates</h3>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            className="h-8 px-3 text-xs hover:scale-105 transition-all duration-300 ease-out"
            onClick={() => setMergeFieldDialogOpen(true)}
          >
            <Plus className="w-3 h-3 mr-1" />
            Merge Field
          </Button>
          {onSaveTemplate && (
            <Button
              variant="secondary"
              onClick={onSaveTemplate}
              className="h-8 px-3 text-xs mr-2 hover:scale-105 transition-all duration-300 ease-out"
            >
              <Save className="w-3 h-3 mr-1" />
              Save as Template
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={isLoading ? "Loading templates..." : "Select a template"} />
          </SelectTrigger>
          <SelectContent>
            {templates.map((template) => (
              <SelectItem 
                key={template.id} 
                value={template.id.toString()}
                className="flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                <div>
                  <div className="font-medium">{template.name}</div>
                  <div className="text-xs text-muted-foreground">{template.description}</div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex justify-end">
          <Button 
            variant="secondary"
            onClick={handleInsertTemplate} 
            disabled={!selectedTemplateId}
            className="h-8 px-3 text-xs mr-2 hover:scale-105 transition-all duration-300 ease-out"
          >
            Insert Template
          </Button>
        </div>
      </div>
      
      <MergeFieldDialog 
        open={mergeFieldDialogOpen} 
        onOpenChange={setMergeFieldDialogOpen} 
      />
    </div>
  );
}