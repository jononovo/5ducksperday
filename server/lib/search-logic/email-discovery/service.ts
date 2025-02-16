import type { EmailSearchContext, EmailSearchResult, EmailSearchStrategy } from './types';
import { websiteCrawlerStrategy } from './strategies/website-crawler';
import { validateEmails } from '../../perplexity';

const DEFAULT_TIMEOUT = 30000; // 30 seconds
const DEFAULT_MAX_DEPTH = 2;

export class EmailDiscoveryService {
  private strategies: EmailSearchStrategy[] = [];

  constructor() {
    // Register default strategies
    this.registerStrategy(websiteCrawlerStrategy);
  }

  registerStrategy(strategy: EmailSearchStrategy) {
    this.strategies.push(strategy);
  }

  async discoverEmails(context: EmailSearchContext): Promise<EmailSearchResult[]> {
    // Ensure proper defaults
    const enrichedContext = {
      ...context,
      timeout: context.timeout || DEFAULT_TIMEOUT,
      maxDepth: context.maxDepth || DEFAULT_MAX_DEPTH
    };

    const results: EmailSearchResult[] = [];

    for (const strategy of this.strategies) {
      try {
        console.log(`Running email discovery strategy: ${strategy.name}`);
        const result = await strategy.execute(enrichedContext);

        // Validate found emails
        if (result.emails.length > 0) {
          console.log(`Found ${result.emails.length} emails, validating...`);
          const validationResult = await validateEmails(result.emails);

          // Filter out low confidence emails
          const validatedEmails = result.emails.filter((_, index) => {
            const score = validationResult.validationDetails?.patternScore || 0;
            return score >= 50; // Only keep emails with decent confidence
          });

          results.push({
            ...result,
            emails: validatedEmails,
            metadata: {
              ...result.metadata,
              validationScore: validationResult.score,
              validationDetails: validationResult.validationDetails,
              originalEmailCount: result.emails.length,
              validatedEmailCount: validatedEmails.length
            }
          });
        } else {
          results.push(result);
        }
      } catch (error) {
        console.error(`Strategy ${strategy.name} failed:`, error);
        results.push({
          source: strategy.name.toLowerCase(),
          emails: [],
          metadata: {
            searchDate: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        });
      }
    }

    return results;
  }

  // Helper method to combine results from multiple strategies
  combineResults(results: EmailSearchResult[]): EmailSearchResult {
    const allEmails = new Set<string>();
    const metadata: Record<string, any> = {
      searchDate: new Date().toISOString(),
      strategies: {}
    };

    results.forEach(result => {
      result.emails.forEach(email => allEmails.add(email));
      metadata.strategies[result.source] = {
        success: !result.metadata.error,
        emailsFound: result.emails.length,
        ...result.metadata
      };
    });

    return {
      source: "combined_results",
      emails: Array.from(allEmails),
      metadata
    };
  }
}

// Export singleton instance
export const emailDiscoveryService = new EmailDiscoveryService();