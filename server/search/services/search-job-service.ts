import { storage } from "../../storage";
import { searchCompanies } from "../perplexity/company-search";
import { findKeyDecisionMakers } from "../contacts/finder";
import { CreditService } from "../../features/billing/credits/service";
import type { InsertSearchJob, SearchJob } from "@shared/schema";
import type { ContactSearchConfig } from "../types";

export interface CreateJobParams {
  userId: number;
  query: string;
  searchType: 'companies' | 'contacts' | 'emails' | 'contact-only';
  contactSearchConfig?: ContactSearchConfig;
  source: 'frontend' | 'api' | 'cron';
  metadata?: Record<string, any>;
  priority?: number;
}

export interface JobProgress {
  phase: string;
  completed: number;
  total: number;
  message?: string;
}

export class SearchJobService {
  /**
   * Create a new search job and save it to database
   */
  static async createJob(params: CreateJobParams): Promise<string> {
    const jobData: InsertSearchJob = {
      userId: params.userId,
      query: params.query,
      searchType: params.searchType || 'companies',
      contactSearchConfig: params.contactSearchConfig || {},
      source: params.source,
      metadata: params.metadata || {},
      priority: params.priority || 0,
      maxRetries: 3
    };

    const job = await storage.createSearchJob(jobData);
    console.log(`[SearchJobService] Created job ${job.jobId} for user ${params.userId}`);
    
    return job.jobId;
  }

  /**
   * Execute a search job (can be called synchronously or by background processor)
   */
  static async executeJob(jobId: string): Promise<void> {
    try {
      // Get the job from database
      const job = await storage.getSearchJobByJobId(jobId);
      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }

      if (job.status !== 'pending') {
        console.log(`[SearchJobService] Job ${jobId} already ${job.status}, skipping`);
        return;
      }

      // Mark job as processing
      await storage.updateSearchJob(job.id, {
        status: 'processing',
        startedAt: new Date(),
        progress: {
          phase: 'Starting search',
          completed: 0,
          total: 5,
          message: 'Initializing search process'
        }
      });

      console.log(`[SearchJobService] Starting execution of job ${jobId}`);

      let savedCompanies = [];
      let contacts: any[] = [];
      
      // Handle different search types
      if (job.searchType === 'contact-only') {
        // Contact-only search: Use existing companies
        await this.executeContactOnlySearch(job, jobId);
        return;
      }
      
      // Regular flow: Search companies first
      // Phase 1: Search for companies
      await this.updateJobProgress(job.id, {
        phase: 'Finding companies',
        completed: 1,
        total: 5,
        message: 'Searching for matching companies'
      });

      const companies = await searchCompanies(job.query);
      console.log(`[SearchJobService] Found ${companies.length} companies for job ${jobId}`);

      // Phase 2: Save companies to database
      await this.updateJobProgress(job.id, {
        phase: 'Saving companies',
        completed: 2,
        total: 5,
        message: `Processing ${companies.length} companies`
      });

      for (const company of companies) {
        const companyData: any = {
          ...company,
          userId: job.userId,
          listId: (job.metadata as any)?.listId || null
        };
        const savedCompany = await storage.createCompany(companyData);
        savedCompanies.push(savedCompany);
      }
      
      // Phase 3: Find contacts if requested
      if (job.searchType === 'contacts' || job.searchType === 'emails') {
        await this.updateJobProgress(job.id, {
          phase: 'Finding contacts',
          completed: 3,
          total: 5,
          message: 'Discovering key decision makers'
        });

        // Use the new ContactSearchService
        const { ContactSearchService } = await import('./contact-search-service');
        
        const contactResults = await ContactSearchService.searchContacts({
          companies: savedCompanies,
          userId: job.userId,
          searchConfig: job.contactSearchConfig as ContactSearchConfig || ContactSearchService.getDefaultConfig(),
          jobId: job.jobId,
          onProgress: async (message: string) => {
            await this.updateJobProgress(job.id, {
              phase: 'Finding contacts',
              completed: 3,
              total: 5,
              message
            });
          }
        });

        // Flatten all contacts from results
        for (const result of contactResults) {
          contacts.push(...result.contacts.map(contact => ({
            ...contact,
            companyName: result.companyName
          })));
        }

        console.log(`[SearchJobService] Found ${contacts.length} contacts for job ${jobId}`);
      }

      // Phase 4: Deduct credits if applicable
      if (job.source !== 'cron' && savedCompanies.length > 0) {
        await this.updateJobProgress(job.id, {
          phase: 'Processing credits',
          completed: 4,
          total: 5,
          message: 'Updating account credits'
        });

        const creditType = job.searchType === 'emails' ? 'email_search' : 
                          job.searchType === 'contacts' ? 'contact_search' : 
                          'company_search';
        
        await CreditService.deductCredits(
          job.userId,
          creditType as any,
          true
        );
      }

      // Phase 5: Mark job as completed
      await this.updateJobProgress(job.id, {
        phase: 'Completed',
        completed: 5,
        total: 5,
        message: 'Search completed successfully'
      });

      const results = {
        companies: savedCompanies,
        contacts: contacts,
        totalCompanies: savedCompanies.length,
        totalContacts: contacts.length
      };

      await storage.updateSearchJob(job.id, {
        status: 'completed',
        completedAt: new Date(),
        results: results,
        resultCount: savedCompanies.length
      });

      console.log(`[SearchJobService] Completed job ${jobId} with ${savedCompanies.length} companies and ${contacts.length} contacts`);

    } catch (error) {
      console.error(`[SearchJobService] Error executing job ${jobId}:`, error);
      
      // Get the job to check retry count
      const job = await storage.getSearchJobByJobId(jobId);
      if (job) {
        const shouldRetry = (job.retryCount || 0) < (job.maxRetries || 3);
        
        await storage.updateSearchJob(job.id, {
          status: shouldRetry ? 'pending' : 'failed',
          error: error instanceof Error ? error.message : String(error),
          retryCount: (job.retryCount || 0) + 1,
          progress: {
            phase: 'Error',
            completed: 0,
            total: 1,
            message: error instanceof Error ? error.message : 'Search failed'
          }
        });

        if (shouldRetry) {
          console.log(`[SearchJobService] Job ${jobId} will be retried (attempt ${(job.retryCount || 0) + 1}/${job.maxRetries || 3})`);
        }
      }
      
      throw error;
    }
  }

  /**
   * Execute a contact-only search (no company search)
   * Used when companies already exist and we just need contacts
   */
  private static async executeContactOnlySearch(job: SearchJob, jobId: string): Promise<void> {
    try {
      console.log(`[SearchJobService] Executing contact-only search for job ${jobId}`);
      
      // Get company IDs from metadata or search all user's companies
      const companyIds = (job.metadata as any)?.companyIds || [];
      let companies;
      
      if (companyIds.length > 0) {
        // Search specific companies
        companies = await Promise.all(
          companyIds.map((id: number) => storage.getCompany(id, job.userId))
        );
        companies = companies.filter(c => c); // Remove nulls
      } else {
        // Search all user's companies
        companies = await storage.listCompanies(job.userId);
      }
      
      if (!companies || companies.length === 0) {
        throw new Error('No companies found for contact search');
      }
      
      console.log(`[SearchJobService] Searching contacts for ${companies.length} companies`);
      
      // Update progress
      await this.updateJobProgress(job.id, {
        phase: 'Finding contacts',
        completed: 1,
        total: 3,
        message: `Searching contacts for ${companies.length} companies`
      });
      
      // Use the ContactSearchService
      const { ContactSearchService } = await import('./contact-search-service');
      
      const contactResults = await ContactSearchService.searchContacts({
        companies,
        userId: job.userId,
        searchConfig: job.contactSearchConfig as ContactSearchConfig || ContactSearchService.getDefaultConfig(),
        jobId: job.jobId,
        onProgress: async (message: string) => {
          await this.updateJobProgress(job.id, {
            phase: 'Finding contacts',
            completed: 2,
            total: 3,
            message
          });
        }
      });
      
      // Collect all contacts
      const allContacts = [];
      for (const result of contactResults) {
        allContacts.push(...result.contacts.map(contact => ({
          ...contact,
          companyName: result.companyName
        })));
      }
      
      console.log(`[SearchJobService] Found ${allContacts.length} contacts across ${companies.length} companies`);
      
      // Update job as completed
      const results = {
        companies: companies.map(c => ({
          id: c.id,
          name: c.name,
          website: c.website,
          description: c.description
        })),
        contacts: allContacts,
        searchType: 'contact-only',
        metadata: {
          companiesSearched: companies.length,
          contactsFound: allContacts.length,
          config: job.contactSearchConfig
        }
      };
      
      await storage.updateSearchJob(job.id, {
        status: 'completed',
        completedAt: new Date(),
        results: results,
        resultCount: allContacts.length,
        progress: {
          phase: 'Complete',
          completed: 3,
          total: 3,
          message: `Found ${allContacts.length} contacts`
        }
      });
      
      console.log(`[SearchJobService] Completed contact-only job ${jobId}`);
      
    } catch (error) {
      console.error(`[SearchJobService] Error in contact-only search:`, error);
      
      // Handle retry logic
      const shouldRetry = (job.retryCount || 0) < (job.maxRetries || 3);
      
      await storage.updateSearchJob(job.id, {
        status: shouldRetry ? 'pending' : 'failed',
        error: error instanceof Error ? error.message : String(error),
        retryCount: (job.retryCount || 0) + 1,
        progress: {
          phase: 'Error',
          completed: 0,
          total: 1,
          message: error instanceof Error ? error.message : 'Contact search failed'
        }
      });
      
      throw error;
    }
  }

  /**
   * Update job progress
   */
  private static async updateJobProgress(jobId: number, progress: JobProgress): Promise<void> {
    await storage.updateSearchJob(jobId, { progress });
  }

  /**
   * Get job status and results
   */
  static async getJob(jobId: string, userId: number): Promise<SearchJob | null> {
    const job = await storage.getSearchJobByJobId(jobId);
    
    // Verify user owns this job
    if (job && job.userId !== userId) {
      console.warn(`[SearchJobService] User ${userId} tried to access job ${jobId} owned by user ${job.userId}`);
      return null;
    }
    
    return job || null;
  }

  /**
   * List user's recent jobs
   */
  static async listJobs(userId: number, limit: number = 10): Promise<SearchJob[]> {
    return storage.listSearchJobs(userId, limit);
  }

  /**
   * List pending jobs for processing
   */
  static async getPendingJobs(limit: number = 1): Promise<SearchJob[]> {
    return storage.getPendingSearchJobs(limit);
  }

  /**
   * Cancel a pending job
   */
  static async cancelJob(jobId: string): Promise<void> {
    const job = await storage.getSearchJobByJobId(jobId);
    
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }
    
    if (job.status !== 'pending') {
      throw new Error(`Cannot cancel job with status: ${job.status}`);
    }
    
    await storage.updateSearchJob(job.id, {
      status: 'failed',
      error: 'Job cancelled by user',
      completedAt: new Date()
    });
    
    console.log(`[SearchJobService] Cancelled job ${jobId}`);
  }

  /**
   * Clean up old completed jobs
   */
  static async cleanupOldJobs(daysToKeep: number = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const deleted = await storage.deleteOldSearchJobs(cutoffDate);
    console.log(`[SearchJobService] Cleaned up ${deleted} old search jobs`);
    
    return deleted;
  }

  /**
   * Get failed jobs that can be retried
   */
  static async getFailedJobsForRetry(): Promise<SearchJob[]> {
    return storage.getFailedJobsForRetry();
  }

  /**
   * Retry a failed job
   */
  static async retryJob(jobId: string): Promise<void> {
    const job = await storage.getSearchJobByJobId(jobId);
    
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }
    
    await storage.updateSearchJob(job.id, {
      status: 'pending',
      retryCount: (job.retryCount || 0) + 1,
      error: null,
      progress: {
        phase: 'Retrying',
        completed: 0,
        total: 1,
        message: `Retrying attempt ${(job.retryCount || 0) + 1}`
      }
    });
    
    console.log(`[SearchJobService] Job ${jobId} marked for retry (attempt ${(job.retryCount || 0) + 1})`);
  }

  /**
   * Update job status directly
   */
  static async updateJobStatus(
    jobId: string, 
    status: string, 
    results?: any, 
    error?: string
  ): Promise<void> {
    const job = await storage.getSearchJobByJobId(jobId);
    
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }
    
    await storage.updateSearchJob(job.id, {
      status,
      results,
      error,
      completedAt: status === 'completed' || status === 'failed' ? new Date() : undefined
    });
  }

  /**
   * Delete old jobs (wrapper for cleanupOldJobs for consistency with cron examples)
   */
  static async deleteOldJobs(cutoffDate: Date): Promise<number> {
    const deleted = await storage.deleteOldSearchJobs(cutoffDate);
    console.log(`[SearchJobService] Deleted ${deleted} jobs older than ${cutoffDate.toISOString()}`);
    return deleted;
  }
}