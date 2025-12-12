import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { useLocation } from "wouter";
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

const GUIDANCE_ENABLED_ROUTES = ["/app", "/quests", "/contacts", "/campaigns", "/outreach", "/replies", "/account", "/strategy"];

function isGuidanceEnabledRoute(location: string): boolean {
  return GUIDANCE_ENABLED_ROUTES.some(route => location === route || location.startsWith(route + "/"));
}

export function GuidanceProvider({ children, autoStartForNewUsers = true }: GuidanceProviderProps) {
  const [location, navigate] = useLocation();
  const engine = useGuidanceEngine();
  const [showChallengeComplete, setShowChallengeComplete] = useState(false);
  const [completedChallengeName, setCompletedChallengeName] = useState("");
  const [completedChallengeMessage, setCompletedChallengeMessage] = useState("");
  const previousLocation = useRef<string | null>(null);
  const previousStepKey = useRef<string | null>(null);

  const { state, currentQuest, currentChallenge, currentStep, getChallengeProgress } = engine;

  const isOnEnabledRoute = isGuidanceEnabledRoute(location);
  const isOnAppRoute = location === "/app" || location.startsWith("/app/");

  // Handle route-based navigation for steps that require a specific page
  // Only auto-navigate when STEP changes (advancing through quest), not when user manually navigates
  useEffect(() => {
    if (!state.isActive || !currentStep?.route) {
      // Reset ref when guidance becomes inactive so next activation will check route
      if (!state.isActive) previousStepKey.current = null;
      return;
    }
    
    const stepKey = `${state.currentQuestId}-${state.currentChallengeIndex}-${state.currentStepIndex}`;
    
    // Only auto-navigate when step changes, not on every location change
    if (previousStepKey.current !== stepKey) {
      previousStepKey.current = stepKey;
      
      const expectedRoute = currentStep.route;
      const isOnCorrectRoute = location === expectedRoute || location.startsWith(expectedRoute + "/");
      
      if (!isOnCorrectRoute) {
        navigate(expectedRoute);
      }
    }
  }, [state.isActive, currentStep, state.currentQuestId, state.currentChallengeIndex, state.currentStepIndex, location, navigate]);

  // Track route changes and auto-resume guidance when navigating between enabled routes
  useEffect(() => {
    const prevLoc = previousLocation.current;
    previousLocation.current = location;

    if (!prevLoc) return;

    const isNowOnEnabled = isOnEnabledRoute;

    // Only auto-resume when user actually NAVIGATES to an enabled route, not when closing guidance
    // Don't auto-resume when visiting /quests - that's for viewing quests, not doing them
    if (prevLoc !== location && isNowOnEnabled && state.currentQuestId && !state.isActive) {
      if (location === "/quests" || location.startsWith("/quests/")) {
        return;
      }
      const timer = setTimeout(() => {
        engine.resumeGuidance();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [location, isOnEnabledRoute, state.currentQuestId, state.isActive, engine]);

  useEffect(() => {
    // Auto-start guidance for new users when they reach /app
    if (autoStartForNewUsers && isOnAppRoute) {
      const hasStarted = localStorage.getItem("fluffy-guidance-started");
      if (!hasStarted && !state.currentQuestId && state.completedQuests.length === 0) {
        const timer = setTimeout(() => {
          engine.startQuest("quest-1-finding-customers");
          localStorage.setItem("fluffy-guidance-started", "true");
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [autoStartForNewUsers, isOnAppRoute, state.currentQuestId, state.completedQuests.length, engine]);

  useEffect(() => {
    if (isOnEnabledRoute && state.isActive && !state.isHeaderVisible) {
      engine.pauseGuidance();
    }
  }, [isOnEnabledRoute, state.isActive, state.isHeaderVisible, engine]);

  useEffect(() => {
    if (!isOnEnabledRoute || !state.isActive || !currentStep) return;

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
  }, [isOnEnabledRoute, state.isActive, currentStep, engine]);

  const prevCompletedChallengesRef = useRef<Record<string, string[]>>(
    JSON.parse(JSON.stringify(state.completedChallenges))
  );

  useEffect(() => {
    if (!state.isActive && currentChallenge && currentQuest) {
      const completedForQuest = state.completedChallenges[currentQuest.id] || [];
      const prevCompletedForQuest = prevCompletedChallengesRef.current[currentQuest.id] || [];
      
      const isNewCompletion = completedForQuest.includes(currentChallenge.id) && 
                             !prevCompletedForQuest.includes(currentChallenge.id);
      
      if (isNewCompletion && !showChallengeComplete) {
        setCompletedChallengeName(currentChallenge.name);
        setCompletedChallengeMessage(currentChallenge.completionMessage || "Great job!");
        setShowChallengeComplete(true);
      }
    }
    
    prevCompletedChallengesRef.current = JSON.parse(JSON.stringify(state.completedChallenges));
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

  const handleHeaderClose = useCallback(() => {
    engine.pauseGuidance();
    engine.toggleHeader();
  }, [engine]);

  const challengeProgress = getChallengeProgress();

  return (
    <GuidanceContext.Provider value={engine}>
      {/* Quest progress header renders before children to push content down */}
      {isOnEnabledRoute && (
        <QuestProgressHeader
          questName={currentQuest?.name || "Quest"}
          challengesCompleted={challengeProgress.completed}
          totalChallenges={challengeProgress.total}
          currentChallengeName={currentChallenge?.name}
          isVisible={state.isHeaderVisible}
          onClose={handleHeaderClose}
        />
      )}

      {children}

      {/* Other guidance UI elements render after children (overlays) */}
      {isOnEnabledRoute && (
        <>
          <FluffyGuide
            onClick={handleFluffyClick}
            isActive={state.isActive}
            onCloseGuide={engine.pauseGuidance}
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
        </>
      )}
    </GuidanceContext.Provider>
  );
}
