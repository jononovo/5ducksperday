/**
 * Parallel Tiered Email Search Module
 * 
 * Implements optimized parallel email searching with tiered provider logic:
 * - Tier 1: Apollo for all 3 contacts (parallel)
 * - Tier 2: Only if <1 email found in Tier 1:
 *   - Perplexity for contacts 1 & 3 (parallel)
 *   - Hunter for contacts 1 & 2 (parallel)
 */

import { storage } from "../../storage";

interface ContactWithCompany {
  contact: any;
  company: any;
}

interface EmailSearchResult {
  contactId: number;
  email: string | null;
  source: string;
  confidence: number;
}

/**
 * Try Apollo search for a contact with error handling and DB save
 */
async function tryApollo(contact: any, company: any, userId: number): Promise<EmailSearchResult | null> {
  const apolloApiKey = process.env.APOLLO_API_KEY;
  if (!apolloApiKey) {
    console.log(`[Apollo] No API key configured, skipping for contact ${contact.name}`);
    return null;
  }

  // Skip if already has email
  if (contact.email && contact.email.includes('@')) {
    console.log(`[Apollo] Contact ${contact.name} already has email: ${contact.email}`);
    return { contactId: contact.id, email: contact.email, source: 'existing', confidence: 100 };
  }

  try {
    console.log(`[Apollo] Searching for ${contact.name} at ${company.name}`);
    const { searchApolloDirect } = await import('../providers/apollo');
    const result = await searchApolloDirect(contact, company, apolloApiKey);
    
    if (result.success && result.contact.email) {
      // Save to database immediately
      await storage.updateContact(contact.id, { 
        email: result.contact.email,
        role: result.contact.role || contact.role,
        completedSearches: [...(contact.completedSearches || []), 'apollo_search'],
        lastValidated: new Date()
      });
      
      console.log(`[Apollo] ✅ Found and saved email for ${contact.name}: ${result.contact.email}`);
      return {
        contactId: contact.id,
        email: result.contact.email,
        source: 'apollo',
        confidence: result.metadata?.confidence || 85
      };
    }
    
    console.log(`[Apollo] No email found for ${contact.name}`);
    return null;
  } catch (error) {
    console.error(`[Apollo] Error searching for ${contact.name}:`, error);
    return null;
  }
}

/**
 * Try Perplexity search for a contact with error handling and DB save
 */
async function tryPerplexity(contact: any, company: any, userId: number): Promise<EmailSearchResult | null> {
  // Skip if already has email
  if (contact.email && contact.email.includes('@')) {
    console.log(`[Perplexity] Contact ${contact.name} already has email: ${contact.email}`);
    return { contactId: contact.id, email: contact.email, source: 'existing', confidence: 100 };
  }

  try {
    console.log(`[Perplexity] Searching for ${contact.name} at ${company.name}`);
    const { searchContactDetails } = await import('../enrichment/contact-details');
    const details = await searchContactDetails(contact.name, company.name);
    
    if (details.email) {
      // Save to database immediately
      await storage.updateContact(contact.id, { 
        email: details.email,
        completedSearches: [...(contact.completedSearches || []), 'contact_enrichment'],
        lastValidated: new Date()
      });
      
      console.log(`[Perplexity] ✅ Found and saved email for ${contact.name}: ${details.email}`);
      return {
        contactId: contact.id,
        email: details.email,
        source: 'perplexity',
        confidence: 75
      };
    }
    
    console.log(`[Perplexity] No email found for ${contact.name}`);
    return null;
  } catch (error) {
    console.error(`[Perplexity] Error searching for ${contact.name}:`, error);
    return null;
  }
}

/**
 * Try Hunter search for a contact with error handling and DB save
 */
async function tryHunter(contact: any, company: any, userId: number): Promise<EmailSearchResult | null> {
  const hunterApiKey = process.env.HUNTER_API_KEY;
  if (!hunterApiKey) {
    console.log(`[Hunter] No API key configured, skipping for contact ${contact.name}`);
    return null;
  }

  // Skip if already has email
  if (contact.email && contact.email.includes('@')) {
    console.log(`[Hunter] Contact ${contact.name} already has email: ${contact.email}`);
    return { contactId: contact.id, email: contact.email, source: 'existing', confidence: 100 };
  }

  try {
    console.log(`[Hunter] Searching for ${contact.name} at ${company.name}`);
    const { searchHunterDirect } = await import('../providers/hunter');
    const result = await searchHunterDirect(contact, company, hunterApiKey);
    
    if (result.success && result.contact.email) {
      // Save to database immediately
      await storage.updateContact(contact.id, { 
        email: result.contact.email,
        role: result.contact.role || contact.role,
        completedSearches: [...(contact.completedSearches || []), 'hunter_search'],
        lastValidated: new Date()
      });
      
      console.log(`[Hunter] ✅ Found and saved email for ${contact.name}: ${result.contact.email}`);
      return {
        contactId: contact.id,
        email: result.contact.email,
        source: 'hunter',
        confidence: result.metadata?.confidence || 70
      };
    }
    
    console.log(`[Hunter] No email found for ${contact.name}`);
    return null;
  } catch (error) {
    console.error(`[Hunter] Error searching for ${contact.name}:`, error);
    return null;
  }
}

/**
 * Execute parallel tiered email search for top 3 contacts of a company
 * 
 * Tier 1: Apollo for all 3 contacts (parallel)
 * Tier 2: Only if <1 email found - Perplexity (contacts 1,3) + Hunter (contacts 1,2) in parallel
 */
export async function parallelTieredEmailSearch(
  contacts: any[],
  company: any,
  userId: number
): Promise<EmailSearchResult[]> {
  const startTime = Date.now();
  const results: EmailSearchResult[] = [];
  
  // Sort by probability and take top 3
  const topContacts = contacts
    .sort((a, b) => (b.probability || 0) - (a.probability || 0))
    .slice(0, 3);
  
  console.log(`[Parallel Search] Starting tiered search for ${topContacts.length} contacts from ${company.name}`);
  
  // TIER 1: Apollo for all contacts in parallel
  console.log(`[Parallel Search] === TIER 1: Apollo for all ${topContacts.length} contacts ===`);
  const tier1StartTime = Date.now();
  
  const apolloPromises = topContacts.map(contact => tryApollo(contact, company, userId));
  const apolloResults = await Promise.allSettled(apolloPromises);
  
  // Process Apollo results
  let emailsFoundInTier1 = 0;
  apolloResults.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value) {
      results.push(result.value);
      if (result.value.source !== 'existing') {
        emailsFoundInTier1++;
      }
    }
  });
  
  console.log(`[Parallel Search] Tier 1 complete in ${Date.now() - tier1StartTime}ms - Found ${emailsFoundInTier1} new emails`);
  
  // TIER 2: Only if less than 1 email found in Tier 1
  if (emailsFoundInTier1 < 1 && topContacts.length > 0) {
    console.log(`[Parallel Search] === TIER 2: Perplexity + Hunter (conditional) ===`);
    const tier2StartTime = Date.now();
    
    const tier2Promises: Promise<EmailSearchResult | null>[] = [];
    
    // Perplexity for contacts 1 and 3 (index 0 and 2)
    if (topContacts[0] && !results.find(r => r.contactId === topContacts[0].id && r.email)) {
      tier2Promises.push(tryPerplexity(topContacts[0], company, userId));
    }
    if (topContacts[2] && !results.find(r => r.contactId === topContacts[2].id && r.email)) {
      tier2Promises.push(tryPerplexity(topContacts[2], company, userId));
    }
    
    // Hunter for contacts 1 and 2 (index 0 and 1)
    if (topContacts[0] && !results.find(r => r.contactId === topContacts[0].id && r.email)) {
      tier2Promises.push(tryHunter(topContacts[0], company, userId));
    }
    if (topContacts[1] && !results.find(r => r.contactId === topContacts[1].id && r.email)) {
      tier2Promises.push(tryHunter(topContacts[1], company, userId));
    }
    
    // Execute all Tier 2 searches in parallel
    const tier2Results = await Promise.allSettled(tier2Promises);
    
    // Process Tier 2 results
    let emailsFoundInTier2 = 0;
    tier2Results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        // Only add if we don't already have an email for this contact
        const existingResult = results.find(r => r.contactId === result.value!.contactId);
        if (!existingResult || !existingResult.email) {
          if (!existingResult) {
            results.push(result.value);
          } else {
            // Update existing null result
            existingResult.email = result.value.email;
            existingResult.source = result.value.source;
            existingResult.confidence = result.value.confidence;
          }
          if (result.value.source !== 'existing') {
            emailsFoundInTier2++;
          }
        }
      }
    });
    
    console.log(`[Parallel Search] Tier 2 complete in ${Date.now() - tier2StartTime}ms - Found ${emailsFoundInTier2} additional emails`);
  } else {
    console.log(`[Parallel Search] Skipping Tier 2 - Already found ${emailsFoundInTier1} email(s) in Tier 1`);
  }
  
  // Mark contacts as comprehensively searched if no email found
  for (const contact of topContacts) {
    const hasResult = results.find(r => r.contactId === contact.id && r.email);
    if (!hasResult) {
      await storage.updateContact(contact.id, {
        completedSearches: [...(contact.completedSearches || []), 'comprehensive_search'],
        lastValidated: new Date()
      });
      console.log(`[Parallel Search] Marked ${contact.name} as comprehensively searched (no email found)`);
    }
  }
  
  const totalTime = Date.now() - startTime;
  const emailsFound = results.filter(r => r.email && r.source !== 'existing').length;
  console.log(`[Parallel Search] ✅ Company ${company.name} complete in ${totalTime}ms - Found ${emailsFound} new emails out of ${topContacts.length} contacts`);
  
  return results;
}