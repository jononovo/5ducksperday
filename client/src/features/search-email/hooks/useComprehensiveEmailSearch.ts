import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { Contact } from '@shared/schema';
import { 
  searchViaApollo, 
  searchViaPerplexity, 
  searchViaHunter,
  markSearchComplete 
} from '../services/api';
import { useEmailSearchBilling } from './useEmailSearchBilling';
import type { 
  SearchContext, 
  UseComprehensiveEmailSearchOptions,
  ComprehensiveEmailSearchResult 
} from '../types';

export function useComprehensiveEmailSearch(
  options: UseComprehensiveEmailSearchOptions = {}
): ComprehensiveEmailSearchResult {
  const [pendingSearchIds, setPendingSearchIds] = useState<Set<number>>(new Set());
  const { toast } = useToast();
  const { onContactUpdate, onSearchComplete, enableBilling = true } = options;
  
  const { checkSufficientCredits, billForEmailSearch } = useEmailSearchBilling();

  const handleComprehensiveEmailSearch = useCallback(async (
    contactId: number,
    contact: Contact,
    searchContext?: SearchContext
  ) => {
    if (pendingSearchIds.has(contactId)) return;
    
    if (contact.email) {
      toast({
        title: "Email Already Found",
        description: `${contact.name} already has email: ${contact.email}`,
        variant: "default",
      });
      return;
    }
    
    if (enableBilling) {
      const hasCredits = await checkSufficientCredits();
      if (!hasCredits) return;
    }
    
    if (contact.completedSearches?.includes('comprehensive_search')) {
      console.log('[search-email] Comprehensive search already attempted, allowing retry');
    }
    
    setPendingSearchIds(prev => new Set(prev).add(contactId));
    
    try {
      let foundEmail = false;
      let updatedContact: Contact | null = null;
      let sourceProvider = '';

      if (!contact.completedSearches?.includes('apollo_search')) {
        updatedContact = await searchViaApollo(contactId, searchContext);
        if (updatedContact?.email) {
          foundEmail = true;
          sourceProvider = 'Apollo';
        }
      }

      if (!foundEmail && !contact.completedSearches?.includes('contact_enrichment')) {
        updatedContact = await searchViaPerplexity(contactId);
        if (updatedContact?.email) {
          foundEmail = true;
          sourceProvider = 'Perplexity';
        }
      }

      if (!foundEmail && !contact.completedSearches?.includes('hunter_search')) {
        updatedContact = await searchViaHunter(contactId);
        if (updatedContact?.email) {
          foundEmail = true;
          sourceProvider = 'Hunter';
        }
      }

      if (foundEmail && updatedContact) {
        setPendingSearchIds(prev => {
          const next = new Set(prev);
          next.delete(contactId);
          return next;
        });
        
        if (enableBilling) {
          await billForEmailSearch(contactId, true);
        }
        
        toast({
          title: "Email Found!",
          description: `Found email for ${contact.name}`,
          variant: "default",
        });
        
        onContactUpdate?.(updatedContact);
        onSearchComplete?.(contactId, true);
        return;
      }

      const markedContact = await markSearchComplete(contactId);
      
      if (markedContact) {
        onContactUpdate?.(markedContact);
      }
      onSearchComplete?.(contactId, false);
      
      toast({
        title: "Search Complete",
        description: `No email found for ${contact.name}. All search methods exhausted.`,
        variant: "default",
      });
      
    } catch (error) {
      console.error('[search-email] Comprehensive search error:', error);
      
      const markedContact = await markSearchComplete(contactId);
      if (markedContact) {
        onContactUpdate?.(markedContact);
      }
      onSearchComplete?.(contactId, false);
      
      toast({
        title: "Search Error",
        description: "Failed to complete email search. Please try again.",
        variant: "destructive",
      });
    } finally {
      setPendingSearchIds(prev => {
        const next = new Set(prev);
        next.delete(contactId);
        return next;
      });
    }
  }, [pendingSearchIds, toast, onContactUpdate, onSearchComplete, enableBilling, checkSufficientCredits, billForEmailSearch]);

  return {
    handleComprehensiveEmailSearch,
    pendingSearchIds,
    isPending: (contactId: number) => pendingSearchIds.has(contactId)
  };
}
