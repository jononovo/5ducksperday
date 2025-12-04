export { IndividualSearchService } from './individual-search-service';
export { parseIndividualQuery, formatSearchQuery } from './query-parser';
export { discoverCandidates, enrichIndividualWithEmail } from './individual-search';
export type {
  ParsedIndividualQuery,
  WebSearchResult,
  CandidateResult,
  MultiCandidateSearchResult
} from './types';
