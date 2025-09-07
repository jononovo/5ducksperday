import type { Contact } from "@shared/schema";

export interface EnrichmentQueueItem {
  contactId: number;
  companyId: number;
  searchId: string;
  priority: number;
}

export interface QueueStatus {
  queueId: string;
  totalItems: number;
  completedItems: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  lastUpdated: Date;
  searchId: string; // Added searchId to track associated search
}

export interface EnrichmentResult {
  contactId: number;
  success: boolean;
  enrichedData?: Partial<Contact>;
  error?: string;
}