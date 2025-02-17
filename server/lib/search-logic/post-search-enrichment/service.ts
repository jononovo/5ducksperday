import { enrichmentQueue } from './queue';
import type { EnrichmentQueueItem, QueueStatus } from './types';
import { storage } from '../../../storage';

class PostSearchEnrichmentService {
  async startEnrichment(companyId: number, searchId: string): Promise<string> {
    // Get contacts for the company
    const contacts = await storage.listContactsByCompany(companyId);
    
    // Filter for top prospects (probability >= 50)
    const topProspects = contacts
      .filter(contact => contact.probability && contact.probability >= 50)
      .sort((a, b) => (b.probability || 0) - (a.probability || 0));

    if (topProspects.length === 0) {
      throw new Error('No top prospects found to enrich');
    }

    // Create queue items
    const queueItems: EnrichmentQueueItem[] = topProspects.map(contact => ({
      contactId: contact.id,
      companyId,
      searchId,
      priority: contact.probability || 50
    }));

    // Add to queue and start processing
    const queueId = await enrichmentQueue.addToQueue(searchId, queueItems);
    
    return queueId;
  }

  getEnrichmentStatus(queueId: string): QueueStatus | undefined {
    return enrichmentQueue.getStatus(queueId);
  }
}

export const postSearchEnrichmentService = new PostSearchEnrichmentService();
