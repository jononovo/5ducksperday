import { StandardSearchResponse, SearchError, SEARCH_ERROR_CODES } from './search-response-types';
import { searchHunter } from './hunter-search';
import { searchApollo } from './apollo-search';

export class EnhancedSearchOrchestrator {
  private maxRetries = 2;
  private retryDelay = 1000; // 1 second

  async executeHunterSearch(
    contact: any,
    company: any,
    apiKey: string
  ): Promise<StandardSearchResponse> {
    const startTime = Date.now();
    let retryCount = 0;

    while (retryCount <= this.maxRetries) {
      try {
        console.log(`Hunter search attempt ${retryCount + 1} for ${contact.name} at ${company.name}`);
        
        const result = await searchHunter(contact.name, company.name, apiKey);
        const duration = Date.now() - startTime;

        if (result.email) {
          return {
            success: true,
            contact: {
              ...contact,
              email: result.email,
              nameConfidenceScore: result.confidence,
              completedSearches: [...(contact.completedSearches || []), 'hunter_search'],
              lastValidated: new Date()
            },
            source: 'hunter',
            searchType: 'email_finder',
            metadata: {
              confidence: result.confidence,
              searchDate: new Date().toISOString(),
              apiCallDuration: duration,
              retryCount
            }
          };
        } else {
          return {
            success: true,
            contact: {
              ...contact,
              completedSearches: [...(contact.completedSearches || []), 'hunter_search'],
              lastValidated: new Date()
            },
            source: 'hunter',
            searchType: 'email_finder',
            metadata: {
              confidence: 0,
              searchDate: new Date().toISOString(),
              apiCallDuration: duration,
              retryCount,
              error: 'No email found'
            }
          };
        }
      } catch (error) {
        retryCount++;
        const isRetryable = this.isRetryableError(error);
        
        if (retryCount > this.maxRetries || !isRetryable) {
          return {
            success: false,
            contact,
            source: 'hunter',
            searchType: 'email_finder',
            metadata: {
              confidence: 0,
              searchDate: new Date().toISOString(),
              apiCallDuration: Date.now() - startTime,
              retryCount: retryCount - 1,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          };
        }
        
        console.log(`Hunter search failed, retrying in ${this.retryDelay}ms...`);
        await this.delay(this.retryDelay);
      }
    }

    return {
      success: false,
      contact,
      source: 'hunter',
      searchType: 'email_finder',
      metadata: {
        confidence: 0,
        searchDate: new Date().toISOString(),
        apiCallDuration: Date.now() - startTime,
        retryCount: this.maxRetries,
        error: 'Max retries exceeded'
      }
    };
  }

  async executeApolloSearch(
    contact: any,
    company: any,
    apiKey: string
  ): Promise<StandardSearchResponse> {
    const startTime = Date.now();
    let retryCount = 0;

    while (retryCount <= this.maxRetries) {
      try {
        console.log(`Apollo search attempt ${retryCount + 1} for ${contact.name} at ${company.name}`);
        
        const result = await searchApollo(contact.name, company.name, apiKey);
        const duration = Date.now() - startTime;

        if (result.email) {
          return {
            success: true,
            contact: {
              ...contact,
              email: result.email,
              nameConfidenceScore: result.confidence,
              linkedinUrl: result.linkedinUrl || contact.linkedinUrl,
              phoneNumber: result.phone || contact.phoneNumber,
              role: result.title || contact.role,
              completedSearches: [...(contact.completedSearches || []), 'apollo_search'],
              lastValidated: new Date()
            },
            source: 'apollo',
            searchType: 'email_finder',
            metadata: {
              confidence: result.confidence,
              searchDate: new Date().toISOString(),
              apiCallDuration: duration,
              retryCount
            }
          };
        } else {
          return {
            success: true,
            contact: {
              ...contact,
              linkedinUrl: result.linkedinUrl || contact.linkedinUrl,
              phoneNumber: result.phone || contact.phoneNumber,
              role: result.title || contact.role,
              completedSearches: [...(contact.completedSearches || []), 'apollo_search'],
              lastValidated: new Date()
            },
            source: 'apollo',
            searchType: 'email_finder',
            metadata: {
              confidence: 0,
              searchDate: new Date().toISOString(),
              apiCallDuration: duration,
              retryCount,
              error: 'No email found'
            }
          };
        }
      } catch (error) {
        retryCount++;
        const isRetryable = this.isRetryableError(error);
        
        if (retryCount > this.maxRetries || !isRetryable) {
          return {
            success: false,
            contact,
            source: 'apollo',
            searchType: 'email_finder',
            metadata: {
              confidence: 0,
              searchDate: new Date().toISOString(),
              apiCallDuration: Date.now() - startTime,
              retryCount: retryCount - 1,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          };
        }
        
        console.log(`Apollo search failed, retrying in ${this.retryDelay}ms...`);
        await this.delay(this.retryDelay);
      }
    }

    return {
      success: false,
      contact,
      source: 'apollo',
      searchType: 'email_finder',
      metadata: {
        confidence: 0,
        searchDate: new Date().toISOString(),
        apiCallDuration: Date.now() - startTime,
        retryCount: this.maxRetries,
        error: 'Max retries exceeded'
      }
    };
  }

  private isRetryableError(error: any): boolean {
    if (error?.response?.status === 429) return true; // Rate limit
    if (error?.response?.status >= 500) return true; // Server errors
    if (error?.code === 'ECONNRESET') return true; // Network issues
    if (error?.code === 'ETIMEDOUT') return true; // Timeout
    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}