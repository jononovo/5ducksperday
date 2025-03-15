import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { RefreshCw, ArrowLeft, Save, PlayCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { N8nWorkflow } from "@shared/schema";
import { WorkflowHeader } from "@/components/workflow-header";

export default function WorkflowEditorPage() {
  const { workflowId } = useParams();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const queryClient = useQueryClient();
  
  // Get the workflow details
  const { data: workflow, isLoading, refetch } = useQuery<N8nWorkflow>({
    queryKey: [`/api/workflows/${workflowId}`],
    enabled: !!workflowId && !!user
  });

  // Handle iframe load event
  const handleIframeLoad = () => {
    setIframeLoaded(true);
    setIframeError(null);
  };

  // Handle iframe error
  const handleIframeError = () => {
    setIframeError("Failed to load the N8N workflow editor. Please check if the N8N service is running.");
    setIframeLoaded(false);
  };

  // Function to send messages to the iframe
  const postMessageToIframe = (message: any) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(message, '*');
    }
  };

  // Function to reload the iframe
  const reloadIframe = () => {
    if (iframeRef.current) {
      postMessageToIframe('n8n-reload');
      // Fallback if postMessage doesn't work
      if (iframeRef.current.src) {
        iframeRef.current.src = iframeRef.current.src;
      }
    }
  };

  // Function to sync workflow from N8N back to our database
  const syncWorkflow = async () => {
    if (!workflowId) return;
    
    setIsSyncing(true);
    try {
      // This endpoint should extract the workflow data from N8N and update our database
      const result = await apiRequest(`/api/workflows/${workflowId}/sync`, {
        method: "POST",
      });
      
      // Invalidate the query cache to refresh the workflow data
      queryClient.invalidateQueries({ queryKey: [`/api/workflows/${workflowId}`] });
      await refetch();
      
      toast({
        title: "Workflow synchronized",
        description: "The workflow has been synchronized with our database.",
      });
    } catch (error) {
      console.error("Error syncing workflow:", error);
      toast({
        title: "Error",
        description: "Failed to sync workflow changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Effect to handle listening for messages from the iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Handle any messages from the N8N iframe here
      if (event.data === 'n8n-workflow-saved') {
        // Auto-sync when workflow is saved in N8N
        syncWorkflow();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [workflowId]);

  // Function to execute the workflow
  const executeWorkflow = async () => {
    if (!workflowId) return;
    
    try {
      const response = await apiRequest(`/api/workflows/${workflowId}/execute`, {
        method: "POST",
      });
      
      toast({
        title: "Workflow execution started",
        description: "The workflow execution has been started. Check the executions tab for results.",
      });
    } catch (error) {
      console.error("Error executing workflow:", error);
      toast({
        title: "Error",
        description: "Failed to execute workflow. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Construct the iframe URL
  const getIframeUrl = () => {
    if (!workflow) return '';
    
    // Use n8nWorkflowId from workflowData if available, otherwise use our internal workflowId
    const workflowData = workflow.workflowData as any || {};
    const n8nId = workflowData.n8nWorkflowId;
    if (n8nId) {
      return `/api/n8n-proxy/workflow/${n8nId}`;
    } else {
      // If no n8nWorkflowId exists yet, use a path that will create a new workflow
      return `/api/n8n-proxy/workflow/new`;
    }
  };

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-64px)]">
        {/* Minimal header with fixed height */}
        <WorkflowHeader
          workflowId={workflowId}
          workflow={workflow}
          isLoading={isLoading}
          isSyncing={isSyncing}
          onSync={syncWorkflow}
          onExecute={executeWorkflow}
          minimal={true}
        />
        
        {/* Main content - takes all remaining height */}
        <div className="flex-grow relative">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Skeleton className="h-[80vh] w-[90vw] max-w-[1200px] rounded-md" />
                <p className="mt-4">Loading workflow editor...</p>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0">
              {iframeError && (
                <Alert variant="destructive" className="m-4">
                  <AlertTitle>Error Loading Editor</AlertTitle>
                  <AlertDescription>
                    {iframeError}
                    <Button variant="outline" size="sm" className="mt-2" onClick={reloadIframe}>
                      Try Again
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {/* N8N Editor Iframe - takes up full remaining space */}
              {workflow && (
                <>
                  {!iframeLoaded && !iframeError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                      <div className="flex flex-col items-center">
                        <RefreshCw className="h-8 w-8 animate-spin text-primary mb-2" />
                        <p>Loading workflow editor...</p>
                      </div>
                    </div>
                  )}
                  
                  <iframe
                    ref={iframeRef}
                    src={getIframeUrl()}
                    className="w-full h-full border-0"
                    title="N8N Workflow Editor"
                    onLoad={handleIframeLoad}
                    onError={handleIframeError}
                    allow="accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone; midi"
                  />
                </>
              )}
              
              {/* Small info indicator in the corner */}
              <div className="absolute bottom-4 right-4 z-10 p-3 bg-card rounded-lg shadow-lg max-w-md opacity-70 hover:opacity-100 transition-opacity">
                <p className="text-xs text-muted-foreground">
                  Remember to click "Save Changes" when finished to synchronize your workflow.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}