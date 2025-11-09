import { Button } from "@/components/ui/button";
import { X, UserPlus, ChevronUp, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useRef, useEffect } from "react";
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
  const [showContactListPopover, setShowContactListPopover] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Fetch contact lists
  const { data: contactLists = [], isLoading } = useQuery<ContactList[]>({
    queryKey: ['/api/contact-lists'],
    enabled: showContactListPopover,
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
      
      // Clear selections and close popover
      onClear();
      setShowContactListPopover(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error adding contacts",
        description: error.message || "Failed to add contacts to the list",
        variant: "destructive",
      });
    }
  });

  const handleContactListSelect = async (contactListId: number) => {
    await addContactsMutation.mutateAsync({
      contactListId,
      contactIds: selectedContactIds,
    });
  };

  const handleScroll = (direction: 'up' | 'down') => {
    if (scrollRef.current) {
      const scrollAmount = 100;
      scrollRef.current.scrollBy({
        top: direction === 'down' ? scrollAmount : -scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Mobile: Fixed bottom toolbar
  // Desktop: Inline with top buttons
  const isMobile = window.innerWidth < 768;

  const toolbar = (
    <div className={`flex items-center gap-2 ${isMobile ? 'w-full justify-between px-4 py-2 bg-background border-t' : ''}`}>
      <span className="text-sm font-medium">
        {selectedCount} contact{selectedCount !== 1 ? 's' : ''} selected
      </span>
      
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              <UserPlus className="h-4 w-4 mr-2" />
              Add to
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <Popover open={showContactListPopover} onOpenChange={setShowContactListPopover}>
              <PopoverTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  Contact List
                </DropdownMenuItem>
              </PopoverTrigger>
              <PopoverContent 
                side="right" 
                align="start"
                className="w-[350px] p-2"
                sideOffset={5}
              >
                <div className="relative">
                  {/* Scroll buttons */}
                  <Button
                    size="icon"
                    variant="outline"
                    className="absolute -top-1 right-7 h-6 w-6 z-10"
                    onClick={() => handleScroll('up')}
                  >
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="absolute -top-1 right-0 h-6 w-6 z-10"
                    onClick={() => handleScroll('down')}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>

                  <ScrollArea className="h-[300px] w-full" ref={scrollRef}>
                    {isLoading ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        Loading contact lists...
                      </div>
                    ) : contactLists.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No contact lists found. Create one first.
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {contactLists.map((list) => (
                          <button
                            key={list.id}
                            onClick={() => handleContactListSelect(list.id)}
                            className="w-full text-left px-3 py-2 rounded hover:bg-accent hover:text-accent-foreground transition-colors"
                            disabled={addContactsMutation.isPending}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{list.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {list.contactCount || 0} contacts
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </PopoverContent>
            </Popover>
            
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