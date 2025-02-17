import { searchContactDetails } from '../../api-interactions';
import type { Contact } from '@shared/schema';
import type { EnrichmentResult, BatchEnrichmentResult, EnrichmentQueueItem } from './types';
import { storage } from '../../../storage';

class EmailEnrichmentService {
  private queue: EnrichmentQueueItem[] = [];
  private isProcessing: boolean = false;

  async addToQueue(items: EnrichmentQueueItem[]): Promise<void> {
    this.queue.push(...items);
    if (!this.isProcessing) {
      await this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    const results: EnrichmentResult[] = [];

    try {
      while (this.queue.length > 0) {
        const item = this.queue.shift();
        if (!item) break;

        const result = await this.enrichContact(item);
        results.push(result);
      }
    } finally {
      this.isProcessing = false;
    }

    // Store batch results if needed
    const batchResult: BatchEnrichmentResult = {
      results,
      completedAt: new Date().toISOString(),
      totalProcessed: results.length,
      successCount: results.filter(r => r.success).length,
      failureCount: results.filter(r => !r.success).length
    };

    console.log('Batch enrichment completed:', batchResult);
  }

  private async enrichContact(item: EnrichmentQueueItem): Promise<EnrichmentResult> {
    try {
      console.log(`Enriching contact: ${item.contactName} from ${item.companyName}`);
      
      const enrichedDetails = await searchContactDetails(item.contactName, item.companyName);
      
      if (Object.keys(enrichedDetails).length === 0) {
        return {
          contactId: item.contactId,
          success: false,
          error: 'No additional details found'
        };
      }

      const updatedContact = await storage.updateContact(item.contactId, {
        ...enrichedDetails,
        completedSearches: ['contact_enrichment']
      });

      return {
        contactId: item.contactId,
        success: true,
        enrichedData: updatedContact
      };

    } catch (error) {
      console.error(`Error enriching contact ${item.contactId}:`, error);
      return {
        contactId: item.contactId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async enrichTopProspects(companyId: number): Promise<EnrichmentResult[]> {
    const contacts = await storage.listContactsByCompany(companyId);
    const topProspects = contacts
      .filter(contact => contact.probability && contact.probability >= 50)
      .sort((a, b) => (b.probability || 0) - (a.probability || 0))
      .slice(0, 10);

    const company = await storage.getCompany(companyId);
    if (!company) throw new Error('Company not found');

    const queueItems: EnrichmentQueueItem[] = topProspects.map(contact => ({
      contactId: contact.id,
      priority: contact.probability || 50,
      companyName: company.name,
      contactName: contact.name
    }));

    await this.addToQueue(queueItems);
    return this.queue.map(item => ({
      contactId: item.contactId,
      success: false,
      error: 'Queued for processing'
    }));
  }
}

export const emailEnrichmentService = new EmailEnrichmentService();
