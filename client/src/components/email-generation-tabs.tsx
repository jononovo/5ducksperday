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
    activeColor: 'text-purple-600 dark:text-purple-400',
    buttonColor: 'bg-purple-100/80 hover:bg-purple-200/80 text-purple-700 dark:bg-purple-900/40 dark:hover:bg-purple-900/60 dark:text-purple-300'
  },
  { 
    id: 'merge_field', 
    label: 'Template with merge-fields', 
    buttonText: 'Generate Template',
    description: 'Use merge fields for personalization',
    icon: FileText,
    activeColor: 'text-pink-600 dark:text-pink-400',
    buttonColor: 'bg-pink-100/80 hover:bg-pink-200/80 text-pink-700 dark:bg-pink-900/40 dark:hover:bg-pink-900/60 dark:text-pink-300'
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
  const renderLabel = (label: string, isAI: boolean, isSelected: boolean, activeColor: string) => {
    if (isAI) {
      // "AI - Each email unique"
      return (
        <>
          <span className={cn("font-semibold", isSelected ? activeColor : "text-muted-foreground/60")}>AI</span>
          <span className="font-normal text-muted-foreground"> - Each email unique</span>
        </>
      );
    } else {
      // "Template with merge-fields"
      return (
        <>
          <span className={cn("font-semibold", isSelected ? activeColor : "text-muted-foreground/60")}>Template</span>
          <span className="font-normal text-muted-foreground"> with merge-fields</span>
        </>
      );
    }
  };

  return (
    <div className={cn("inline-flex rounded-t-lg bg-muted/30 p-0.5 gap-0.5", className)}>
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
                ? "bg-background shadow-sm"
                : "hover:text-foreground bg-transparent"
            )}
            title={mode.description}
          >
            <Icon className={cn("h-3.5 w-3.5", isSelected ? mode.activeColor : "text-muted-foreground/60")} />
            {renderLabel(mode.label, mode.id === 'ai_unique', isSelected, mode.activeColor)}
          </button>
        );
      })}
    </div>
  );
}

export function getGenerationModeConfig(mode: 'ai_unique' | 'merge_field'): GenerationMode {
  return GENERATION_MODES.find(m => m.id === mode) || GENERATION_MODES[1]; // Default to merge_field
}