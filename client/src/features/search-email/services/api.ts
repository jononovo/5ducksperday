import { apiRequest, queryClient } from '@/lib/queryClient';
import type { Contact } from '@shared/schema';
import type { SearchContext, BillingResult } from '../types';

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

export async function checkCredits(): Promise<{ balance: number; isBlocked: boolean }> {
  try {
    const response = await apiRequest("GET", "/api/credits");
    return await response.json();
  } catch (error) {
    console.error('[search-email] Credit check failed:', error);
    return { balance: 0, isBlocked: true };
  }
}

export async function deductCreditsForEmailSearch(
  contactId: number,
  emailFound: boolean
): Promise<BillingResult> {
  try {
    if (!emailFound) {
      return { 
        success: true, 
        charged: false, 
        message: "No email found - no credits deducted" 
      };
    }

    const response = await apiRequest("POST", "/api/credits/deduct-individual-email", {
      contactId,
      searchType: 'comprehensive',
      emailFound: true
    });
    
    const result = await response.json();
    
    queryClient.invalidateQueries({ queryKey: ['/api/credits'] });
    
    return {
      success: result.success,
      charged: result.charged,
      newBalance: result.newBalance,
      isBlocked: result.isBlocked,
      message: result.message
    };
  } catch (error) {
    console.error('[search-email] Credit deduction failed:', error);
    return {
      success: false,
      charged: false,
      message: error instanceof Error ? error.message : 'Credit deduction failed'
    };
  }
}

export const CREDIT_COST_EMAIL_SEARCH = 20;
