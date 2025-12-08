/**
 * Individual Search Email Enrichment
 * 
 * This module provides email enrichment for individual search results.
 * The actual candidate discovery is handled by IndividualSearchApiService
 * using Perplexity Search API + Claude extraction.
 */

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
