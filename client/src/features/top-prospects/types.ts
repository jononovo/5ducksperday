import type { ContactWithCompanyInfo } from "@/lib/results-analysis/prospect-filtering";

export interface TopProspectsCardProps {
  prospects: ContactWithCompanyInfo[];
  pendingComprehensiveSearchIds?: Set<number>;
  isVisible: boolean;
  onContactView: (contactId: number) => void;
  onContactFeedback: (contactId: number, feedback: string) => void;
  handleComprehensiveEmailSearch?: (contactId: number) => void;
}
