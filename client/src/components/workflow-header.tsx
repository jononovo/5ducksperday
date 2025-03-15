import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, RefreshCw, PlayCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { N8nWorkflow } from "@shared/schema";

interface WorkflowHeaderProps {
  workflowId?: string;
  workflow?: N8nWorkflow;
  isLoading?: boolean;
  isSyncing?: boolean;
  onSync?: () => Promise<void>;
  onExecute?: () => Promise<void>;
  minimal?: boolean;
}

export function WorkflowHeader({
  workflowId,
  workflow,
  isLoading = false,
  isSyncing = false,
  onSync,
  onExecute,
  minimal = false
}: WorkflowHeaderProps) {
  const [, navigate] = useLocation();
  const [isExecuting, setIsExecuting] = useState(false);

  // Handle execute workflow with loading state
  const handleExecute = async () => {
    if (!onExecute) return;
    
    setIsExecuting(true);
    try {
      await onExecute();
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className={`flex justify-between items-center ${minimal ? 'p-2' : 'p-4'} border-b bg-background z-10 ${minimal ? 'h-[50px]' : ''}`}>
      <div className="flex items-center">
        <Button 
          variant="ghost" 
          size={minimal ? "sm" : "default"}
          onClick={() => navigate(minimal ? `/workflows/${workflowId}` : "/workflows")}
          className="mr-2"
        >
          <ArrowLeft className={`${minimal ? 'mr-1 h-4 w-4' : 'mr-2 h-5 w-5'}`} />
          {minimal ? "Back" : "Back to Workflows"}
        </Button>
        
        {!isLoading && workflow ? (
          <h1 className={`${minimal ? 'text-lg' : 'text-2xl'} font-semibold truncate max-w-md`}>
            {workflow.name || "Workflow"}
          </h1>
        ) : (
          <Skeleton className={`w-40 ${minimal ? 'h-6' : 'h-8'}`} />
        )}
      </div>
      
      <div className="flex gap-2">
        {onExecute && (
          <Button 
            onClick={handleExecute}
            disabled={isExecuting}
            variant="outline"
            size={minimal ? "sm" : "default"}
            className="whitespace-nowrap"
          >
            <PlayCircle className={`${minimal ? 'mr-1 h-4 w-4' : 'mr-2 h-5 w-5'}`} />
            {isExecuting ? "Running..." : "Run Workflow"}
          </Button>
        )}
        
        {onSync && (
          <Button 
            onClick={onSync}
            disabled={isSyncing}
            variant="default"
            size={minimal ? "sm" : "default"}
            className="whitespace-nowrap"
          >
            {isSyncing ? (
              <>
                <RefreshCw className={`${minimal ? 'mr-1 h-4 w-4' : 'mr-2 h-5 w-5'} animate-spin`} />
                {minimal ? "Syncing..." : "Synchronizing..."}
              </>
            ) : (
              <>
                <Save className={`${minimal ? 'mr-1 h-4 w-4' : 'mr-2 h-5 w-5'}`} />
                {minimal ? "Save Changes" : "Save Workflow"}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}