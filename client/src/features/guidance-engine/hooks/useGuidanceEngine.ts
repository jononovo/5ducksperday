import { useState, useCallback, useMemo, useEffect } from "react";
import type { GuidanceState, GuidanceContextValue, Quest, Challenge, GuidanceStep } from "../types";
import { QUESTS, getQuestById, getFirstIncompleteQuest } from "../data/quests";

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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save guidance progress:", e);
  }
}

export function useGuidanceEngine(): GuidanceContextValue {
  const [state, setState] = useState<GuidanceState>(loadProgress);

  useEffect(() => {
    saveProgress(state);
  }, [state]);

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
      (c) => !completedChallengesForQuest.includes(c.id)
    );

    setState((prev) => ({
      ...prev,
      isActive: true,
      currentQuestId: questId,
      currentChallengeIndex: firstIncompleteIndex >= 0 ? firstIncompleteIndex : 0,
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

    const nextChallengeIndex = state.currentChallengeIndex + 1;
    
    if (nextChallengeIndex < currentQuest.challenges.length) {
      setState((prev) => ({
        ...prev,
        isActive: true,
        currentChallengeIndex: nextChallengeIndex,
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
  }, [currentQuest, state.currentChallengeIndex, state.completedQuests, startQuest]);

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
  }, []);

  const restartChallenge = useCallback((questId: string, challengeIndex: number) => {
    const quest = getQuestById(questId);
    if (!quest) return;
    
    const challenge = quest.challenges[challengeIndex];
    if (!challenge) return;

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
