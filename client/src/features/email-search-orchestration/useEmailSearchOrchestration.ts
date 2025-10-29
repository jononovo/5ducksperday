import { useState, useRef, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { SearchSessionManager } from "@/lib/search-session-manager";
import type { CompanyWithContacts } from "@/features/search-state";
import type {
  SearchProgress,
  ProgressPhase,
  ProgressState,
  EmailSearchMetadata,
  EmailSearchJobResult,
  EmailSearchOrchestrationHook
} from "./types";

interface UseEmailSearchOrchestrationProps {
  currentResults: CompanyWithContacts[] | null;
  currentQuery: string;
  currentListId: number | null;
  lastExecutedQuery: string | null;
  currentSessionId: string | null;
  setCurrentResults: React.Dispatch<React.SetStateAction<CompanyWithContacts[] | null>>;
  refreshContactDataIfNeeded: (results: CompanyWithContacts[]) => Promise<CompanyWithContacts[]>;
  refreshAndUpdateResults: (
    companies: CompanyWithContacts[],
    stateValues: { currentQuery: string; currentListId: number | null; lastExecutedQuery: string | null },
    options?: any
  ) => Promise<CompanyWithContacts[]>;
  updateListMutation: any;
  isAutomatedSearchRef: React.MutableRefObject<boolean>;
}

export function useEmailSearchOrchestration({
  currentResults,
  currentQuery,
  currentListId,
  lastExecutedQuery,
  currentSessionId,
  setCurrentResults,
  refreshContactDataIfNeeded,
  refreshAndUpdateResults,
  updateListMutation,
  isAutomatedSearchRef
}: UseEmailSearchOrchestrationProps): EmailSearchOrchestrationHook {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State management
  const [isSearching, setIsSearching] = useState(false);
  const [searchProgress, setSearchProgress] = useState<SearchProgress>({
    phase: "",
    completed: 0,
    total: 0
  });
  const [summaryVisible, setSummaryVisible] = useState(false);
  const [lastEmailSearchCount, setLastEmailSearchCount] = useState(0);
  const [lastSourceBreakdown, setLastSourceBreakdown] = useState<any>(undefined);

  // Progress configuration
  const progressQueue: ProgressPhase[] = [
    { name: "Starting Key Emails Search", duration: 1000 },
    { name: "Processing Companies", duration: 2000 },
    { name: "Searching for Emails", duration: 3000 },
    { name: "Finalizing Results", duration: 1500 }
  ];

  const [progressState, setProgressState] = useState<ProgressState>({
    currentPhase: 0,
    startTime: 0,
    backendCompleted: false
  });

  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Progress timer management
  const startProgressTimer = useCallback(() => {
    if (progressTimerRef.current) {
      clearTimeout(progressTimerRef.current);
    }

    let currentPhase = 0;

    const updateProgress = () => {
      if (currentPhase < progressQueue.length) {
        const currentPhaseData = progressQueue[currentPhase];

        setSearchProgress({
          phase: currentPhaseData.name,
          completed: currentPhase + 1,
          total: progressQueue.length
        });

        if (currentPhase < progressQueue.length - 1) {
          progressTimerRef.current = setTimeout(() => {
            currentPhase++;
            updateProgress();
          }, currentPhaseData.duration);
        } else {
          const finalPhaseTimeout = setTimeout(() => {
            if (!progressState.backendCompleted) {
              setProgressState(prev => ({ ...prev, backendCompleted: true }));
            }
          }, currentPhaseData.duration);

          const checkBackendCompletion = () => {
            if (progressState.backendCompleted) {
              clearTimeout(finalPhaseTimeout);
            } else {
              setTimeout(checkBackendCompletion, 200);
            }
          };
          checkBackendCompletion();
        }
      }
    };

    updateProgress();
  }, [progressQueue, progressState.backendCompleted]);

  // Helper functions
  const getTopContacts = useCallback((company: any, count: number) => {
    if (!company.contacts || company.contacts.length === 0) return [];

    const sorted = [...company.contacts].sort((a, b) => {
      return (b.probability || 0) - (a.probability || 0);
    });

    return sorted.slice(0, count);
  }, []);

  const getCurrentCompaniesWithoutEmails = useCallback(() => {
    return currentResults?.filter(company =>
      !getTopContacts(company, 3).some(contact => contact.email && contact.email.length > 5)
    ) || [];
  }, [currentResults, getTopContacts]);

  // Main email search orchestration
  const runEmailSearch = useCallback(async () => {
    if (!currentResults || currentResults.length === 0) return;

    setIsSearching(true);
    isAutomatedSearchRef.current = true;
    setSummaryVisible(false);

    // Initialize progress
    setProgressState({
      currentPhase: 0,
      startTime: Date.now(),
      backendCompleted: false
    });

    setSearchProgress({
      phase: progressQueue[0].name,
      completed: 1,
      total: progressQueue.length
    });

    startProgressTimer();

    try {
      // Refresh contact data from recent searches
      const updatedResults = await refreshContactDataIfNeeded(currentResults);

      // Get companies needing emails
      const companiesNeedingEmails = updatedResults.filter(company =>
        !getTopContacts(company, 3).some(contact => contact.email && contact.email.length > 5)
      );

      if (companiesNeedingEmails.length === 0) {
        console.log('No companies need email searches - all companies have sufficient emails');
        setIsSearching(false);
        setSummaryVisible(true);
        return;
      }

      const companyIds = companiesNeedingEmails.map(company => company.id);
      console.log(`Starting backend email orchestration for ${companyIds.length} companies`);

      // Mark email search as started
      if (currentSessionId) {
        SearchSessionManager.markEmailSearchStarted(currentSessionId);
      }

      // Create search job
      const response = await apiRequest("POST", "/api/search-jobs", {
        query: `email-search-bulk`,
        searchType: 'emails',
        metadata: {
          companyIds,
          sessionId: currentSessionId,
          isBulkEmailSearch: true
        },
        priority: 0
      });

      if (!response.ok) {
        throw new Error(`Job creation failed: ${response.status}`);
      }

      const { jobId } = await response.json();

      // Poll job status
      let jobCompleted = false;
      let pollAttempts = 0;
      const maxPollAttempts = 60;
      let data: EmailSearchJobResult = {
        summary: { emailsFound: 0, contactsProcessed: 0, companiesProcessed: companyIds.length }
      };

      while (!jobCompleted && pollAttempts < maxPollAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000));

        const statusResponse = await apiRequest("GET", `/api/search-jobs/${jobId}`);
        const jobData = await statusResponse.json();

        if (jobData.status === 'completed') {
          jobCompleted = true;
          data = jobData.results || data;
          console.log(`Backend orchestration completed:`, data);
        } else if (jobData.status === 'failed') {
          throw new Error(`Email search job failed: ${jobData.error}`);
        }

        pollAttempts++;
      }

      if (!jobCompleted) {
        throw new Error('Email search job timed out');
      }

      const emailData: EmailSearchMetadata = data.metadata || data.summary || {
        emailsFound: 0,
        contactsEnriched: 0,
        companiesSearched: 0
      };

      console.log(`Backend orchestration completed with metadata:`, emailData);

      // Mark email search as completed
      if (currentSessionId) {
        SearchSessionManager.markEmailSearchCompleted(currentSessionId);
      }

      setProgressState(prev => ({ ...prev, backendCompleted: true }));
      setLastEmailSearchCount(emailData.emailsFound || 0);
      setLastSourceBreakdown(emailData.sourceBreakdown || {});

      const contactCount = emailData.contactsEnriched || emailData.contactsProcessed || 0;
      const companyCount = emailData.companiesSearched || emailData.companiesProcessed || 0;

      toast({
        title: "Email Search Complete",
        description: `Found ${emailData.emailsFound || 0} emails for ${contactCount} contacts across ${companyCount} companies`,
      });

      // Refresh credits
      await queryClient.invalidateQueries({ queryKey: ['/api/credits'] });

      // Merge email data into results
      console.log('EMAIL SEARCH COMPLETE: Updating results with email data');

      if (data.companies && Array.isArray(data.companies)) {
        console.log(`Merging emails from ${data.companies.length} companies into current results`);

        const companyContactMap = new Map<number, any[]>();
        data.companies.forEach((company: any) => {
          if (company.contacts && Array.isArray(company.contacts)) {
            companyContactMap.set(company.id, company.contacts);
          }
        });

        const mergedResults = currentResults.map(company => {
          const updatedContacts = companyContactMap.get(company.id);
          if (updatedContacts) {
            const mergedContacts = company.contacts?.map(contact => {
              const updatedContact = updatedContacts.find(c => c.id === contact.id);
              return updatedContact ? { ...contact, ...updatedContact } : contact;
            }) || updatedContacts;

            return { ...company, contacts: mergedContacts };
          }
          return company;
        });

        setCurrentResults(mergedResults);

        // Save to localStorage with full search state structure
        const searchState = {
          query: currentQuery,
          resultsCount: mergedResults.length,
          listId: currentListId,
          currentQuery: currentQuery,
          currentResults: mergedResults,
          currentListId: currentListId,
          lastExecutedQuery: lastExecutedQuery,
          companies: mergedResults.map(c => ({ id: c.id, name: c.name })),
          timestamp: Date.now(),
          emailSearchCompleted: true
        };
        localStorage.setItem('searchState', JSON.stringify(searchState));

        const emailCount = mergedResults.reduce((total, company) =>
          total + (company.contacts?.filter(c => c.email && c.email.length > 0).length || 0), 0
        );

        console.log(`Email merge completed with ${emailCount} emails found`);
      } else {
        // Fallback to database refresh
        console.log('EMAIL SEARCH COMPLETE: Falling back to database reload');
        await new Promise(resolve => setTimeout(resolve, 1000));

        const freshResults = await refreshAndUpdateResults(
          currentResults,
          {
            currentQuery: currentQuery,
            currentListId: currentListId,
            lastExecutedQuery: lastExecutedQuery
          },
          {
            forceFresh: true,
            additionalStateFields: {
              emailSearchCompleted: true,
              emailSearchTimestamp: Date.now()
            }
          }
        );

        const emailCount = freshResults.reduce((total, company) =>
          total + (company.contacts?.filter(c => c.email && c.email.length > 0).length || 0), 0
        );

        console.log(`Database reload completed with ${emailCount} emails found`);
      }

      // Update existing list
      if (currentListId && currentQuery && currentResults) {
        console.log('Updating existing list after email search completion:', currentListId);
        updateListMutation.mutate({
          query: currentQuery,
          companies: currentResults,
          listId: currentListId
        });
      }

      setIsSearching(false);
      isAutomatedSearchRef.current = false;
      setSummaryVisible(true);

      if (progressTimerRef.current) {
        clearTimeout(progressTimerRef.current);
        progressTimerRef.current = null;
      }

    } catch (error) {
      console.error("Backend email orchestration error:", error);
      toast({
        title: "Search Failed",
        description: error instanceof Error ? error.message : "Failed to complete email search",
        variant: "destructive"
      });
      setIsSearching(false);
      isAutomatedSearchRef.current = false;

      if (progressTimerRef.current) {
        clearTimeout(progressTimerRef.current);
      }
    }
  }, [
    currentResults,
    currentQuery,
    currentListId,
    lastExecutedQuery,
    currentSessionId,
    setCurrentResults,
    refreshContactDataIfNeeded,
    refreshAndUpdateResults,
    updateListMutation,
    isAutomatedSearchRef,
    toast,
    queryClient,
    progressQueue,
    getTopContacts,
    startProgressTimer
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (progressTimerRef.current) {
        clearTimeout(progressTimerRef.current);
      }
    };
  }, []);

  return {
    isSearching,
    searchProgress,
    summaryVisible,
    lastEmailSearchCount,
    lastSourceBreakdown,
    runEmailSearch,
    startProgressTimer,
    getCurrentCompaniesWithoutEmails,
    getTopContacts
  };
}
