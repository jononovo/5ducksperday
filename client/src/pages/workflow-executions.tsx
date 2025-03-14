import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
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
  Card,
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Play, Eye, RefreshCw } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { N8nWorkflow, N8nWorkflowExecution } from "@shared/schema";

export default function WorkflowExecutionsPage() {
  const params = useParams<{ id: string }>();
  const workflowId = parseInt(params.id);
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedExecution, setSelectedExecution] = useState<N8nWorkflowExecution | null>(null);

  // Fetch workflow details
  const { data: workflow, isLoading: isLoadingWorkflow } = useQuery({
    queryKey: [`/api/workflows/${workflowId}`],
    enabled: !!user && !!workflowId,
  });

  // Fetch workflow executions
  const { 
    data: executions, 
    isLoading: isLoadingExecutions,
    refetch: refetchExecutions
  } = useQuery({
    queryKey: [`/api/workflows/${workflowId}/executions`],
    enabled: !!user && !!workflowId,
  });

  // Execute workflow
  const executeWorkflow = async () => {
    try {
      await apiRequest(`/api/workflows/${workflowId}/execute`, {
        method: "POST",
        data: {},
      });
      
      toast({
        title: "Workflow executed",
        description: "Execution started successfully. Refreshing results...",
      });
      
      // Refresh the executions list after a short delay
      setTimeout(() => {
        refetchExecutions();
      }, 1000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to execute workflow. Please try again.",
        variant: "destructive",
      });
      console.error("Execute workflow error:", error);
    }
  };

  // Get status badge color
  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return "success";
      case 'running':
        return "default";
      case 'failed':
        return "destructive";
      default:
        return "secondary";
    }
  };

  // Format date
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleString();
  };

  // Calculate duration
  const calculateDuration = (start: string | null | undefined, end: string | null | undefined) => {
    if (!start || !end) return "—";
    
    const startDate = new Date(start);
    const endDate = new Date(end);
    const durationMs = endDate.getTime() - startDate.getTime();
    
    // Format nicely
    if (durationMs < 1000) {
      return `${durationMs}ms`;
    } else if (durationMs < 60000) {
      return `${(durationMs / 1000).toFixed(1)}s`;
    } else {
      return `${(durationMs / 60000).toFixed(1)}min`;
    }
  };

  // Refresh executions
  const handleRefresh = () => {
    refetchExecutions();
    toast({
      title: "Refreshed",
      description: "Execution list updated.",
    });
  };

  // Show execution details
  const viewExecutionDetails = (execution: N8nWorkflowExecution) => {
    setSelectedExecution(execution);
  };

  if (isLoadingWorkflow || isLoadingExecutions) {
    return (
      <Layout>
        <div className="container mx-auto py-6">
          <div className="flex justify-center items-center h-64">
            <p>Loading workflow executions...</p>
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
          <Button variant="ghost" onClick={() => navigate(`/workflows/${workflowId}`)} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Workflow
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Execution History</h1>
            {workflow && (
              <p className="text-muted-foreground">
                Workflow: {workflow.name}
              </p>
            )}
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={executeWorkflow}>
              <Play className="h-4 w-4 mr-2" />
              Execute Now
            </Button>
          </div>
        </div>

        {/* Executions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Execution History</CardTitle>
            <CardDescription>
              View the history of all executions for this workflow
            </CardDescription>
          </CardHeader>
          <CardContent>
            {executions && executions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {executions.map((execution: N8nWorkflowExecution) => (
                    <TableRow key={execution.id}>
                      <TableCell className="font-medium">{execution.id}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(execution.status)}>
                          {execution.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(execution.startedAt)}</TableCell>
                      <TableCell>{formatDate(execution.completedAt)}</TableCell>
                      <TableCell>
                        {calculateDuration(execution.startedAt, execution.completedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => viewExecutionDetails(execution)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl">
                            <DialogHeader>
                              <DialogTitle>Execution Details</DialogTitle>
                              <DialogDescription>
                                Execution #{execution.id} - {execution.status}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 mt-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <h3 className="text-sm font-medium mb-1">Started</h3>
                                  <p className="text-sm">{formatDate(execution.startedAt)}</p>
                                </div>
                                <div>
                                  <h3 className="text-sm font-medium mb-1">Completed</h3>
                                  <p className="text-sm">{formatDate(execution.completedAt)}</p>
                                </div>
                                <div>
                                  <h3 className="text-sm font-medium mb-1">Duration</h3>
                                  <p className="text-sm">
                                    {calculateDuration(execution.startedAt, execution.completedAt)}
                                  </p>
                                </div>
                                <div>
                                  <h3 className="text-sm font-medium mb-1">External ID</h3>
                                  <p className="text-sm">{execution.executionId || "—"}</p>
                                </div>
                              </div>

                              {execution.error && (
                                <div className="mt-4">
                                  <h3 className="text-sm font-medium mb-1 text-destructive">Error</h3>
                                  <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
                                    {execution.error}
                                  </div>
                                </div>
                              )}

                              <div className="mt-4">
                                <h3 className="text-sm font-medium mb-1">Input Data</h3>
                                <ScrollArea className="h-40 rounded-md border p-4">
                                  <pre className="text-xs">
                                    {JSON.stringify(execution.inputData || {}, null, 2)}
                                  </pre>
                                </ScrollArea>
                              </div>

                              {execution.outputData && (
                                <div className="mt-4">
                                  <h3 className="text-sm font-medium mb-1">Output Data</h3>
                                  <ScrollArea className="h-40 rounded-md border p-4">
                                    <pre className="text-xs">
                                      {JSON.stringify(execution.outputData, null, 2)}
                                    </pre>
                                  </ScrollArea>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <h3 className="text-lg font-medium mb-2">No executions yet</h3>
                <p className="text-muted-foreground mb-4">
                  This workflow hasn't been executed yet
                </p>
                <Button onClick={executeWorkflow}>
                  <Play className="h-4 w-4 mr-2" />
                  Execute Now
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}