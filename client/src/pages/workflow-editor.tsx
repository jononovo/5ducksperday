import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function WorkflowEditorPage() {
  const { workflowId } = useParams();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [editorUrl, setEditorUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!workflowId || !user) return;

    // For self-hosted N8N, the editor is available directly on port 5678
    // No API key required since we're running it in our own application
    setEditorUrl(`http://localhost:5678/workflow/${workflowId}`);
    setIsLoading(false);
  }, [workflowId, user]);

  // Function to save workflow from N8N back to our database
  const saveWorkflow = async () => {
    if (!workflowId) return;
    
    setIsSaving(true);
    try {
      // This endpoint should extract the workflow data from N8N and update our database
      await apiRequest(`/api/workflows/${workflowId}/sync`, {
        method: "POST",
      });
      
      toast({
        title: "Workflow saved",
        description: "The workflow has been synchronized with our database.",
      });
    } catch (error) {
      console.error("Error saving workflow:", error);
      toast({
        title: "Error",
        description: "Failed to save workflow changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto py-4 flex flex-col h-[calc(100vh-80px)]">
        <div className="flex justify-between items-center mb-4">
          <Button 
            variant="outline" 
            onClick={() => navigate("/workflows")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Workflows
          </Button>
          <div>
            <Button 
              onClick={saveWorkflow}
              disabled={isSaving}
              className="ml-2"
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Saving..." : "Save Workflow"}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p>Loading editor...</p>
          </div>
        ) : (
          <div className="flex-grow border rounded-lg overflow-hidden h-full">
            <iframe 
              src={editorUrl}
              className="w-full h-full"
              title="N8N Workflow Editor"
              allow="fullscreen"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads allow-modals"
            ></iframe>
          </div>
        )}
      </div>
    </Layout>
  );
}