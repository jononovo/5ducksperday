import { useState, useCallback, useRef } from 'react';
import type { SearchPlan, TableRow, SuperSearchState, StreamEvent } from './types';

const initialState: SuperSearchState = {
  isSearching: false,
  plan: null,
  status: '',
  rows: [],
  error: null,
  isComplete: false,
};

export function useSuperSearch() {
  const [state, setState] = useState<SuperSearchState>(initialState);
  const abortControllerRef = useRef<AbortController | null>(null);

  const startSearch = useCallback(async (query: string, variant: string = 'v1') => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    
    setState({
      isSearching: true,
      plan: null,
      status: 'Initializing AI search...',
      rows: [],
      error: null,
      isComplete: false,
    });

    try {
      const response = await fetch('/api/super-search/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, variant }),
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
            const payload = line.slice(6);
            
            if (payload === '[DONE]') {
              setState(prev => {
                if (!prev.isComplete) {
                  return {
                    ...prev,
                    isSearching: false,
                    isComplete: true,
                    status: `Search complete! Found ${prev.rows.length} results.`,
                  };
                }
                return prev;
              });
              continue;
            }
            
            try {
              const event: StreamEvent = JSON.parse(payload);
              
              switch (event.type) {
                case 'plan':
                  setState(prev => ({
                    ...prev,
                    plan: event.data as SearchPlan,
                    status: `Strategy: ${(event.data as SearchPlan).searchStrategy}`,
                  }));
                  break;
                  
                case 'status':
                  setState(prev => ({
                    ...prev,
                    status: event.data as string,
                  }));
                  break;
                  
                case 'row':
                  setState(prev => ({
                    ...prev,
                    rows: [...prev.rows, event.data as TableRow],
                    status: `Found ${prev.rows.length + 1} results...`,
                  }));
                  break;
                  
                case 'complete':
                  setState(prev => ({
                    ...prev,
                    isSearching: false,
                    isComplete: true,
                    status: `Search complete! Found ${prev.rows.length} results.`,
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
          status: 'Search cancelled',
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
