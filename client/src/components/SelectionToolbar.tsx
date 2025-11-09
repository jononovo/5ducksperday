import { Button } from "@/components/ui/button";
import { X, UserPlus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RecipientSelectionModal } from "@/components/recipient-selection-modal";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SelectionToolbarProps {
  selectedCount: number;
  onClear: () => void;
  selectedContactIds: number[];
}

export function SelectionToolbar({ selectedCount, onClear, selectedContactIds }: SelectionToolbarProps) {
  const [showRecipientModal, setShowRecipientModal] = useState(false);
  const [modalMode, setModalMode] = useState<'list' | 'campaign'>('list');
  const { toast } = useToast();

  const addContactsMutation = useMutation({
    mutationFn: async ({ contactListId, contactIds }: { contactListId: number; contactIds: number[] }) => {
      return await apiRequest(`/api/contact-lists/${contactListId}/contacts`, {
        method: 'POST',
        body: JSON.stringify({ contactIds }),
      });
    },
    onSuccess: (_, { contactListId }) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/contact-lists'] });
      queryClient.invalidateQueries({ queryKey: [`/api/contact-lists/${contactListId}/contacts`] });
      
      toast({
        title: "Contacts added successfully",
        description: `${selectedContactIds.length} contact${selectedContactIds.length !== 1 ? 's' : ''} added to the list.`,
      });
      
      // Clear selections after successful add
      onClear();
      setShowRecipientModal(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error adding contacts",
        description: error.message || "Failed to add contacts to the list",
        variant: "destructive",
      });
    }
  });

  const handleAddToClick = (mode: 'list' | 'campaign') => {
    setModalMode(mode);
    setShowRecipientModal(true);
  };

  const handleModalSelect = async (selection: any) => {
    if (selection.type === 'existing' && selection.contactListId) {
      // Add contacts to existing contact list
      await addContactsMutation.mutateAsync({
        contactListId: selection.contactListId,
        contactIds: selectedContactIds,
      });
    } else if (selection.type === 'current' || selection.type === 'multiple') {
      // For campaigns, we'd need a different mutation - for now just show a toast
      toast({
        title: "Campaign creation",
        description: "Campaign creation with selected contacts is coming soon!",
      });
      setShowRecipientModal(false);
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
            <DropdownMenuItem onClick={() => handleAddToClick('list')}>
              Contact List
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAddToClick('campaign')}>
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

      {/* Reuse existing modal for selection */}
      {showRecipientModal && (
        <RecipientSelectionModal
          open={showRecipientModal}
          onOpenChange={setShowRecipientModal}
          currentListId={null}
          currentQuery={null}
          onSelect={handleModalSelect}
        />
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