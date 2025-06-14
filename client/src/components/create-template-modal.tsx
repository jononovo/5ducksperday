import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertEmailTemplateSchema } from "@shared/schema";
import type { InsertEmailTemplate } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Loader2, FileText, ChevronDown } from "lucide-react";

interface CreateTemplateModalProps {
  onTemplateCreated?: () => void;
}

// Define merge variables for email templates
const MERGE_VARIABLES = [
  { label: "Company Name", value: "{{company_name}}" },
  { label: "Contact Name", value: "{{contact_name}}" },
  { label: "Contact Role", value: "{{contact_role}}" },
  { label: "Sender Name", value: "{{sender_name}}" },
];

export default function CreateTemplateModal({ onTemplateCreated }: CreateTemplateModalProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  // Helper function to insert merge variable into subject field
  const insertMergeVariable = (mergeVariable: string, field: any) => {
    const currentValue = field.value || "";
    const newValue = currentValue + mergeVariable;
    field.onChange(newValue);
  };
  const queryClient = useQueryClient();

  const form = useForm<InsertEmailTemplate>({
    resolver: zodResolver(insertEmailTemplateSchema),
    defaultValues: {
      name: "",
      subject: "",
      content: "",
      description: "",
      category: "general"
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertEmailTemplate) => {
      console.log('CreateTemplateModal - Submitting form with data:', {
        ...data,
        category: data.category || 'general'
      });

      const res = await apiRequest("POST", "/api/email-templates", data);
      console.log('CreateTemplateModal - API Response status:', res.status);

      if (!res.ok) {
        const error = await res.json();
        console.error('CreateTemplateModal - API Error:', error);
        throw new Error(error.message || "Failed to create template");
      }

      const result = await res.json();
      console.log('CreateTemplateModal - Success:', {
        id: result.id,
        name: result.name,
        userId: result.userId
      });
      return result;
    },
    onSuccess: () => {
      console.log('CreateTemplateModal - Mutation succeeded');
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      toast({
        title: "Success",
        description: "Template created successfully",
      });
      setOpen(false);
      form.reset();
      onTemplateCreated?.();
    },
    onError: (error) => {
      console.error('CreateTemplateModal - Mutation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create template",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: InsertEmailTemplate) => {
    console.log('CreateTemplateModal - Form submitted:', {
      name: data.name,
      subject: data.subject,
      formErrors: form.formState.errors
    });

    try {
      await createMutation.mutateAsync(data);
    } catch (error) {
      console.error('CreateTemplateModal - Submit error:', error);
      // Keep modal open on error
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-8 px-3 text-xs hover:scale-105 transition-all duration-300 ease-out">
          <Plus className="w-3 h-3 mr-1" />
          New Template
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create Email Template</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={(e) => {
            e.preventDefault();
            console.log('Form submit event triggered');
            form.handleSubmit(onSubmit)(e);
          }} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Template name" 
                      {...field} 
                      onChange={(e) => {
                        console.log('Name field changed:', e.target.value);
                        field.onChange(e);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        placeholder="Email subject" 
                        {...field}
                        className="pb-10"
                        onChange={(e) => {
                          console.log('Subject field changed:', e.target.value);
                          field.onChange(e);
                        }}
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            type="button"
                            variant="outline" 
                            size="sm"
                            className="absolute bottom-2 right-2 h-6 px-2 text-xs hover:scale-105 transition-all duration-300 ease-out"
                          >
                            <FileText className="w-3 h-3 mr-1" />
                            Merge
                            <ChevronDown className="w-3 h-3 ml-1" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          {MERGE_VARIABLES.map((variable) => (
                            <DropdownMenuItem
                              key={variable.value}
                              onClick={() => insertMergeVariable(variable.value, field)}
                              className="cursor-pointer"
                            >
                              {variable.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description/Prompt</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Template description or generation prompt"
                      className="min-h-[100px]"
                      {...field} 
                      onChange={(e) => {
                        console.log('Description field changed:', e.target.value);
                        field.onChange(e);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Body</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Email content"
                      className="min-h-[200px]"
                      {...field}
                      onChange={(e) => {
                        console.log('Content field changed:', e.target.value);
                        field.onChange(e);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                onClick={() => form.handleSubmit(onSubmit)()}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Template'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}