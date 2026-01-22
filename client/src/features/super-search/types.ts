export interface SearchPlan {
  queryType: 'person' | 'role' | 'company' | 'signals';
  displayMode: 'list' | 'table';
  targetCount: 5 | 10 | 20;
  columns?: string[];
  searchStrategy: string;
}

export interface CompanyResult {
  type: 'company';
  name: string;
  website?: string;
  city?: string;
  country?: string;
  industry?: string;
  superSearchMeta?: Record<string, string>;
}

export interface ContactResult {
  type: 'contact';
  name: string;
  role?: string;
  company: string;
  companyWebsite?: string;
  linkedinUrl?: string;
  city?: string;
  country?: string;
  superSearchMeta?: Record<string, string>;
}

export type SuperSearchResult = CompanyResult | ContactResult;

export type StreamEvent = 
  | { type: 'plan'; data: SearchPlan }
  | { type: 'progress'; data: string }
  | { type: 'result'; data: SuperSearchResult }
  | { type: 'complete'; data: { totalResults: number } }
  | { type: 'error'; data: string };

export interface SuperSearchState {
  isSearching: boolean;
  plan: SearchPlan | null;
  progress: string;
  results: SuperSearchResult[];
  error: string | null;
  isComplete: boolean;
}
