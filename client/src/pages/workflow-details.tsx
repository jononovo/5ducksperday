import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Save, Play, History } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { N8nWorkflow } from "@shared/schema";

export default function WorkflowDetailsPage() {
  const params = useParams<{ id: string }>();
  const workflowId = parseInt(params.id);
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for workflow editor
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);
  const [workflowData, setWorkflowData] = useState<Record<string, any>>({});
  
  // Fetch workflow details
  const { data: workflow, isLoading } = useQuery({
    queryKey: [`/api/workflows/${workflowId}`],
    enabled: !!user && !!workflowId,
  });
  
  // Update state when workflow data is loaded
  useEffect(() => {
    if (workflow) {
      setName(workflow.name || "");
      setDescription(workflow.description || "");
      setActive(workflow.active || false);
      setWorkflowData(workflow.workflowData || {});
    }
  }, [workflow]);
  
  // Mutation for updating a workflow
  const updateWorkflowMutation = useMutation({
    mutationFn: async (data: Partial<N8nWorkflow>) => {
      return apiRequest(`/api/workflows/${workflowId}`, {
        method: "PATCH",
        data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workflows/${workflowId}`] });
      toast({
        title: "Workflow updated",
        description: "The workflow has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update workflow. Please try again.",
        variant: "destructive",
      });
      console.error("Update workflow error:", error);
    },
  });
  
  // Mutation for executing a workflow
  const executeWorkflowMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/workflows/${workflowId}/execute`, {
        method: "POST",
        data: {},
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Workflow executed",
        description: `Execution started with ID: ${data.executionId}`,
      });
      
      // Navigate to executions page after a short delay
      setTimeout(() => {
        navigate(`/workflows/${workflowId}/executions`);
      }, 1500);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to execute workflow. Please try again.",
        variant: "destructive",
      });
      console.error("Execute workflow error:", error);
    },
  });
  
  // Handle save workflow
  const handleSave = () => {
    updateWorkflowMutation.mutate({
      name,
      description,
      active,
      workflowData,
    });
  };
  
  // Handle execute workflow
  const handleExecute = () => {
    executeWorkflowMutation.mutate();
  };
  
  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto py-6">
          <div className="flex justify-center items-center h-64">
            <p>Loading workflow details...</p>
          </div>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <div className="container mx-auto py-6">
        {/* Header with back button */}
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={() => navigate("/workflows")} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Workflows
          </Button>
          <h1 className="text-3xl font-bold flex-1">Workflow Details</h1>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => navigate(`/workflows/${workflowId}/executions`)}
            >
              <History className="h-4 w-4 mr-2" />
              Execution History
            </Button>
            <Button
              onClick={handleExecute}
              disabled={executeWorkflowMutation.isPending}
            >
              <Play className="h-4 w-4 mr-2" />
              {executeWorkflowMutation.isPending ? "Executing..." : "Execute Workflow"}
            </Button>
          </div>
        </div>
        
        {/* Tabs for different workflow aspects */}
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="editor">Workflow Editor</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          
          {/* Details Tab */}
          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle>Workflow Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Workflow name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={description || ""}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe what this workflow does"
                      rows={4}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="active"
                      checked={active}
                      onCheckedChange={setActive}
                    />
                    <Label htmlFor="active">Active</Label>
                  </div>
                  
                  <Button 
                    onClick={handleSave}
                    disabled={updateWorkflowMutation.isPending}
                    className="mt-4"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updateWorkflowMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Workflow Editor Tab */}
          <TabsContent value="editor">
            <Card>
              <CardHeader>
                <CardTitle>Workflow Editor</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted rounded-md p-4 min-h-[400px]">
                  <p className="text-muted-foreground text-center mt-40">
                    The N8N workflow editor will be integrated here.
                    <br />
                    Currently, workflows can be edited directly in the N8N interface.
                  </p>
                </div>
                
                <Button onClick={handleSave} className="mt-4" disabled={updateWorkflowMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {updateWorkflowMutation.isPending ? "Saving..." : "Save Workflow"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Workflow Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="active-setting"
                      checked={active}
                      onCheckedChange={setActive}
                    />
                    <Label htmlFor="active-setting">Active</Label>
                    <p className="text-sm text-muted-foreground ml-2">
                      When inactive, the workflow will not be triggered automatically
                    </p>
                  </div>
                  
                  {workflow && (
                    <div className="space-y-2 text-sm">
                      <p><strong>ID:</strong> {workflowId}</p>
                      <p><strong>Created:</strong> {new Date(workflow.createdAt || "").toLocaleString()}</p>
                      <p><strong>Last Updated:</strong> {new Date(workflow.updatedAt || "").toLocaleString()}</p>
                      
                      {workflow.strategyId && (
                        <p><strong>Associated Strategy:</strong> Strategy #{workflow.strategyId}</p>
                      )}
                    </div>
                  )}
                  
                  <Button onClick={handleSave} className="mt-4" disabled={updateWorkflowMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    {updateWorkflowMutation.isPending ? "Saving..." : "Save Settings"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}