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

interface SelectionToolbarProps {
  selectedCount: number;
  onClear: () => void;
  selectedContactIds: number[];
}

export function SelectionToolbar({ selectedCount, onClear, selectedContactIds }: SelectionToolbarProps) {
  const [showRecipientModal, setShowRecipientModal] = useState(false);
  const [modalMode, setModalMode] = useState<'list' | 'campaign'>('list');

  const handleAddToClick = (mode: 'list' | 'campaign') => {
    setModalMode(mode);
    setShowRecipientModal(true);
  };

  const handleModalSelect = (selection: any) => {
    // TODO: Implement actual add to list/campaign logic
    console.log('Add contacts to:', selection, 'Contact IDs:', selectedContactIds);
    setShowRecipientModal(false);
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