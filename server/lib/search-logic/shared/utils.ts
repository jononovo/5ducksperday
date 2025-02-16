import type { SearchResult, SearchContext } from './types';
import { moduleConfigurations } from '../deep-searches';

export function validateSearchResult(
  result: SearchResult,
  minConfidence: number = 0.5
): boolean {
  if (!result.content || result.content.trim() === '') {
    return false;
  }

  if (result.confidence < minConfidence) {
    return false;
  }

  return true;
}

export function enrichSearchContext(
  context: SearchContext,
  additionalData: Record<string, unknown>
): SearchContext {
  return {
    ...context,
    options: {
      ...context.options,
      ...additionalData
    }
  };
}

export function normalizeConfidenceScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score * 100)));
}

export function combineSearchResults(
  results: SearchResult[],
  weights?: Record<string, number>
): SearchResult[] {
  return results
    .filter(result => validateSearchResult(result))
    .map(result => ({
      ...result,
      confidence: weights?.[result.source]
        ? result.confidence * weights[result.source]
        : result.confidence
    }))
    .sort((a, b) => b.confidence - a.confidence);
}

// New utility function to get search configuration
export function getSearchConfiguration(moduleId: string, searchId: string) {
  const moduleConfig = moduleConfigurations[moduleId as keyof typeof moduleConfigurations];
  if (!moduleConfig) return null;

  return moduleConfig.searches.find(search => search.id === searchId);
}