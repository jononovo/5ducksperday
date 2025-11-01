import { Plus, Save, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MergeFieldControlsProps {
  isMergeViewMode?: boolean;
  onToggleMergeView?: () => void;
  onMergeFieldClick?: () => void;
  onSaveTemplateClick?: () => void;
  className?: string;
}

export function MergeFieldControls({ 
  isMergeViewMode = false,
  onToggleMergeView,
  onMergeFieldClick,
  onSaveTemplateClick,
  className = ""
}: MergeFieldControlsProps) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {onToggleMergeView && (
        <Button
          variant="secondary"
          className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:scale-105 transition-all duration-300 ease-out"
          onClick={onToggleMergeView}
          data-testid="button-merge-view"
        >
          {isMergeViewMode ? (
            <>
              <EyeOff className="w-3 h-3 mr-0.5" />
              Normal View
            </>
          ) : (
            <>
              <Eye className="w-3 h-3 mr-0.5" />
              Merge View
            </>
          )}
        </Button>
      )}
      {onMergeFieldClick && (
        <Button
          variant="secondary"
          className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:scale-105 transition-all duration-300 ease-out"
          onClick={onMergeFieldClick}
          data-testid="button-merge-field"
        >
          <Plus className="w-3 h-3 mr-0.5" />
          Merge Field
        </Button>
      )}
      {onSaveTemplateClick && (
        <Button
          variant="secondary"
          onClick={onSaveTemplateClick}
          className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground mr-2 hover:scale-105 transition-all duration-300 ease-out"
          data-testid="button-save-template"
        >
          <Save className="w-3 h-3 mr-0.5" />
          Save as Template
        </Button>
      )}
    </div>
  );
}