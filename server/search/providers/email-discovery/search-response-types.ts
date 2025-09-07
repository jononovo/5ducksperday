export interface StandardSearchResponse {
  success: boolean;
  contact: any;
  source: 'perplexity' | 'apollo' | 'hunter';
  searchType: 'enrichment' | 'email_finder';
  metadata: {
    confidence?: number;
    searchDate: string;
    error?: string;
    alternativeResults?: any[];
    apiCallDuration?: number;
    retryCount?: number;
  };
}

export interface SearchProgressState {
  contactId: number;
  isSearching: boolean;
  currentMethod?: string;
  progress: number;
  error?: string;
  completed: boolean;
}

export interface UnifiedSearchState {
  [contactId: number]: SearchProgressState;
}

export class SearchError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean = false,
    public originalError?: any
  ) {
    super(message);
    this.name = 'SearchError';
  }
}

export const SEARCH_ERROR_CODES = {
  API_KEY_INVALID: 'API_KEY_INVALID',
  RATE_LIMIT: 'RATE_LIMIT', 
  NETWORK_ERROR: 'NETWORK_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  NO_RESULTS: 'NO_RESULTS',
  TIMEOUT: 'TIMEOUT'
} as const;