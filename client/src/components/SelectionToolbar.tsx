import { Button } from "@/components/ui/button";
import { ChevronDown, CheckSquare } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect, useRef } from "react";
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
  const checkboxRef = useRef<HTMLButtonElement>(null);

  // Set indeterminate state on the checkbox element and apply blue styling
  useEffect(() => {
    if (checkboxRef.current) {
      const input = checkboxRef.current.querySelector('input');
      if (input) {
        input.indeterminate = selectedCount > 0;
      }
    }
  }, [selectedCount]);

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
        <div className="flex items-center gap-1.5">
          {/* Gmail-style checkbox with indeterminate state */}
          <Checkbox
            ref={checkboxRef}
            checked={selectedCount > 0 ? "indeterminate" : false}
            onCheckedChange={() => onClear()}
            className="h-4 w-4 ml-1 data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground data-[state=indeterminate]:border-primary"
            aria-label={`${selectedCount} selected, click to deselect all`}
          />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-6 px-2 text-[11px] font-medium text-gray-600"
                title={`${selectedCount} selected • Add selected to list`}
              >
                <span className="text-primary mr-1">{selectedCount}</span>
                Add to
                <ChevronDown className="h-3 w-3 ml-1" />
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
        </div>
      )}
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