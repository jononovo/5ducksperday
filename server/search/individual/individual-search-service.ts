import { storage } from '../../storage';
import { CreditService } from '../../features/billing/credits/service';
import { discoverCandidates, enrichIndividualWithEmail } from './individual-search';
import type { SearchJob } from '@shared/schema';
import type { SearchType } from '../../features/billing/credits/types';
import type { CandidateResult } from './types';

/**
 * Simplified Individual Search Service
 * 
 * Flow:
 * 1. Take raw query from user
 * 2. Send to Perplexity AI which interprets query AND extracts candidates
 * 3. Create company/contact records
 * 4. Enrich with Apollo for emails
 * 
 * The AI handles ALL query interpretation - no regex parsing needed!
 */
export class IndividualSearchService {
  static async executeIndividualJob(job: SearchJob, jobId: string): Promise<void> {
    try {
      console.log(`[IndividualSearchService] Starting search for job ${jobId}`);
      console.log(`[IndividualSearchService] Query: "${job.query}"`);

      await storage.updateSearchJob(job.id, {
        progress: {
          phase: 'Searching',
          completed: 1,
          total: 5,
          message: 'Searching for candidates...'
        }
      });

      if (job.source !== 'cron') {
        const creditType: SearchType = 'individual_search';
        const userCredits = await CreditService.getUserCredits(job.userId);
        const { CREDIT_COSTS } = await import('../../features/billing/credits/types');
        const requiredCredits = CREDIT_COSTS[creditType];

        if (userCredits.currentBalance < requiredCredits) {
          console.log(`[IndividualSearchService] Insufficient credits for job ${job.id}: has ${userCredits.currentBalance}, needs ${requiredCredits}`);
          await storage.updateSearchJob(job.id, {
            status: 'failed',
            completedAt: new Date(),
            error: `Insufficient credits. You have ${userCredits.currentBalance} credits but this search requires ${requiredCredits} credits.`,
            results: {
              companies: [],
              contacts: [],
              totalCompanies: 0,
              totalContacts: 0,
              searchType: 'individual',
              metadata: {
                message: 'Insufficient credits for this search. Please add more credits to continue.'
              }
            },
            resultCount: 0
          });
          return;
        }
      }

      const result = await discoverCandidates(job.query);
      const { candidates, searchContext } = result;

      console.log(`[IndividualSearchService] AI interpreted query as:`, searchContext);

      if (candidates.length === 0) {
        console.log(`[IndividualSearchService] No candidates found for "${searchContext.interpretedName}"`);
        await storage.updateSearchJob(job.id, {
          status: 'completed',
          completedAt: new Date(),
          results: {
            companies: [],
            contacts: [],
            totalCompanies: 0,
            totalContacts: 0,
            searchType: 'individual',
            metadata: {
              message: `Could not find anyone matching "${searchContext.interpretedName}". Try adding more context like their company, role, or location.`
            }
          },
          resultCount: 0
        });
        return;
      }

      console.log(`[IndividualSearchService] Found ${candidates.length} candidates`);

      await storage.updateSearchJob(job.id, {
        progress: {
          phase: 'Creating records',
          completed: 2,
          total: 5,
          message: `Found ${candidates.length} potential matches, creating records...`
        }
      });

      const createdCompanies: any[] = [];
      const createdContacts: any[] = [];
      const listId = (job.metadata as any)?.listId || null;

      for (const candidate of candidates) {
        const { company, contact } = await this.createCandidateRecords(
          job.userId,
          candidate,
          listId
        );
        createdCompanies.push(company);
        createdContacts.push(contact);
      }

      console.log(`[IndividualSearchService] Created ${createdCompanies.length} companies and ${createdContacts.length} contacts`);

      await storage.updateSearchJob(job.id, {
        progress: {
          phase: 'Finding emails',
          completed: 3,
          total: 5,
          message: `Searching for email addresses for ${createdContacts.length} candidates...`
        }
      });

      for (let i = 0; i < createdContacts.length; i++) {
        const contact = createdContacts[i];
        const company = createdCompanies[i];
        
        await storage.updateSearchJob(job.id, {
          progress: {
            phase: 'Finding emails',
            completed: 3,
            total: 5,
            message: `Finding email for ${contact.name} (${i + 1}/${createdContacts.length})...`
          }
        });
        
        await enrichIndividualWithEmail(contact.id, company.id, job.userId);
      }

      const enrichedContacts = await Promise.all(
        createdContacts.map(c => storage.getContact(c.id, job.userId))
      );

      if (job.source !== 'cron') {
        await storage.updateSearchJob(job.id, {
          progress: {
            phase: 'Processing credits',
            completed: 4,
            total: 5,
            message: 'Updating account credits'
          }
        });

        const creditType: SearchType = 'individual_search';
        const creditResult = await CreditService.deductCredits(
          job.userId,
          creditType,
          true
        );

        console.log(`[IndividualSearchService] Deducted credits for individual search, new balance: ${creditResult.newBalance}`);
      }

      const companiesWithContacts = createdCompanies.map((company, index) => ({
        ...company,
        contacts: enrichedContacts[index] ? [enrichedContacts[index]] : [createdContacts[index]]
      }));

      await storage.updateSearchJob(job.id, {
        status: 'completed',
        completedAt: new Date(),
        progress: {
          phase: 'Complete',
          completed: 5,
          total: 5,
          message: `Found ${candidates.length} candidates`
        },
        results: {
          companies: companiesWithContacts,
          contacts: enrichedContacts.filter(Boolean),
          totalCompanies: createdCompanies.length,
          totalContacts: createdContacts.length,
          searchType: 'individual',
          metadata: {
            candidateCount: candidates.length,
            searchedName: searchContext.interpretedName,
            hints: {
              company: searchContext.interpretedCompany,
              location: searchContext.interpretedLocation,
              role: searchContext.interpretedRole
            }
          }
        },
        resultCount: candidates.length
      });

      console.log(`[IndividualSearchService] Completed search job ${jobId} with ${candidates.length} results`);

    } catch (error) {
      console.error(`[IndividualSearchService] Error in individual search:`, error);

      const shouldRetry = (job.retryCount || 0) < (job.maxRetries || 3);

      await storage.updateSearchJob(job.id, {
        status: shouldRetry ? 'pending' : 'failed',
        error: error instanceof Error ? error.message : 'Unknown error in individual search',
        retryCount: (job.retryCount || 0) + 1
      });

      if (!shouldRetry) {
        throw error;
      }
    }
  }

  private static async createCandidateRecords(
    userId: number,
    candidate: CandidateResult,
    listId: number | null
  ): Promise<{ company: any; contact: any }> {
    const companyData = {
      userId,
      name: candidate.currentCompany || 'Unknown Company',
      website: candidate.companyWebsite || null,
      description: null,
      size: null,
      age: null,
      alternativeProfileUrl: null,
      defaultContactEmail: null,
      ranking: null,
      linkedinProminence: null,
      customerCount: null,
      rating: null,
      services: null,
      validationPoints: null,
      differentiation: null,
      totalScore: candidate.score || null,
      snapshot: null,
      listId
    };

    const savedCompany = await storage.createCompany(companyData);
    console.log(`[IndividualSearchService] Created company ${savedCompany.id}: ${savedCompany.name}`);

    const contactData = {
      userId,
      name: candidate.name,
      companyId: savedCompany.id,
      role: candidate.currentRole || null,
      email: null,
      probability: candidate.score || null,
      linkedinUrl: candidate.linkedinUrl || null,
      twitterHandle: null,
      phoneNumber: null,
      department: null,
      location: null,
      verificationSource: 'individual_search',
      nameConfidenceScore: candidate.score,
      userFeedbackScore: null,
      feedbackCount: null
    };

    const savedContact = await storage.createContact(contactData);
    console.log(`[IndividualSearchService] Created contact ${savedContact.id}: ${savedContact.name} (score: ${candidate.score})`);

    return { company: savedCompany, contact: savedContact };
  }
}
