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

            <div className="relative flex flex-col items-center justify-center h-full">
              <div className="text-center p-6 max-w-md bg-card rounded-lg shadow-lg">
                <h2 className="text-xl font-bold mb-4">N8N Editor Integration</h2>
                <p className="mb-6">
                  Due to browser security restrictions, we can't embed the N8N editor directly in an iframe.
                </p>
                <p className="mb-6">
                  You can access the N8N editor by clicking the button below, which will open it in a new tab.
                </p>
                <button
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                  onClick={async () => {
                    try {
                      // First get the proper N8N workflow ID from our mapping endpoint
                      const response = await fetch(`/api/n8n-workflow-mapping/${workflowId}`, {
                        method: 'GET',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                      });
                      
                      if (!response.ok) {
                        throw new Error('Failed to get workflow mapping');
                      }
                      
                      const mapping = await response.json();
                      const domain = window.location.origin;
                      
                      // Use the N8N workflow ID if available, otherwise fall back to our database ID
                      const workflowIdToUse = mapping.n8nWorkflowId || workflowId;
                      const n8nEditorUrl = `${domain}/api/n8n-proxy/workflow/${workflowIdToUse}`;
                      
                      window.open(n8nEditorUrl, '_blank');
                    } catch (error) {
                      console.error('Error opening N8N editor:', error);
                      toast({
                        title: 'Error',
                        description: 'Failed to open N8N editor. Please try again.',
                        variant: 'destructive'
                      });
                    }
                  }}
                >
                  Open N8N Editor
                </button>
                <p className="mt-6 text-sm text-muted-foreground">
                  After making changes in the N8N editor, return to this page and click the "Save Changes" button 
                  to synchronize your workflow with our database.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}