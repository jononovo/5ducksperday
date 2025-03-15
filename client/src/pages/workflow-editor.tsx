import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, RefreshCw, PlayCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { N8nWorkflow } from "@shared/schema";

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
    const n8nId = workflow.workflowData?.n8nWorkflowId;
    if (n8nId) {
      return `/api/n8n-proxy/workflow/${n8nId}`;
    } else {
      // If no n8nWorkflowId exists yet, use a path that will create a new workflow
      return `/api/n8n-proxy/workflow/new`;
    }
  };

  return (
    <Layout>
      <div className="container mx-auto p-4 flex flex-col h-[calc(100vh-80px)]">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 gap-2">
          <div className="flex items-center">
            <Button 
              variant="outline" 
              onClick={() => navigate("/workflows")}
              className="mr-2"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Workflows
            </Button>
            
            {!isLoading && workflow && (
              <h1 className="text-xl font-bold hidden md:block truncate max-w-md">
                Editing: {workflow.name || "Workflow"}
              </h1>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={executeWorkflow}
              variant="outline"
              className="whitespace-nowrap"
            >
              <PlayCircle className="mr-2 h-4 w-4" />
              Run Workflow
            </Button>
            
            <Button 
              onClick={syncWorkflow}
              disabled={isSyncing}
              variant="default"
              className="whitespace-nowrap"
            >
              {isSyncing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {isSyncing ? "Syncing..." : "Save Changes"}
            </Button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex-grow flex items-center justify-center">
            <div className="text-center">
              <Skeleton className="h-[600px] w-full max-w-[800px] rounded-md" />
              <p className="mt-4">Loading workflow editor...</p>
            </div>
          </div>
        ) : (
          <div className="flex-grow border rounded-lg overflow-hidden relative">
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

            <div className="relative h-full">
              {/* N8N Editor Iframe */}
              {workflow && (
                <div className="h-full w-full">
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
                </div>
              )}
              
              {/* Information overlay in the corner */}
              <div className="absolute bottom-4 right-4 z-10 p-4 bg-card rounded-lg shadow-lg max-w-md">
                <h3 className="text-sm font-semibold mb-2">N8N Editor Integration</h3>
                <p className="text-xs text-muted-foreground mb-2">
                  You're editing this workflow directly in the N8N editor. All changes are made in real-time.
                </p>
                <p className="text-xs text-muted-foreground">
                  Remember to click the "Save Changes" button above when finished to synchronize your workflow with our database.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}