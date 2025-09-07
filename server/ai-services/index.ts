/**
 * AI Services Module
 * Central location for all AI-related integrations
 */

// Export all OpenAI functions
export {
  getOpenAIClient,
  queryOpenAI,
  generateEmailStrategy,
  generateBoundary,
  generateBoundaryOptions,
  generateSprintPrompt,
  generateDailyQueries,
  generateAllProductOffers as generateProductOffers
} from './openai-client';

// Re-export PerplexityMessage type to fix TypeScript errors in routes
export type { PerplexityMessage } from '../search/core/perplexity-types';