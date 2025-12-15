import { ReactNode } from "react";

export interface GuidanceStep {
  id: string;
  selector: string;
  action: "click" | "type" | "view" | "hover";
  instruction: string;
  tooltipPosition?: "top" | "bottom" | "left" | "right" | "auto";
  value?: string;
  waitForUser?: boolean;
  validateCompletion?: () => boolean;
  route?: string;
  advanceDelay?: number;
}

export interface Challenge {
  id: string;
  name: string;
  description: string;
  emoji?: string;
  steps: GuidanceStep[];
  completionMessage?: string;
  setupEvent?: string;
}

export interface QuestTrigger {
  type: "newUser" | "firstVisit" | "route" | "userEvent";
  route?: string;           // Required for route/firstVisit/newUser types
  eventName?: string;       // Required for userEvent type
  requiresAuth?: boolean;   // Default true - must be logged in to trigger
  once?: boolean;           // Default true - only trigger once per user
}

export interface Quest {
  id: string;
  name: string;
  description: string;
  emoji?: string;
  challenges: Challenge[];
  trigger?: QuestTrigger;   // Defines when/how this quest auto-starts
}

export interface GuidanceState {
  isActive: boolean;
  currentQuestId: string | null;
  currentChallengeIndex: number;
  currentStepIndex: number;
  completedQuests: string[];
  completedChallenges: Record<string, string[]>;
  isHeaderVisible: boolean;
}

export interface GuidanceContextValue {
  state: GuidanceState;
  currentQuest: Quest | null;
  currentChallenge: Challenge | null;
  currentStep: GuidanceStep | null;
  startQuest: (questId: string) => void;
  startNextChallenge: () => void;
  advanceStep: () => void;
  completeChallenge: () => void;
  pauseGuidance: () => void;
  resumeGuidance: () => void;
  toggleHeader: () => void;
  resetProgress: () => void;
  restartChallenge: (questId: string, challengeIndex: number) => void;
  getChallengeProgress: () => { completed: number; total: number };
  getQuestProgress: () => { completed: number; total: number };
}

export interface FluffyGuideProps {
  onClick: () => void;
  isActive: boolean;
}

export interface QuestProgressHeaderProps {
  questName: string;
  challengesCompleted: number;
  totalChallenges: number;
  currentChallengeName?: string;
  isVisible: boolean;
  onClose: () => void;
}

export interface ElementHighlightProps {
  targetSelector: string;
  isVisible: boolean;
}

export interface GuidanceTooltipProps {
  targetSelector: string;
  instruction: string;
  position: "top" | "bottom" | "left" | "right" | "auto";
  isVisible: boolean;
  onDismiss?: () => void;
  stepNumber?: number;
  totalSteps?: number;
}

export interface SpotlightOverlayProps {
  targetSelector: string;
  isVisible: boolean;
}
