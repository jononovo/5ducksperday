import { Progress } from "@/components/ui/progress";

interface SearchProgressProps {
  phase: string; 
  completed: number;
  total: number;
  isVisible: boolean;
}

export function SearchProgress({ 
  phase, 
  completed, 
  total,
  isVisible
}: SearchProgressProps) {
  if (!isVisible) return null;
  
  const percentComplete = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  return (
    <div className="mb-2 w-full">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-medium">
          {phase} ({completed}/{total})
        </span>
        <span className="text-xs text-muted-foreground">{percentComplete}%</span>
      </div>
      <Progress value={percentComplete} className="h-1.5" />
    </div>
  );
}