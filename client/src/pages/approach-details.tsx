import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Edit3,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Code,
  FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import type { SearchApproach } from "@shared/schema";

// Define an extended interface to include sequence which may not be in schema yet
interface ExtendedSearchApproach extends SearchApproach {
  sequence?: {
    modules: string[];
    moduleConfigs?: Record<string, any>;
  };
}

export default function ApproachDetailsPage() {
  const [, params] = useRoute<{ id: string }>("/approaches/:id");
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<ExtendedSearchApproach>>({});

  // Fetch approach by ID
  const { data: approach, isLoading } = useQuery<ExtendedSearchApproach>({
    queryKey: [`/api/search-approaches/${params?.id}`],
    enabled: !!params?.id,
  });

  // Find implementation files based on module type
  const [implementationFiles, setImplementationFiles] = useState<string[]>([]);
  const [serviceFile, setServiceFile] = useState<string | null>(null);

  useEffect(() => {
    if (approach?.moduleType) {
      // Map module types to their implementation files
      const fileMap: Record<string, { service: string, implementations: string[] }> = {
        company_overview: {
          service: "server/lib/search-logic/company-overview/service.ts",
          implementations: [
            "server/lib/search-logic/company-overview/index.ts",
            "server/lib/search-logic/company-overview/prompts.ts",
          ]
        },
        decision_maker: {
          service: "server/lib/search-logic/decision-maker/service.ts",
          implementations: [
            "server/lib/search-logic/decision-maker/index.ts",
            "server/lib/search-logic/decision-maker/strategies/title-matching.ts",
            "server/lib/search-logic/decision-maker/strategies/seniority-detection.ts",
          ]
        },
        email_discovery: {
          service: "server/lib/search-logic/email-discovery/service.ts",
          implementations: [
            "server/lib/search-logic/email-discovery/index.ts",
            "server/lib/search-logic/email-discovery/strategies/pattern-prediction.ts",
            "server/lib/search-logic/email-discovery/strategies/website-crawler.ts",
            "server/lib/search-logic/email-discovery/strategies/domain-analysis.ts",
          ]
        },
        email_enrichment: {
          service: "server/lib/search-logic/email-enrichment/service.ts",
          implementations: [
            "server/lib/search-logic/email-enrichment/index.ts",
            "server/lib/search-logic/email-enrichment/validation.ts",
          ]
        },
        email_deepdive: {
          service: "server/lib/search-logic/email-deepdive/service.ts",
          implementations: [
            "server/lib/search-logic/email-deepdive/index.ts",
            "server/lib/search-logic/email-deepdive/insights.ts",
          ]
        }
      };
      
      const moduleInfo = fileMap[approach.moduleType];
      if (moduleInfo) {
        setServiceFile(moduleInfo.service);
        setImplementationFiles(moduleInfo.implementations);
      }
    }
  }, [approach?.moduleType]);

  // Update approach
  const updateMutation = useMutation({
    mutationFn: async (data: Partial<SearchApproach>) => {
      const response = await apiRequest("PATCH", `/api/search-approaches/${params?.id}`, data);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update approach");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/search-approaches/${params?.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/search-approaches"] });
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Search approach updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update approach",
        variant: "destructive",
      });
    },
  });

  // Toggle activation
  const toggleMutation = useMutation({
    mutationFn: async (active: boolean) => {
      const response = await apiRequest("PATCH", `/api/search-approaches/${params?.id}`, {
        active,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to toggle approach");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/search-approaches/${params?.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/search-approaches"] });
      toast({
        title: "Success",
        description: "Search approach status toggled successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to toggle approach",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (approach) {
      setFormData({
        name: approach.name,
        prompt: approach.prompt,
        technicalPrompt: approach.technicalPrompt || "",
        responseStructure: approach.responseStructure || "",
        moduleType: approach.moduleType,
        active: approach.active,
        order: approach.order,
        sequence: approach.sequence,
      });
    }
  }, [approach]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const toggleActivation = () => {
    if (approach) {
      toggleMutation.mutate(!approach.active);
    }
  };

  // Helper to get module type display name
  const getModuleTypeDisplay = (type: string | null | undefined) => {
    if (!type) return "Unknown";
    
    const typeMap: Record<string, string> = {
      'company_overview': 'Company Overview',
      'decision_maker': 'Decision Maker',
      'email_discovery': 'Email Discovery',
      'email_enrichment': 'Email Enrichment',
      'email_deepdive': 'Email Deep Dive'
    };
    return typeMap[type] || type;
  };

  const getModuleDescription = (type: string | null | undefined) => {
    if (!type) return "";
    
    const descriptions: Record<string, string> = {
      'company_overview': 'Analyzes companies to gather key information including industry, size, products/services, key people, and market position.',
      'decision_maker': 'Identifies decision makers within a company based on title, seniority, and department filtering.',
      'email_discovery': 'Discovers valid email addresses using website crawling, pattern prediction, and domain analysis.',
      'email_enrichment': 'Validates and enriches email data with probability scores and additional metadata.',
      'email_deepdive': 'Performs deep analysis of email patterns and communication styles for specific contacts.'
    };
    return descriptions[type] || "";
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!approach) {
    return (
      <div className="container mx-auto py-10">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Search Approach Not Found</h1>
          <p className="text-muted-foreground">The approach you're looking for doesn't exist or has been removed.</p>
          <Link href="/approaches">
            <Button className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Approaches
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/approaches">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">{approach.name}</h1>
            <Badge variant={approach.active ? "default" : "outline"}>
              {approach.active ? "Active" : "Inactive"}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={toggleActivation}>
              {approach.active ? (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Disable
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Enable
                </>
              )}
            </Button>
            <Button onClick={() => setIsEditing(true)}>
              <Edit3 className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground mt-2">
          {getModuleTypeDisplay(approach.moduleType)} • Priority: {approach.order}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
              <CardDescription>
                {getModuleDescription(approach.moduleType)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Prompt</h3>
                <div className="bg-muted p-4 rounded-md whitespace-pre-wrap">
                  {approach.prompt}
                </div>
              </div>
              
              {approach.technicalPrompt && (
                <div>
                  <h3 className="font-medium mb-2">Technical Prompt</h3>
                  <pre className="bg-muted p-4 rounded-md text-sm font-mono overflow-x-auto whitespace-pre-wrap">
                    {approach.technicalPrompt}
                  </pre>
                </div>
              )}
              
              {approach.responseStructure && (
                <div>
                  <h3 className="font-medium mb-2">Response Structure</h3>
                  <pre className="bg-muted p-4 rounded-md text-sm font-mono overflow-x-auto whitespace-pre-wrap">
                    {approach.responseStructure}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>

          {approach.sequence && (
            <Card>
              <CardHeader>
                <CardTitle>Execution Sequence</CardTitle>
                <CardDescription>
                  How this approach executes search modules in sequence
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Modules</h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {approach.sequence.modules.map((module) => (
                      <Badge key={module} variant="secondary">
                        {getModuleTypeDisplay(module)}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                {approach.sequence.moduleConfigs && (
                  <div>
                    <h3 className="font-medium mb-2">Module Configurations</h3>
                    <pre className="bg-muted p-4 rounded-md text-sm font-mono overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(approach.sequence.moduleConfigs, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Implementation Files</CardTitle>
              <CardDescription>
                Code files that implement this search approach
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {serviceFile && (
                <div>
                  <div className="flex items-center gap-2 text-primary font-medium mb-1">
                    <FileText className="h-4 w-4" />
                    Main Service File
                  </div>
                  <div className="bg-muted p-3 rounded-md text-sm font-mono">
                    {serviceFile}
                  </div>
                </div>
              )}
              
              {implementationFiles.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-primary font-medium mb-1 mt-4">
                    <Code className="h-4 w-4" />
                    Implementation Files
                  </div>
                  <div className="space-y-2">
                    {implementationFiles.map((file, index) => (
                      <div key={index} className="bg-muted p-3 rounded-md text-sm font-mono">
                        {file}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Usage Information</CardTitle>
              <CardDescription>
                How this approach is used in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-1">Status</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {approach.active ? (
                      <Badge variant="default">Active</Badge>
                    ) : (
                      <Badge variant="outline">Inactive</Badge>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium mb-1">Type</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary">{getModuleTypeDisplay(approach.moduleType)}</Badge>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium mb-1">Priority Order</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline">{approach.order}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Lower numbers have higher priority
                  </p>
                </div>
                
                {approach.completedSearches && (
                  <div>
                    <h3 className="font-medium mb-1">Searches Completed</h3>
                    <div className="mt-1">
                      <Badge variant="outline">{approach.completedSearches.length}</Badge>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Search Approach</DialogTitle>
            <DialogDescription>
              Modify the settings for this search approach
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">
                  Name
                </Label>
                <Input
                  id="edit-name"
                  name="name"
                  value={formData.name || ""}
                  onChange={handleInputChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-moduleType" className="text-right">
                  Module Type
                </Label>
                <Select 
                  name="moduleType" 
                  value={formData.moduleType || ""} 
                  onValueChange={(value) => handleSelectChange("moduleType", value)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select module type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company_overview">Company Overview</SelectItem>
                    <SelectItem value="decision_maker">Decision Maker</SelectItem>
                    <SelectItem value="email_discovery">Email Discovery</SelectItem>
                    <SelectItem value="email_enrichment">Email Enrichment</SelectItem>
                    <SelectItem value="email_deepdive">Email Deep Dive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-order" className="text-right">
                  Display Order
                </Label>
                <Input
                  id="edit-order"
                  name="order"
                  type="number"
                  value={formData.order || 0}
                  onChange={handleInputChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="edit-prompt" className="text-right pt-2">
                  Prompt
                </Label>
                <Textarea
                  id="edit-prompt"
                  name="prompt"
                  value={formData.prompt || ""}
                  onChange={handleInputChange}
                  className="col-span-3 min-h-[100px]"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="edit-technicalPrompt" className="text-right pt-2">
                  Technical Prompt
                </Label>
                <Textarea
                  id="edit-technicalPrompt"
                  name="technicalPrompt"
                  value={formData.technicalPrompt || ""}
                  onChange={handleInputChange}
                  className="col-span-3 min-h-[100px] font-mono text-sm"
                />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="edit-responseStructure" className="text-right pt-2">
                  Response Structure
                </Label>
                <Textarea
                  id="edit-responseStructure"
                  name="responseStructure"
                  value={formData.responseStructure || ""}
                  onChange={handleInputChange}
                  placeholder="{}"
                  className="col-span-3 min-h-[100px] font-mono text-sm"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}