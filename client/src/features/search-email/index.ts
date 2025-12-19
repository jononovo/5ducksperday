export { useComprehensiveEmailSearch } from './hooks/useComprehensiveEmailSearch';
export { useEmailSearchBilling } from './hooks/useEmailSearchBilling';

export { ComprehensiveSearchButton } from '@/components/comprehensive-email-search';

export { 
  searchViaApollo,
  searchViaPerplexity,
  searchViaHunter,
  markSearchComplete,
  checkCredits,
  deductCreditsForEmailSearch,
  CREDIT_COST_EMAIL_SEARCH
} from './services/api';

export type {
  SearchContext,
  ComprehensiveSearchButtonProps,
  SearchState,
  UseComprehensiveEmailSearchOptions,
  ComprehensiveEmailSearchResult,
  BillingResult,
  EmailSearchBillingOptions
} from './types';
