export * from "./types";

export { useFormFlow } from "./hooks/useFormFlow";
export { FormShell } from "./components/FormShell";
export { SlideSingleSelect } from "./components/SlideSingleSelect";
export { SlideMultiSelect } from "./components/SlideMultiSelect";
export { SlideTextInput } from "./components/SlideTextInput";
export { SlideCompanyDetails } from "./components/SlideCompanyDetails";
export { WelcomeScreen } from "./components/WelcomeScreen";
export { SectionIntro } from "./components/SectionIntro";
export { SectionComplete } from "./components/SectionComplete";
export { FinalComplete } from "./components/FinalComplete";
export { fireSectionConfetti, fireFinalConfetti } from "./utils/confetti";

export { FORM_DEFAULTS, resolveDefault } from "./defaults";
export { 
  FORMS, 
  getFormById, 
  getAllForms,
  onboardingQuestionnaire,
  ONBOARDING_QUESTIONNAIRE_INITIAL_DATA,
  type OnboardingQuestionnaireData,
} from "./formSlides";

export { useOnboardingFlow } from "./hooks/useOnboardingFlow";
export { OnboardingShell } from "./components/OnboardingShell";
export { QuestionSingleSelect } from "./components/QuestionSingleSelect";
export { QuestionMultiSelect } from "./components/QuestionMultiSelect";
export { QuestionTextInput } from "./components/QuestionTextInput";
export { QuestionCompanyDetails } from "./components/QuestionCompanyDetails";

export { 
  STEALTH_FLOW_CONFIG, 
  STEALTH_QUESTIONS, 
  STEALTH_INITIAL_DATA,
  type StealthOnboardingData 
} from "./configs/stealth-flow";
