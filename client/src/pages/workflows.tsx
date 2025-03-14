import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { PlusCircle, Play, Edit, Trash, Eye } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { N8nWorkflow } from "@shared/schema";

// Form schema for creating/editing workflows
const workflowFormSchema = z.object({
  name: z.string().min(1, "Workflow name is required"),
  description: z.string().optional(),
  strategyId: z.number().optional(),
});

type WorkflowFormValues = z.infer<typeof workflowFormSchema>;

export default function WorkflowsPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isNewWorkflowDialogOpen, setIsNewWorkflowDialogOpen] = useState(false);

  // Fetch workflows
  const { data: workflows, isLoading } = useQuery({
    queryKey: ["/api/workflows"],
    enabled: !!user,
  });
  
  // Fetch search strategies
  const { data: searchStrategies } = useQuery({
    queryKey: ["/api/search-approaches"],
    enabled: !!user,
  });

  // Form for creating new workflows
  const form = useForm<WorkflowFormValues>({
    resolver: zodResolver(workflowFormSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // Mutation for creating a new workflow
  const createWorkflowMutation = useMutation({
    mutationFn: async (data: any) => {
      // Default workflowData if not provided
      const workflowData = data.workflowData || {};
      
      return apiRequest("/api/workflows", {
        method: "POST",
        data: {
          ...data,
          active: true,
          workflowData, 
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflows"] });
      setIsNewWorkflowDialogOpen(false);
      form.reset();
      toast({
        title: "Workflow created",
        description: "The workflow has been created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create workflow. Please try again.",
        variant: "destructive",
      });
      console.error("Create workflow error:", error);
    },
  });

  // Mutation for executing a workflow
  const executeWorkflowMutation = useMutation({
    mutationFn: async (workflowId: number) => {
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

  // Advanced Key Contact Discovery workflow template
  const keyContactWorkflowTemplate = {
    name: "Advanced Key Contact Discovery",
    active: true,
    nodes: [
      {
        parameters: {
          description: "Start the contact discovery process",
          objectData: "={{ $workflow.company }}",
          resultData: {
            success: true,
            data: {
              name: "={{ $workflow.company.name }}",
              website: "={{ $workflow.company.website }}"
            }
          }
        },
        name: "Start",
        type: "n8n-nodes-base.start",
        typeVersion: 1,
        position: [100, 300]
      },
      {
        parameters: {
          description: "Search for key decision makers",
          operation: "executeSingleFunction",
          functionCode: "// This function searches for key decision makers using the ID17 strategy\nreturn {\n  success: true,\n  contacts: [\n    // The contacts will be populated by the advanced search algorithm\n  ]\n};"
        },
        name: "Discovery Function",
        type: "n8n-nodes-base.function",
        typeVersion: 1,
        position: [300, 300]
      },
      {
        parameters: {
          description: "Filter and validate discovered contacts",
          functionCode: "// Filter contacts with high confidence scores\nconst highConfidenceContacts = $input.all()[0].json.contacts.filter(c => c.score > 70);\nreturn { contacts: highConfidenceContacts, count: highConfidenceContacts.length };"
        },
        name: "Filter Contacts",
        type: "n8n-nodes-base.function",
        typeVersion: 1,
        position: [500, 300]
      },
      {
        parameters: {
          description: "Save to database",
          operation: "executeCustomCode",
          customCode: "// Save contacts to database\nconst contacts = $input.all()[0].json.contacts;\nreturn { success: true, savedContacts: contacts.length };"
        },
        name: "Save Results",
        type: "n8n-nodes-base.code",
        typeVersion: 1,
        position: [700, 300]
      }
    ],
    connections: {
      Start: {
        main: [
          [
            {
              node: "Discovery Function",
              type: "main",
              index: 0
            }
          ]
        ]
      },
      "Discovery Function": {
        main: [
          [
            {
              node: "Filter Contacts",
              type: "main",
              index: 0
            }
          ]
        ]
      },
      "Filter Contacts": {
        main: [
          [
            {
              node: "Save Results",
              type: "main",
              index: 0
            }
          ]
        ]
      }
    }
  };

  // Handle form submission for new workflow
  const onSubmit = (data: WorkflowFormValues) => {
    // If this is an Advanced Key Contact Discovery workflow (strategyId === 17)
    // add the template workflow data
    if (data.strategyId === 17) {
      createWorkflowMutation.mutate({
        ...data,
        workflowData: keyContactWorkflowTemplate
      });
    } else {
      createWorkflowMutation.mutate(data);
    }
  };

  // Function to execute a workflow
  const executeWorkflow = (workflowId: number) => {
    executeWorkflowMutation.mutate(workflowId);
  };

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Workflow Management</h1>
          <Dialog open={isNewWorkflowDialogOpen} onOpenChange={setIsNewWorkflowDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Workflow
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Workflow</DialogTitle>
                <DialogDescription>
                  Create a new workflow for your data processing and automation tasks.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                    name="strategyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Search Strategy</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          defaultValue={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a search strategy" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {searchStrategies?.map((strategy: any) => (
                              <SelectItem key={strategy.id} value={strategy.id.toString()}>
                                {strategy.name} {strategy.id === 17 && "(Advanced Key Contact Discovery)"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Associate this workflow with a search strategy to automate contact discovery
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button
                      type="submit"
                      disabled={createWorkflowMutation.isPending}
                    >
                      {createWorkflowMutation.isPending ? "Creating..." : "Create Workflow"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-card rounded-lg shadow">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <p>Loading workflows...</p>
            </div>
          ) : workflows && workflows.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workflows.map((workflow: N8nWorkflow) => (
                  <TableRow key={workflow.id}>
                    <TableCell className="font-medium">{workflow.name}</TableCell>
                    <TableCell>{workflow.description || "—"}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          workflow.active
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {workflow.active ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {new Date(workflow.createdAt!).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => executeWorkflow(workflow.id)}
                          disabled={executeWorkflowMutation.isPending}
                        >
                          <Play className="h-4 w-4" />
                          <span className="sr-only">Execute</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/workflows/${workflow.id}/executions`)}
                        >
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">View Executions</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/workflows/${workflow.id}`)}
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 p-6 text-center">
              <h3 className="text-lg font-medium mb-2">No workflows yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first workflow to automate data processing and search tasks
              </p>
              <Button onClick={() => setIsNewWorkflowDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Workflow
              </Button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}