import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  UserX,
  Ban,
  Plus,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Edit,
  Copy,
  Archive,
  Trash2,
  Mail,
  Target,
  Calendar,
} from "lucide-react";
import type { ContactList, Contact, InsertContactList } from "@shared/schema";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface ContactStats {
  totalContacts: number;
  unsubscribers: number;
  blocklist: number;
}

// Form validation schema
const newListFormSchema = z.object({
  name: z.string().min(1, "List name is required"),
  description: z.string().optional(),
});

type NewListFormValues = z.infer<typeof newListFormSchema>;

// NewListModal component
function NewListModal({ 
  open, 
  onOpenChange 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<NewListFormValues>({
    resolver: zodResolver(newListFormSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const createListMutation = useMutation({
    mutationFn: async (values: NewListFormValues) => {
      const response = await apiRequest("POST", "/api/contact-lists", {
        ...values,
        userId: user?.id,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Contact list created successfully",
      });
      // Invalidate and refetch contact lists
      queryClient.invalidateQueries({ queryKey: ["/api/contact-lists"] });
      // Close modal
      onOpenChange(false);
      // Reset form
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create contact list",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: NewListFormValues) => {
    createListMutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Contact List</DialogTitle>
          <DialogDescription>
            Create a new list to organize your contacts
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
                    <Input
                      placeholder="e.g., Q1 2025 Prospects"
                      {...field}
                      data-testid="input-list-name"
                    />
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
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add a description..."
                      className="min-h-[80px]"
                      {...field}
                      data-testid="textarea-list-description"
                    />
                  </FormControl>
                  <FormDescription>
                    Briefly describe the purpose of this list
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={createListMutation.isPending}
                data-testid="button-create-list"
              >
                {createListMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function Contacts() {
  const [currentPage, setCurrentPage] = useState(1);
  const [newListModalOpen, setNewListModalOpen] = useState(false);
  const [selectedLists, setSelectedLists] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const itemsPerPage = 10;

  // Fetch contact lists
  const { data: contactLists = [], isLoading: listsLoading, refetch: refetchLists } = useQuery<ContactList[]>({
    queryKey: ["/api/contact-lists"],
    enabled: !!user,
  });

  // Fetch all contacts to calculate stats
  const { data: contactsData, isLoading: contactsLoading } = useQuery<{ total: number; contacts: Contact[] }>({
    queryKey: ["/api/contacts"],
    enabled: !!user,
  });

  // Calculate contact statistics
  const contactStats: ContactStats = {
    totalContacts: contactsData?.total || 0,
    // For now, we'll set unsubscribers and blocklist to 0 or mock values
    // These would typically come from a specific field in the contact data
    unsubscribers: 13, // Mock value matching the design
    blocklist: 0, // Mock value matching the design
  };

  // Pagination logic
  const totalPages = Math.ceil(contactLists.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLists = contactLists.slice(startIndex, endIndex);

  const handleNewList = () => {
    // Open the new list modal
    setNewListModalOpen(true);
  };

  const handleListClick = (listId: number) => {
    navigate(`/contact-lists/${listId}`);
  };

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  // Handle select all checkbox
  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedLists(new Set(paginatedLists.map(list => list.id)));
    } else {
      setSelectedLists(new Set());
    }
  };

  // Toggle list selection
  const toggleListSelection = (e: React.MouseEvent, listId: number) => {
    e.stopPropagation();
    setSelectedLists(prev => {
      const newSet = new Set(prev);
      if (newSet.has(listId)) {
        newSet.delete(listId);
      } else {
        newSet.add(listId);
      }
      return newSet;
    });
  };

  // Update select all status when selections change
  useEffect(() => {
    const allSelected = paginatedLists.length > 0 && paginatedLists.every(list => selectedLists.has(list.id));
    setSelectAll(allSelected);
  }, [selectedLists, paginatedLists]);

  // Delete list mutation
  const deleteListMutation = useMutation({
    mutationFn: async (listId: number) => {
      const response = await apiRequest("DELETE", `/api/contact-lists/${listId}`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Contact list deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/contact-lists"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete contact list",
        variant: "destructive",
      });
    },
  });

  const handleDeleteList = (e: React.MouseEvent, listId: number, listName: string) => {
    e.stopPropagation();
    if (confirm(`Delete "${listName}"? This action cannot be undone.`)) {
      deleteListMutation.mutate(listId);
    }
  };

  const isLoading = listsLoading || contactsLoading;

  return (
    <>
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Contacts</h1>
          <Button
            onClick={handleNewList}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            data-testid="button-new-list"
          >
            <Plus className="w-4 h-4 mr-2" />
            New list
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* All contacts card - clickable */}
          <Link href="/contacts/all-contacts">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <Users className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        All contacts
                      </p>
                      <p className="text-2xl font-bold mt-1" data-testid="text-all-contacts-count">
                        {contactStats.totalContacts.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Users className="w-5 h-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Unsubscribers card */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <UserX className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Unsubscribers
                    </p>
                    <p className="text-2xl font-bold mt-1" data-testid="text-unsubscribers-count">
                      {contactStats.unsubscribers}
                    </p>
                  </div>
                </div>
                <UserX className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          {/* Blocklist card */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-red-50 rounded-lg">
                    <Ban className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Blocklist
                    </p>
                    <p className="text-2xl font-bold mt-1" data-testid="text-blocklist-count">
                      {contactStats.blocklist}
                    </p>
                  </div>
                </div>
                <Ban className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Your lists section with gradient background */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b">
            <h2 className="text-xl font-semibold">Your lists</h2>
            <CardDescription>
              Organize your contacts into lists for targeted campaigns
            </CardDescription>
          </CardHeader>
          
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <p className="mt-2 text-muted-foreground">Loading lists...</p>
            </div>
          ) : (
            <>
              <div className="w-full overflow-hidden relative">
                {/* Fluffy gradient background matching company table */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(219,234,254,0.6),rgba(239,246,255,0.4),rgba(224,242,254,0.3))] dark:bg-[radial-gradient(ellipse_at_bottom_right,rgba(30,58,138,0.2),rgba(37,99,235,0.15),rgba(29,78,216,0.1))] pointer-events-none"></div>
                <div className="relative z-10">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-8">
                          <Checkbox 
                            checked={selectAll}
                            onCheckedChange={(checked) => handleSelectAll(checked === true)}
                            aria-label="Select all lists"
                          />
                        </TableHead>
                        <TableHead className="font-medium">List Name</TableHead>
                        <TableHead className="hidden md:table-cell font-medium">Contacts</TableHead>
                        <TableHead className="hidden md:table-cell font-medium">Campaigns</TableHead>
                        <TableHead className="font-medium">Created</TableHead>
                        <TableHead className="text-right font-medium">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedLists.length > 0 ? (
                        paginatedLists.map((list) => (
                          <TableRow
                            key={list.id}
                            className="cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-800/40 hover:opacity-100 bg-transparent transition-all duration-200"
                            onClick={() => handleListClick(list.id)}
                            data-testid={`row-list-${list.id}`}
                          >
                            <TableCell 
                              className="px-2 py-3"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Checkbox 
                                checked={selectedLists.has(list.id)}
                                onCheckedChange={() => toggleListSelection({stopPropagation: () => {}} as React.MouseEvent, list.id)}
                                onClick={(e) => e.stopPropagation()}
                                aria-label={`Select ${list.name}`}
                              />
                            </TableCell>
                            <TableCell className="font-medium py-3">
                              <div className="flex flex-col">
                                <div className="font-semibold">{list.name}</div>
                                {list.description && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {list.description}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell py-3">
                              <Badge variant="secondary" className="font-normal">
                                <Users className="h-3 w-3 mr-1" />
                                {list.contactCount || 0}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden md:table-cell py-3">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge variant="outline" className="font-normal">
                                      <Target className="h-3 w-3 mr-1" />
                                      0 active
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>No active campaigns for this list</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                            <TableCell className="py-3">
                              <div className="text-sm text-muted-foreground">
                                {list.createdAt
                                  ? format(new Date(list.createdAt), "MMM d, yyyy 'at' h:mm a")
                                  : "—"}
                              </div>
                            </TableCell>
                            <TableCell className="text-right py-3">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/contact-lists/${list.id}`);
                                    }}
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    View & Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toast({
                                        title: "Coming Soon",
                                        description: "Campaign creation will be available soon",
                                      });
                                    }}
                                  >
                                    <Mail className="h-4 w-4 mr-2" />
                                    Create Campaign
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toast({
                                        title: "Coming Soon",
                                        description: "List duplication will be available soon",
                                      });
                                    }}
                                  >
                                    <Copy className="h-4 w-4 mr-2" />
                                    Duplicate
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toast({
                                        title: "Coming Soon",
                                        description: "List archiving will be available soon",
                                      });
                                    }}
                                  >
                                    <Archive className="h-4 w-4 mr-2" />
                                    Archive
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={(e) => handleDeleteList(e, list.id, list.name)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center">
                            <div className="text-muted-foreground">
                              <p>No lists yet</p>
                              <p className="text-sm mt-1">
                                Click "New list" to create your first contact list
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Viewing {startIndex + 1}—
                    {Math.min(endIndex, contactLists.length)} over{" "}
                    {contactLists.length} results
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePreviousPage}
                      disabled={currentPage === 1}
                      data-testid="button-previous-page"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages}
                      data-testid="button-next-page"
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      {/* New List Modal */}
      <NewListModal 
        open={newListModalOpen} 
        onOpenChange={setNewListModalOpen}
      />
    </>
  );
}