import type { SearchModuleConfig, SearchSection } from "@shared/schema";

export interface SearchResult {
  content: string;
  confidence: number;
  source: string;
  metadata?: Record<string, unknown>;
}

export interface SearchContext {
  companyName: string;
  config: SearchModuleConfig;
  options?: {
    timeout?: number;
    maxResults?: number;
    filters?: Record<string, unknown>;
  };
}

export interface SearchImplementation {
  execute: (context: SearchContext) => Promise<SearchResult[]>;
  validate?: (result: SearchResult) => Promise<boolean>;
  name: string;
  description: string;
}

export interface SearchModule {
  name: string;
  description: string;
  searches: SearchImplementation[];
  config?: SearchModuleConfig;
}
