import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { MERGE_FIELDS, type MergeFieldItem } from "@/lib/merge-fields";

interface MergeFieldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MergeFieldDialog({ open, onOpenChange }: MergeFieldDialogProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (field: MergeFieldItem) => {
    try {
      await navigator.clipboard.writeText(field.value);
      setCopiedField(field.value);
      
      // Auto-close dialog after 1 second
      setTimeout(() => {
        onOpenChange(false);
        setCopiedField(null);
      }, 1000);
    } catch (err) {
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = field.value;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        setCopiedField(field.value);
        setTimeout(() => {
          onOpenChange(false);
          setCopiedField(null);
        }, 1000);
      } catch (fallbackErr) {
        console.error('Failed to copy to clipboard:', fallbackErr);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] h-[90vh] max-w-[95vw] sm:w-auto sm:h-auto sm:max-w-lg sm:max-h-[80vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Select Merge Field</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-1">
          {MERGE_FIELDS.map((field) => (
            <div
              key={field.value}
              className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="font-mono text-sm text-foreground">
                  {field.value}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {field.description}
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(field)}
                className="ml-3 flex-shrink-0 h-8 w-8 p-0"
                disabled={copiedField === field.value}
              >
                {copiedField === field.value ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}