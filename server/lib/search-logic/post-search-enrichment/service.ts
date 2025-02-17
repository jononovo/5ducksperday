import { enrichmentQueue } from './queue';
import type { EnrichmentQueueItem, QueueStatus } from './types';
import { storage } from '../../../storage';

class PostSearchEnrichmentService {
  async startEnrichment(companyId: number, searchId: string): Promise<string> {
    console.log(`Starting post-search enrichment for company ${companyId}, search ${searchId}`);

    // Get contacts for the company
    const contacts = await storage.listContactsByCompany(companyId);

    // Filter for high-confidence prospects only
    const topProspects = contacts
      .filter(contact => {
        const hasHighConfidence = contact.nameConfidenceScore && contact.nameConfidenceScore >= 70;
        const notEnrichedYet = !contact.completedSearches?.includes('contact_enrichment');
        return hasHighConfidence && notEnrichedYet;
      })
      .sort((a, b) => (b.nameConfidenceScore || 0) - (a.nameConfidenceScore || 0));

    if (topProspects.length === 0) {
      console.log(`No qualified top prospects found for company ${companyId}`);
      throw new Error('No qualified prospects found to enrich');
    }

    console.log(`Found ${topProspects.length} qualified prospects for enrichment in company ${companyId}`);

    const company = await storage.getCompany(companyId);
    if (!company) throw new Error('Company not found');

    // Create queue items with proper prioritization
    const queueItems: EnrichmentQueueItem[] = topProspects.map(contact => ({
      contactId: contact.id,
      companyId,
      searchId,
      priority: contact.nameConfidenceScore || 50
    }));

    // Add to queue and start processing
    const queueId = await enrichmentQueue.addToQueue(searchId, queueItems);
    console.log(`Created enrichment queue ${queueId} for ${queueItems.length} contacts`);

    return queueId;
  }

  getEnrichmentStatus(queueId: string): QueueStatus | undefined {
    const status = enrichmentQueue.getStatus(queueId);
    if (status) {
      console.log(`Queue ${queueId} status: ${status.status}, completed ${status.completedItems}/${status.totalItems}`);
    }
    return status;
  }
}

export const postSearchEnrichmentService = new PostSearchEnrichmentService();