import type { ParsedIndividualQuery, CandidateResult } from './types';
import { searchWebForPerson, extractCandidatesFromResults } from './perplexity-search';

export async function discoverCandidates(
  parsed: ParsedIndividualQuery
): Promise<CandidateResult[]> {
  console.log(`[IndividualSearch] Starting multi-candidate search for: ${parsed.personName}`);
  
  const searchResults = await searchWebForPerson(parsed);
  
  if (searchResults.length === 0) {
    console.log('[IndividualSearch] No search results found');
    return [];
  }
  
  console.log(`[IndividualSearch] Found ${searchResults.length} raw results, extracting candidates...`);
  
  const candidates = await extractCandidatesFromResults(searchResults, parsed);
  
  console.log(`[IndividualSearch] Extracted ${candidates.length} candidates`);
  
  return candidates;
}

export async function enrichIndividualWithEmail(
  contactId: number,
  companyId: number,
  userId: number
): Promise<void> {
  try {
    const { parallelTieredEmailSearch } = await import('../services/parallel-email-search');
    const { storage } = await import('../../storage');
    
    const contact = await storage.getContact(contactId, userId);
    const company = await storage.getCompany(companyId, userId);
    
    if (!contact || !company) {
      console.error('[IndividualSearch] Contact or company not found for email enrichment');
      return;
    }

    console.log(`[IndividualSearch] Starting email enrichment for ${contact.name} at ${company.name}`);

    const contactsForSearch = [{
      id: contact.id,
      name: contact.name,
      role: contact.role,
      probability: contact.probability,
      companyId: company.id,
      completedSearches: contact.completedSearches
    }];

    const emailResults = await parallelTieredEmailSearch(
      contactsForSearch,
      company,
      userId
    );

    console.log(`[IndividualSearch] Email enrichment complete. Found ${emailResults.length} results`);

  } catch (error) {
    console.error('[IndividualSearch] Error enriching with email:', error);
  }
}
