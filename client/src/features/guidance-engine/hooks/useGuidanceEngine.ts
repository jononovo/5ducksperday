import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import type { GuidanceState, GuidanceContextValue, Quest, Challenge, GuidanceStep } from "../types";
import { QUESTS, getQuestById, getFirstIncompleteQuest } from "../quests";

const STORAGE_KEY = "fluffy-guidance-progress";

const defaultState: GuidanceState = {
  isActive: false,
  currentQuestId: null,
  currentChallengeIndex: 0,
  currentStepIndex: 0,
  completedQuests: [],
  completedChallenges: {},
  isHeaderVisible: false,
};

function loadProgress(): GuidanceState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...defaultState, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error("Failed to load guidance progress:", e);
  }
  return defaultState;
}

function saveProgress(state: GuidanceState) {
  try {
    const persistedState = {
      completedQuests: state.completedQuests,
      completedChallenges: state.completedChallenges,
      currentQuestId: state.currentQuestId,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedState));
  } catch (e) {
    console.error("Failed to save guidance progress:", e);
  }
}

function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  const authToken = localStorage.getItem('authToken');
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  return headers;
}

async function fetchServerProgress(): Promise<Partial<GuidanceState> | null> {
  try {
    const authToken = localStorage.getItem('authToken');
    console.log("[GuidanceEngine] Fetching server progress...", { hasAuthToken: !!authToken });
    
    const headers: HeadersInit = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const res = await fetch("/api/guidance/progress", { 
      credentials: "include",
      headers 
    });
    console.log("[GuidanceEngine] Fetch response status:", res.status);
    if (!res.ok) {
      console.warn("[GuidanceEngine] Fetch failed with status:", res.status);
      return null;
    }
    const data = await res.json();
    console.log("[GuidanceEngine] Server progress received:", data);
    return data;
  } catch (e) {
    console.error("[GuidanceEngine] Failed to fetch server guidance progress:", e);
    return null;
  }
}

async function syncToServer(state: GuidanceState): Promise<void> {
  const authToken = localStorage.getItem('authToken');
  const payload = {
    completedQuests: state.completedQuests,
    completedChallenges: state.completedChallenges,
    currentQuestId: state.currentQuestId,
  };
  console.log("[GuidanceEngine] Syncing to server:", { ...payload, hasAuthToken: !!authToken });
  
  try {
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const res = await fetch("/api/guidance/progress", {
      method: "PATCH",
      headers,
      credentials: "include",
      body: JSON.stringify(payload),
    });
    console.log("[GuidanceEngine] Sync response status:", res.status);
    if (!res.ok) {
      const errorText = await res.text();
      console.error("[GuidanceEngine] Sync failed:", res.status, errorText);
    } else {
      const responseData = await res.json();
      console.log("[GuidanceEngine] Sync successful, server response:", responseData);
    }
  } catch (e) {
    console.error("[GuidanceEngine] Failed to sync guidance progress to server:", e);
  }
}

interface UseGuidanceEngineOptions {
  authReady: boolean;
  userId: number | null;
}

export function useGuidanceEngine(options: UseGuidanceEngineOptions): GuidanceContextValue {
  const { authReady, userId } = options;
  const [state, setState] = useState<GuidanceState>(loadProgress);
  const [isInitialized, setIsInitialized] = useState(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUserIdRef = useRef<number | null>(null);

  // Initialize from server once auth is ready
  useEffect(() => {
    if (!authReady) {
      console.log("[GuidanceEngine] Waiting for auth to be ready before initializing...");
      return;
    }

    async function initFromServer() {
      console.log("[GuidanceEngine] Initializing from server...", { userId, authReady });
      const serverProgress = await fetchServerProgress();
      if (serverProgress) {
        console.log("[GuidanceEngine] Applying server progress to state (completions only)");
        setState((prev) => ({
          ...prev,
          completedQuests: serverProgress.completedQuests || prev.completedQuests,
          completedChallenges: serverProgress.completedChallenges || prev.completedChallenges,
          currentQuestId: serverProgress.currentQuestId ?? prev.currentQuestId,
        }));
      }
      setIsInitialized(true);
      lastUserIdRef.current = userId;
      console.log("[GuidanceEngine] Initialization complete, isInitialized=true, userId=", userId);
    }
    initFromServer();
  }, [authReady, userId]);

  // Re-fetch progress when user changes (login/logout transition)
  useEffect(() => {
    if (!authReady || !isInitialized) return;
    if (lastUserIdRef.current === userId) return;
    
    console.log("[GuidanceEngine] User changed from", lastUserIdRef.current, "to", userId, "- re-fetching progress");
    lastUserIdRef.current = userId;
    
    async function refetchProgress() {
      const serverProgress = await fetchServerProgress();
      if (serverProgress) {
        setState((prev) => ({
          ...prev,
          completedQuests: serverProgress.completedQuests || prev.completedQuests,
          completedChallenges: serverProgress.completedChallenges || prev.completedChallenges,
          currentQuestId: serverProgress.currentQuestId ?? prev.currentQuestId,
        }));
      }
    }
    refetchProgress();
  }, [authReady, isInitialized, userId]);

  // Sync to server when state changes (with debounce)
  useEffect(() => {
    saveProgress(state);
    
    if (!isInitialized) {
      console.log("[GuidanceEngine] Skipping server sync - not yet initialized");
      return;
    }
    
    if (!authReady) {
      console.log("[GuidanceEngine] Skipping server sync - auth not ready");
      return;
    }
    
    console.log("[GuidanceEngine] State changed, scheduling sync in 1s:", {
      completedChallenges: state.completedChallenges,
      completedQuests: state.completedQuests,
      userId,
    });
    
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    syncTimeoutRef.current = setTimeout(() => {
      console.log("[GuidanceEngine] Debounce complete, triggering sync now");
      syncToServer(state);
    }, 1000);

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [state, isInitialized, authReady, userId]);

  const currentQuest: Quest | null = useMemo(() => {
    if (!state.currentQuestId) return null;
    return getQuestById(state.currentQuestId) || null;
  }, [state.currentQuestId]);

  const currentChallenge: Challenge | null = useMemo(() => {
    if (!currentQuest) return null;
    return currentQuest.challenges[state.currentChallengeIndex] || null;
  }, [currentQuest, state.currentChallengeIndex]);

  const currentStep: GuidanceStep | null = useMemo(() => {
    if (!currentChallenge) return null;
    return currentChallenge.steps[state.currentStepIndex] || null;
  }, [currentChallenge, state.currentStepIndex]);

  const startQuest = useCallback((questId: string) => {
    const quest = getQuestById(questId);
    if (!quest) return;

    const completedChallengesForQuest = state.completedChallenges[questId] || [];
    const firstIncompleteIndex = quest.challenges.findIndex(
      (c) => !completedChallengesForQuest.includes(c.id) && c.steps.length > 0
    );

    if (firstIncompleteIndex < 0) return;

    setState((prev) => ({
      ...prev,
      isActive: true,
      currentQuestId: questId,
      currentChallengeIndex: firstIncompleteIndex,
      currentStepIndex: 0,
      isHeaderVisible: true,
    }));
  }, [state.completedChallenges]);

  const startNextChallenge = useCallback(() => {
    if (!currentQuest) {
      const firstQuest = getFirstIncompleteQuest(state.completedQuests);
      if (firstQuest) {
        startQuest(firstQuest.id);
      }
      return;
    }

    const completedChallengesForQuest = state.completedChallenges[currentQuest.id] || [];
    const nextValidIndex = currentQuest.challenges.findIndex(
      (c, idx) => idx > state.currentChallengeIndex && 
                  c.steps.length > 0 && 
                  !completedChallengesForQuest.includes(c.id)
    );
    
    if (nextValidIndex >= 0) {
      setState((prev) => ({
        ...prev,
        isActive: true,
        currentChallengeIndex: nextValidIndex,
        currentStepIndex: 0,
        isHeaderVisible: true,
      }));
    } else {
      setState((prev) => ({
        ...prev,
        completedQuests: [...prev.completedQuests, currentQuest.id],
        currentQuestId: null,
        currentChallengeIndex: 0,
        currentStepIndex: 0,
        isActive: false,
      }));
    }
  }, [currentQuest, state.currentChallengeIndex, state.completedQuests, state.completedChallenges, startQuest]);

  const advanceStep = useCallback(() => {
    if (!currentChallenge) return;

    const nextStepIndex = state.currentStepIndex + 1;
    
    if (nextStepIndex < currentChallenge.steps.length) {
      setState((prev) => ({
        ...prev,
        currentStepIndex: nextStepIndex,
      }));
    } else {
      const questId = state.currentQuestId;
      if (questId) {
        const completedForQuest = state.completedChallenges[questId] || [];
        setState((prev) => ({
          ...prev,
          completedChallenges: {
            ...prev.completedChallenges,
            [questId]: [...completedForQuest, currentChallenge.id],
          },
          isActive: false,
        }));
      }
    }
  }, [currentChallenge, state.currentStepIndex, state.currentQuestId, state.completedChallenges]);

  const previousStep = useCallback(() => {
    if (state.currentStepIndex > 0) {
      setState((prev) => ({
        ...prev,
        currentStepIndex: prev.currentStepIndex - 1,
      }));
    }
  }, [state.currentStepIndex]);

  const completeChallenge = useCallback(() => {
    if (!currentChallenge || !state.currentQuestId) return;

    const completedForQuest = state.completedChallenges[state.currentQuestId] || [];
    
    setState((prev) => ({
      ...prev,
      completedChallenges: {
        ...prev.completedChallenges,
        [state.currentQuestId!]: [...completedForQuest, currentChallenge.id],
      },
      isActive: false,
      currentStepIndex: 0,
    }));
  }, [currentChallenge, state.currentQuestId, state.completedChallenges]);

  const pauseGuidance = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isActive: false,
    }));
  }, []);

  const resumeGuidance = useCallback(() => {
    if (state.currentQuestId) {
      setState((prev) => ({
        ...prev,
        isActive: true,
        isHeaderVisible: true,
      }));
    } else {
      const firstQuest = getFirstIncompleteQuest(state.completedQuests);
      if (firstQuest) {
        startQuest(firstQuest.id);
      }
    }
  }, [state.currentQuestId, state.completedQuests, startQuest]);

  const toggleHeader = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isHeaderVisible: !prev.isHeaderVisible,
    }));
  }, []);

  const resetProgress = useCallback(() => {
    setState(defaultState);
    localStorage.removeItem(STORAGE_KEY);
    syncToServer(defaultState);
  }, []);

  const restartChallenge = useCallback((questId: string, challengeIndex: number) => {
    const quest = getQuestById(questId);
    if (!quest) return;
    
    const challenge = quest.challenges[challengeIndex];
    if (!challenge || challenge.steps.length === 0) return;

    const completedForQuest = state.completedChallenges[questId] || [];
    const updatedCompleted = completedForQuest.filter(id => id !== challenge.id);

    setState((prev) => ({
      ...prev,
      isActive: true,
      currentQuestId: questId,
      currentChallengeIndex: challengeIndex,
      currentStepIndex: 0,
      isHeaderVisible: true,
      completedChallenges: {
        ...prev.completedChallenges,
        [questId]: updatedCompleted,
      },
    }));
  }, [state.completedChallenges]);

  const getChallengeProgress = useCallback((): { completed: number; total: number } => {
    if (!currentQuest) return { completed: 0, total: 0 };
    const completedForQuest = state.completedChallenges[currentQuest.id] || [];
    return {
      completed: completedForQuest.length,
      total: currentQuest.challenges.length,
    };
  }, [currentQuest, state.completedChallenges]);

  const getQuestProgress = useCallback((): { completed: number; total: number } => {
    return {
      completed: state.completedQuests.length,
      total: QUESTS.length,
    };
  }, [state.completedQuests]);

  return {
    state,
    currentQuest,
    currentChallenge,
    currentStep,
    startQuest,
    startNextChallenge,
    advanceStep,
    previousStep,
    completeChallenge,
    pauseGuidance,
    resumeGuidance,
    toggleHeader,
    resetProgress,
    restartChallenge,
    getChallengeProgress,
    getQuestProgress,
  };
}
