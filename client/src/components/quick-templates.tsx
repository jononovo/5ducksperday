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
import { Input } from "@/components/ui/input";
import { FileText, Save, Plus, Edit } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { EmailTemplate } from "@shared/schema";
import MergeFieldDialog from "./merge-field-dialog";

interface QuickTemplatesProps {
  onSelectTemplate: (template: EmailTemplate) => void;
  onSaveTemplate?: (templateName: string) => void;
}

export default function QuickTemplates({ onSelectTemplate, onSaveTemplate }: QuickTemplatesProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>();
  const [mergeFieldDialogOpen, setMergeFieldDialogOpen] = useState(false);
  const [editConfirmDialogOpen, setEditConfirmDialogOpen] = useState(false);
  const [saveTemplateDialogOpen, setSaveTemplateDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
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
    if (!selectedTemplateId) {
      // Could show a toast or just return silently
      return;
    }
    const template = templates.find(t => t.id.toString() === selectedTemplateId);
    if (template) {
      console.log('QuickTemplates - Selected template:', { id: template.id, name: template.name });
      onSelectTemplate(template);
    }
  };

  const handleEditTemplate = () => {
    if (!selectedTemplateId) {
      return;
    }
    setEditConfirmDialogOpen(true);
  };

  const handleConfirmEdit = () => {
    const template = templates.find(t => t.id.toString() === selectedTemplateId);
    if (template) {
      console.log('QuickTemplates - Loading template for editing:', { id: template.id, name: template.name });
      onSelectTemplate(template);
    }
    setEditConfirmDialogOpen(false);
  };

  const handleSaveTemplate = () => {
    if (!onSaveTemplate) return;
    setTemplateName("");
    setSaveTemplateDialogOpen(true);
  };

  const handleConfirmSave = () => {
    if (!templateName.trim() || !onSaveTemplate) return;
    onSaveTemplate(templateName.trim());
    setSaveTemplateDialogOpen(false);
    setTemplateName("");
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
              onClick={handleSaveTemplate}
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

        <div className="flex justify-end gap-2">
          <Button 
            variant="secondary"
            onClick={handleInsertTemplate} 
            disabled={!selectedTemplateId}
            className="h-8 px-3 text-xs hover:scale-105 transition-all duration-300 ease-out"
          >
            <FileText className="w-3 h-3 mr-1" />
            Insert Template
          </Button>
          <Button 
            variant="secondary"
            onClick={handleEditTemplate} 
            disabled={!selectedTemplateId}
            className="h-8 px-3 text-xs hover:scale-105 transition-all duration-300 ease-out"
          >
            <Edit className="w-3 h-3 mr-1" />
            Edit Template
          </Button>
        </div>
      </div>
      
      <MergeFieldDialog 
        open={mergeFieldDialogOpen} 
        onOpenChange={setMergeFieldDialogOpen} 
      />

      <AlertDialog open={editConfirmDialogOpen} onOpenChange={setEditConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Template</AlertDialogTitle>
            <AlertDialogDescription>
              Editing this template, will replace all content currently in fields on this page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEditConfirmDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmEdit}>
              Load the Template
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={saveTemplateDialogOpen} onOpenChange={setSaveTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
            <DialogDescription>
              Enter name of new template:
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Sales Genius 2027"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && templateName.trim()) {
                  handleConfirmSave();
                }
              }}
              className="w-full"
            />
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setSaveTemplateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmSave}
              disabled={!templateName.trim()}
            >
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}