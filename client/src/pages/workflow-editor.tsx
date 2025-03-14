import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { N8nWorkflow } from "@shared/schema";

export default function WorkflowEditorPage() {
  const { workflowId } = useParams();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  
  // Get the workflow details
  const { data: workflow, isLoading } = useQuery<N8nWorkflow>({
    queryKey: [`/api/workflows/${workflowId}`],
    enabled: !!workflowId && !!user
  });

  // Function to sync workflow from N8N back to our database
  const syncWorkflow = async () => {
    if (!workflowId) return;
    
    setIsSyncing(true);
    try {
      // This endpoint should extract the workflow data from N8N and update our database
      const result = await apiRequest(`/api/workflows/${workflowId}/sync`, {
        method: "POST",
      });
      
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

  return (
    <Layout>
      <div className="container mx-auto p-4 flex flex-col h-[calc(100vh-80px)]">
        <div className="flex justify-between items-center mb-4">
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
              <h1 className="text-xl font-bold hidden md:block">
                Editing: {workflow.name || "Workflow"}
              </h1>
            )}
          </div>
          
          <div>
            <Button 
              onClick={syncWorkflow}
              disabled={isSyncing}
              variant="default"
              className="ml-2"
            >
              {isSyncing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {isSyncing ? "Syncing..." : "Save Changes"}
            </Button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex-grow flex items-center justify-center">
            <div className="text-center">
              <Skeleton className="h-[600px] w-[800px] rounded-md" />
              <p className="mt-4">Loading workflow editor...</p>
            </div>
          </div>
        ) : (
          <div className="flex-grow border rounded-lg overflow-hidden relative">
            {!iframeLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                <div className="text-center">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p>Loading N8N editor...</p>
                </div>
              </div>
            )}
            <iframe 
              src={`http://localhost:5678/workflow/${workflowId}`}
              className="w-full h-full border-0"
              title="N8N Workflow Editor"
              onLoad={() => setIframeLoaded(true)}
              allow="accelerometer; camera; encrypted-media; fullscreen; geolocation; gyroscope; microphone; midi"
              sandbox="allow-same-origin allow-scripts allow-forms allow-modals allow-popups"
            />
          </div>
        )}
      </div>
    </Layout>
  );
}