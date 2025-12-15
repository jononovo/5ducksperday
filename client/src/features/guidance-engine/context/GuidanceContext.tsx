import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import type { GuidanceContextValue, QuestTrigger } from "../types";
import { useGuidanceEngine } from "../hooks/useGuidanceEngine";
import { QUESTS } from "../data/quests";
import { useAuth } from "@/hooks/use-auth";
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

function getTriggerStorageKey(questId: string): string {
  return `fluffy-quest-triggered-${questId}`;
}

function hasQuestBeenTriggered(questId: string): boolean {
  return localStorage.getItem(getTriggerStorageKey(questId)) === "true";
}

function markQuestAsTriggered(questId: string): void {
  localStorage.setItem(getTriggerStorageKey(questId), "true");
}

function isRouteMatch(currentLocation: string, triggerRoute: string): boolean {
  return currentLocation === triggerRoute || currentLocation.startsWith(triggerRoute + "/");
}

export function GuidanceProvider({ children, autoStartForNewUsers = true }: GuidanceProviderProps) {
  const [location, navigate] = useLocation();
  const engine = useGuidanceEngine();
  const { user, isLoading: authLoading } = useAuth();
  const [showChallengeComplete, setShowChallengeComplete] = useState(false);
  const [completedChallengeName, setCompletedChallengeName] = useState("");
  const [completedChallengeMessage, setCompletedChallengeMessage] = useState("");
  const previousLocation = useRef<string | null>(null);
  const previousStepKey = useRef<string | null>(null);
  const shownChallengeCompletionRef = useRef<string | null>(null);
  const advanceDelayTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Stable ref for startQuest to avoid effect re-runs when engine object changes
  const startQuestRef = useRef(engine.startQuest);
  startQuestRef.current = engine.startQuest;

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
    console.log('[Guidance Debug] Trigger effect entered:', {
      autoStartForNewUsers,
      authLoading,
      isActive: state.isActive,
      currentQuestId: state.currentQuestId,
      completedQuests: state.completedQuests,
      user: user ? user.email : null,
      location,
    });

    if (!autoStartForNewUsers) {
      console.log('[Guidance Debug] Early exit: autoStartForNewUsers is false');
      return;
    }
    if (authLoading) {
      console.log('[Guidance Debug] Early exit: authLoading is true');
      return;
    }
    if (state.isActive) {
      console.log('[Guidance Debug] Early exit: state.isActive is true');
      return;
    }
    if (state.currentQuestId) {
      console.log('[Guidance Debug] Early exit: state.currentQuestId is set:', state.currentQuestId);
      return;
    }

    console.log('[Guidance Debug] Passed all early exits, evaluating quests...');

    const evaluateTrigger = (questId: string, trigger: QuestTrigger): boolean => {
      const requiresAuth = trigger.requiresAuth !== false;
      const once = trigger.once !== false;

      if (requiresAuth && !user) return false;
      if (once && hasQuestBeenTriggered(questId)) return false;
      if (state.completedQuests.includes(questId)) return false;

      if (trigger.route && !isRouteMatch(location, trigger.route)) return false;

      switch (trigger.type) {
        case "newUser":
          return state.completedQuests.length === 0;
        case "firstVisit":
          return true;
        case "route":
          return true;
        case "userEvent":
          return false;
        default:
          return false;
      }
    };

    for (const quest of QUESTS) {
      if (!quest.trigger) continue;
      if (quest.trigger.type === "userEvent") continue;
      
      const shouldTrigger = evaluateTrigger(quest.id, quest.trigger);
      
      console.log('[Guidance Trigger] Evaluating quest:', {
        questId: quest.id,
        triggerType: quest.trigger.type,
        route: quest.trigger.route,
        currentLocation: location,
        isAuthenticated: !!user,
        authLoading,
        shouldTrigger,
      });

      if (shouldTrigger) {
        console.log('[Guidance Trigger] Quest matched, scheduling start in 2s:', quest.id);
        const timer = setTimeout(() => {
          console.log('[Guidance Trigger] Timer fired, starting quest:', quest.id);
          startQuestRef.current(quest.id);
          markQuestAsTriggered(quest.id);
        }, 2000);
        return () => {
          console.log('[Guidance Trigger] Timer cleanup - effect re-ran before 2s');
          clearTimeout(timer);
        };
      }
    }
  }, [autoStartForNewUsers, authLoading, user, location, state.isActive, state.currentQuestId, state.completedQuests]);

  useEffect(() => {
    if (!autoStartForNewUsers) return;
    if (authLoading) return;

    const eventQuests = QUESTS.filter(q => q.trigger?.type === "userEvent" && q.trigger.eventName);
    if (eventQuests.length === 0) return;

    const handleUserEvent = (e: Event) => {
      const eventName = (e as CustomEvent).type;
      
      for (const quest of eventQuests) {
        if (quest.trigger?.eventName !== eventName) continue;
        
        const requiresAuth = quest.trigger.requiresAuth !== false;
        const once = quest.trigger.once !== false;

        if (requiresAuth && !user) continue;
        if (once && hasQuestBeenTriggered(quest.id)) continue;
        if (state.completedQuests.includes(quest.id)) continue;
        if (state.isActive || state.currentQuestId) continue;

        console.log('[Guidance Trigger] userEvent matched:', quest.id, eventName);
        startQuestRef.current(quest.id);
        markQuestAsTriggered(quest.id);
        break;
      }
    };

    const eventNames = [...new Set(eventQuests.map(q => q.trigger!.eventName!))];
    eventNames.forEach(name => window.addEventListener(name, handleUserEvent));

    return () => {
      eventNames.forEach(name => window.removeEventListener(name, handleUserEvent));
    };
  }, [autoStartForNewUsers, authLoading, user, state.isActive, state.currentQuestId, state.completedQuests]);

  // Dispatch setupEvent when starting a challenge that requires it
  useEffect(() => {
    if (
      state.isActive &&
      state.currentStepIndex === 0 &&
      currentChallenge?.setupEvent &&
      currentStep?.route &&
      location === currentStep.route
    ) {
      // Delay to ensure target page is mounted and event listeners are attached
      const timer = setTimeout(() => {
        window.dispatchEvent(new CustomEvent(currentChallenge.setupEvent!));
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [state.isActive, state.currentStepIndex, currentChallenge, currentStep, location]);

  useEffect(() => {
    if (isOnEnabledRoute && state.isActive && !state.isHeaderVisible) {
      engine.pauseGuidance();
    }
  }, [isOnEnabledRoute, state.isActive, state.isHeaderVisible, engine]);

  useEffect(() => {
    if (!isOnEnabledRoute || !state.isActive || !currentStep) return;

    // Clear any existing timer when step changes
    if (advanceDelayTimerRef.current) {
      clearTimeout(advanceDelayTimerRef.current);
      advanceDelayTimerRef.current = null;
    }

    const advanceWithDelay = () => {
      // Default 1 second delay between steps so users notice completion before next prompt
      const delay = currentStep.advanceDelay ?? 1000;
      advanceDelayTimerRef.current = setTimeout(() => {
        engine.advanceStep();
      }, delay);
    };

    let hasAdvancedForType = false;

    const handleElementClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const stepElement = document.querySelector(currentStep.selector);
      
      if (stepElement && (stepElement === target || stepElement.contains(target))) {
        if (currentStep.action === "click") {
          advanceWithDelay();
        }
      }
    };

    const handleInput = (e: Event) => {
      if (currentStep.action !== "type" || hasAdvancedForType) return;
      
      const target = e.target as HTMLElement;
      const stepElement = document.querySelector(currentStep.selector);
      
      if (stepElement && (stepElement === target || stepElement.contains(target))) {
        hasAdvancedForType = true;
        advanceWithDelay();
      }
    };

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        engine.pauseGuidance();
      }
    };

    document.addEventListener("click", handleElementClick, true);
    document.addEventListener("keydown", handleKeyPress);
    document.addEventListener("input", handleInput, true);

    return () => {
      document.removeEventListener("click", handleElementClick, true);
      document.removeEventListener("keydown", handleKeyPress);
      document.removeEventListener("input", handleInput, true);
      if (advanceDelayTimerRef.current) {
        clearTimeout(advanceDelayTimerRef.current);
        advanceDelayTimerRef.current = null;
      }
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
