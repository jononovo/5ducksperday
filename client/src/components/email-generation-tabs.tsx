import { cn } from "@/lib/utils";
import { Sparkles, FileText } from "lucide-react";

export interface GenerationMode {
  id: 'ai_unique' | 'merge_field';
  label: string;
  buttonText: string;
  description?: string;
  icon: React.ElementType;
  activeColor: string;
  buttonColor: string;
}

const GENERATION_MODES: GenerationMode[] = [
  { 
    id: 'ai_unique', 
    label: 'AI - Each email unique', 
    buttonText: 'Generate Sample',
    description: 'Generate unique email for each recipient',
    icon: Sparkles,
    activeColor: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    buttonColor: 'bg-purple-600 hover:bg-purple-700 text-white'
  },
  { 
    id: 'merge_field', 
    label: 'Template with merge-fields', 
    buttonText: 'Generate Template',
    description: 'Use merge fields for personalization',
    icon: FileText,
    activeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    buttonColor: 'bg-blue-600 hover:bg-blue-700 text-white'
  }
];

interface EmailGenerationTabsProps {
  selectedMode: 'ai_unique' | 'merge_field';
  onModeChange: (mode: 'ai_unique' | 'merge_field') => void;
  className?: string;
}

export function EmailGenerationTabs({ 
  selectedMode, 
  onModeChange, 
  className 
}: EmailGenerationTabsProps) {
  const renderLabel = (label: string, isAI: boolean) => {
    if (isAI) {
      // "AI - Each email unique"
      return (
        <>
          <span className="font-semibold">AI</span>
          <span className="font-normal"> - Each email unique</span>
        </>
      );
    } else {
      // "Template with merge-fields"
      return (
        <>
          <span className="font-semibold">Template</span>
          <span className="font-normal"> with merge-fields</span>
        </>
      );
    }
  };

  return (
    <div className={cn("inline-flex rounded-lg border bg-muted/30 p-0.5 gap-0.5", className)}>
      {GENERATION_MODES.map((mode) => {
        const Icon = mode.icon;
        const isSelected = selectedMode === mode.id;
        
        return (
          <button
            key={mode.id}
            type="button"
            onClick={() => onModeChange(mode.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 text-xs rounded-md transition-all min-w-fit",
              isSelected
                ? mode.activeColor + " shadow-sm font-medium"
                : "text-muted-foreground hover:text-foreground bg-transparent"
            )}
            title={mode.description}
          >
            <Icon className="h-3.5 w-3.5" />
            {renderLabel(mode.label, mode.id === 'ai_unique')}
          </button>
        );
      })}
    </div>
  );
}

export function getGenerationModeConfig(mode: 'ai_unique' | 'merge_field'): GenerationMode {
  return GENERATION_MODES.find(m => m.id === mode) || GENERATION_MODES[1]; // Default to merge_field
}