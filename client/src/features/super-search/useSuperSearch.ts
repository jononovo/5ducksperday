import { useState, useCallback, useRef } from 'react';
import type { SearchPlan, SuperSearchResult, SuperSearchState, StreamEvent } from './types';

const initialState: SuperSearchState = {
  isSearching: false,
  plan: null,
  progress: '',
  results: [],
  error: null,
  isComplete: false,
};

export function useSuperSearch() {
  const [state, setState] = useState<SuperSearchState>(initialState);
  const abortControllerRef = useRef<AbortController | null>(null);

  const startSearch = useCallback(async (query: string, listId?: number) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    
    setState({
      isSearching: true,
      plan: null,
      progress: 'Initializing AI search...',
      results: [],
      error: null,
      isComplete: false,
    });

    try {
      const response = await fetch('/api/super-search/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, listId }),
        signal: abortControllerRef.current.signal,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Search failed');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response stream available');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event: StreamEvent = JSON.parse(line.slice(6));
              
              switch (event.type) {
                case 'plan':
                  setState(prev => ({
                    ...prev,
                    plan: event.data as SearchPlan,
                    progress: `Strategy: ${(event.data as SearchPlan).searchStrategy}`,
                  }));
                  break;
                  
                case 'progress':
                  setState(prev => ({
                    ...prev,
                    progress: event.data as string,
                  }));
                  break;
                  
                case 'result':
                  setState(prev => ({
                    ...prev,
                    results: [...prev.results, event.data as SuperSearchResult],
                    progress: `Found ${prev.results.length + 1} results...`,
                  }));
                  break;
                  
                case 'complete':
                  setState(prev => ({
                    ...prev,
                    isSearching: false,
                    isComplete: true,
                    progress: `Search complete! Found ${prev.results.length} results.`,
                  }));
                  break;
                  
                case 'error':
                  setState(prev => ({
                    ...prev,
                    isSearching: false,
                    error: event.data as string,
                  }));
                  break;
              }
            } catch (e) {
              console.warn('Failed to parse SSE event:', line);
            }
          }
        }
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        setState(prev => ({
          ...prev,
          isSearching: false,
          progress: 'Search cancelled',
        }));
        return;
      }
      
      setState(prev => ({
        ...prev,
        isSearching: false,
        error: (error as Error).message || 'An unexpected error occurred',
      }));
    }
  }, []);

  const cancelSearch = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    cancelSearch();
    setState(initialState);
  }, [cancelSearch]);

  return {
    ...state,
    startSearch,
    cancelSearch,
    reset,
  };
}
