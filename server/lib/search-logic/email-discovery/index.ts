import type { SearchModule } from '../../shared/types';
import { websiteCrawlerStrategy } from './strategies/website-crawler';
import { patternPredictionStrategy } from './strategies/pattern-prediction';
import { domainAnalysisStrategy } from './strategies/domain-analysis';
import { publicDirectoryStrategy } from './strategies/public-directory';
import { socialProfileStrategy } from './strategies/social-profile';
import { localBusinessAssociationsSearch } from '../deep-searches/local-sources/local-business-associations-search';
import { localEventsSearch } from '../deep-searches/local-sources/local-events-search';
import { emailEnrichmentService } from '../email-enrichment/email-enrichment-service';

// Export module configuration
export const emailDiscoveryModule = {
  id: "email_discovery",
  label: "Email Discovery",
  description: "Multi-source email discovery and verification",
  searches: [
    {
      id: "website-email-search",
      label: "Website Email Search",
      description: "Extract email addresses from company website and related pages",
      implementation: websiteCrawlerStrategy,
      defaultEnabled: true
    },
    {
      id: "pattern-prediction-search",
      label: "Pattern Prediction",
      description: "Predict email addresses based on common corporate patterns",
      implementation: patternPredictionStrategy,
      defaultEnabled: true
    },
    {
      id: "domain-analysis-search",
      label: "Domain Analysis",
      description: "Analyze domain MX records and email configurations",
      implementation: domainAnalysisStrategy,
      defaultEnabled: true
    },
    {
      id: "public-directory-search",
      label: "Public Directory Search", 
      description: "Search public business directories and listing sites",
      implementation: publicDirectoryStrategy,
      defaultEnabled: true
    },
    {
      id: "social-profile-search",
      label: "Social Profile Search",
      description: "Extract email addresses from public social media profiles",
      implementation: socialProfileStrategy,
      defaultEnabled: false
    },
    {
      id: "local-business-search",
      label: "Local Business Associations",
      description: "Search local business associations for top prospect emails",
      implementation: localBusinessAssociationsSearch,
      defaultEnabled: true
    },
    {
      id: "local-events-search",
      label: "Local Events Search",
      description: "Search local business events and conferences for contact discovery",
      implementation: localEventsSearch,
      defaultEnabled: true
    },
    {
      id: "email-enrichment",
      label: "Email Enrichment",
      description: "Enrich discovered email addresses with additional data",
      implementation: async (context) => {
        const { companyId, companyName } = context;
        if (!companyId) {
          console.warn('Cannot enrich contacts: Missing companyId in context');
          return [];
        }

        try {
          // Start the enrichment process
          await emailEnrichmentService.enrichTopProspects(companyId);

          return [{
            content: `Started email enrichment for top prospects at ${companyName}`,
            confidence: 1,
            source: "email_enrichment",
            metadata: {
              searchDate: new Date().toISOString(),
              searchType: "contact_enrichment",
              status: "processing",
              companyId,
              companyName
            }
          }];
        } catch (error) {
          console.error('Email enrichment failed:', error);
          return [{
            content: `Email enrichment failed for ${companyName}`,
            confidence: 0,
            source: "email_enrichment",
            metadata: {
              searchDate: new Date().toISOString(),
              searchType: "contact_enrichment",
              status: "failed",
              error: error instanceof Error ? error.message : "Unknown error",
              companyId,
              companyName
            }
          }];
        }
      },
      defaultEnabled: false
    }
  ]
};

// Re-export all strategy implementations
export * from './strategies/website-crawler';
export * from './strategies/pattern-prediction';
export * from './strategies/domain-analysis';
export * from './strategies/public-directory';
export * from './strategies/social-profile';

// Re-export types and service
export * from './types';
export * from './service';

// Re-export the singleton service instance as the default export
export { emailDiscoveryService as default } from './service';