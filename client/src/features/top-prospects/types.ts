import type { ContactWithCompanyInfo } from "@/lib/results-analysis/prospect-filtering";

export interface TopProspectsCardProps {
  prospects: ContactWithCompanyInfo[];
  selectedContacts: Set<number>;
  pendingContactIds: Set<number>;
  pendingHunterIds: Set<number>;
  pendingApolloIds: Set<number>;
  isVisible: boolean;
  onEnrichProspects: (prospects: ContactWithCompanyInfo[]) => void;
  onSelectAll: (checked: boolean) => void;
  onCheckboxChange: (contactId: number) => void;
  onContactView: (contactId: number) => void;
  onEnrichContact: (contactId: number) => void;
  onHunterSearch: (contactId: number) => void;
  onApolloSearch: (contactId: number) => void;
  onContactFeedback: (contactId: number, feedback: string) => void;
}
