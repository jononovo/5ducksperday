import type { Contact } from '@shared/schema';

export interface EnrichmentResult {
  contactId: number;
  success: boolean;
  enrichedData?: Partial<Contact>;
  error?: string;
}

export interface BatchEnrichmentResult {
  results: EnrichmentResult[];
  completedAt: string;
  totalProcessed: number;
  successCount: number;
  failureCount: number;
}

export interface EnrichmentQueueItem {
  contactId: number;
  priority: number;
  companyName: string;
  contactName: string;
}
