export { useComprehensiveEmailSearch } from './hooks/useComprehensiveEmailSearch';

export { ComprehensiveSearchButton } from '@/components/comprehensive-email-search';

export { 
  searchViaApollo,
  searchViaPerplexity,
  searchViaHunter,
  markSearchComplete
} from './services/api';

export type {
  SearchContext,
  ComprehensiveSearchButtonProps,
  SearchState,
  UseComprehensiveEmailSearchOptions,
  ComprehensiveEmailSearchResult
} from './types';
