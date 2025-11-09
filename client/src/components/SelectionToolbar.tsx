import { Button } from "@/components/ui/button";
import { X, UserPlus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ContactList } from "@shared/schema";

interface SelectionToolbarProps {
  selectedCount: number;
  onClear: () => void;
  selectedContactIds: number[];
}

export function SelectionToolbar({ selectedCount, onClear, selectedContactIds }: SelectionToolbarProps) {
  const [showListSelector, setShowListSelector] = useState(false);
  const [selectedContactList, setSelectedContactList] = useState<string>("");
  const { toast } = useToast();

  // Fetch contact lists
  const { data: contactLists = [] } = useQuery<ContactList[]>({
    queryKey: ['/api/contact-lists'],
  });

  const addContactsMutation = useMutation({
    mutationFn: async ({ contactListId, contactIds }: { contactListId: number; contactIds: number[] }) => {
      const response = await fetch(`/api/contact-lists/${contactListId}/contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contactIds }),
      });
      if (!response.ok) {
        throw new Error('Failed to add contacts');
      }
      return response.json();
    },
    onSuccess: (_, { contactListId }) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/contact-lists'] });
      queryClient.invalidateQueries({ queryKey: [`/api/contact-lists/${contactListId}/contacts`] });
      
      const list = contactLists.find(l => l.id === contactListId);
      toast({
        title: "Contacts added successfully",
        description: `${selectedContactIds.length} contact${selectedContactIds.length !== 1 ? 's' : ''} added to "${list?.name || 'list'}".`,
      });
      
      // Clear selections after successful add
      onClear();
      setShowListSelector(false);
      setSelectedContactList("");
    },
    onError: (error: any) => {
      toast({
        title: "Error adding contacts",
        description: error.message || "Failed to add contacts to the list",
        variant: "destructive",
      });
    }
  });

  // Handle list selection
  useEffect(() => {
    if (selectedContactList && selectedContactList !== "") {
      const listId = parseInt(selectedContactList);
      if (!isNaN(listId)) {
        addContactsMutation.mutate({
          contactListId: listId,
          contactIds: selectedContactIds,
        });
      }
    }
  }, [selectedContactList]);

  // Mobile: Fixed bottom toolbar
  // Desktop: Inline with top buttons
  const isMobile = window.innerWidth < 768;

  const toolbar = (
    <div className={`flex items-center gap-2 ${isMobile ? 'w-full justify-between px-4 py-2 bg-background border-t' : ''}`}>
      <span className="text-sm font-medium">
        {selectedCount} contact{selectedCount !== 1 ? 's' : ''} selected
      </span>
      
      <div className="flex items-center gap-2">
        {showListSelector ? (
          <Select
            value={selectedContactList}
            onValueChange={setSelectedContactList}
            open={true}
            onOpenChange={(open) => {
              if (!open) {
                setShowListSelector(false);
                setSelectedContactList("");
              }
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Choose a contact list" />
            </SelectTrigger>
            <SelectContent>
              {contactLists.map((list) => (
                <SelectItem key={list.id} value={list.id.toString()}>
                  <div className="flex items-center justify-between w-full">
                    <span>{list.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {list.contactCount} contacts
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <UserPlus className="h-4 w-4 mr-2" />
                Add to
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setShowListSelector(true)}>
                Contact List
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                toast({
                  title: "Campaign creation",
                  description: "Campaign creation with selected contacts is coming soon!",
                });
              }}>
                Campaign
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="h-8"
        >
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    // Mobile: Fixed bottom position
    return (
      <div className="fixed bottom-0 left-0 right-0 z-40 shadow-lg border-t">
        {toolbar}
      </div>
    );
  }

  // Desktop: Return inline toolbar for parent to place
  return toolbar;
}