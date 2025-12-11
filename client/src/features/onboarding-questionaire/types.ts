import { ReactNode } from "react";

export type QuestionType = 
  | "welcome" 
  | "section-intro" 
  | "single-select" 
  | "multi-select"
  | "text-input" 
  | "multi-field"
  | "section-complete" 
  | "final-complete";

export type SectionId = "A" | "B" | "C" | "D" | "E" | "F";

export type OnboardingDataBase = Record<string, string> & { [key: string]: string };

export interface QuestionOption {
  id: string;
  label: string;
  icon: ReactNode;
  description?: string;
}

export interface Question<T extends Record<string, string> = Record<string, string>> {
  id: string;
  type: QuestionType;
  section?: SectionId;
  title: string;
  subtitle?: string;
  emoji?: string;
  options?: QuestionOption[];
  placeholder?: string;
  inputType?: "text" | "textarea" | "url";
  conditionalOn?: keyof T;
  conditionalValue?: string;
  credits?: number;
  component?: string;
  validate?: (data: T) => boolean;
  optional?: boolean;
}

export interface FlowConfig<T extends Record<string, string>> {
  questions: Question<T>[];
  initialData: T;
  sectionCredits?: Partial<Record<SectionId, number>>;
}

export interface FlowState<T extends Record<string, string>> {
  currentStep: number;
  data: T;
  visibleQuestions: Question<T>[];
  totalSteps: number;
  progress: number;
  currentQuestion: Question<T> | null;
}

export interface FlowActions<T extends Record<string, string>> {
  setData: (key: keyof T, value: string) => void;
  handleNext: () => void;
  handleBack: () => void;
  canContinue: () => boolean;
  getButtonText: () => string;
}

export interface OnboardingFlowReturn<T extends Record<string, string>> 
  extends FlowState<T>, FlowActions<T> {}

export interface OnboardingShellProps<T extends Record<string, string>> {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  flow: OnboardingFlowReturn<T>;
  componentRegistry?: Record<string, React.ComponentType<QuestionComponentProps<T>>>;
}

export interface QuestionComponentProps<T extends Record<string, string>> {
  question: Question<T>;
  data: T;
  onSelect?: (questionId: string, optionId: string) => void;
  onTextInput?: (questionId: string, value: string) => void;
  onNext?: () => void;
}

export interface ScreenComponentProps {
  title: string;
  subtitle?: string;
  emoji?: string;
  credits?: number;
}
