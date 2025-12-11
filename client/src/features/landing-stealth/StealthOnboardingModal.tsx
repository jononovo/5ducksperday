import { 
  OnboardingShell, 
  useOnboardingFlow,
  QuestionCompanyDetails,
  STEALTH_FLOW_CONFIG,
  type StealthOnboardingData,
  type QuestionComponentProps
} from "@/features/onboarding-questionaire";

interface StealthOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const componentRegistry: Record<string, React.ComponentType<QuestionComponentProps<StealthOnboardingData>>> = {
  "company-details": QuestionCompanyDetails as React.ComponentType<QuestionComponentProps<StealthOnboardingData>>,
};

export function StealthOnboardingModal({ isOpen, onClose, onComplete }: StealthOnboardingModalProps) {
  const flow = useOnboardingFlow<StealthOnboardingData>(STEALTH_FLOW_CONFIG);

  return (
    <OnboardingShell
      isOpen={isOpen}
      onClose={onClose}
      onComplete={onComplete}
      flow={flow}
      componentRegistry={componentRegistry}
    />
  );
}
