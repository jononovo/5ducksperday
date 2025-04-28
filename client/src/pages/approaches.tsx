import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, PlusCircle, Trash2, Edit3, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { SearchApproach } from "@shared/schema";

// Define an extended interface to include sequence which may not be in schema yet
interface ExtendedSearchApproach extends SearchApproach {
  sequence?: {
    modules: string[];
    moduleConfigs?: Record<string, any>;
  };
}

export default function ApproachesPage() {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<ExtendedSearchApproach>>({
    name: "",
    prompt: "",
    technicalPrompt: "",
    responseStructure: "",
    moduleType: "company_overview",
    active: true,
    order: 100, // Default to high number, will be at the end
  });

  // Fetch all search approaches
  const { data: approaches = [], isLoading } = useQuery<ExtendedSearchApproach[]>({
    queryKey: ["/api/search-approaches"],
  });

  // Create new approach
  const createMutation = useMutation({
    mutationFn: async (data: Partial<SearchApproach>) => {
      const response = await apiRequest("POST", "/api/search-approaches", data);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create approach");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/search-approaches"] });
      setIsCreating(false);
      resetForm();
      toast({
        title: "Success",
        description: "Search approach created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create approach",
        variant: "destructive",
      });
    },
  });

  // Update approach
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<SearchApproach> }) => {
      const response = await apiRequest("PATCH", `/api/search-approaches/${id}`, data);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update approach");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/search-approaches"] });
      setEditingId(null);
      resetForm();
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
    mutationFn: async ({ id, active }: { id: number; active: boolean }) => {
      const response = await apiRequest("PATCH", `/api/search-approaches/${id}`, {
        active,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to toggle approach");
      }
      
      return response.json();
    },
    onSuccess: () => {
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      prompt: "",
      technicalPrompt: "",
      responseStructure: "",
      moduleType: "company_overview",
      active: true,
      order: 100,
    });
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    }
  };

  const startEditing = (approach: ExtendedSearchApproach) => {
    setEditingId(approach.id);
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
  };

  const toggleActivation = (approach: ExtendedSearchApproach) => {
    toggleMutation.mutate({
      id: approach.id,
      active: !approach.active,
    });
  };

  // Helper to get module type display name
  const getModuleTypeDisplay = (type: string) => {
    const typeMap: Record<string, string> = {
      'company_overview': 'Company Overview',
      'decision_maker': 'Decision Maker',
      'email_discovery': 'Email Discovery',
      'email_enrichment': 'Email Enrichment',
      'email_deepdive': 'Email Deep Dive'
    };
    return typeMap[type] || type;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Search Approaches</h1>
          <p className="text-muted-foreground mt-1">
            Manage the search strategies and approaches for contact discovery
          </p>
        </div>
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Approach
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create New Search Approach</DialogTitle>
              <DialogDescription>
                Define a new search approach for contact discovery
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="moduleType" className="text-right">
                    Module Type
                  </Label>
                  <Select 
                    name="moduleType" 
                    value={formData.moduleType} 
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
                  <Label htmlFor="order" className="text-right">
                    Display Order
                  </Label>
                  <Input
                    id="order"
                    name="order"
                    type="number"
                    value={formData.order}
                    onChange={handleInputChange}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="prompt" className="text-right pt-2">
                    Prompt
                  </Label>
                  <Textarea
                    id="prompt"
                    name="prompt"
                    value={formData.prompt}
                    onChange={handleInputChange}
                    className="col-span-3 min-h-[100px]"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="technicalPrompt" className="text-right pt-2">
                    Technical Prompt
                  </Label>
                  <Textarea
                    id="technicalPrompt"
                    name="technicalPrompt"
                    value={formData.technicalPrompt}
                    onChange={handleInputChange}
                    className="col-span-3 min-h-[100px] font-mono text-sm"
                  />
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="responseStructure" className="text-right pt-2">
                    Response Structure
                  </Label>
                  <Textarea
                    id="responseStructure"
                    name="responseStructure"
                    value={formData.responseStructure}
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
                  onClick={() => {
                    resetForm();
                    setIsCreating(false);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editingId !== null} onOpenChange={(open) => !open && setEditingId(null)}>
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
                  value={formData.name}
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
                  value={formData.moduleType} 
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
                  value={formData.order}
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
                  value={formData.prompt}
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
                  value={formData.technicalPrompt}
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
                  value={formData.responseStructure}
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
                onClick={() => {
                  resetForm();
                  setEditingId(null);
                }}
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

      {/* List of all search approaches */}
      <div className="grid gap-4">
        {approaches.map((approach) => (
          <ApproachCard 
            key={approach.id} 
            approach={approach}
            onEdit={() => startEditing(approach)}
            onToggle={() => toggleActivation(approach)}
            displayType={getModuleTypeDisplay}
          />
        ))}
      </div>
    </div>
  );
}

interface ApproachCardProps {
  approach: ExtendedSearchApproach;
  onEdit: () => void;
  onToggle: () => void;
  displayType: (type: string) => string;
}

function ApproachCard({ approach, onEdit, onToggle, displayType }: ApproachCardProps) {
  return (
    <Card className="hover:bg-accent/5 transition-colors cursor-pointer">
      <Link href={`/approaches/${approach.id}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {approach.name}
                <Badge variant={approach.active ? "default" : "outline"}>
                  {approach.active ? "Active" : "Inactive"}
                </Badge>
              </CardTitle>
              <CardDescription>
                {displayType(approach.moduleType)} • Priority: {approach.order}
              </CardDescription>
            </div>
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              <Button variant="outline" size="sm" onClick={onToggle}>
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
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit3 className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </div>
          </div>
        </CardHeader>
      </Link>
      <CardContent>
        <div className="truncate text-sm text-muted-foreground">
          {approach.prompt.substring(0, 150)}
          {approach.prompt.length > 150 && "..."}
        </div>
      </CardContent>
    </Card>
  );
}