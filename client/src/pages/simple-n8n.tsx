import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { ExternalLink, RefreshCw } from "lucide-react";

export default function SimpleN8nPage() {
  const [n8nStatus, setN8nStatus] = useState<'loading' | 'running' | 'error'>('loading');
  const [isRestarting, setIsRestarting] = useState(false);

  // Simple function to check if n8n is running
  const checkN8nStatus = async () => {
    try {
      const response = await fetch('http://localhost:5678/healthz');
      if (response.ok) {
        setN8nStatus('running');
      } else {
        setN8nStatus('error');
      }
    } catch (error) {
      console.error("Error checking n8n status:", error);
      setN8nStatus('error');
    }
  };

  // Check status on page load and periodically
  useEffect(() => {
    checkN8nStatus();
    const interval = setInterval(checkN8nStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  // Function to restart n8n
  const restartN8n = async () => {
    setIsRestarting(true);
    try {
      await fetch('/api/n8n/restart', { method: 'POST' });
      // Wait a bit for n8n to restart
      setTimeout(() => {
        checkN8nStatus();
        setIsRestarting(false);
      }, 3000);
    } catch (error) {
      console.error("Error restarting n8n:", error);
      setIsRestarting(false);
    }
  };

  // Function to open n8n in a new tab
  const openN8n = () => {
    window.open('http://localhost:5678', '_blank');
  };

  return (
    <Layout>
      <div className="container mx-auto py-10">
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl">n8n Workflow Editor</CardTitle>
            <CardDescription>
              Access the n8n workflow editor directly to create and manage your workflows
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {n8nStatus === 'loading' && (
              <div className="flex justify-center items-center p-10">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Checking n8n status...</span>
              </div>
            )}

            {n8nStatus === 'running' && (
              <div className="text-center p-6 border rounded-lg bg-muted/30">
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800 mb-4">
                  <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
                  n8n Service is Running
                </div>
                
                <h3 className="text-xl font-semibold mb-3">Ready to use n8n</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Click the button below to open n8n in a new browser tab.
                </p>
                
                <Button 
                  size="lg" 
                  className="gap-2" 
                  onClick={openN8n}
                >
                  <ExternalLink className="h-5 w-5" />
                  Open n8n Editor
                </Button>
              </div>
            )}

            {n8nStatus === 'error' && (
              <Alert variant="destructive">
                <AlertTitle>n8n Service Not Available</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>The n8n service is not running or is not accessible.</p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={isRestarting}
                    onClick={restartN8n}
                    className="mt-2"
                  >
                    {isRestarting ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Restarting...
                      </>
                    ) : (
                      "Restart n8n Service"
                    )}
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            <div className="p-4 border rounded bg-amber-50 text-amber-800">
              <h4 className="font-medium mb-1">Important Note</h4>
              <p className="text-sm">
                After creating or modifying workflows in n8n, you'll need to manually sync them with the 5 Ducks
                platform by using the sync functionality in the Workflow Editor page.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}