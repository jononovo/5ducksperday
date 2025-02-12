import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FileText, Plus } from "lucide-react";
import type { EmailTemplate } from "@shared/schema";

interface QuickTemplatesProps {
  onSelectTemplate: (template: EmailTemplate) => void;
}

export default function QuickTemplates({ onSelectTemplate }: QuickTemplatesProps) {
  const { data: templates = [] } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/email-templates"],
  });

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id.toString() === templateId);
    if (template) {
      onSelectTemplate(template);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Quick Templates</h3>
        <Button variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      <Select onValueChange={handleTemplateSelect}>
        <SelectTrigger>
          <SelectValue placeholder="Select a template" />
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
    </div>
  );
}