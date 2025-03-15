import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RefreshCw, ArrowLeft, Save, PlayCircle, ExternalLink } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { WorkflowHeader } from "@/components/workflow-header";
import { N8nWorkflow } from "@shared/schema";

export default function WorkflowEditorPage() {
  const { workflowId } = useParams();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [n8nStatus, setN8nStatus] = useState<'loading' | 'running' | 'error'>('loading');
  const queryClient = useQueryClient();
  
  // Get the workflow details
  const { data: workflow, isLoading, refetch } = useQuery<N8nWorkflow>({
    queryKey: [`/api/workflows/${workflowId}`],
    enabled: !!workflowId && !!user
  });

  // Check if n8n is running
  useEffect(() => {
    const checkN8nStatus = async () => {
      try {
        // Use a proxy endpoint to avoid CORS issues
        const response = await fetch('/api/n8n/status');
        const data = await response.json();
        
        if (data.status === 'ok') {
          setN8nStatus('running');
        } else {
          setN8nStatus('error');
        }
      } catch (error) {
        console.error("Error checking n8n status:", error);
        setN8nStatus('error');
      }
    };
    
    checkN8nStatus();
    // Check status every 30 seconds
    const interval = setInterval(checkN8nStatus, 30000);
    return () => clearInterval(interval);
  }, []);

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

  // Function to execute the workflow
  const executeWorkflow = async () => {
    if (!workflowId) return;
    
    setIsExecuting(true);
    try {
      const response = await apiRequest(`/api/workflows/${workflowId}/execute`, {
        method: "POST",
      });
      
      toast({
        title: "Workflow execution started",
        description: "The workflow execution has been started. Check the executions tab for results.",
      });
      
      // Navigate to executions page after successful execution
      navigate(`/workflows/${workflowId}/executions`);
    } catch (error) {
      console.error("Error executing workflow:", error);
      toast({
        title: "Error",
        description: "Failed to execute workflow. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  // Function to get the n8n workflow URL
  const getN8nWorkflowUrl = (): string => {
    if (!workflow) return '/api/n8n-proxy/workflow/new';
    
    const workflowData = workflow.workflowData as any || {};
    const n8nWorkflowId = workflowData.n8nWorkflowId;
    
    if (n8nWorkflowId) {
      return `/api/n8n-proxy/workflow/${n8nWorkflowId}`;
    } else {
      return '/api/n8n-proxy/workflow/new';
    }
  };

  // Function to open n8n in a new tab
  const openN8nEditor = () => {
    window.open(getN8nWorkflowUrl(), '_blank');
  };

  return (
    <Layout>
      <div className="container mx-auto py-6">
        {/* Header with back button */}
        <WorkflowHeader
          workflowId={workflowId}
          workflow={workflow}
          isLoading={isLoading}
          isSyncing={isSyncing}
          onSync={syncWorkflow}
          onExecute={executeWorkflow}
          minimal={false}
        />
        
        <div className="mt-8">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-64" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-64 w-full mt-8" />
            </div>
          ) : (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Workflow Editor</CardTitle>
                  <CardDescription>
                    Edit your workflow using the n8n editor
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {n8nStatus === 'running' ? (
                      <div className="p-8 border rounded-lg bg-muted/50 flex flex-col items-center justify-center">
                        <Badge variant="outline" className="mb-4 px-2 py-1">
                          <span className="h-2 w-2 rounded-full bg-green-500 mr-2 inline-block"></span>
                          n8n is running
                        </Badge>
                        
                        <h3 className="text-xl font-semibold mb-2">Ready to edit your workflow</h3>
                        <p className="text-center mb-6 text-muted-foreground max-w-md">
                          The n8n editor will open in a new tab. After making changes, remember to save your workflow and sync it back to this application.
                        </p>
                        
                        <Button size="lg" className="gap-2" onClick={openN8nEditor}>
                          <ExternalLink className="h-5 w-5" />
                          Open in n8n Editor
                        </Button>
                        
                        <div className="mt-6 flex flex-col items-center">
                          <p className="text-sm text-muted-foreground mb-2">After you've finished editing:</p>
                          <Button 
                            onClick={syncWorkflow} 
                            disabled={isSyncing}
                            variant="outline" 
                            className="gap-2"
                          >
                            {isSyncing ? (
                              <>
                                <RefreshCw className="h-4 w-4 animate-spin" />
                                Syncing...
                              </>
                            ) : (
                              <>
                                <Save className="h-4 w-4" />
                                Sync Changes from n8n
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Alert variant="destructive">
                        <AlertTitle>n8n Service Unavailable</AlertTitle>
                        <AlertDescription>
                          <p className="mb-2">The n8n service is currently not running or not accessible.</p>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              // Try to restart n8n via API
                              fetch('/api/n8n/restart', { method: 'POST' })
                                .then(() => setN8nStatus('loading'))
                                .catch(err => console.error("Failed to restart n8n:", err));
                            }}
                          >
                            Try to restart n8n
                          </Button>
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {workflow && (
                      <div className="mt-8">
                        <Separator className="my-4" />
                        <h3 className="text-lg font-medium mb-2">Workflow Details</h3>
                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <label className="text-sm font-medium">Name</label>
                            <Input value={workflow.name || ''} readOnly className="bg-muted/50" />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Description</label>
                            <Textarea value={workflow.description || ''} readOnly className="bg-muted/50" />
                          </div>
                          {workflow.workflowData && (workflow.workflowData as any).n8nWorkflowId && (
                            <div>
                              <label className="text-sm font-medium">n8n Workflow ID</label>
                              <Input 
                                value={(workflow.workflowData as any).n8nWorkflowId} 
                                readOnly 
                                className="bg-muted/50 font-mono text-xs" 
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}