import { apiRequest } from '@/lib/queryClient';
import type { Contact } from '@shared/schema';
import type { SearchContext } from '../types';

export async function searchViaApollo(
  contactId: number,
  searchContext?: SearchContext
): Promise<Contact | null> {
  try {
    const response = await apiRequest("POST", `/api/contacts/${contactId}/apollo`, {
      searchContext,
      silent: true
    });
    await response.json();
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const updatedResponse = await apiRequest("GET", `/api/contacts/${contactId}`);
    return await updatedResponse.json();
  } catch (error) {
    console.log('[search-email] Apollo search failed:', error);
    return null;
  }
}

export async function searchViaPerplexity(
  contactId: number
): Promise<Contact | null> {
  try {
    const response = await apiRequest("POST", `/api/contacts/${contactId}/enrich`, {
      includeEmail: true,
      silent: true
    });
    await response.json();
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const updatedResponse = await apiRequest("GET", `/api/contacts/${contactId}`);
    return await updatedResponse.json();
  } catch (error) {
    console.log('[search-email] Perplexity search failed:', error);
    return null;
  }
}

export async function searchViaHunter(
  contactId: number
): Promise<Contact | null> {
  try {
    const response = await apiRequest("POST", `/api/contacts/${contactId}/hunter`, {
      silent: true
    });
    await response.json();
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const updatedResponse = await apiRequest("GET", `/api/contacts/${contactId}`);
    return await updatedResponse.json();
  } catch (error) {
    console.log('[search-email] Hunter search failed:', error);
    return null;
  }
}

export async function markSearchComplete(contactId: number): Promise<Contact | null> {
  try {
    const response = await apiRequest("POST", `/api/contacts/${contactId}/comprehensive-search-complete`, {});
    return await response.json();
  } catch (error) {
    console.error('[search-email] Failed to mark search as complete:', error);
    return null;
  }
}
