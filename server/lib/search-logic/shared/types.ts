import type { SearchModuleConfig, SearchSection } from "@shared/schema";

export interface SearchResult {
  content: string;
  confidence: number;
  source: string;
  metadata?: Record<string, unknown>;
}

export interface TopProspect {
  name: string;
  role?: string;
  company?: string;
  score?: number;
}

export interface SearchContext {
  companyName: string;
  companyWebsite?: string;
  companyDomain?: string;
  config: SearchModuleConfig;
  topProspects?: TopProspect[];
  options?: {
    timeout?: number;
    maxDepth?: number;
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