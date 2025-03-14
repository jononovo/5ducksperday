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
  
  // State for company selection in the Advanced Key Contact workflow
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  
  // Fetch companies for Advanced Key Contact Discovery workflow
  const { data: companies } = useQuery({
    queryKey: ["/api/companies"],
    enabled: !!user && workflow?.strategyId === 17,
  });
  
  // Mutation for executing a workflow
  const executeWorkflowMutation = useMutation({
    mutationFn: async () => {
      // Prepare execution data
      let executionData = {};
      
      // If this is an Advanced Key Contact Discovery workflow
      if (workflow?.strategyId === 17) {
        // If a company is selected, include it in the execution data
        if (selectedCompanyId && companies) {
          const selectedCompany = companies.find(company => company.id === selectedCompanyId);
          if (selectedCompany) {
            executionData = {
              company: {
                id: selectedCompany.id,
                name: selectedCompany.name,
                website: selectedCompany.website || 'example.com',
                industry: selectedCompany.industry
              }
            };
            
            console.log('Executing workflow with company data:', executionData);
          }
        }
      }
      
      return apiRequest(`/api/workflows/${workflowId}/execute`, {
        method: "POST",
        data: executionData,
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
  
  // Function to fetch and sync the N8N workflow data
  const syncN8nWorkflow = async () => {
    try {
      // Get iframe window to access N8N workflow data
      const iframeEl = document.querySelector('iframe');
      if (!iframeEl) {
        toast({
          title: "Error",
          description: "Could not access the N8N editor iframe",
          variant: "destructive",
        });
        return;
      }

      // Get the workflow ID from the iframe URL
      const iframeSrc = iframeEl.getAttribute('src') || '';
      const n8nWorkflowId = iframeSrc.split('/workflow/')[1]?.replace('new', '');
      
      if (!n8nWorkflowId) {
        toast({
          title: "Warning",
          description: "Please save your workflow in the N8N editor first",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Syncing workflow",
        description: "Fetching workflow data from N8N...",
      });

      // Make a direct fetch to N8N API to get workflow data
      const n8nApiResponse = await fetch(`http://localhost:5678/api/v1/workflows/${n8nWorkflowId}`, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!n8nApiResponse.ok) {
        toast({
          title: "Error",
          description: `Failed to fetch workflow data from N8N: ${n8nApiResponse.status}`,
          variant: "destructive",
        });
        return;
      }

      const n8nWorkflowData = await n8nApiResponse.json();
      
      // Check if this is a workflow with a strategy (e.g., Advanced Key Contact Discovery)
      const hasStrategyTemplate = workflow?.strategyId === 17;
      console.log('Workflow sync with strategy check:', {
        strategyId: workflow?.strategyId,
        isAdvancedKeyContactDiscovery: workflow?.strategyId === 17,
        hasTemplate: hasStrategyTemplate
      });
      
      // Update our local workflow data state, preserving template info if it exists
      const updatedWorkflowData = {
        ...workflowData,
        n8nWorkflowId,
        n8nWorkflow: n8nWorkflowData,
        // Retain strategy template information if applicable
        strategy: hasStrategyTemplate ? {
          id: workflow?.strategyId,
          type: 'Advanced Key Contact Discovery',
          templateVersion: '1.0'
        } : workflowData?.strategy
      };
      
      setWorkflowData(updatedWorkflowData);
      
      // Save the workflow with updated N8N data
      updateWorkflowMutation.mutate({
        name,
        description,
        active,
        workflowData: updatedWorkflowData,
      });
      
      toast({
        title: "Workflow synced",
        description: "The workflow has been synchronized successfully",
      });
      
    } catch (error) {
      console.error('Error syncing N8N workflow:', error);
      toast({
        title: "Error",
        description: "Failed to sync N8N workflow data",
        variant: "destructive",
      });
    }
  };

  // Handle save workflow
  const handleSave = () => {
    // If we're on the editor tab, sync with N8N first
    const activeTab = document.querySelector('[data-state="active"][role="tab"]')?.getAttribute('data-value');
    
    if (activeTab === 'editor') {
      syncN8nWorkflow();
    } else {
      updateWorkflowMutation.mutate({
        name,
        description,
        active,
        workflowData,
      });
    }
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
            {/* If Advanced Key Contact workflow, show company selection in execute button */}
            {workflow?.strategyId === 17 ? (
              <Popover>
                <PopoverTrigger asChild>
                  <Button>
                    <Play className="h-4 w-4 mr-2" />
                    Execute Workflow
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-4">
                    <h4 className="font-medium">Select a target company</h4>
                    <p className="text-sm text-muted-foreground">
                      Choose the company to discover key contacts for:
                    </p>
                    
                    {companies ? (
                      <Select
                        value={selectedCompanyId?.toString() || ""}
                        onValueChange={(value) => setSelectedCompanyId(parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a company" />
                        </SelectTrigger>
                        <SelectContent>
                          {companies.map((company) => (
                            <SelectItem 
                              key={company.id} 
                              value={company.id.toString()}
                            >
                              {company.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm text-muted-foreground">Loading companies...</p>
                    )}
                    
                    <Button 
                      onClick={handleExecute}
                      disabled={executeWorkflowMutation.isPending || !selectedCompanyId}
                      className="w-full"
                    >
                      {executeWorkflowMutation.isPending ? "Executing..." : "Run Workflow"}
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            ) : (
              <Button
                onClick={handleExecute}
                disabled={executeWorkflowMutation.isPending}
              >
                <Play className="h-4 w-4 mr-2" />
                {executeWorkflowMutation.isPending ? "Executing..." : "Execute Workflow"}
              </Button>
            )}
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
                <div className="rounded-md overflow-hidden border border-border">
                  <iframe 
                    src={workflow?.workflowData?.n8nWorkflowId 
                      ? `http://localhost:5678/workflow/${workflow.workflowData.n8nWorkflowId}` 
                      : "http://localhost:5678/workflow/new"} 
                    className="w-full h-[600px] border-0"
                    title="N8N Workflow Editor"
                    onLoad={() => {
                      console.log('N8N iframe loaded', {
                        workflowData: workflow?.workflowData,
                        n8nWorkflowId: workflow?.workflowData?.n8nWorkflowId,
                        hasTemplate: !!workflow?.workflowData?.n8nWorkflow
                      });
                    }}
                  />
                </div>
                
                <div className="mt-4 p-4 bg-muted rounded-md">
                  <p className="text-sm text-muted-foreground mb-2">
                    <strong>Note:</strong> The N8N editor is embedded above. To properly save changes:
                  </p>
                  <ol className="list-decimal ml-5 text-sm">
                    <li>Design your workflow in the N8N editor</li>
                    <li>Click "Save" in the N8N editor</li>
                    <li>Then click the button below to sync the workflow with our system</li>
                  </ol>
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
                        <>
                          <p><strong>Associated Strategy:</strong> {workflow.strategyId === 17 ? 
                            "Advanced Key Contact Discovery (ID: 17)" : 
                            `Strategy #${workflow.strategyId}`}</p>
                          
                          {workflow.strategyId === 17 && (
                            <div className="mt-4 p-4 bg-muted rounded-md">
                              <h4 className="text-sm font-medium mb-2">Advanced Key Contact Discovery</h4>
                              <p className="text-xs text-muted-foreground mb-2">
                                This workflow template is designed to find and validate key decision makers at target companies. 
                                It implements:
                              </p>
                              <ul className="list-disc ml-5 text-xs space-y-1">
                                <li>Automated discovery of leadership contacts</li>
                                <li>AI-powered role validation</li>
                                <li>Email pattern prediction</li>
                                <li>Confidence scoring system</li>
                              </ul>
                            </div>
                          )}
                        </>
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