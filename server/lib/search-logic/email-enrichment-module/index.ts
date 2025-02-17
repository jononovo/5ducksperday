import type { SearchImplementation, SearchContext, SearchResult } from '../shared/types';
import { normalizeConfidenceScore } from '../shared/utils';
import { emailEnrichmentService } from '../email-enrichment/email-enrichment-service';

export const emailEnrichmentModule = {
  id: "email_enrichment",
  label: "Email Enrichment",
  description: "Enhance discovered contact information with additional data sources",
  searches: [
    {
      id: "contact-enrichment",
      label: "Contact Data Enrichment",
      description: "Enrich contact information with professional details and social profiles",
      implementation: async (context: SearchContext): Promise<SearchResult[]> => {
        const { companyId, companyName } = context;
        
        if (!companyId) {
          console.warn('Cannot enrich contacts: Missing companyId in context');
          return [{
            content: "Missing company ID for enrichment",
            confidence: 0,
            source: "contact_enrichment",
            metadata: {
              searchDate: new Date().toISOString(),
              searchType: "contact_enrichment",
              status: "failed",
              error: "Missing companyId in context"
            }
          }];
        }

        try {
          // Start the enrichment process for top prospects
          await emailEnrichmentService.enrichTopProspects(companyId);

          return [{
            content: `Started contact enrichment for top prospects at ${companyName}`,
            confidence: normalizeConfidenceScore(0.9),
            source: "contact_enrichment",
            metadata: {
              searchDate: new Date().toISOString(),
              searchType: "contact_enrichment",
              status: "processing",
              companyId,
              companyName
            }
          }];
        } catch (error) {
          console.error('Contact enrichment failed:', error);
          return [{
            content: `Contact enrichment failed for ${companyName}`,
            confidence: 0,
            source: "contact_enrichment",
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
      defaultEnabled: true
    }
  ]
};

export default emailEnrichmentModule;
