import type { ContactWithCompanyInfo } from "@/lib/results-analysis/prospect-filtering";

export interface TopProspectsCardProps {
  prospects: ContactWithCompanyInfo[];
  pendingContactIds: Set<number>;
  pendingHunterIds: Set<number>;
  pendingApolloIds: Set<number>;
  pendingComprehensiveSearchIds?: Set<number>;
  isVisible: boolean;
  onContactView: (contactId: number) => void;
  onEnrichContact: (contactId: number) => void;
  onHunterSearch: (contactId: number) => void;
  onApolloSearch: (contactId: number) => void;
  onContactFeedback: (contactId: number, feedback: string) => void;
  handleComprehensiveEmailSearch?: (contactId: number) => void;
}
