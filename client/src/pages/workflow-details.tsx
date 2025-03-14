import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  Form,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Save, Play, Code } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { N8nWorkflow } from "@shared/schema";

// Form schema for editing workflows
const workflowFormSchema = z.object({
  name: z.string().min(1, "Workflow name is required"),
  description: z.string().optional(),
  active: z.boolean().default(true),
  strategyId: z.number().optional(),
  workflowData: z.any().optional(),
});

type WorkflowFormValues = z.infer<typeof workflowFormSchema>;

export default function WorkflowDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("details");
  const [workflowJson, setWorkflowJson] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Fetch workflow details
  const { data: workflow, isLoading } = useQuery({
    queryKey: [`/api/workflows/${id}`],
    enabled: !!user && !!id,
  });

  // Fetch search strategies for the strategy dropdown
  const { data: strategies } = useQuery({
    queryKey: ["/api/search-approaches"],
    enabled: !!user,
  });

  // Form for editing workflow
  const form = useForm<WorkflowFormValues>({
    resolver: zodResolver(workflowFormSchema),
    defaultValues: {
      name: "",
      description: "",
      active: true,
      strategyId: undefined,
      workflowData: {},
    },
  });

  // Update form when workflow data is loaded
  useEffect(() => {
    if (workflow) {
      form.reset({
        name: workflow.name,
        description: workflow.description || "",
        active: workflow.active,
        strategyId: workflow.strategyId || undefined,
        workflowData: workflow.workflowData || {},
      });

      setWorkflowJson(JSON.stringify(workflow.workflowData || {}, null, 2));
    }
  }, [workflow, form]);

  // Mutation for updating a workflow
  const updateWorkflowMutation = useMutation({
    mutationFn: async (data: WorkflowFormValues) => {
      return apiRequest(`/api/workflows/${id}`, {
        method: "PUT",
        data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workflows/${id}`] });
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
      return apiRequest(`/api/workflows/${id}/execute`, {
        method: "POST",
        data: {},
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Workflow executed",
        description: `Execution started with ID: ${data.executionId}`,
      });
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

  // Handle form submission for updating workflow
  const onSubmit = (data: WorkflowFormValues) => {
    // Parse the JSON input if we're on the JSON tab
    if (activeTab === "json") {
      try {
        const parsedJson = JSON.parse(workflowJson);
        data.workflowData = parsedJson;
        setJsonError(null);
      } catch (err) {
        setJsonError("Invalid JSON format");
        return;
      }
    }

    updateWorkflowMutation.mutate(data);
  };

  // Function to execute a workflow
  const executeWorkflow = () => {
    executeWorkflowMutation.mutate();
  };

  // Handle JSON input change
  const handleJsonChange = (value: string) => {
    setWorkflowJson(value);
    try {
      JSON.parse(value);
      setJsonError(null);
    } catch (err) {
      setJsonError("Invalid JSON format");
    }
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

  if (!workflow) {
    return (
      <Layout>
        <div className="container mx-auto py-6">
          <div className="flex flex-col items-center justify-center h-64">
            <h3 className="text-lg font-medium mb-2">Workflow not found</h3>
            <p className="text-muted-foreground mb-4">
              The workflow you're looking for doesn't exist or you don't have permission to view it.
            </p>
            <Button onClick={() => navigate("/workflows")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Workflows
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={() => navigate("/workflows")} className="mr-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-3xl font-bold flex-1">Edit Workflow</h1>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={executeWorkflow}
              disabled={executeWorkflowMutation.isPending}
            >
              <Play className="mr-2 h-4 w-4" />
              {executeWorkflowMutation.isPending ? "Executing..." : "Execute Workflow"}
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="json">JSON Configuration</TabsTrigger>
          </TabsList>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <TabsContent value="details">
                <Card>
                  <CardHeader>
                    <CardTitle>Workflow Details</CardTitle>
                    <CardDescription>
                      Configure the basic details of your workflow
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter workflow name" {...field} />
                          </FormControl>
                          <FormDescription>
                            A descriptive name for your workflow
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Enter workflow description"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormDescription>
                            Optional details about what this workflow does
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="active"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Active Status</FormLabel>
                            <FormDescription>
                              When active, this workflow can be executed and scheduled
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {strategies && (
                      <FormField
                        control={form.control}
                        name="strategyId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Associated Strategy</FormLabel>
                            <FormControl>
                              <select
                                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={field.value || ""}
                                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                              >
                                <option value="">None (Generic workflow)</option>
                                {strategies.map((strategy) => (
                                  <option key={strategy.id} value={strategy.id}>
                                    {strategy.name} (ID: {strategy.id})
                                  </option>
                                ))}
                              </select>
                            </FormControl>
                            <FormDescription>
                              Link this workflow to a specific search strategy
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="json">
                <Card>
                  <CardHeader>
                    <CardTitle>Workflow Configuration</CardTitle>
                    <CardDescription>
                      Edit the raw JSON configuration for this workflow (Advanced)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <p className="text-sm text-muted-foreground mb-2">
                        This is the advanced configuration used by N8N to execute the workflow.
                      </p>
                      {jsonError && (
                        <div className="text-red-500 text-sm mb-2">{jsonError}</div>
                      )}
                      <Textarea
                        value={workflowJson}
                        onChange={(e) => handleJsonChange(e.target.value)}
                        className="font-mono text-sm h-96"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={updateWorkflowMutation.isPending || !!jsonError}
                  className="w-full sm:w-auto"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {updateWorkflowMutation.isPending ? "Saving..." : "Save Workflow"}
                </Button>
              </div>
            </form>
          </Form>
        </Tabs>
      </div>
    </Layout>
  );
}