import { Progress } from "@/components/ui/progress";

interface EmailSearchProgressProps {
  phase: string; 
  completed: number;
  total: number;
  isVisible: boolean;
}

export function EmailSearchProgress({ 
  phase, 
  completed, 
  total,
  isVisible
}: EmailSearchProgressProps) {
  if (!isVisible) return null;
  
  const percentComplete = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  return (
    <div className="mb-4 w-full">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium">
          {phase} ({completed}/{total} companies)
        </span>
        <span className="text-sm text-muted-foreground">{percentComplete}%</span>
      </div>
      <Progress value={percentComplete} className="h-2" />
    </div>
  );
}