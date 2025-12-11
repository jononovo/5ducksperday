import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Sparkles, Target, Briefcase, TrendingUp, Users, Zap, MessageSquare, Search, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPortal } from "react-dom";

interface StealthOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface QuestionOption {
  id: string;
  label: string;
  icon: React.ReactNode;
  description?: string;
}

interface OnboardingData {
  purpose: string;
  role: string;
  goal: string;
}

const QUESTIONS = [
  {
    id: "welcome",
    type: "welcome" as const,
    title: "Welcome aboard!",
    subtitle: "Let's personalize your experience",
  },
  {
    id: "purpose",
    type: "single-select" as const,
    title: "What brings you here?",
    subtitle: "Select the option that best describes you",
    options: [
      { id: "sales", label: "Grow my sales pipeline", icon: <TrendingUp className="w-5 h-5" /> },
      { id: "outreach", label: "Automate my outreach", icon: <Mail className="w-5 h-5" /> },
      { id: "leads", label: "Find new leads", icon: <Search className="w-5 h-5" /> },
      { id: "curious", label: "Just exploring", icon: <Sparkles className="w-5 h-5" /> },
    ],
  },
  {
    id: "role",
    type: "single-select" as const,
    title: "What's your role?",
    subtitle: "This helps us tailor the experience",
    options: [
      { id: "founder", label: "Founder / CEO", icon: <Zap className="w-5 h-5" /> },
      { id: "sales", label: "Sales / BD", icon: <Target className="w-5 h-5" /> },
      { id: "marketing", label: "Marketing", icon: <MessageSquare className="w-5 h-5" /> },
      { id: "other", label: "Something else", icon: <Users className="w-5 h-5" /> },
    ],
  },
  {
    id: "goal",
    type: "single-select" as const,
    title: "What's your main goal?",
    subtitle: "Pick your top priority",
    options: [
      { id: "meetings", label: "Book more meetings", icon: <Briefcase className="w-5 h-5" /> },
      { id: "pipeline", label: "Build my pipeline", icon: <TrendingUp className="w-5 h-5" /> },
      { id: "time", label: "Save time on outreach", icon: <Zap className="w-5 h-5" /> },
      { id: "learn", label: "Learn sales strategies", icon: <Target className="w-5 h-5" /> },
    ],
  },
];

export function StealthOnboardingModal({ isOpen, onClose, onComplete }: StealthOnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    purpose: "",
    role: "",
    goal: "",
  });

  const totalSteps = QUESTIONS.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;
  const currentQuestion = QUESTIONS[currentStep];

  const handleSelect = (questionId: string, optionId: string) => {
    setData((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const canContinue = () => {
    if (currentQuestion.type === "welcome") return true;
    if (currentQuestion.type === "single-select") {
      return data[currentQuestion.id as keyof OnboardingData] !== "";
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  if (!isOpen) return null;

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
              {currentQuestion.type === "welcome" ? (
                <div className="text-center space-y-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
                    className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-[0_0_60px_rgba(250,204,21,0.4)]"
                  >
                    <span className="text-4xl">🐥</span>
                  </motion.div>

                  <div>
                    <motion.h1
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-3xl md:text-4xl font-bold text-white mb-2"
                    >
                      Welcome aboard!
                    </motion.h1>
                    <motion.p
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="text-lg text-gray-400"
                    >
                      {currentQuestion.subtitle}
                    </motion.p>
                  </div>

                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="text-sm text-gray-500"
                  >
                    Just a few quick questions to get you started
                  </motion.p>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 border border-yellow-500/20 mb-6">
                      <span className="text-2xl">🐥</span>
                      <h2 className="text-xl md:text-2xl font-bold text-white">
                        {currentQuestion.title}
                      </h2>
                    </div>
                    {currentQuestion.subtitle && (
                      <p className="text-gray-400">{currentQuestion.subtitle}</p>
                    )}
                  </div>

                  <div className="space-y-3">
                    {currentQuestion.options?.map((option, index) => {
                      const isSelected = data[currentQuestion.id as keyof OnboardingData] === option.id;
                      return (
                        <motion.button
                          key={option.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          onClick={() => handleSelect(currentQuestion.id, option.id)}
                          className={`w-full p-4 rounded-xl border-2 transition-all duration-200 flex items-center gap-4 text-left group ${
                            isSelected
                              ? "bg-yellow-500/10 border-yellow-500/50 shadow-[0_0_20px_rgba(250,204,21,0.2)]"
                              : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                          }`}
                          data-testid={`option-${currentQuestion.id}-${option.id}`}
                        >
                          <div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                              isSelected
                                ? "bg-yellow-500/20 text-yellow-400"
                                : "bg-white/10 text-gray-400 group-hover:text-white"
                            }`}
                          >
                            {option.icon}
                          </div>
                          <span
                            className={`text-lg font-medium transition-colors ${
                              isSelected ? "text-white" : "text-gray-300"
                            }`}
                          >
                            {option.label}
                          </span>
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="ml-auto w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center"
                            >
                              <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </motion.div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="px-6 py-6">
        <div className="max-w-lg mx-auto">
          <Button
            onClick={handleNext}
            disabled={!canContinue()}
            className={`w-full h-14 text-lg font-bold rounded-xl transition-all ${
              canContinue()
                ? "bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-black shadow-[0_0_30px_rgba(250,204,21,0.3)]"
                : "bg-white/10 text-gray-500 cursor-not-allowed"
            }`}
            data-testid="button-onboarding-continue"
          >
            {currentStep === totalSteps - 1 ? "Get Started" : "Continue"}
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </motion.div>,
    document.body
  );
}
