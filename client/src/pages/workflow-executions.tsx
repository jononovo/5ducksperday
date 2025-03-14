import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import Layout from "@/components/layout";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Eye, AlertCircle, CheckCircle, Clock, MoreHorizontal } from "lucide-react";
import { N8nWorkflowExecution } from "@shared/schema";

export default function WorkflowExecutionsPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [selectedExecution, setSelectedExecution] = useState<N8nWorkflowExecution | null>(null);

  // Fetch workflow details
  const { data: workflow, isLoading: isLoadingWorkflow } = useQuery({
    queryKey: [`/api/workflows/${id}`],
    enabled: !!user && !!id,
  });

  // Fetch workflow executions
  const { data: executions, isLoading: isLoadingExecutions } = useQuery({
    queryKey: [`/api/workflows/${id}/executions`],
    enabled: !!user && !!id,
  });

  // Helper function to get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="mr-1 h-3 w-3" />
            Completed
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <AlertCircle className="mr-1 h-3 w-3" />
            Failed
          </Badge>
        );
      case "running":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Clock className="mr-1 h-3 w-3 animate-spin" />
            Running
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            <MoreHorizontal className="mr-1 h-3 w-3" />
            {status}
          </Badge>
        );
    }
  };

  // Format date helper
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "medium",
    }).format(date);
  };

  // Calculate duration helper
  const calculateDuration = (
    startDate: string | null | undefined,
    endDate: string | null | undefined
  ) => {
    if (!startDate || !endDate) return "—";
    
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const durationMs = end - start;
    
    if (durationMs < 1000) {
      return `${durationMs}ms`;
    } else if (durationMs < 60000) {
      return `${Math.round(durationMs / 1000)}s`;
    } else {
      const minutes = Math.floor(durationMs / 60000);
      const seconds = Math.round((durationMs % 60000) / 1000);
      return `${minutes}m ${seconds}s`;
    }
  };

  // View execution details
  const viewExecutionDetails = (execution: N8nWorkflowExecution) => {
    setSelectedExecution(execution);
  };

  const isLoading = isLoadingWorkflow || isLoadingExecutions;

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={() => navigate(`/workflows/${id}`)} className="mr-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Workflow
          </Button>
          <h1 className="text-3xl font-bold flex-1">
            {workflow ? `Executions: ${workflow.name}` : "Workflow Executions"}
          </h1>
          <Button variant="outline" onClick={() => navigate("/workflows")}>
            All Workflows
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <p>Loading execution history...</p>
          </div>
        ) : executions && executions.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Execution History</CardTitle>
              <CardDescription>
                View all executions for this workflow
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                      <TableCell>{execution.id}</TableCell>
                      <TableCell>{getStatusBadge(execution.status)}</TableCell>
                      <TableCell>{formatDate(execution.startedAt)}</TableCell>
                      <TableCell>{formatDate(execution.completedAt)}</TableCell>
                      <TableCell>
                        {calculateDuration(execution.startedAt, execution.completedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewExecutionDetails(execution)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 p-6 text-center">
            <h3 className="text-lg font-medium mb-2">No executions yet</h3>
            <p className="text-muted-foreground mb-4">
              This workflow hasn't been executed yet. Execute it to see results here.
            </p>
            <Button onClick={() => navigate(`/workflows/${id}`)}>
              Back to Workflow
            </Button>
          </div>
        )}

        {/* Execution Details Dialog */}
        <Dialog
          open={!!selectedExecution}
          onOpenChange={(open) => {
            if (!open) setSelectedExecution(null);
          }}
        >
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Execution Details</DialogTitle>
              <DialogDescription>
                Details of workflow execution #{selectedExecution?.id}
              </DialogDescription>
            </DialogHeader>

            {selectedExecution && (
              <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
                    <div className="mt-1">{getStatusBadge(selectedExecution.status)}</div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Execution ID</h3>
                    <p className="mt-1">{selectedExecution.id}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Started At</h3>
                    <p className="mt-1">{formatDate(selectedExecution.startedAt)}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Completed At</h3>
                    <p className="mt-1">{formatDate(selectedExecution.completedAt)}</p>
                  </div>
                </div>

                {selectedExecution.error && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-muted-foreground">Error</h3>
                    <div className="mt-1 p-3 bg-red-50 text-red-800 rounded-md border border-red-200 text-sm">
                      {selectedExecution.error}
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Input Data</h3>
                  <pre className="mt-1 p-3 bg-gray-50 rounded-md border text-sm overflow-x-auto">
                    {JSON.stringify(selectedExecution.inputData || {}, null, 2)}
                  </pre>
                </div>

                {selectedExecution.outputData && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-muted-foreground">Output Data</h3>
                    <pre className="mt-1 p-3 bg-gray-50 rounded-md border text-sm overflow-x-auto">
                      {JSON.stringify(selectedExecution.outputData, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}