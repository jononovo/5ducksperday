import type { EnrichmentQueueItem, QueueStatus, EnrichmentResult } from './types';
import { storage } from '../../../storage';
import { searchContactDetails } from '../../api-interactions';

class EnrichmentQueue {
  private queue: Map<string, EnrichmentQueueItem[]> = new Map();
  private status: Map<string, QueueStatus> = new Map();
  private processing: boolean = false;

  generateQueueId(): string {
    return `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async addToQueue(searchId: string, contacts: EnrichmentQueueItem[]): Promise<string> {
    const queueId = this.generateQueueId();
    this.queue.set(queueId, contacts);
    this.status.set(queueId, {
      queueId,
      totalItems: contacts.length,
      completedItems: 0,
      status: 'pending',
      lastUpdated: new Date()
    });

    if (!this.processing) {
      this.processQueue(queueId);
    }

    return queueId;
  }

  getStatus(queueId: string): QueueStatus | undefined {
    return this.status.get(queueId);
  }

  private async processQueue(queueId: string): Promise<void> {
    if (this.processing) return;

    this.processing = true;
    const items = this.queue.get(queueId);
    
    if (!items || items.length === 0) {
      this.processing = false;
      return;
    }

    try {
      this.updateStatus(queueId, 'processing');

      for (const item of items) {
        const contact = await storage.getContact(item.contactId);
        if (!contact) continue;

        const company = await storage.getCompany(item.companyId);
        if (!company) continue;

        try {
          const enrichedDetails = await searchContactDetails(contact.name, company.name);
          
          if (Object.keys(enrichedDetails).length > 0) {
            await storage.updateContact(item.contactId, {
              ...contact,
              ...enrichedDetails,
              completedSearches: [...(contact.completedSearches || []), 'post_search_enrichment']
            });
          }

          this.incrementCompleted(queueId);
        } catch (error) {
          console.error(`Error enriching contact ${item.contactId}:`, error);
        }
      }

      this.updateStatus(queueId, 'completed');
    } catch (error) {
      console.error('Queue processing error:', error);
      this.updateStatus(queueId, 'failed');
    } finally {
      this.processing = false;
    }
  }

  private updateStatus(queueId: string, status: QueueStatus['status']): void {
    const current = this.status.get(queueId);
    if (current) {
      this.status.set(queueId, {
        ...current,
        status,
        lastUpdated: new Date()
      });
    }
  }

  private incrementCompleted(queueId: string): void {
    const current = this.status.get(queueId);
    if (current) {
      this.status.set(queueId, {
        ...current,
        completedItems: current.completedItems + 1,
        lastUpdated: new Date()
      });
    }
  }
}

export const enrichmentQueue = new EnrichmentQueue();
