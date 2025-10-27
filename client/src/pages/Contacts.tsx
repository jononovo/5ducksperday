import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
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
  Users,
  UserX,
  Ban,
  Plus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { ContactList, Contact } from "@shared/schema";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

interface ContactStats {
  totalContacts: number;
  unsubscribers: number;
  blocklist: number;
}

export default function Contacts() {
  const [currentPage, setCurrentPage] = useState(1);
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const itemsPerPage = 10;

  // Fetch contact lists
  const { data: contactLists = [], isLoading: listsLoading } = useQuery<ContactList[]>({
    queryKey: ["/api/contact-lists"],
    enabled: !!user,
  });

  // Fetch all contacts to calculate stats
  const { data: allContacts = [], isLoading: contactsLoading } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
    enabled: !!user,
  });

  // Calculate contact statistics
  const contactStats: ContactStats = {
    totalContacts: allContacts.length,
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
    // Navigate to create new list or open modal
    navigate("/app");
    toast({
      title: "Create a new list",
      description: "Start by searching for companies and contacts",
    });
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

  const isLoading = listsLoading || contactsLoading;

  return (
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
        {/* All contacts card */}
        <Card className="hover:shadow-lg transition-shadow">
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

      {/* Your lists section */}
      <div className="bg-white rounded-lg border">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Your lists</h2>
        </div>

        {isLoading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2 text-muted-foreground">Loading lists...</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[50%] font-medium">Name</TableHead>
                  <TableHead className="w-[25%] font-medium">Contacts</TableHead>
                  <TableHead className="w-[25%] font-medium">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLists.length > 0 ? (
                  paginatedLists.map((list) => (
                    <TableRow
                      key={list.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleListClick(list.id)}
                      data-testid={`row-list-${list.id}`}
                    >
                      <TableCell className="font-medium">
                        {list.name}
                      </TableCell>
                      <TableCell>
                        {list.contactCount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {list.createdAt
                          ? format(new Date(list.createdAt), "MMM d, yyyy 'at' h:mm:ss a")
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
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
      </div>
    </div>
  );
}