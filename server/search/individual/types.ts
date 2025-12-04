export interface ParsedIndividualQuery {
  personName: string;
  companyHint?: string;
  locationHint?: string;
  roleHint?: string;
  originalQuery: string;
}

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  date?: string;
}

export interface CandidateResult {
  name: string;
  currentCompany: string;
  currentRole: string;
  companyWebsite?: string;
  linkedinUrl?: string;
  score: number;
  reasoning?: string;
}

export interface MultiCandidateSearchResult {
  candidates: CandidateResult[];
  searchSources: string[];
}
