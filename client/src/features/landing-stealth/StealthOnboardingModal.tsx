import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Sparkles, Target, Briefcase, TrendingUp, Users, Zap, MessageSquare, Search, Mail, Globe, Building2, MapPin, Package, Headphones, Heart, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createPortal } from "react-dom";
import confetti from "canvas-confetti";

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

type QuestionType = "welcome" | "section-intro" | "single-select" | "text-input" | "conditional" | "section-complete" | "final-complete";

interface Question {
  id: string;
  type: QuestionType;
  section?: "A" | "B" | "C";
  title: string;
  subtitle?: string;
  emoji?: string;
  options?: QuestionOption[];
  placeholder?: string;
  inputType?: "text" | "textarea" | "url";
  conditionalOn?: string;
  conditionalValue?: string;
  credits?: number;
}

interface OnboardingData {
  // Section A - Get to Know
  purpose: string;
  role: string;
  goal: string;
  // Section B - Company
  hasWebsite: string;
  website: string;
  companyName: string;
  companyCity: string;
  companyState: string;
  companyRole: string;
  // Section C - Product
  offeringType: string;
  productDescription: string;
  customerLove: string;
  // Section C - Pricing
  hasFixedPricing: string;
  // Fixed pricing fields
  packageName: string;
  packageCost: string;
  packageIncludes: string;
  // Custom pricing fields
  serviceDescription: string;
  serviceCost: string;
  serviceOther: string;
}

const SECTION_CREDITS = {
  A: 50,
  B: 75,
  C: 100,
};

const QUESTIONS: Question[] = [
  // ===== SECTION A: Get to Know =====
  {
    id: "welcome",
    type: "welcome",
    section: "A",
    title: "Welcome aboard!",
    subtitle: "Let's personalize your experience",
    emoji: "🐥",
  },
  {
    id: "purpose",
    type: "single-select",
    section: "A",
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
    type: "single-select",
    section: "A",
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
    type: "single-select",
    section: "A",
    title: "What's your main goal?",
    subtitle: "Pick your top priority",
    options: [
      { id: "meetings", label: "Book more meetings", icon: <Briefcase className="w-5 h-5" /> },
      { id: "pipeline", label: "Build my pipeline", icon: <TrendingUp className="w-5 h-5" /> },
      { id: "time", label: "Save time on outreach", icon: <Zap className="w-5 h-5" /> },
      { id: "learn", label: "Learn sales strategies", icon: <Target className="w-5 h-5" /> },
    ],
  },
  {
    id: "section-a-complete",
    type: "section-complete",
    section: "A",
    title: "Nice work!",
    subtitle: "You've unlocked your first reward",
    emoji: "🎉",
    credits: SECTION_CREDITS.A,
  },
  
  // ===== SECTION B: Your Company =====
  {
    id: "section-b-intro",
    type: "section-intro",
    section: "B",
    title: "Now let's learn about your company",
    subtitle: "Just a couple quick questions",
    emoji: "🏢",
  },
  {
    id: "hasWebsite",
    type: "single-select",
    section: "B",
    title: "Does your company have a website?",
    subtitle: "This helps Fluffy learn about your business",
    options: [
      { id: "yes", label: "Yes, we have a website", icon: <Globe className="w-5 h-5" /> },
      { id: "no", label: "Not yet", icon: <Building2 className="w-5 h-5" /> },
    ],
  },
  {
    id: "website",
    type: "text-input",
    section: "B",
    title: "What's your website?",
    subtitle: "Fluffy will learn all about your company from here",
    placeholder: "https://yourcompany.com",
    inputType: "url",
    conditionalOn: "hasWebsite",
    conditionalValue: "yes",
  },
  {
    id: "companyDetails",
    type: "text-input",
    section: "B",
    title: "Tell us about your company",
    subtitle: "Just the basics so Fluffy knows who you are",
    placeholder: "Company name",
    inputType: "text",
    conditionalOn: "hasWebsite",
    conditionalValue: "no",
  },
  {
    id: "companyRole",
    type: "single-select",
    section: "B",
    title: "What's your role at the company?",
    subtitle: "This helps us personalize your experience",
    options: [
      { id: "owner", label: "Owner / Founder", icon: <Zap className="w-5 h-5" /> },
      { id: "executive", label: "Executive / C-Suite", icon: <Star className="w-5 h-5" /> },
      { id: "manager", label: "Manager / Team Lead", icon: <Users className="w-5 h-5" /> },
      { id: "individual", label: "Individual Contributor", icon: <Target className="w-5 h-5" /> },
    ],
  },
  {
    id: "section-b-complete",
    type: "section-complete",
    section: "B",
    title: "Awesome!",
    subtitle: "Fluffy is getting to know you better",
    emoji: "✨",
    credits: SECTION_CREDITS.B,
  },
  
  // ===== SECTION C: Your Product =====
  {
    id: "section-c-intro",
    type: "section-intro",
    section: "C",
    title: "Help Fluffy understand what you sell",
    subtitle: "3 simple steps to supercharge your sales assistant",
    emoji: "🐥",
  },
  {
    id: "offeringType",
    type: "single-select",
    section: "C",
    title: "What do you offer?",
    subtitle: "Pick the one that fits best",
    options: [
      { id: "product", label: "A Product", icon: <Package className="w-5 h-5" /> },
      { id: "service", label: "A Service", icon: <Headphones className="w-5 h-5" /> },
      { id: "both", label: "Both", icon: <Sparkles className="w-5 h-5" /> },
    ],
  },
  {
    id: "productDescription",
    type: "text-input",
    section: "C",
    title: "Describe what you sell",
    subtitle: "A quick one-liner works great",
    placeholder: "e.g., We help small businesses automate their accounting",
    inputType: "textarea",
  },
  {
    id: "customerLove",
    type: "text-input",
    section: "C",
    title: "What do customers love about it?",
    subtitle: "This helps Fluffy craft the perfect pitch",
    placeholder: "e.g., Easy to use, saves 10 hours per week, great support",
    inputType: "textarea",
  },
  {
    id: "hasFixedPricing",
    type: "single-select",
    section: "C",
    title: "Do you have a fixed price or package?",
    subtitle: "Let Fluffy know how you charge",
    options: [
      { id: "yes", label: "Yes, I have set pricing", icon: <Package className="w-5 h-5" /> },
      { id: "no", label: "No, it varies by project", icon: <TrendingUp className="w-5 h-5" /> },
    ],
  },
  // Fixed pricing sub-slides
  {
    id: "packageName",
    type: "text-input",
    section: "C",
    title: "What's your package or product called?",
    subtitle: "Give it a name that sticks",
    placeholder: "e.g., Growth Plan, Pro Package, Starter Kit",
    inputType: "text",
    conditionalOn: "hasFixedPricing",
    conditionalValue: "yes",
  },
  {
    id: "packageCost",
    type: "text-input",
    section: "C",
    title: "How much does it cost?",
    subtitle: "Ballpark is fine!",
    placeholder: "e.g., $99/month, $2,500 one-time, Starting at $500",
    inputType: "text",
    conditionalOn: "hasFixedPricing",
    conditionalValue: "yes",
  },
  {
    id: "packageIncludes",
    type: "text-input",
    section: "C",
    title: "What's included?",
    subtitle: "The highlights that make it awesome",
    placeholder: "e.g., 3 revisions, 24/7 support, unlimited users",
    inputType: "textarea",
    conditionalOn: "hasFixedPricing",
    conditionalValue: "yes",
  },
  // Custom pricing sub-slides
  {
    id: "serviceDescription",
    type: "text-input",
    section: "C",
    title: "Describe a service you offer right now",
    subtitle: "Just one or two lines is perfect",
    placeholder: "e.g., Custom website design for small businesses",
    inputType: "textarea",
    conditionalOn: "hasFixedPricing",
    conditionalValue: "no",
  },
  {
    id: "serviceCost",
    type: "text-input",
    section: "C",
    title: "What's typically paid for that?",
    subtitle: "A range works great here",
    placeholder: "e.g., $2,000-$5,000 depending on scope",
    inputType: "text",
    conditionalOn: "hasFixedPricing",
    conditionalValue: "no",
  },
  {
    id: "serviceOther",
    type: "text-input",
    section: "C",
    title: "Anything else we should know?",
    subtitle: "Optional but helpful for Fluffy",
    placeholder: "e.g., Projects usually take 2-4 weeks",
    inputType: "textarea",
    conditionalOn: "hasFixedPricing",
    conditionalValue: "no",
  },
  {
    id: "section-c-complete",
    type: "section-complete",
    section: "C",
    title: "You're a star!",
    subtitle: "Fluffy is ready to help you sell",
    emoji: "⭐",
    credits: SECTION_CREDITS.C,
  },
  
  // ===== FINAL =====
  {
    id: "final-complete",
    type: "final-complete",
    title: "You're all set!",
    subtitle: "Fluffy is excited to help you grow your business",
    emoji: "🚀",
  },
];

export function StealthOnboardingModal({ isOpen, onClose, onComplete }: StealthOnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    purpose: "",
    role: "",
    goal: "",
    hasWebsite: "",
    website: "",
    companyName: "",
    companyCity: "",
    companyState: "",
    companyRole: "",
    offeringType: "",
    productDescription: "",
    customerLove: "",
    hasFixedPricing: "",
    packageName: "",
    packageCost: "",
    packageIncludes: "",
    serviceDescription: "",
    serviceCost: "",
    serviceOther: "",
  });
  const [showCelebration, setShowCelebration] = useState(false);
  const [earnedCredits, setEarnedCredits] = useState(0);
  const confettiFiredRef = useRef<number | null>(null);

  // Get visible questions (filter out conditional ones that don't apply)
  const getVisibleQuestions = (): Question[] => {
    return QUESTIONS.filter((q) => {
      if (q.conditionalOn) {
        return data[q.conditionalOn as keyof OnboardingData] === q.conditionalValue;
      }
      return true;
    });
  };

  const visibleQuestions = getVisibleQuestions();
  const totalSteps = visibleQuestions.length;
  const currentQuestion = visibleQuestions[currentStep];
  const progress = ((currentStep + 1) / totalSteps) * 100;

  // Fire confetti for section completions
  const fireSectionConfetti = () => {
    const duration = 2000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: ['#fbbf24', '#f59e0b', '#d97706'],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ['#fbbf24', '#f59e0b', '#d97706'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  };

  // Fire bigger confetti for final completion
  const fireFinalConfetti = () => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 70,
        origin: { x: 0, y: 0.6 },
        colors: ['#fbbf24', '#f59e0b', '#d97706', '#10b981', '#3b82f6'],
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 70,
        origin: { x: 1, y: 0.6 },
        colors: ['#fbbf24', '#f59e0b', '#d97706', '#10b981', '#3b82f6'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  };

  // Handle section complete screens - fire confetti only once per step
  useEffect(() => {
    if (confettiFiredRef.current === currentStep) return;
    
    if (currentQuestion?.type === "section-complete") {
      confettiFiredRef.current = currentStep;
      fireSectionConfetti();
      if (currentQuestion.credits) {
        setEarnedCredits(currentQuestion.credits);
      }
    } else if (currentQuestion?.type === "final-complete") {
      confettiFiredRef.current = currentStep;
      fireFinalConfetti();
    }
  }, [currentStep, currentQuestion]);

  const handleSelect = (questionId: string, optionId: string) => {
    setData((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const handleTextInput = (questionId: string, value: string) => {
    setData((prev) => ({ ...prev, [questionId]: value }));
  };

  const canContinue = (): boolean => {
    if (!currentQuestion) return false;
    
    if (currentQuestion.type === "welcome" || 
        currentQuestion.type === "section-intro" || 
        currentQuestion.type === "section-complete" ||
        currentQuestion.type === "final-complete") {
      return true;
    }
    
    if (currentQuestion.type === "single-select") {
      const value = data[currentQuestion.id as keyof OnboardingData];
      return value !== "" && value !== undefined;
    }
    
    if (currentQuestion.type === "text-input") {
      // For company details, we require all fields (name, city, state)
      if (currentQuestion.id === "companyDetails") {
        return (
          data.companyName.trim() !== "" &&
          data.companyCity.trim() !== "" &&
          data.companyState.trim() !== ""
        );
      }
      // serviceOther is optional
      if (currentQuestion.id === "serviceOther") {
        return true;
      }
      const value = data[currentQuestion.id as keyof OnboardingData];
      return typeof value === 'string' && value.trim() !== "";
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

  const getButtonText = (): string => {
    if (!currentQuestion) return "Continue";
    
    if (currentQuestion.type === "welcome") return "Let's Go!";
    if (currentQuestion.type === "section-intro") return "Let's Do It!";
    if (currentQuestion.type === "section-complete") return "Keep Going";
    if (currentQuestion.type === "final-complete") return "Start Selling!";
    if (currentStep === totalSteps - 1) return "Finish";
    return "Continue";
  };

  if (!isOpen) return null;

  const renderQuestionContent = () => {
    if (!currentQuestion) return null;

    // Welcome screen
    if (currentQuestion.type === "welcome") {
      return (
        <div className="text-center space-y-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
            className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-[0_0_60px_rgba(250,204,21,0.4)]"
          >
            <span className="text-4xl">{currentQuestion.emoji || "🐥"}</span>
          </motion.div>

          <div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl md:text-4xl font-bold text-white mb-2"
            >
              {currentQuestion.title}
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
      );
    }

    // Section intro screens
    if (currentQuestion.type === "section-intro") {
      return (
        <div className="text-center space-y-6">
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
            className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-[0_0_60px_rgba(250,204,21,0.4)]"
          >
            <span className="text-4xl">{currentQuestion.emoji || "✨"}</span>
          </motion.div>

          <div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl md:text-4xl font-bold text-white mb-2"
            >
              {currentQuestion.title}
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
        </div>
      );
    }

    // Section complete screens (celebration)
    if (currentQuestion.type === "section-complete") {
      return (
        <div className="text-center space-y-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.2, 1] }}
            transition={{ duration: 0.5, times: [0, 0.6, 1] }}
            className="w-28 h-28 mx-auto rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-[0_0_80px_rgba(250,204,21,0.5)]"
          >
            <span className="text-5xl">{currentQuestion.emoji || "🎉"}</span>
          </motion.div>

          <div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl md:text-4xl font-bold text-white mb-2"
            >
              {currentQuestion.title}
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

          {currentQuestion.credits && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, type: "spring" }}
              className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30"
            >
              <span className="text-2xl">💰</span>
              <span className="text-xl font-bold text-yellow-400">+{currentQuestion.credits} credits earned!</span>
            </motion.div>
          )}
        </div>
      );
    }

    // Final complete screen
    if (currentQuestion.type === "final-complete") {
      return (
        <div className="text-center space-y-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.3, 1] }}
            transition={{ duration: 0.6, times: [0, 0.5, 1] }}
            className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 flex items-center justify-center shadow-[0_0_100px_rgba(250,204,21,0.6)]"
          >
            <span className="text-6xl">{currentQuestion.emoji || "🚀"}</span>
          </motion.div>

          <div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-4xl md:text-5xl font-bold text-white mb-3"
            >
              {currentQuestion.title}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-xl text-gray-400"
            >
              {currentQuestion.subtitle}
            </motion.p>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-gray-500 flex items-center justify-center gap-2"
          >
            <span className="text-xl">🐥</span>
            Fluffy can't wait to help you close more deals!
          </motion.p>
        </div>
      );
    }

    // Single select questions
    if (currentQuestion.type === "single-select") {
      return (
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
      );
    }

    // Text input questions
    if (currentQuestion.type === "text-input") {
      // Special handling for company details (multiple fields)
      if (currentQuestion.id === "companyDetails") {
        return (
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

            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <label className="block text-sm font-medium text-gray-400 mb-2">Company Name</label>
                <Input
                  value={data.companyName}
                  onChange={(e) => handleTextInput("companyName", e.target.value)}
                  placeholder="Acme Inc."
                  className="h-14 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-500/50 focus:ring-yellow-500/20 rounded-xl text-lg"
                  data-testid="input-companyName"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <label className="block text-sm font-medium text-gray-400 mb-2">City</label>
                <Input
                  value={data.companyCity}
                  onChange={(e) => handleTextInput("companyCity", e.target.value)}
                  placeholder="San Francisco"
                  className="h-14 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-500/50 focus:ring-yellow-500/20 rounded-xl text-lg"
                  data-testid="input-companyCity"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <label className="block text-sm font-medium text-gray-400 mb-2">State</label>
                <Input
                  value={data.companyState}
                  onChange={(e) => handleTextInput("companyState", e.target.value)}
                  placeholder="California"
                  className="h-14 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-500/50 focus:ring-yellow-500/20 rounded-xl text-lg"
                  data-testid="input-companyState"
                />
              </motion.div>
            </div>
          </div>
        );
      }

      // Standard text input
      return (
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

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {currentQuestion.inputType === "textarea" ? (
              <Textarea
                value={data[currentQuestion.id as keyof OnboardingData] as string || ""}
                onChange={(e) => handleTextInput(currentQuestion.id, e.target.value)}
                placeholder={currentQuestion.placeholder}
                className="min-h-[120px] bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-500/50 focus:ring-yellow-500/20 rounded-xl text-lg p-4"
                data-testid={`input-${currentQuestion.id}`}
              />
            ) : (
              <Input
                type={currentQuestion.inputType === "url" ? "url" : "text"}
                value={data[currentQuestion.id as keyof OnboardingData] as string || ""}
                onChange={(e) => handleTextInput(currentQuestion.id, e.target.value)}
                placeholder={currentQuestion.placeholder}
                className="h-14 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-500/50 focus:ring-yellow-500/20 rounded-xl text-lg"
                data-testid={`input-${currentQuestion.id}`}
              />
            )}
          </motion.div>
        </div>
      );
    }

    return null;
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
            {getButtonText()}
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </motion.div>,
    document.body
  );
}
