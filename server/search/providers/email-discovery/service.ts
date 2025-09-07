import type { EmailSearchContext, EmailSearchResult, EmailSearchStrategy } from './types';
import { websiteCrawlerStrategy } from './strategies/website-crawler';
import { patternPredictionStrategy } from './strategies/pattern-prediction';
import { domainAnalysisStrategy } from './strategies/domain-analysis';
import { publicDirectoryStrategy } from './strategies/public-directory';
import { socialProfileStrategy } from './strategies/social-profile';
import { validateEmails } from '../../perplexity';
import { validateEmailPattern, isValidBusinessEmail } from '../../results-analysis/email-analysis';

const DEFAULT_TIMEOUT = 30000; // 30 seconds
const DEFAULT_MAX_DEPTH = 2;

export class EmailDiscoveryService {
  private strategies: EmailSearchStrategy[] = [];

  constructor() {
    // Register all available strategies
    this.registerStrategy(websiteCrawlerStrategy);
    this.registerStrategy(patternPredictionStrategy);
    this.registerStrategy(domainAnalysisStrategy);
    this.registerStrategy(publicDirectoryStrategy);
    this.registerStrategy(socialProfileStrategy);
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
          console.log(`Found ${result.emails.length} emails with ${strategy.name}, validating...`);

          // First apply local validation
          const preValidatedEmails = result.emails.filter(email => {
            const patternScore = validateEmailPattern(email);
            const isBusinessEmail = isValidBusinessEmail(email);
            return patternScore >= 50 && isBusinessEmail;
          });

          // Then use Perplexity AI validation for remaining emails
          if (preValidatedEmails.length > 0) {
            const validationResult = await validateEmails(preValidatedEmails);

            // Filter based on combined validation scores
            const validatedEmails = preValidatedEmails.filter(email => {
              const score = validationResult.validationDetails?.patternScore || 0;
              return score >= 50;
            });

            results.push({
              ...result,
              emails: validatedEmails,
              metadata: {
                ...result.metadata,
                searchDate: new Date().toISOString(),
                validationScore: validationResult.score,
                validationDetails: validationResult.validationDetails,
                originalEmailCount: result.emails.length,
                preValidatedCount: preValidatedEmails.length,
                validatedEmailCount: validatedEmails.length
              }
            });
          } else {
            results.push({
              ...result,
              emails: [],
              metadata: {
                ...result.metadata,
                searchDate: new Date().toISOString(),
                validationMessage: "No emails passed initial validation"
              }
            });
          }
        } else {
          results.push({
            ...result,
            metadata: {
              ...result.metadata,
              searchDate: new Date().toISOString()
            }
          });
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
      metadata: {
        searchDate: new Date().toISOString(),
        ...metadata
      }
    };
  }
}

// Export singleton instance
export const emailDiscoveryService = new EmailDiscoveryService();