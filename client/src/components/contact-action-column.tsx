import React from "react";
import { TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  Eye, 
  Menu,
  Sparkles,
  Target,
  Gem,
  Rocket
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ContactWithCompanyInfo } from "@/lib/results-analysis/prospect-filtering";

export interface ContactActionColumnProps {
  // Core data
  contact: ContactWithCompanyInfo;
  
  // Display mode configuration (kept for backward compatibility but no longer used)
  displayMode?: 'auto' | 'desktop' | 'mobile';
  
  // Whether to render as a TableCell or standalone
  standalone?: boolean;
  
  // Action handlers
  handleContactView?: (contactId: number) => void;
  handleEnrichContact?: (contactId: number) => void;
  handleHunterSearch?: (contactId: number) => void;
  handleAeroLeadsSearch?: (contactId: number) => void;
  handleApolloSearch?: (contactId: number) => void;
  
  // State tracking
  pendingContactIds?: Set<number>;
  pendingHunterIds?: Set<number>;
  pendingAeroLeadsIds?: Set<number>;
  pendingApolloIds?: Set<number>;
  
  // Optional custom class
  className?: string;
}

export function ContactActionColumn({
  contact,
  displayMode = 'auto', // Kept for backward compatibility
  standalone = false,
  handleContactView,
  handleEnrichContact,
  handleHunterSearch,
  handleAeroLeadsSearch,
  handleApolloSearch,
  pendingContactIds = new Set(),
  pendingHunterIds = new Set(),
  pendingAeroLeadsIds = new Set(),
  pendingApolloIds = new Set(),
  className = '',
}: ContactActionColumnProps) {
  
  // Helper functions for checking state
  const isPending = {
    contact: (id: number) => pendingContactIds.has(id),
    hunter: (id: number) => pendingHunterIds.has(id),
    aeroLeads: (id: number) => pendingAeroLeadsIds.has(id),
    apollo: (id: number) => pendingApolloIds.has(id)
  };
  
  const isComplete = {
    contact: (c: ContactWithCompanyInfo) => c.completedSearches?.includes('contact_enrichment') || false,
    hunter: (c: ContactWithCompanyInfo) => c.completedSearches?.includes('hunter') || false,
    aeroLeads: (c: ContactWithCompanyInfo) => c.completedSearches?.includes('aeroleads') || false,
    apollo: (c: ContactWithCompanyInfo) => c.completedSearches?.includes('apollo_search') || false
  };
  
  const getSuccessColor = {
    contact: "text-green-500",
    hunter: "text-green-500",
    aeroLeads: "text-yellow-500", 
    apollo: "text-purple-500"
  };

  // Unified dropdown menu content for all screen sizes
  const content = (
    <div className={`flex items-center justify-center ${className}`}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <Menu className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {/* View contact menu item */}
          {handleContactView && (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                handleContactView(contact.id);
              }}
            >
              <Eye className="mr-2 h-5 w-5 text-gray-700" />
              View Contact
            </DropdownMenuItem>
          )}
          
          {/* Apollo search menu item */}
          {handleApolloSearch && (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                handleApolloSearch(contact.id);
              }}
              disabled={isPending.apollo(contact.id) || isComplete.apollo(contact)}
            >
              {isPending.apollo(contact.id) ? (
                <div className="animate-spin mr-2 h-5 w-5">
                  <Rocket className="h-5 w-5 text-gray-700" />
                </div>
              ) : (
                <Rocket className={`mr-2 h-5 w-5 ${isComplete.apollo(contact) && contact.email ? getSuccessColor.apollo : "text-gray-700"}`} />
              )}
              Apollo.io Search
            </DropdownMenuItem>
          )}
          
          {/* AI-powered search menu item */}
          {handleEnrichContact && (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                handleEnrichContact(contact.id);
              }}
              disabled={isPending.contact(contact.id) || isComplete.contact(contact)}
            >
              {isPending.contact(contact.id) ? (
                <div className="animate-spin mr-2 h-5 w-5">
                  <Sparkles className="h-5 w-5 text-gray-700" />
                </div>
              ) : (
                <Sparkles className={`mr-2 h-5 w-5 ${isComplete.contact(contact) && contact.email ? getSuccessColor.contact : "text-gray-700"}`} />
              )}
              AI-powered Search
            </DropdownMenuItem>
          )}
          
          {/* Hunter search menu item */}
          {handleHunterSearch && (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                handleHunterSearch(contact.id);
              }}
              disabled={isPending.hunter(contact.id) || isComplete.hunter(contact)}
            >
              {isPending.hunter(contact.id) ? (
                <div className="animate-spin mr-2 h-5 w-5">
                  <Target className="h-5 w-5 text-gray-700" />
                </div>
              ) : (
                <Target className={`mr-2 h-5 w-5 ${isComplete.hunter(contact) && contact.email ? getSuccessColor.hunter : "text-gray-700"}`} />
              )}
              Hunter Search
            </DropdownMenuItem>
          )}
          
          {/* AeroLeads search menu item */}
          {handleAeroLeadsSearch && (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                handleAeroLeadsSearch(contact.id);
              }}
              disabled={isPending.aeroLeads(contact.id) || isComplete.aeroLeads(contact)}
            >
              {isPending.aeroLeads(contact.id) ? (
                <div className="animate-spin mr-2 h-5 w-5">
                  <Gem className="h-5 w-5 text-gray-700" />
                </div>
              ) : (
                <Gem className={`mr-2 h-5 w-5 ${isComplete.aeroLeads(contact) && contact.email ? getSuccessColor.aeroLeads : "text-gray-700"}`} />
              )}
              AeroLeads Search
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
  
  // Return either standalone or wrapped in TableCell
  return standalone ? content : <TableCell>{content}</TableCell>;
}