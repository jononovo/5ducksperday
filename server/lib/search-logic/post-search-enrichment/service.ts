import { enrichmentQueue } from './queue';
import type { EnrichmentQueueItem, QueueStatus } from './types';
import { storage } from '../../../storage';

class PostSearchEnrichmentService {
  async startEnrichment(companyId: number, searchId: string): Promise<string> {
    console.log(`Starting post-search enrichment for company ${companyId}, search ${searchId}`);

    // Get contacts for the company
    const contacts = await storage.listContactsByCompany(companyId);

    // Filter for top prospects (probability >= 50)
    const topProspects = contacts
      .filter(contact => contact.probability && contact.probability >= 50)
      .sort((a, b) => (b.probability || 0) - (a.probability || 0));

    if (topProspects.length === 0) {
      console.log(`No top prospects found for company ${companyId}`);
      throw new Error('No top prospects found to enrich');
    }

    console.log(`Found ${topProspects.length} top prospects for enrichment in company ${companyId}`);

    // Create queue items
    const queueItems: EnrichmentQueueItem[] = topProspects.map(contact => ({
      contactId: contact.id,
      companyId,
      searchId,
      priority: contact.probability || 50
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