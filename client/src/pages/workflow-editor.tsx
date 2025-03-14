import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, Save } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function WorkflowEditorPage() {
  const { workflowId } = useParams();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!workflowId || !user) return;

    // Instead of embedding in an iframe, we'll open the N8N editor directly
    // This solves cross-origin and permission issues
    const editorUrl = `http://localhost:5678/workflow/${workflowId}`;
    window.open(editorUrl, "_blank", "noopener");
    
    // Redirect back to the workflows page after opening the editor
    navigate("/workflows");
  }, [workflowId, user, navigate]);

  // Function to sync workflow from N8N back to our database
  const syncWorkflow = async () => {
    if (!workflowId) return;
    
    try {
      // This endpoint should extract the workflow data from N8N and update our database
      await apiRequest(`/api/workflows/${workflowId}/sync`, {
        method: "POST",
      });
      
      toast({
        title: "Workflow synchronized",
        description: "The workflow has been synchronized with our database.",
      });
      
      // Navigate back to the workflows list
      navigate("/workflows");
    } catch (error) {
      console.error("Error syncing workflow:", error);
      toast({
        title: "Error",
        description: "Failed to sync workflow changes. Please try again.",
        variant: "destructive",
      });
    }
  };

  const openEditor = () => {
    if (!workflowId) return;
    const editorUrl = `http://localhost:5678/workflow/${workflowId}`;
    window.open(editorUrl, "_blank", "noopener");
  };

  return (
    <Layout>
      <div className="container mx-auto py-4">
        <div className="flex justify-between items-center mb-4">
          <Button 
            variant="outline" 
            onClick={() => navigate("/workflows")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Workflows
          </Button>
        </div>
        
        <div className="bg-card rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-4">N8N Workflow Editor</h1>
          
          <p className="mb-6">
            The N8N workflow editor will open in a new tab. After making changes in the editor, 
            return to this page and click the "Sync Workflow" button to save your changes to our database.
          </p>
          
          <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
            <Button 
              onClick={openEditor}
              className="flex-1"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Open Editor in New Tab
            </Button>
            
            <Button 
              onClick={syncWorkflow}
              className="flex-1"
              variant="outline"
            >
              <Save className="mr-2 h-4 w-4" />
              Sync Workflow
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}