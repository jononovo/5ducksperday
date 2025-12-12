import { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { GuidanceContextValue } from "../types";
import { useGuidanceEngine } from "../hooks/useGuidanceEngine";
import {
  ElementHighlight,
  SpotlightOverlay,
  GuidanceTooltip,
  FluffyGuide,
  QuestProgressHeader,
  ChallengeComplete,
} from "../components";

const GuidanceContext = createContext<GuidanceContextValue | null>(null);

export function useGuidance() {
  const context = useContext(GuidanceContext);
  if (!context) {
    throw new Error("useGuidance must be used within a GuidanceProvider");
  }
  return context;
}

interface GuidanceProviderProps {
  children: React.ReactNode;
  autoStartForNewUsers?: boolean;
}

export function GuidanceProvider({ children, autoStartForNewUsers = true }: GuidanceProviderProps) {
  const engine = useGuidanceEngine();
  const [showChallengeComplete, setShowChallengeComplete] = useState(false);
  const [completedChallengeName, setCompletedChallengeName] = useState("");
  const [completedChallengeMessage, setCompletedChallengeMessage] = useState("");

  const { state, currentQuest, currentChallenge, currentStep, getChallengeProgress } = engine;

  useEffect(() => {
    if (autoStartForNewUsers) {
      const hasStarted = localStorage.getItem("fluffy-guidance-started");
      if (!hasStarted && !state.currentQuestId && state.completedQuests.length === 0) {
        const timer = setTimeout(() => {
          engine.startQuest("quest-1-finding-customers");
          localStorage.setItem("fluffy-guidance-started", "true");
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [autoStartForNewUsers, state.currentQuestId, state.completedQuests.length, engine]);

  useEffect(() => {
    if (!state.isActive || !currentStep) return;

    const handleElementClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const stepElement = document.querySelector(currentStep.selector);
      
      if (stepElement && (stepElement === target || stepElement.contains(target))) {
        if (currentStep.action === "click") {
          engine.advanceStep();
        }
      }
    };

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        engine.pauseGuidance();
      }
    };

    document.addEventListener("click", handleElementClick, true);
    document.addEventListener("keydown", handleKeyPress);

    return () => {
      document.removeEventListener("click", handleElementClick, true);
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, [state.isActive, currentStep, engine]);

  useEffect(() => {
    if (!state.isActive && currentChallenge && currentQuest) {
      const completedForQuest = state.completedChallenges[currentQuest.id] || [];
      const justCompleted = completedForQuest.includes(currentChallenge.id);
      
      if (justCompleted && !showChallengeComplete) {
        setCompletedChallengeName(currentChallenge.name);
        setCompletedChallengeMessage(currentChallenge.completionMessage || "Great job!");
        setShowChallengeComplete(true);
      }
    }
  }, [state.isActive, state.completedChallenges, currentChallenge, currentQuest, showChallengeComplete]);

  const handleChallengeCompleteClose = useCallback(() => {
    setShowChallengeComplete(false);
  }, []);

  const handleNextChallenge = useCallback(() => {
    setShowChallengeComplete(false);
    engine.startNextChallenge();
  }, [engine]);

  const handleFluffyClick = useCallback(() => {
    if (state.isActive) {
      engine.pauseGuidance();
    } else {
      engine.resumeGuidance();
    }
  }, [state.isActive, engine]);

  const challengeProgress = getChallengeProgress();

  return (
    <GuidanceContext.Provider value={engine}>
      {children}

      <FluffyGuide
        onClick={handleFluffyClick}
        isActive={state.isActive}
        hasNewChallenge={!state.isActive && currentQuest !== null}
      />

      <QuestProgressHeader
        questName={currentQuest?.name || "Quest"}
        challengesCompleted={challengeProgress.completed}
        totalChallenges={challengeProgress.total}
        currentChallengeName={currentChallenge?.name}
        isVisible={state.isHeaderVisible}
        onClose={engine.toggleHeader}
      />

      {state.isActive && currentStep && (
        <>
          <SpotlightOverlay
            targetSelector={currentStep.selector}
            isVisible={state.isActive}
          />
          <ElementHighlight
            targetSelector={currentStep.selector}
            isVisible={state.isActive}
          />
          <GuidanceTooltip
            targetSelector={currentStep.selector}
            instruction={currentStep.instruction}
            position={currentStep.tooltipPosition || "auto"}
            isVisible={state.isActive}
            onDismiss={() => engine.advanceStep()}
            stepNumber={state.currentStepIndex + 1}
            totalSteps={currentChallenge?.steps.length}
          />
        </>
      )}

      <ChallengeComplete
        isVisible={showChallengeComplete}
        challengeName={completedChallengeName}
        message={completedChallengeMessage}
        onContinue={handleNextChallenge}
        onDismiss={handleChallengeCompleteClose}
      />
    </GuidanceContext.Provider>
  );
}
