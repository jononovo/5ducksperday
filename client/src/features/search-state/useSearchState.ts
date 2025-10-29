import { useRef, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";
import type { SavedSearchState, SearchStateHookReturn, CompanyWithContacts } from "./types";

/**
 * Custom hook for managing search state persistence and restoration
 * Handles localStorage/sessionStorage, database refresh, and state synchronization
 */
export function useSearchState(
  setCurrentResults: React.Dispatch<React.SetStateAction<CompanyWithContacts[] | null>>
): SearchStateHookReturn {
  // Refs for tracking component lifecycle
  const isMountedRef = useRef(true);
  const isInitializedRef = useRef(false);
  const hasSessionRestoredDataRef = useRef(false);
  const refreshVersionRef = useRef(0);
  
  // Helper to check if companies have complete contact information
  const hasCompleteContacts = (companies: CompanyWithContacts[] | null): boolean => {
    if (!companies || companies.length === 0) return false;
    return companies.some(c => c.contacts && c.contacts.length > 0);
  };
  
  // Load search state from localStorage/sessionStorage with fallback
  const loadSearchState = useCallback((): SavedSearchState | null => {
    try {
      // Try localStorage first
      const localState = localStorage.getItem('searchState');
      if (localState) {
        const parsed = JSON.parse(localState) as SavedSearchState;
        // Validate the data - ensure we have meaningful content
        if (parsed.currentQuery || (parsed.currentResults && parsed.currentResults.length > 0)) {
          return parsed;
        }
      }
      
      // Fallback to sessionStorage if localStorage is corrupted
      const sessionState = sessionStorage.getItem('searchState');
      if (sessionState) {
        const parsed = JSON.parse(sessionState) as SavedSearchState;
        if (parsed.currentQuery || (parsed.currentResults && parsed.currentResults.length > 0)) {
          console.log('Restored search state from sessionStorage backup');
          return parsed;
        }
      }
    } catch (error) {
      console.error('Error loading search state:', error);
    }
    return null;
  }, []);
  
  // Persist search state to both localStorage and sessionStorage
  const persistSearchState = useCallback((
    state: {
      currentResults: CompanyWithContacts[];
      emailSearchCompleted?: boolean;
      emailSearchTimestamp?: number | null;
      navigationRefreshTimestamp?: number;
    },
    currentValues: {
      currentQuery: string;
      currentListId: number | null;
      lastExecutedQuery: string | null;
    }
  ) => {
    const queryToSave = currentValues.lastExecutedQuery || currentValues.currentQuery;
    const stateToSave = {
      currentQuery: queryToSave,
      currentResults: state.currentResults,
      currentListId: currentValues.currentListId,
      lastExecutedQuery: currentValues.lastExecutedQuery || queryToSave,
      ...(state.emailSearchCompleted !== undefined && { emailSearchCompleted: state.emailSearchCompleted }),
      ...(state.emailSearchTimestamp !== undefined && { emailSearchTimestamp: state.emailSearchTimestamp }),
      ...(state.navigationRefreshTimestamp !== undefined && { navigationRefreshTimestamp: state.navigationRefreshTimestamp })
    };
    
    const stateString = JSON.stringify(stateToSave);
    localStorage.setItem('searchState', stateString);
    sessionStorage.setItem('searchState', stateString);
    
    console.log('Persisted search state to storage:', {
      companyCount: state.currentResults.length,
      emailCount: state.currentResults.reduce((total, company) => 
        total + (company.contacts?.filter(c => c.email && c.email.length > 0).length || 0), 0
      ),
      hasListId: !!currentValues.currentListId
    });
  }, []);
  
  // Refresh contact data from database to ensure freshness
  const refreshContactDataFromDatabase = useCallback(async (
    companies: CompanyWithContacts[],
    options?: { forceFresh?: boolean }
  ): Promise<CompanyWithContacts[]> => {
    try {
      console.log('Refreshing contact data from database for navigation persistence...');
      
      // Fetch fresh contacts for each company in parallel
      const refreshedResults = await Promise.all(
        companies.map(async (company) => {
          try {
            const response = await apiRequest('GET', `/api/companies/${company.id}/contacts`);
            const freshContacts = await response.json();
            
            console.log(`Refreshed ${freshContacts.length} contacts for ${company.name}:`, 
              freshContacts.map(c => ({
                name: c.name,
                email: c.email,
                hasEmail: !!c.email
              }))
            );
            
            return {
              ...company,
              contacts: freshContacts
            };
          } catch (error) {
            console.error(`Failed to refresh contacts for company ${company.id}:`, error);
            return company;
          }
        })
      );
      
      console.log('Contact data refresh completed from database');
      return refreshedResults;
    } catch (error) {
      console.error('Database refresh failed:', error);
      return companies;
    }
  }, []);
  
  // Sort companies by contact count (helper for consistent ordering)
  const sortCompaniesByContactCount = (companies: CompanyWithContacts[]): CompanyWithContacts[] => {
    return [...companies].sort((a, b) => {
      const contactsA = a.contacts?.length || 0;
      const contactsB = b.contacts?.length || 0;
      return contactsB - contactsA; // Descending order (most contacts first)
    });
  };
  
  // Unified function to refresh and update results with sorting
  const refreshAndUpdateResults = useCallback(async (
    companies: CompanyWithContacts[],
    stateValues: {
      currentQuery: string;
      currentListId: number | null;
      lastExecutedQuery: string | null;
    },
    options: {
      forceUiReset?: boolean;
      clearEmailSearchTimestamp?: boolean;
      forceFresh?: boolean;
      additionalStateFields?: {
        emailSearchCompleted?: boolean;
        emailSearchTimestamp?: number | null;
        navigationRefreshTimestamp?: number;
      };
    } = {}
  ): Promise<CompanyWithContacts[]> => {
    try {
      // Increment version to track this refresh operation
      const thisVersion = ++refreshVersionRef.current;
      
      // Refresh contact data from database with optional cache-busting
      const refreshedResults = await refreshContactDataFromDatabase(
        companies,
        { forceFresh: options.forceFresh }
      );
      
      // Check if this is still the latest refresh request
      if (thisVersion !== refreshVersionRef.current) {
        console.log('Skipping stale refresh result from version', thisVersion);
        return companies; // Return original without updating
      }
      
      // Apply sorting to ensure companies with contacts appear first
      const sortedResults = sortCompaniesByContactCount(refreshedResults);
      
      // Update state (with optional UI reset for animation effects)
      if (options.forceUiReset) {
        // Force UI re-render for animations and state resets
        setCurrentResults([]);
        setTimeout(() => {
          // Double-check version is still current before updating
          if (thisVersion === refreshVersionRef.current) {
            setCurrentResults(sortedResults);
          }
        }, 100);
      } else {
        // Normal state update
        setCurrentResults(sortedResults);
      }
      
      // Persist to storage
      persistSearchState({
        currentResults: sortedResults,
        ...options.additionalStateFields
      }, stateValues);
      
      // Clear email search timestamp if requested
      if (options.clearEmailSearchTimestamp) {
        localStorage.removeItem('lastEmailSearchTimestamp');
        console.log('Cleared lastEmailSearchTimestamp');
      }
      
      console.log('Refreshed and updated results:', {
        companyCount: sortedResults.length,
        companiesWithContacts: sortedResults.filter(c => c.contacts && c.contacts.length > 0).length
      });
      
      return sortedResults;
    } catch (error) {
      console.error('Failed to refresh and update results:', error);
      // Return original companies if refresh fails
      return companies;
    }
  }, [refreshContactDataFromDatabase, persistSearchState, setCurrentResults]);
  
  return {
    loadSearchState,
    persistSearchState,
    refreshContactDataFromDatabase,
    refreshAndUpdateResults,
    isMountedRef,
    isInitializedRef,
    hasSessionRestoredDataRef,
    refreshVersionRef,
  };
}
