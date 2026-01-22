import { storage } from '../../storage';
import { CreditService } from '../../features/billing/credits/service';
import { streamSuperSearch } from './perplexity-stream';
import type { SearchPlan, SuperSearchResult, CompanyResult, ContactResult, StreamEvent } from './types';

interface SavedCompany {
  id: number;
  name: string;
  website?: string | null;
}

export class SuperSearchService {
  static async* executeSearch(
    userId: number,
    query: string,
    listId?: number
  ): AsyncGenerator<StreamEvent> {
    console.log(`[SuperSearchService] Starting search for user ${userId}: "${query}"`);

    const results: SuperSearchResult[] = [];
    let plan: SearchPlan | null = null;

    try {
      for await (const event of streamSuperSearch(query)) {
        if (event.type === 'plan') {
          plan = event.data;
        } else if (event.type === 'result') {
          results.push(event.data);
        }
        yield event;
      }

      if (results.length > 0) {
        console.log(`[SuperSearchService] Saving ${results.length} results to database`);
        const savedData = await this.saveResults(userId, results, listId);
        
        yield { type: 'progress', data: 'Finding email addresses...' };
        await this.enrichWithEmails(savedData.contacts, savedData.companyMap, userId);
        
        await CreditService.deductCredits(userId, 'super_search', true);
        console.log(`[SuperSearchService] Deducted 250 credits for super search`);
      }

      // Emit completion event
      yield { type: 'complete', data: { totalResults: results.length } };
      console.log(`[SuperSearchService] Search complete with ${results.length} results`);

    } catch (error) {
      console.error('[SuperSearchService] Error:', error);
      yield { type: 'error', data: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private static async saveResults(
    userId: number,
    results: SuperSearchResult[],
    listId?: number
  ): Promise<{ companies: SavedCompany[]; contacts: any[]; companyMap: Map<string, SavedCompany> }> {
    const savedCompanies: SavedCompany[] = [];
    const savedContacts: any[] = [];
    const companyMap = new Map<string, SavedCompany>();

    for (const result of results) {
      if (result.type === 'company') {
        const company = await this.saveCompanyResult(userId, result, listId);
        savedCompanies.push(company);
        companyMap.set(result.name.toLowerCase(), company);
      } else if (result.type === 'contact') {
        let company = companyMap.get(result.company.toLowerCase());
        if (!company) {
          company = await this.findOrCreateCompany(userId, result.company, result.companyWebsite, listId);
          companyMap.set(result.company.toLowerCase(), company);
          savedCompanies.push(company);
        }
        const contact = await this.saveContactResult(userId, result, company.id);
        savedContacts.push(contact);
      }
    }

    return { companies: savedCompanies, contacts: savedContacts, companyMap };
  }

  private static async saveCompanyResult(
    userId: number,
    result: CompanyResult,
    listId?: number
  ): Promise<SavedCompany> {
    const companyData = {
      userId,
      name: result.name,
      website: result.website || null,
      city: result.city || null,
      country: result.country || null,
      superSearchMeta: result.superSearchMeta || null,
      listId: listId || null
    };

    const saved = await storage.createCompany(companyData as any);
    console.log(`[SuperSearchService] Saved company: ${saved.name} (id: ${saved.id})`);
    return saved;
  }

  private static async findOrCreateCompany(
    userId: number,
    companyName: string,
    website?: string,
    listId?: number
  ): Promise<SavedCompany> {
    const companyData = {
      userId,
      name: companyName,
      website: website || null,
      listId: listId || null
    };

    const saved = await storage.createCompany(companyData as any);
    console.log(`[SuperSearchService] Created company for contact: ${saved.name} (id: ${saved.id})`);
    return saved;
  }

  private static async saveContactResult(
    userId: number,
    result: ContactResult,
    companyId: number
  ): Promise<any> {
    const contactData = {
      userId,
      companyId,
      name: result.name,
      role: result.role || null,
      linkedinUrl: result.linkedinUrl || null,
      city: result.city || null,
      country: result.country || null,
      superSearchMeta: result.superSearchMeta || null,
      verificationSource: 'super_search'
    };

    const saved = await storage.createContact(contactData as any);
    console.log(`[SuperSearchService] Saved contact: ${saved.name} (id: ${saved.id})`);
    return saved;
  }

  private static async enrichWithEmails(
    contacts: any[],
    companyMap: Map<string, SavedCompany>,
    userId: number
  ): Promise<void> {
    if (contacts.length === 0) return;

    console.log(`[SuperSearchService] Enriching ${contacts.length} contacts with emails via Apollo`);

    const apolloApiKey = process.env.APOLLO_API_KEY;
    if (!apolloApiKey) {
      console.log('[SuperSearchService] No Apollo API key configured, skipping email enrichment');
      return;
    }

    try {
      const { searchApolloDirect } = await import('../providers/apollo');
      
      for (const contact of contacts) {
        try {
          if (contact.email && contact.email.includes('@')) {
            console.log(`[SuperSearchService] Contact ${contact.name} already has email`);
            continue;
          }

          const company = await storage.getCompany(contact.companyId, userId);
          if (!company) continue;

          const apolloResult = await searchApolloDirect(contact, company, apolloApiKey);

          if (apolloResult?.email) {
            await storage.updateContact(contact.id, { 
              email: apolloResult.email,
              verificationSource: 'apollo',
              linkedinUrl: apolloResult.linkedin_url || contact.linkedinUrl
            });
            console.log(`[SuperSearchService] Found email for ${contact.name}: ${apolloResult.email}`);
          }
        } catch (error) {
          console.error(`[SuperSearchService] Email enrichment failed for ${contact.name}:`, error);
        }
      }
    } catch (error) {
      console.error('[SuperSearchService] Email enrichment module error:', error);
    }
  }
}
