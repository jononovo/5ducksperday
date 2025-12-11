export * from "./types";
export { useOnboardingFlow } from "./hooks/useOnboardingFlow";
export { OnboardingShell } from "./components/OnboardingShell";
export { QuestionSingleSelect } from "./components/QuestionSingleSelect";
export { QuestionMultiSelect } from "./components/QuestionMultiSelect";
export { QuestionTextInput } from "./components/QuestionTextInput";
export { QuestionCompanyDetails } from "./components/QuestionCompanyDetails";
export { WelcomeScreen } from "./components/WelcomeScreen";
export { SectionIntro } from "./components/SectionIntro";
export { SectionComplete } from "./components/SectionComplete";
export { FinalComplete } from "./components/FinalComplete";
export { fireSectionConfetti, fireFinalConfetti } from "./utils/confetti";

export { 
  STEALTH_FLOW_CONFIG, 
  STEALTH_QUESTIONS, 
  STEALTH_INITIAL_DATA,
  type StealthOnboardingData 
} from "./configs/stealth-flow";
