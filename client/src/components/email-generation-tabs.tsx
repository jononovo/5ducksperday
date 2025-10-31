import { cn } from "@/lib/utils";

export interface GenerationMode {
  id: 'ai_unique' | 'merge_field';
  label: string;
  buttonText: string;
  description?: string;
}

const GENERATION_MODES: GenerationMode[] = [
  { 
    id: 'ai_unique', 
    label: 'AI Each Unique', 
    buttonText: 'Generate Sample',
    description: 'Generate unique email for each recipient'
  },
  { 
    id: 'merge_field', 
    label: 'Merge-field Template', 
    buttonText: 'Generate Template',
    description: 'Use merge fields for personalization'
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
  return (
    <div className={cn("flex rounded-lg border bg-muted/30 p-1 gap-1", className)}>
      {GENERATION_MODES.map((mode) => (
        <button
          key={mode.id}
          type="button"
          onClick={() => onModeChange(mode.id)}
          className={cn(
            "flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all",
            selectedMode === mode.id
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
          title={mode.description}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}

export function getGenerationModeConfig(mode: 'ai_unique' | 'merge_field'): GenerationMode {
  return GENERATION_MODES.find(m => m.id === mode) || GENERATION_MODES[1]; // Default to merge_field
}