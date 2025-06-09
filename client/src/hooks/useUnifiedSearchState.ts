import { useState, useCallback } from 'react';

export interface SearchProgress {
  contactId: number;
  searchType: 'hunter' | 'apollo' | 'enrichment';
  isSearching: boolean;
  progress: number;
  error?: string;
  completed: boolean;
  emailFound?: boolean;
  confidence?: number;
}

export interface UnifiedSearchState {
  [contactId: number]: {
    [searchType: string]: SearchProgress;
  };
}

export const useUnifiedSearchState = () => {
  const [searchState, setSearchState] = useState<UnifiedSearchState>({});

  const startSearch = useCallback((contactId: number, searchType: 'hunter' | 'apollo' | 'enrichment') => {
    setSearchState(prev => ({
      ...prev,
      [contactId]: {
        ...prev[contactId],
        [searchType]: {
          contactId,
          searchType,
          isSearching: true,
          progress: 0,
          completed: false
        }
      }
    }));
  }, []);

  const updateSearchProgress = useCallback((contactId: number, searchType: string, progress: number) => {
    setSearchState(prev => ({
      ...prev,
      [contactId]: {
        ...prev[contactId],
        [searchType]: {
          ...prev[contactId]?.[searchType],
          progress,
          isSearching: true
        }
      }
    }));
  }, []);

  const completeSearch = useCallback((
    contactId: number, 
    searchType: string, 
    success: boolean, 
    emailFound?: boolean, 
    confidence?: number,
    error?: string
  ) => {
    setSearchState(prev => ({
      ...prev,
      [contactId]: {
        ...prev[contactId],
        [searchType]: {
          ...prev[contactId]?.[searchType],
          isSearching: false,
          progress: 100,
          completed: true,
          emailFound,
          confidence,
          error: success ? undefined : error
        }
      }
    }));
  }, []);

  const isSearching = useCallback((contactId: number, searchType: string) => {
    return searchState[contactId]?.[searchType]?.isSearching || false;
  }, [searchState]);

  const isCompleted = useCallback((contactId: number, searchType: string) => {
    return searchState[contactId]?.[searchType]?.completed || false;
  }, [searchState]);

  const getSearchProgress = useCallback((contactId: number, searchType: string) => {
    return searchState[contactId]?.[searchType];
  }, [searchState]);

  const hasEmailFound = useCallback((contactId: number, searchType: string) => {
    return searchState[contactId]?.[searchType]?.emailFound || false;
  }, [searchState]);

  return {
    searchState,
    startSearch,
    updateSearchProgress,
    completeSearch,
    isSearching,
    isCompleted,
    getSearchProgress,
    hasEmailFound
  };
};