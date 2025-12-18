import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserCircle, Banknote, ChevronDown, ChevronUp } from "lucide-react";
import { ContactRow } from "@/components/contact-row";
import type { TopProspectsCardProps } from "./types";

const INITIAL_VISIBLE_COUNT = 5;

export function TopProspectsCard({
  prospects,
  selectedContacts,
  pendingContactIds,
  pendingHunterIds,
  pendingApolloIds,
  pendingComprehensiveSearchIds,
  isVisible,
  onEnrichProspects,
  onSelectAll,
  onCheckboxChange,
  onContactView,
  onEnrichContact,
  onHunterSearch,
  onApolloSearch,
  onContactFeedback,
  handleComprehensiveEmailSearch,
}: TopProspectsCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!isVisible || prospects.length === 0) return null;

  const getSelectedProspects = () => {
    return prospects.filter(contact => selectedContacts.has(contact.id));
  };
  
  const visibleProspects = isExpanded ? prospects : prospects.slice(0, INITIAL_VISIBLE_COUNT);
  const remainingCount = prospects.length - INITIAL_VISIBLE_COUNT;
  const hasMoreProspects = remainingCount > 0;

  return (
    <Card className="w-full rounded-none md:rounded-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <UserCircle className="w-5 h-5" />
            Top Prospects
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const selectedProspects = getSelectedProspects();
                if (selectedProspects.length > 0) {
                  onEnrichProspects(selectedProspects);
                } else {
                  onEnrichProspects(prospects);
                }
              }}
              data-testid="button-enrich-prospects"
            >
              <Banknote className="mr-2 h-4 w-4" />
              {selectedContacts.size > 0 
                ? `Enrich Selected (${selectedContacts.size})` 
                : "Enrich All Prospects"}
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Highest probability contacts across all companies
        </p>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-0">
        <div className="space-y-1.5">
          {visibleProspects.map((contact) => (
            <ContactRow
              key={contact.id}
              contact={contact}
              showCheckbox={false}
              showCompanyName={true}
              showFeedback={true}
              handleContactView={onContactView}
              handleEnrichContact={onEnrichContact}
              handleHunterSearch={onHunterSearch}
              handleApolloSearch={onApolloSearch}
              handleComprehensiveEmailSearch={handleComprehensiveEmailSearch}
              onContactFeedback={onContactFeedback}
              pendingContactIds={pendingContactIds}
              pendingHunterIds={pendingHunterIds}
              pendingApolloIds={pendingApolloIds}
              pendingComprehensiveSearchIds={pendingComprehensiveSearchIds}
            />
          ))}
        </div>
        
        {hasMoreProspects && (
          <div className="pt-2">
            <Button
              variant="ghost"
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full text-xs text-muted-foreground hover:text-gray-600 dark:hover:text-gray-400 hover:bg-accent/50 transition-all py-2 rounded-md"
              data-testid="button-toggle-prospects"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Show fewer prospects
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  +{remainingCount} more prospects available
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
