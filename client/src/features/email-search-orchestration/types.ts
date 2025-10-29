import type { CompanyWithContacts } from "@/features/search-state";

export interface SearchProgress {
  phase: string;
  completed: number;
  total: number;
}

export interface ProgressPhase {
  name: string;
  duration: number;
}

export interface ProgressState {
  currentPhase: number;
  startTime: number;
  backendCompleted: boolean;
}

export interface EmailSearchMetadata {
  emailsFound: number;
  contactsEnriched?: number;
  contactsProcessed?: number;
  companiesSearched?: number;
  companiesProcessed?: number;
  sourceBreakdown?: {
    Perplexity?: number;
    Apollo?: number;
    Hunter?: number;
  };
}

export interface EmailSearchJobResult {
  summary?: EmailSearchMetadata;
  metadata?: EmailSearchMetadata;
  companies?: CompanyWithContacts[];
}

export interface EmailSearchOrchestrationHook {
  // State
  isSearching: boolean;
  searchProgress: SearchProgress;
  summaryVisible: boolean;
  lastEmailSearchCount: number;
  lastSourceBreakdown: any;
  
  // Actions
  runEmailSearch: () => Promise<void>;
  
  // Progress management
  startProgressTimer: () => void;
  
  // Helpers
  getCurrentCompaniesWithoutEmails: () => CompanyWithContacts[];
  getTopContacts: (company: any, count: number) => any[];
}
