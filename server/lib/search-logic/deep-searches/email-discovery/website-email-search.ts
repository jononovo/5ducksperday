import type { SearchImplementation, SearchContext, SearchResult } from '../../shared/types';
import { normalizeConfidenceScore } from '../../shared/utils';
import { websiteCrawlerStrategy } from '../../email-discovery/strategies/website-crawler';

export const websiteEmailSearch: SearchImplementation = {
  name: "Website Email Search",
  description: "Extract email addresses from company website and related pages",

  async execute(context: SearchContext): Promise<SearchResult[]> {
    const { companyName, companyWebsite } = context;

    try {
      // Use the dedicated website crawler strategy
      const result = await websiteCrawlerStrategy.execute({
        companyName,
        companyWebsite,
        maxDepth: context.options?.maxDepth,
        timeout: context.options?.timeout
      });

      return [{
        content: `Extracted email addresses from ${companyWebsite}`,
        confidence: result.emails.length > 0 ? normalizeConfidenceScore(0.85) : 0,
        source: "website_email_search",
        metadata: {
          searchDate: new Date().toISOString(),
          searchType: "website_crawl",
          foundEmails: result.emails,
          ...result.metadata
        }
      }];

    } catch (error) {
      console.error(`Website email search failed for ${companyName}:`, error);
      return [{
        content: `Error searching website ${companyWebsite}`,
        confidence: 0,
        source: "website_email_search",
        metadata: {
          searchDate: new Date().toISOString(),
          searchType: "website_crawl",
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }];
    }
  }
};