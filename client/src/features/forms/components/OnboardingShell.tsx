import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPortal } from "react-dom";
import type { OnboardingShellProps, QuestionComponentProps } from "../types";
import { fireSectionConfetti, fireFinalConfetti } from "../utils/confetti";
import { apiRequest } from "@/lib/queryClient";
import { QuestionSingleSelect } from "./QuestionSingleSelect";
import { QuestionMultiSelect } from "./QuestionMultiSelect";
import { QuestionTextInput } from "./QuestionTextInput";
import { WelcomeScreen } from "./WelcomeScreen";
import { SectionIntro } from "./SectionIntro";
import { SectionComplete } from "./SectionComplete";
import { FinalComplete } from "./FinalComplete";

export function OnboardingShell<T extends Record<string, string>>({
  isOpen,
  onClose,
  onComplete,
  flow,
  componentRegistry = {},
}: OnboardingShellProps<T>) {
  const confettiFiredRef = useRef<number | null>(null);
  const creditClaimedRef = useRef<Set<string>>(new Set());

  const {
    currentStep,
    data,
    progress,
    currentQuestion,
    setData,
    handleNext,
    handleBack,
    canContinue,
    getButtonText,
    totalSteps,
  } = flow;

  useEffect(() => {
    if (confettiFiredRef.current === currentStep) return;

    if (currentQuestion?.type === "section-complete") {
      confettiFiredRef.current = currentStep;
      fireSectionConfetti();
      
      const section = currentQuestion.section?.toLowerCase();
      if (section && !creditClaimedRef.current.has(section)) {
        creditClaimedRef.current.add(section);
        const milestoneId = `onboarding-section-${section}`;
        console.log(`[Onboarding] Claiming credits for milestone: ${milestoneId}`);
        
        apiRequest("POST", `/api/progress/form/milestone/${milestoneId}`)
          .then((response) => {
            console.log(`[Onboarding] Credit claim response:`, response);
          })
          .catch((error) => {
            console.error(`[Onboarding] Failed to claim credits for ${milestoneId}:`, error);
          });
      }
    } else if (currentQuestion?.type === "final-complete") {
      confettiFiredRef.current = currentStep;
      fireFinalConfetti();
    }
  }, [currentStep, currentQuestion]);

  const handleSelect = (questionId: string, optionId: string) => {
    setData(questionId as keyof T, optionId);
  };

  const handleTextInput = (questionId: string, value: string) => {
    setData(questionId as keyof T, value);
  };

  const handleContinue = () => {
    if (currentStep === totalSteps - 1) {
      onComplete();
    } else {
      handleNext();
    }
  };

  if (!isOpen) return null;

  const renderQuestionContent = () => {
    if (!currentQuestion) return null;

    const props: QuestionComponentProps<T> = {
      question: currentQuestion,
      data,
      onSelect: handleSelect,
      onTextInput: handleTextInput,
      onNext: handleNext,
    };

    if (currentQuestion.component && componentRegistry[currentQuestion.component]) {
      const CustomComponent = componentRegistry[currentQuestion.component];
      return <CustomComponent {...props} />;
    }

    switch (currentQuestion.type) {
      case "welcome":
        return (
          <WelcomeScreen
            title={currentQuestion.title}
            subtitle={currentQuestion.subtitle}
            emoji={currentQuestion.emoji}
          />
        );
      case "section-intro":
        return (
          <SectionIntro
            title={currentQuestion.title}
            subtitle={currentQuestion.subtitle}
            emoji={currentQuestion.emoji}
          />
        );
      case "section-complete":
        return (
          <SectionComplete
            title={currentQuestion.title}
            subtitle={currentQuestion.subtitle}
            emoji={currentQuestion.emoji}
            credits={currentQuestion.credits}
          />
        );
      case "final-complete":
        return (
          <FinalComplete
            title={currentQuestion.title}
            subtitle={currentQuestion.subtitle}
            emoji={currentQuestion.emoji}
          />
        );
      case "single-select":
        return <QuestionSingleSelect {...props} />;
      case "multi-select":
        return <QuestionMultiSelect {...props} />;
      case "text-input":
        return <QuestionTextInput {...props} />;
      case "multi-field":
        if (currentQuestion.component && componentRegistry[currentQuestion.component]) {
          const CustomComponent = componentRegistry[currentQuestion.component];
          return <CustomComponent {...props} />;
        }
        return null;
      default:
        return null;
    }
  };

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] bg-[#0a0a0f] flex flex-col"
    >
      <div className="flex items-center justify-between px-6 py-4">
        <button
          onClick={handleBack}
          className={`p-2 rounded-full hover:bg-white/10 transition-colors ${
            currentStep === 0 ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
          data-testid="button-onboarding-back"
        >
          <ChevronLeft className="w-6 h-6 text-white/70" />
        </button>

        <div className="flex-1 mx-8 max-w-md">
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
          data-testid="button-onboarding-close"
        >
          <X className="w-6 h-6 text-white/70" />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 overflow-y-auto">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              {renderQuestionContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {currentQuestion?.type !== "single-select" && (
        <div className="px-6 py-6">
          <div className="max-w-lg mx-auto">
            <Button
              onClick={handleContinue}
              disabled={!canContinue()}
              className={`w-full h-14 text-lg font-bold rounded-xl transition-all ${
                canContinue()
                  ? "bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-black shadow-[0_0_30px_rgba(250,204,21,0.3)]"
                  : "bg-white/10 text-gray-500 cursor-not-allowed"
              }`}
              data-testid="button-onboarding-continue"
            >
              {getButtonText()}
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      )}
    </motion.div>,
    document.body
  );
}
