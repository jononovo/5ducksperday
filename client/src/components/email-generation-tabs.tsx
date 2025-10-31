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
    label: 'AI - Each email unique', 
    buttonText: 'Generate Sample',
    description: 'Generate unique email for each recipient'
  },
  { 
    id: 'merge_field', 
    label: 'Template with merge-fields', 
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
      {GENERATION_MODES.map((mode) => (
        <button
          key={mode.id}
          type="button"
          onClick={() => onModeChange(mode.id)}
          className={cn(
            "px-3 py-1 text-xs rounded-md transition-all min-w-fit",
            selectedMode === mode.id
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
          title={mode.description}
        >
          {renderLabel(mode.label, mode.id === 'ai_unique')}
        </button>
      ))}
    </div>
  );
}

export function getGenerationModeConfig(mode: 'ai_unique' | 'merge_field'): GenerationMode {
  return GENERATION_MODES.find(m => m.id === mode) || GENERATION_MODES[1]; // Default to merge_field
}