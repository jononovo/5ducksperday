import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface N8nServiceStatus {
  isRunning: boolean;
  isHealthy: boolean;
  apiUrl: string;
  editorUrl: string;
  statusMessage: string;
}

export function N8nServiceStatus() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [lastChecked, setLastChecked] = useState<Date>(new Date());
  
  // Query N8N service status
  const { 
    data: serviceStatus, 
    isLoading, 
    isError,
    refetch 
  } = useQuery<N8nServiceStatus>({
    queryKey: ["/api/n8n/status"],
    refetchInterval: 60000, // Check every minute
  });

  // Restart N8N service mutation
  const restartMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/n8n/restart", {
        method: "POST",
      });
    },
    onSuccess: () => {
      toast({
        title: "N8N Service Restarted",
        description: "The N8N service was successfully restarted.",
      });
      // Wait 3 seconds to allow service to start up before refreshing status
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/n8n/status"] });
      }, 3000);
    },
    onError: (error) => {
      toast({
        title: "Restart Failed",
        description: "Failed to restart N8N service. Please try again.",
        variant: "destructive",
      });
      console.error("N8N restart error:", error);
    },
  });

  // Update last checked timestamp on successful refetch
  useEffect(() => {
    if (!isLoading && !isError) {
      setLastChecked(new Date());
    }
  }, [serviceStatus, isLoading, isError]);

  // Determine status indicator
  const getStatusIndicator = () => {
    if (isLoading) {
      return (
        <Badge variant="outline" className="flex items-center">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Checking status...
        </Badge>
      );
    }
    
    if (isError) {
      return (
        <Badge variant="destructive" className="flex items-center">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Status check failed
        </Badge>
      );
    }
    
    if (!serviceStatus?.isRunning) {
      return (
        <Badge variant="destructive" className="flex items-center">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Service not running
        </Badge>
      );
    }
    
    if (!serviceStatus?.isHealthy) {
      return (
        <Badge variant="warning" className="flex items-center bg-amber-500 hover:bg-amber-600">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Service unhealthy
        </Badge>
      );
    }
    
    return (
      <Badge variant="success" className="flex items-center bg-green-500 hover:bg-green-600">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Service healthy
      </Badge>
    );
  };

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-md flex items-center justify-between">
          N8N Service Status
          {getStatusIndicator()}
        </CardTitle>
        <CardDescription>
          Status as of {lastChecked.toLocaleTimeString()}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm pb-0">
        {isLoading ? (
          <div className="flex justify-center items-center h-10">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : isError ? (
          <div className="text-red-500">
            Failed to connect to N8N status service.
          </div>
        ) : (
          <div className="space-y-1">
            <div>{serviceStatus?.statusMessage}</div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between pt-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Check current N8N service status</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <Button
          variant="default"
          size="sm"
          onClick={() => restartMutation.mutate()}
          disabled={restartMutation.isPending || isLoading}
          className={serviceStatus?.isRunning && serviceStatus?.isHealthy ? "bg-blue-500 hover:bg-blue-600" : "bg-red-500 hover:bg-red-600"}
        >
          {restartMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              Restarting...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-1" />
              Restart Service
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}