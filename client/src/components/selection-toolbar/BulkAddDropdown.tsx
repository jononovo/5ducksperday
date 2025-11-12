import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

interface BulkAddDropdownProps {
  onSelectList: () => void;
  onSelectCampaign: () => void;
}

export function BulkAddDropdown({ onSelectList, onSelectCampaign }: BulkAddDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-6 px-2 text-[11px] font-medium text-gray-600"
          title="Add selected to list"
        >
          Add to
          <ChevronDown className="h-3 w-3 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => {
          console.log('[SelectionToolbar] "Contact List" clicked, showing selector');
          onSelectList();
        }}>
          Contact List
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => {
          console.log('[SelectionToolbar] "Campaign" clicked, showing selector');
          onSelectCampaign();
        }}>
          Campaign
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}