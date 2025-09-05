import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import type { Contact } from '@shared/schema';

interface UseComprehensiveEmailSearchOptions {
  onContactUpdate?: (contact: Contact) => void;
  onSearchComplete?: (contactId: number, emailFound: boolean) => void;
}

export function useComprehensiveEmailSearch(options: UseComprehensiveEmailSearchOptions = {}) {
  const [pendingSearchIds, setPendingSearchIds] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  const handleComprehensiveEmailSearch = useCallback(async (
    contactId: number,
    contact: Contact,
    searchContext?: {
      companyName?: string;
      companyWebsite?: string;
      companyDescription?: string;
    }
  ) => {
    // Check if already searching
    if (pendingSearchIds.has(contactId)) return;
    
    // Skip if email already exists
    if (contact.email) {
      toast({
        title: "Email Already Found",
        description: `${contact.name} already has email: ${contact.email}`,
        variant: "default",
      });
      return;
    }
    
    // Check if comprehensive search was already attempted
    if (contact.completedSearches?.includes('comprehensive_search')) {
      console.log('Comprehensive search already attempted for this contact, allowing retry');
    }
    
    // Add to pending set
    setPendingSearchIds(prev => new Set(prev).add(contactId));
    
    try {
      // 1. Try Apollo first
      if (!contact.completedSearches?.includes('apollo_search')) {
        const apolloResponse = await apiRequest("POST", `/api/contacts/${contactId}/apollo`, {
          searchContext,
          silent: true
        });
        const apolloResult = await apolloResponse.json();
        
        // Wait for the result to be saved
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Fetch updated contact
        const updatedResponse = await apiRequest("GET", `/api/contacts/${contactId}`, {});
        const updatedContact = await updatedResponse.json();
        
        if (updatedContact.email) {
          // Apollo found email - success!
          setPendingSearchIds(prev => {
            const next = new Set(prev);
            next.delete(contactId);
            return next;
          });
          
          toast({
            title: "Email Found!",
            description: `Found email via Apollo: ${updatedContact.email}`,
            variant: "default",
          });
          
          options.onContactUpdate?.(updatedContact);
          options.onSearchComplete?.(contactId, true);
          return;
        }
      }
      
      // 2. Try Perplexity AI if Apollo didn't find email
      if (!contact.completedSearches?.includes('contact_enrichment')) {
        const enrichResponse = await apiRequest("POST", `/api/contacts/${contactId}/enrich`, {
          includeEmail: true,
          silent: true
        });
        const enrichResult = await enrichResponse.json();
        
        // Wait for the result to be saved
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Fetch updated contact
        const updatedResponse = await apiRequest("GET", `/api/contacts/${contactId}`, {});
        const updatedContact = await updatedResponse.json();
        
        if (updatedContact.email) {
          // Perplexity found email - success!
          setPendingSearchIds(prev => {
            const next = new Set(prev);
            next.delete(contactId);
            return next;
          });
          
          toast({
            title: "Email Found!",
            description: `Found email via Perplexity: ${updatedContact.email}`,
            variant: "default",
          });
          
          options.onContactUpdate?.(updatedContact);
          options.onSearchComplete?.(contactId, true);
          return;
        }
      }
      
      // 3. Try Hunter as last resort
      if (!contact.completedSearches?.includes('hunter_search')) {
        const hunterResponse = await apiRequest("POST", `/api/contacts/${contactId}/hunter`, {
          silent: true
        });
        const hunterResult = await hunterResponse.json();
        
        // Wait for the result to be saved
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Fetch updated contact
        const updatedResponse = await apiRequest("GET", `/api/contacts/${contactId}`, {});
        const updatedContact = await updatedResponse.json();
        
        if (updatedContact.email) {
          // Hunter found email - success!
          setPendingSearchIds(prev => {
            const next = new Set(prev);
            next.delete(contactId);
            return next;
          });
          
          toast({
            title: "Email Found!",
            description: `Found email via Hunter: ${updatedContact.email}`,
            variant: "default",
          });
          
          options.onContactUpdate?.(updatedContact);
          options.onSearchComplete?.(contactId, true);
          return;
        }
      }
      
      // If we get here, no email was found
      // Mark comprehensive search as complete
      const markResponse = await apiRequest("POST", `/api/contacts/${contactId}/comprehensive-search-complete`, {});
      const markedContact = await markResponse.json();
      
      options.onContactUpdate?.(markedContact);
      options.onSearchComplete?.(contactId, false);
      
      toast({
        title: "Search Complete",
        description: `No email found for ${contact.name}. All search methods exhausted.`,
        variant: "default",
      });
      
    } catch (error) {
      console.error('Comprehensive search error:', error);
      
      // Mark comprehensive search as complete even on error
      try {
        const markResponse = await apiRequest("POST", `/api/contacts/${contactId}/comprehensive-search-complete`, {});
        const markedContact = await markResponse.json();
        
        options.onContactUpdate?.(markedContact);
        options.onSearchComplete?.(contactId, false);
      } catch (markError) {
        console.error('Failed to mark search as complete:', markError);
      }
      
      toast({
        title: "Search Error",
        description: "Failed to complete email search. Please try again.",
        variant: "destructive",
      });
    } finally {
      // Remove from pending
      setPendingSearchIds(prev => {
        const next = new Set(prev);
        next.delete(contactId);
        return next;
      });
      
      // Invalidate queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: [`/api/contacts/${contactId}`] });
    }
  }, [pendingSearchIds, toast, options]);

  return {
    handleComprehensiveEmailSearch,
    pendingSearchIds,
    isPending: (contactId: number) => pendingSearchIds.has(contactId)
  };
}