export interface ExtensionSearchParams {
  userId: number;
  originalQuery: string;
  excludeCompanyNames: string[];
  contactSearchConfig?: any;
  listId?: number | null;
}

export interface ExtensionSearchResult {
  jobId: string;
  companies: Array<{name: string, website?: string | null}>;
}