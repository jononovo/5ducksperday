import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowRight, Map, X, Unlock, Sparkles, User, Mail, ChevronRight, ChevronLeft, Check } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";

type OnboardingPhase = "A" | "B" | "C";
type OnboardingStep = 0 | 1 | 2 | 3 | 4 | 5;

interface FormData {
  name: string;
  email: string;
  role: string;
  offering: string;
  target: string;
  goal: string;
}

import duckImage from "./assets/3d_cute_duckling_mascot_edited.png";
import bgImage from "./assets/abstract_3d_sales_background_with_envelopes_and_charts.png";
import salesImage from "./assets/sales_meeting_v9_transparent.png";
import dealFlowImage from "./assets/deal_flow_v6_transparent.png";
import leadsImage from "./assets/email-notification-no-bg-crop.png";
import outreachImage from "./assets/outreach_campaign_v9_transparent.png";
import danImage from "./assets/professional_headshot_of_dan_hartmann.png";
import sarahImage from "./assets/professional_headshot_of_sarah_chen.png";
import mikeImage from "./assets/professional_headshot_of_mike_ross.png";
import alexImage from "./assets/natural_outdoor_portrait_of_older_alex_rivera_with_beard.png";

export default function LandingStealth() {
  const [code, setCode] = useState("");
  const { toast } = useToast();
  const [isHoveringDuck, setIsHoveringDuck] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentTestimonialIndex, setCurrentTestimonialIndex] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [isQuestHovered, setIsQuestHovered] = useState(false);
  
  // Onboarding flow state
  const [phase, setPhase] = useState<OnboardingPhase>("A");
  const [step, setStep] = useState<OnboardingStep>(0);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    role: "",
    offering: "",
    target: "",
    goal: "",
  });
  
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Fire confetti from the button position
  const fireUnlockConfetti = () => {
    const button = buttonRef.current;
    if (!button) {
      // Fallback to center
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { x: 0.5, y: 0.5 },
        colors: ['#fbbf24', '#f59e0b', '#d97706', '#22c55e', '#10b981'],
      });
      return;
    }
    
    const rect = button.getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = (rect.top + rect.height / 2) / window.innerHeight;
    
    // Golden sparkle burst
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { x, y },
      colors: ['#fbbf24', '#f59e0b', '#d97706', '#fef3c7'],
      shapes: ['circle', 'square'],
      scalar: 1.2,
    });
    
    // Secondary burst with stars
    setTimeout(() => {
      confetti({
        particleCount: 40,
        spread: 100,
        origin: { x, y },
        colors: ['#22c55e', '#10b981', '#a3e635'],
        shapes: ['circle'],
        scalar: 0.8,
      });
    }, 150);
  };

  const content = [
    { 
      text: "Sales", 
      component: (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center">
          <div className="text-4xl mb-4">🤝</div>
          <h3 className="text-2xl font-bold text-white mb-2">Close More Deals</h3>
          <p className="text-sm text-gray-400">Automate your outreach and focus on closing.</p>
        </div>
      ), 
      label: "Meeting Booked",
      rotation: -3
    },
    { 
      text: "Sales", 
      image: salesImage, 
      label: "Meeting Booked", 
      rotation: 2, 
      duration: 4000
    },
    { 
      text: "Deal-flow", 
      image: dealFlowImage, 
      label: "Demo Call", 
      rotation: -2, 
      duration: 4000,
      containerClass: "!bg-transparent !border-none !shadow-none !backdrop-blur-none",
      imageClass: "mix-blend-screen scale-125 object-contain"
    },
    { 
      text: "Leads", 
      image: leadsImage, 
      label: "New Reply", 
      rotation: 4, 
      duration: 4000,
      containerClass: "!bg-transparent !border-none !shadow-none !backdrop-blur-none",
      imageClass: "mix-blend-screen scale-125 object-contain"
    },
    { 
      text: "Outreach", 
      image: outreachImage, 
      label: "Campaign Sent", 
      rotation: -3, 
      duration: 4000,
      containerClass: "!bg-transparent !border-none !shadow-none !backdrop-blur-none",
      imageClass: "mix-blend-screen scale-125 object-contain"
    },
    { text: "Sales", label: "Enter Code", duration: 30000 },
  ];

  const testimonials = [
    {
      quote: "Sales for dummies (or busy people)",
      author: "Alex Rivera",
      role: "Growth Hacker Daily",
      image: alexImage
    },
    {
      quote: "...crushes distractions and procrastination",
      author: "Sarah Chen",
      role: "TechWeekly",
      image: sarahImage
    },
    {
      quote: "...simplifies prospecting & outreach into one page",
      author: "Mike Polinski",
      role: "Startup Insider",
      image: mikeImage
    }
  ];

  useEffect(() => {
    // Pause cycling when overlay is open and user is typing
    if (currentIndex === 5 && code.length > 0) {
      return;
    }
    
    const item = content[currentIndex];
    const duration = (item as any).duration || 6000;
    
    const timeout = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % content.length);
    }, duration);

    const testimonialInterval = setInterval(() => {
      setCurrentTestimonialIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => {
      clearTimeout(timeout);
      clearInterval(testimonialInterval);
    };
  }, [currentIndex, code]);

  const handleQuack = () => {
    if (code.toLowerCase() === "quack") {
      // Start unlock animation sequence
      setIsUnlocking(true);
      
      // Fire confetti immediately
      fireUnlockConfetti();
      
      // Show toast
      toast({
        title: "LEVEL UNLOCKED! 🦆",
        description: "Welcome to the inner circle.",
        className: "bg-primary text-primary-foreground border-none font-heading font-bold",
      });
      
      // Transition to Phase B after animation delay
      setTimeout(() => {
        setPhase("B");
        setIsUnlocking(false);
      }, 800);
    } else {
      toast({
        title: "WRONG CODE 🚫",
        description: "That's not the secret password!",
        variant: "destructive",
        className: "font-heading font-bold",
      });
    }
  };
  
  const handlePhaseB_Continue = () => {
    if (formData.name && formData.email) {
      setPhase("C");
      setStep(0);
    } else {
      toast({
        title: "Please fill in your details",
        description: "We need your name and email to continue.",
        variant: "destructive",
      });
    }
  };
  
  const handleNextStep = () => {
    if (step < 5) {
      setStep((prev) => (prev + 1) as OnboardingStep);
    }
  };
  
  const handlePrevStep = () => {
    if (step > 0) {
      setStep((prev) => (prev - 1) as OnboardingStep);
    } else {
      // Go back to Phase B
      setPhase("B");
    }
  };
  
  const handleSelectOption = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Auto-advance after selection with small delay for visual feedback
    setTimeout(() => {
      // Allow advancing from step 1-4 to the next step (including to step 5 completion)
      if (step >= 1 && step <= 4) {
        setStep((prev) => (prev + 1) as OnboardingStep);
      }
    }, 300);
  };

  return (
    <div className="min-h-screen w-full bg-background overflow-x-hidden relative flex flex-col">
      <div className="relative z-10 min-h-[90vh] flex flex-col justify-center">
        <div className="absolute top-6 left-6 md:top-10 md:left-10 z-30">
            <div className="font-bold flex items-center text-3xl">
              <div className="flex items-end ml-3">
                <span className="text-3xl opacity-80">🐥</span>
                <span className="text-2xl md:inline hidden opacity-60">🥚🥚🥚🥚</span>
              </div>
            </div>
        </div>

        <div className="absolute top-10 left-0 right-0 flex justify-center z-20">
             <span className="px-4 py-1.5 rounded-full bg-white/5 text-white/20 text-xs font-bold uppercase tracking-widest border border-white/5 backdrop-blur-md">
               Stealth Mode
             </span>
        </div>

        <div className="absolute top-4 right-6 md:top-6 md:right-10 z-30">
          <a href="/auth" className="text-sm text-white/10 hover:text-white/30 transition-colors font-bold uppercase tracking-widest" data-testid="link-login">
            Login
          </a>
        </div>

        <div className="absolute inset-0 z-0">
          <img 
            src={bgImage} 
            alt="Background" 
            className="w-full h-full object-cover opacity-40 mix-blend-screen"
          />
          <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px]" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
        </div>

        <div className="container mx-auto px-6 relative z-10 grid lg:grid-cols-2 gap-12 items-center py-20">
        
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col gap-8 max-w-xl"
        >
          <div className="space-y-4 relative pt-12 lg:pt-24">
            <motion.span 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 0.8, y: 0 }}
              transition={{ duration: 0.5, delay: 0 }}
              className="block text-sm lg:text-base text-gray-400 font-medium tracking-widest uppercase mb-2 pl-1 font-mono"
            >
              Founder-led
            </motion.span>
            <h1 className="text-6xl lg:text-8xl font-bold leading-[0.9] tracking-normal text-gray-200 font-serif h-[1.8em] relative z-20">
              <span className="block mb-2">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={content[currentIndex].text}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="inline-block"
                  >
                    {content[currentIndex].text}.
                  </motion.span>
                </AnimatePresence>
              </span>
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-100 drop-shadow-[0_0_30px_rgba(250,204,21,0.3)]">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={currentIndex >= 3 ? "simplified" : "gamified"}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                    className="inline-block"
                  >
                    {currentIndex >= 3 ? "Simplified." : "Gamified."}
                  </motion.span>
                </AnimatePresence>
              </span>
            </h1>

            <div className="absolute -top-12 -right-4 md:-right-24 lg:-right-32 w-48 h-32 md:w-64 md:h-40 pointer-events-none z-10 hidden sm:block">
              <AnimatePresence mode="wait">
                 {currentIndex === 0 && (
                   <motion.div
                     key="visual-context-left"
                     layoutId="visual-context"
                     initial={{ opacity: 0, x: -20, scale: 0.9, rotate: -5 }}
                     animate={{ opacity: 1, x: 0, scale: 1, rotate: 3 }}
                     exit={{ opacity: 0, x: 20, scale: 0.9, rotate: 10 }}
                     transition={{ duration: 0.6, ease: "circOut" }}
                     className="relative w-full h-full"
                   >
                     <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-cyan-400/20 rounded-xl blur-xl" />
                     <div className="relative w-full h-full rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-black/50 backdrop-blur-sm">
                        {content[currentIndex].component}
                     </div>
                   </motion.div>
                 )}
              </AnimatePresence>
            </div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.4 }}
              className="text-xl text-muted-foreground leading-relaxed max-w-md font-medium relative z-20 pt-8"
            >
              <TooltipProvider delayDuration={1500}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span 
                      className="inline-flex items-center gap-2 cursor-pointer"
                      onMouseEnter={() => setIsQuestHovered(true)}
                      onMouseLeave={() => setIsQuestHovered(false)}
                      style={{ perspective: "600px" }}
                    >
                      <motion.span
                        animate={isQuestHovered ? {
                          scale: [1, 1.2, 1],
                          rotate: [0, 15, 0]
                        } : {}}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                      >
                        <Map className="w-5 h-5" />
                      </motion.span>
                      <motion.span
                        animate={{ 
                          color: isQuestHovered ? "rgba(255,255,255,1)" : "rgba(255,255,255,0.7)",
                          textShadow: isQuestHovered ? "0 0 8px rgba(255,255,255,0.3)" : "none"
                        }}
                        transition={{ duration: 0.2 }}
                        className="cursor-pointer"
                      >
                        Quest 1:
                      </motion.span>
                      <span className="inline-flex items-center overflow-hidden">
                        <motion.span
                          className="inline-flex text-muted-foreground/70"
                          initial="hidden"
                          animate={isQuestHovered ? "revealed" : "hidden"}
                          variants={{
                            hidden: { transition: { staggerChildren: 0.015, staggerDirection: -1 } },
                            revealed: { transition: { staggerChildren: 0.025, delayChildren: 0.05 } }
                          }}
                        >
                          {"Find your target customers".split("").map((char, i) => (
                            <motion.span
                              key={i}
                              className="inline-block"
                              variants={{
                                hidden: { x: -8, opacity: 0, scale: 0.8 },
                                revealed: { x: 0, opacity: 1, scale: 1 }
                              }}
                              transition={{ duration: 0.15, ease: "easeOut" }}
                            >
                              {char === " " ? "\u00A0" : char}
                            </motion.span>
                          ))}
                        </motion.span>
                      </span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs bg-gray-900 text-white border-gray-700">
                    <p>Don't worry "Fluffy" 🐥 has AI search for this - She's incredible!</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </motion.div>
          </div>

          {currentIndex !== 5 && (
            <div className="flex flex-col gap-4 w-full max-w-md mt-4">
              <div className="relative flex-1 group/input flex items-center">
                <Input 
                  type="text" 
                  placeholder="ENTER_SECRET_CODE" 
                  className="h-16 bg-black/40 backdrop-blur-md border-none text-xl md:text-2xl pl-8 pr-16 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-white/40 font-code tracking-widest uppercase text-white w-full relative z-10 transition-all duration-500 text-center"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && code.length >= 6 && handleQuack()}
                  onFocus={() => setCurrentIndex(5)}
                  data-testid="input-secret-code"
                />

                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white/60 group-focus-within/input:border-white transition-colors pointer-events-none z-10" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white/60 group-focus-within/input:border-white transition-colors pointer-events-none z-10" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white/60 group-focus-within/input:border-white transition-colors pointer-events-none z-10" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white/60 group-focus-within/input:border-white transition-colors pointer-events-none z-10" />
                
                <AnimatePresence>
                  {code.length >= 6 && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      className="absolute right-3 z-20 p-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors flex items-center justify-center"
                      onClick={handleQuack}
                      data-testid="button-quack"
                    >
                      <ArrowRight className="w-5 h-5 text-white" />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          {isMounted && currentIndex === 5 && createPortal(
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                transition={{ duration: 0.5 }}
              />
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                onClick={() => { setCurrentIndex(0); setPhase("A"); }}
                className="fixed top-6 right-6 z-50 p-2 rounded-full bg-black/60 hover:bg-black/80 transition-colors cursor-pointer"
                data-testid="button-close-overlay"
              >
                <X className="w-6 h-6 text-white/70 hover:text-white" />
              </motion.button>
              
              <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 max-w-md w-full scale-110 shadow-2xl flex flex-col gap-4 px-4">
                {/* Phase A: Secret Code Input */}
                <AnimatePresence mode="wait">
                  {phase === "A" && (
                    <motion.div 
                      key="phase-a"
                      initial={{ opacity: 1 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="w-full"
                    >
                      <div className="relative flex-1 group/input flex items-center">
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ 
                            opacity: isUnlocking ? 0.8 : 1,
                            scale: isUnlocking ? 1.2 : 1,
                          }}
                          className={`absolute inset-0 blur-xl rounded-lg z-0 transition-colors duration-300 ${
                            isUnlocking ? 'bg-yellow-500/40' : 'bg-blue-500/20'
                          }`}
                        />
                        
                        <Input 
                          type="text" 
                          placeholder="ENTER_SECRET_CODE" 
                          className={`h-16 bg-black border-none text-xl md:text-2xl pl-8 pr-16 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-white/40 font-code tracking-widest uppercase text-white w-full relative z-10 transition-all duration-500 text-center ${
                            isUnlocking 
                              ? 'shadow-[0_0_40px_rgba(250,204,21,0.5)]' 
                              : 'shadow-[0_0_30px_rgba(59,130,246,0.3)]'
                          }`}
                          value={code}
                          onChange={(e) => setCode(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && code.length >= 6 && handleQuack()}
                          autoFocus
                          disabled={isUnlocking}
                          data-testid="input-secret-code-floating"
                        />

                        <div className={`absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 transition-colors pointer-events-none z-10 ${isUnlocking ? 'border-yellow-400' : 'border-white/60 group-focus-within/input:border-white'}`} />
                        <div className={`absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 transition-colors pointer-events-none z-10 ${isUnlocking ? 'border-yellow-400' : 'border-white/60 group-focus-within/input:border-white'}`} />
                        <div className={`absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 transition-colors pointer-events-none z-10 ${isUnlocking ? 'border-yellow-400' : 'border-white/60 group-focus-within/input:border-white'}`} />
                        <div className={`absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 transition-colors pointer-events-none z-10 ${isUnlocking ? 'border-yellow-400' : 'border-white/60 group-focus-within/input:border-white'}`} />
                        
                        <AnimatePresence>
                          {code.length >= 6 && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ 
                                opacity: 1, 
                                scale: isUnlocking ? [1, 1.3, 1] : 1,
                              }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              transition={{ type: "spring", stiffness: 300, damping: 25 }}
                              className="absolute right-3 z-20"
                            >
                              <Button 
                                ref={buttonRef}
                                size="icon" 
                                className={`h-10 w-10 rounded-md text-white hover:scale-105 active:scale-95 transition-all flex items-center justify-center ${
                                  isUnlocking 
                                    ? 'bg-gradient-to-r from-yellow-500 to-amber-500 shadow-[0_0_20px_rgba(250,204,21,0.6)]' 
                                    : 'bg-gray-700 hover:bg-gray-600'
                                }`}
                                onClick={handleQuack}
                                disabled={isUnlocking}
                                data-testid="button-quack-floating"
                              >
                                {isUnlocking ? (
                                  <motion.div
                                    animate={{ rotate: [0, 360] }}
                                    transition={{ duration: 0.5 }}
                                  >
                                    <Unlock className="w-5 h-5" />
                                  </motion.div>
                                ) : (
                                  <ArrowRight className="w-5 h-5" />
                                )}
                              </Button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Phase B: Expanded Contact Fields */}
                <AnimatePresence>
                  {phase === "B" && (
                    <motion.div
                      key="phase-b"
                      initial={{ opacity: 0, height: 0, y: 20 }}
                      animate={{ opacity: 1, height: "auto", y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -20 }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 200, 
                        damping: 25,
                        opacity: { duration: 0.3 }
                      }}
                      className="w-full overflow-hidden"
                    >
                      {/* Unlock success header */}
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                        className="flex items-center justify-center gap-3 mb-6"
                      >
                        <motion.div
                          animate={{ 
                            boxShadow: [
                              "0 0 20px rgba(250,204,21,0.3)",
                              "0 0 40px rgba(250,204,21,0.6)",
                              "0 0 20px rgba(250,204,21,0.3)"
                            ]
                          }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center"
                        >
                          <Sparkles className="w-6 h-6 text-white" />
                        </motion.div>
                        <div>
                          <h3 className="text-xl font-bold text-white font-heading">Access Granted!</h3>
                          <p className="text-sm text-gray-400">Tell us about yourself</p>
                        </div>
                      </motion.div>

                      {/* Glowing container for fields */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="relative"
                      >
                        <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/10 via-amber-500/5 to-transparent blur-2xl rounded-lg" />
                        
                        <div className="relative space-y-4 p-6 bg-black/40 backdrop-blur-md rounded-lg border border-white/10">
                          {/* Name Input */}
                          <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                          >
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                              Your Name
                            </label>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                              <Input
                                type="text"
                                placeholder="Enter your name"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                className="h-12 bg-black/60 border-white/10 pl-11 text-white placeholder:text-gray-500 focus-visible:ring-yellow-500/50 focus-visible:border-yellow-500/50"
                                data-testid="input-name"
                              />
                            </div>
                          </motion.div>

                          {/* Email Input */}
                          <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 }}
                          >
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                              Email Address
                            </label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                              <Input
                                type="email"
                                placeholder="you@example.com"
                                value={formData.email}
                                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                className="h-12 bg-black/60 border-white/10 pl-11 text-white placeholder:text-gray-500 focus-visible:ring-yellow-500/50 focus-visible:border-yellow-500/50"
                                data-testid="input-email"
                              />
                            </div>
                          </motion.div>

                          {/* Continue Button */}
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="pt-2"
                          >
                            <Button
                              onClick={handlePhaseB_Continue}
                              className="w-full h-12 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-black font-bold text-lg shadow-[0_0_20px_rgba(250,204,21,0.3)] hover:shadow-[0_0_30px_rgba(250,204,21,0.5)] transition-all"
                              data-testid="button-continue-setup"
                            >
                              Continue to Setup
                              <ChevronRight className="w-5 h-5 ml-2" />
                            </Button>
                          </motion.div>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Apply for code link - only show in Phase A */}
                {phase === "A" && !isUnlocking && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full text-center mt-24"
                  >
                    <Button variant="link" className="text-white/60 hover:text-white transition-colors font-code uppercase tracking-widest text-sm no-underline hover:no-underline cursor-pointer" data-testid="link-apply-code">
                      Apply for a code <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </motion.div>
                )}
              </div>
            </>,
            document.body
          )}
          
          {/* Phase C: Full-screen Onboarding Modal */}
          {isMounted && phase === "C" && createPortal(
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-gradient-to-b from-gray-900 via-black to-gray-900 flex flex-col"
            >
              {/* Progress Bar */}
              <div className="w-full h-1 bg-gray-800">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${((step + 1) / 6) * 100}%` }}
                  transition={{ type: "spring", stiffness: 100, damping: 20 }}
                  className="h-full bg-gradient-to-r from-yellow-500 to-amber-500"
                />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <Button
                  variant="ghost"
                  onClick={handlePrevStep}
                  className="text-white/60 hover:text-white"
                  data-testid="button-back"
                >
                  <ChevronLeft className="w-5 h-5 mr-1" />
                  Back
                </Button>
                <span className="text-sm text-gray-500 font-mono">
                  Step {step + 1} of 6
                </span>
                <Button
                  variant="ghost"
                  onClick={() => { setPhase("A"); setCurrentIndex(0); }}
                  className="text-white/60 hover:text-white"
                  data-testid="button-close-onboarding"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Content Area */}
              <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
                <div className="max-w-lg w-full">
                  <AnimatePresence mode="wait">
                    {/* Step 0: Welcome */}
                    {step === 0 && (
                      <motion.div
                        key="step-0"
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        className="text-center"
                      >
                        <motion.div
                          animate={{ y: [0, -10, 0] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="text-8xl mb-6"
                        >
                          🦆
                        </motion.div>
                        <h2 className="text-3xl font-bold text-white mb-4 font-heading">
                          Welcome, {formData.name}!
                        </h2>
                        <p className="text-gray-400 text-lg mb-8">
                          Let's set up your personalized sales journey. This will only take a minute.
                        </p>
                        <Button
                          onClick={handleNextStep}
                          className="h-14 px-8 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-black font-bold text-lg"
                          data-testid="button-start-journey"
                        >
                          Let's Go!
                          <ChevronRight className="w-5 h-5 ml-2" />
                        </Button>
                      </motion.div>
                    )}

                    {/* Step 1: Role */}
                    {step === 1 && (
                      <motion.div
                        key="step-1"
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                      >
                        <h2 className="text-2xl font-bold text-white mb-2 font-heading text-center">
                          What's your role?
                        </h2>
                        <p className="text-gray-400 text-center mb-8">
                          This helps us personalize your experience
                        </p>
                        <div className="grid gap-3">
                          {[
                            { value: "founder", label: "Founder / CEO", icon: "🚀" },
                            { value: "sales", label: "Sales Professional", icon: "💼" },
                            { value: "marketing", label: "Marketing", icon: "📣" },
                            { value: "other", label: "Other", icon: "✨" },
                          ].map((option) => (
                            <motion.button
                              key={option.value}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleSelectOption("role", option.value)}
                              className={`p-4 rounded-lg border text-left flex items-center gap-4 transition-all ${
                                formData.role === option.value
                                  ? "bg-yellow-500/20 border-yellow-500 text-white"
                                  : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20"
                              }`}
                              data-testid={`option-role-${option.value}`}
                            >
                              <span className="text-2xl">{option.icon}</span>
                              <span className="font-medium">{option.label}</span>
                              {formData.role === option.value && (
                                <Check className="w-5 h-5 ml-auto text-yellow-500" />
                              )}
                            </motion.button>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {/* Step 2: Offering */}
                    {step === 2 && (
                      <motion.div
                        key="step-2"
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                      >
                        <h2 className="text-2xl font-bold text-white mb-2 font-heading text-center">
                          What are you selling?
                        </h2>
                        <p className="text-gray-400 text-center mb-8">
                          We'll tailor your outreach strategy accordingly
                        </p>
                        <div className="grid gap-3">
                          {[
                            { value: "product", label: "Product", desc: "Physical or digital goods", icon: "📦" },
                            { value: "service", label: "Service", desc: "Consulting, agency, or professional services", icon: "🛠️" },
                            { value: "saas", label: "SaaS / Software", desc: "Subscription-based software", icon: "💻" },
                            { value: "both", label: "Both", desc: "Products and services", icon: "🎯" },
                          ].map((option) => (
                            <motion.button
                              key={option.value}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleSelectOption("offering", option.value)}
                              className={`p-4 rounded-lg border text-left flex items-center gap-4 transition-all ${
                                formData.offering === option.value
                                  ? "bg-yellow-500/20 border-yellow-500 text-white"
                                  : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20"
                              }`}
                              data-testid={`option-offering-${option.value}`}
                            >
                              <span className="text-2xl">{option.icon}</span>
                              <div>
                                <span className="font-medium block">{option.label}</span>
                                <span className="text-sm text-gray-500">{option.desc}</span>
                              </div>
                              {formData.offering === option.value && (
                                <Check className="w-5 h-5 ml-auto text-yellow-500" />
                              )}
                            </motion.button>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {/* Step 3: Target */}
                    {step === 3 && (
                      <motion.div
                        key="step-3"
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                      >
                        <h2 className="text-2xl font-bold text-white mb-2 font-heading text-center">
                          Who's your ideal customer?
                        </h2>
                        <p className="text-gray-400 text-center mb-8">
                          This helps us find the right prospects for you
                        </p>
                        <div className="grid gap-3">
                          {[
                            { value: "b2b", label: "B2B", desc: "Other businesses and companies", icon: "🏢" },
                            { value: "b2c", label: "B2C", desc: "Individual consumers", icon: "👤" },
                            { value: "both", label: "Both B2B & B2C", desc: "Mixed customer base", icon: "🌐" },
                          ].map((option) => (
                            <motion.button
                              key={option.value}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleSelectOption("target", option.value)}
                              className={`p-4 rounded-lg border text-left flex items-center gap-4 transition-all ${
                                formData.target === option.value
                                  ? "bg-yellow-500/20 border-yellow-500 text-white"
                                  : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20"
                              }`}
                              data-testid={`option-target-${option.value}`}
                            >
                              <span className="text-2xl">{option.icon}</span>
                              <div>
                                <span className="font-medium block">{option.label}</span>
                                <span className="text-sm text-gray-500">{option.desc}</span>
                              </div>
                              {formData.target === option.value && (
                                <Check className="w-5 h-5 ml-auto text-yellow-500" />
                              )}
                            </motion.button>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {/* Step 4: Goal */}
                    {step === 4 && (
                      <motion.div
                        key="step-4"
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                      >
                        <h2 className="text-2xl font-bold text-white mb-2 font-heading text-center">
                          What's your main goal?
                        </h2>
                        <p className="text-gray-400 text-center mb-8">
                          We'll prioritize features that help you achieve this
                        </p>
                        <div className="grid gap-3">
                          {[
                            { value: "leads", label: "Generate More Leads", desc: "Build a bigger pipeline", icon: "🎣" },
                            { value: "deals", label: "Close More Deals", desc: "Convert leads to customers", icon: "🤝" },
                            { value: "pipeline", label: "Build My Pipeline", desc: "Organize and track prospects", icon: "📊" },
                            { value: "automate", label: "Automate Outreach", desc: "Save time on repetitive tasks", icon: "🤖" },
                          ].map((option) => (
                            <motion.button
                              key={option.value}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleSelectOption("goal", option.value)}
                              className={`p-4 rounded-lg border text-left flex items-center gap-4 transition-all ${
                                formData.goal === option.value
                                  ? "bg-yellow-500/20 border-yellow-500 text-white"
                                  : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20"
                              }`}
                              data-testid={`option-goal-${option.value}`}
                            >
                              <span className="text-2xl">{option.icon}</span>
                              <div>
                                <span className="font-medium block">{option.label}</span>
                                <span className="text-sm text-gray-500">{option.desc}</span>
                              </div>
                              {formData.goal === option.value && (
                                <Check className="w-5 h-5 ml-auto text-yellow-500" />
                              )}
                            </motion.button>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {/* Step 5: Completion */}
                    {step === 5 && (
                      <motion.div
                        key="step-5"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="text-center"
                        onAnimationComplete={() => {
                          // Fire celebration confetti
                          confetti({
                            particleCount: 150,
                            spread: 100,
                            origin: { y: 0.6 },
                            colors: ['#fbbf24', '#f59e0b', '#22c55e', '#10b981', '#3b82f6'],
                          });
                        }}
                      >
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                          className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-[0_0_40px_rgba(34,197,94,0.4)]"
                        >
                          <Check className="w-12 h-12 text-white" />
                        </motion.div>
                        <h2 className="text-3xl font-bold text-white mb-4 font-heading">
                          You're All Set! 🎉
                        </h2>
                        <p className="text-gray-400 text-lg mb-8">
                          Your personalized sales journey is ready. Let's start finding your ideal customers.
                        </p>
                        <Button
                          onClick={() => {
                            setPhase("A");
                            setCurrentIndex(0);
                            toast({
                              title: "Setup Complete!",
                              description: "Welcome to the platform. Your journey begins now.",
                              className: "bg-green-600 text-white border-none",
                            });
                          }}
                          className="h-14 px-8 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold text-lg"
                          data-testid="button-complete"
                        >
                          Start My Journey
                          <ChevronRight className="w-5 h-5 ml-2" />
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>,
            document.body
          )}
            
            <div className="flex items-center gap-6">
             <div className="flex items-center gap-4 text-sm text-muted-foreground/80 p-3 rounded-2xl bg-white/5 border border-white/5 w-fit backdrop-blur-md hover:bg-white/10 transition-colors cursor-default">
              <div className="flex -space-x-3">
                {[danImage, sarahImage, mikeImage].map((img, i) => (
                  <div key={i} className="w-8 h-8 rounded-full overflow-hidden border border-white/10 shadow-lg bg-gray-800">
                    <img src={img} alt="Player" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              <p className="font-heading"><span className="text-white font-bold">1,248</span> Players Waiting</p>
            </div>

            <Button variant="link" className="text-muted-foreground hover:text-gray-400 transition-colors font-heading cursor-pointer" data-testid="link-apply">
              Apply for a code <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </motion.div>

        <div className="relative flex items-center justify-center w-full h-[500px]">
           <AnimatePresence mode="wait">
             {currentIndex !== 0 && currentIndex !== 5 && (
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] max-w-md aspect-video z-10">
                 <motion.div
                   key="visual-context-right"
                   layoutId="visual-context"
                   initial={{ opacity: 0, scale: 0.8 }}
                   animate={{ opacity: 1, scale: 1, rotate: content[currentIndex].rotation || 0 }}
                   exit={{ opacity: 0, scale: 0.8 }}
                   transition={{ duration: 0.6, ease: "circOut" }}
                   className="w-full h-full"
                 >
                    <div className="absolute inset-0 bg-gradient-to-tr from-primary/30 to-cyan-400/30 rounded-2xl blur-2xl transform scale-105 opacity-60" />

                    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black/50 backdrop-blur-sm group">
                      <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-cyan-400/10 opacity-50" />
                      <img 
                        src={content[currentIndex].image} 
                        alt={content[currentIndex].label}
                        className="w-full h-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-105"
                      />
                    </div>
                 </motion.div>
               </div>
             )}
           </AnimatePresence>

           <motion.div 
             initial={{ opacity: 0, scale: 0.8, rotate: 10 }}
          animate={{ 
            opacity: currentIndex === 0 ? 1 : 0, 
            scale: currentIndex === 0 ? 1 : 0.5, 
            x: currentIndex === 0 ? 0 : 400,
            y: currentIndex === 0 ? 0 : -400,
            rotate: currentIndex === 0 ? 0 : 45
          }}
          transition={{ duration: 0.8, type: "spring" }}
          className="relative flex items-center justify-center z-20"
          onMouseEnter={() => setIsHoveringDuck(true)}
          onMouseLeave={() => setIsHoveringDuck(false)}
        >
           <motion.div 
             animate={{ 
               scale: isHoveringDuck ? 1.2 : 1,
               opacity: isHoveringDuck ? 0.8 : (currentIndex === 0 ? 0.5 : 0)
             }}
             className="absolute inset-0 bg-primary/30 blur-[120px] rounded-full" 
           />
           
           <motion.img 
            src={duckImage} 
            alt="Fluffy the Duck" 
            animate={{ 
              y: currentIndex === 0 ? [0, -20, 0] : 0,
              rotate: isHoveringDuck ? [0, -5, 5, 0] : 0
            }}
            transition={{ 
              y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
              rotate: { duration: 0.5 }
            }}
            className="relative z-10 w-full max-w-[300px] lg:max-w-[350px] drop-shadow-2xl cursor-pointer"
            style={{ filter: "drop-shadow(0 30px 60px rgba(0,0,0,0.6))" }}
           />
           
           <AnimatePresence>
             {currentIndex === 0 && (
               <>
                 <motion.div 
                   initial={{ opacity: 0, x: 20 }}
                   animate={{ opacity: 1, x: 0, y: [0, -10, 0] }}
                   exit={{ opacity: 0, scale: 0.5 }}
                   transition={{ duration: 0.5, y: { duration: 3, repeat: Infinity, ease: "easeInOut" } }}
                   className="absolute top-10 right-0 lg:-right-12 bg-black/40 backdrop-blur-md border border-white/5 p-4 rounded-2xl z-20 shadow-2xl flex items-center gap-3 w-48"
                 >
                   <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-xl border border-blue-500/20">
                     📧
                   </div>
                   <div>
                     <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Action</p>
                     <p className="text-sm font-bold text-gray-200">Email Sent <span className="text-gray-500">+50XP</span></p>
                   </div>
                 </motion.div>
      
                 <motion.div 
                   initial={{ opacity: 0, x: -20 }}
                   animate={{ opacity: 1, x: 0, y: [0, 15, 0] }}
                   exit={{ opacity: 0, scale: 0.5 }}
                   transition={{ duration: 0.5, delay: 0.1, y: { duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 } }}
                   className="absolute bottom-20 -left-4 lg:-left-16 bg-black/40 backdrop-blur-md border border-white/5 p-4 rounded-2xl z-20 shadow-2xl flex items-center gap-3 w-52"
                 >
                   <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-xl border border-green-500/20">
                     🎯
                   </div>
                   <div>
                     <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">New Lead</p>
                     <p className="text-sm font-bold text-gray-200">Prospect Found</p>
                   </div>
                 </motion.div>
      
                 <motion.div 
                   initial={{ opacity: 0, scale: 0.8 }}
                   animate={{ opacity: 1, scale: 1, y: [0, -8, 0] }}
                   exit={{ opacity: 0, scale: 0.5 }}
                   transition={{ duration: 0.5, delay: 0.2, y: { duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 } }}
                   className="absolute -bottom-4 right-10 bg-black/40 backdrop-blur-md border border-white/5 text-gray-200 p-3 rounded-2xl z-30 shadow-xl flex items-center gap-2"
                 >
                   <span className="text-xl">🔥</span>
                   <div className="leading-tight">
                     <p className="text-xs font-black uppercase opacity-80">Streak</p>
                     <p className="text-sm font-bold">12 Days</p>
                   </div>
                 </motion.div>
               </>
             )}
           </AnimatePresence>
        </motion.div>
        </div>
      </div>

      </div>

      <div className="relative z-20 bg-[#0A0A10] border-t border-white/10 py-24">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(#1e293b 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
        
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] max-w-5xl -z-0 pointer-events-none">
           <motion.div 
             animate={{ 
               opacity: [0.1, 0.3, 0.1],
               scale: [1, 1.05, 1],
             }}
             transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
             className="absolute inset-0 bg-gradient-to-r from-primary/10 via-purple-500/10 to-blue-500/10 blur-[100px] rounded-full" 
           />
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl mx-auto">
            <div className="relative">
              
              <div className="min-h-[250px] flex flex-col justify-center items-center relative z-10">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentTestimonialIndex}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.4 }}
                    className="w-full"
                  >
                    <div className="flex flex-col md:flex-row items-end justify-center md:pl-20">
                      
                      <h3 className="relative z-20 text-4xl md:text-6xl font-serif italic leading-[1.1] text-white max-w-2xl text-left drop-shadow-2xl -mb-8 md:-mb-0 pointer-events-none">
                        &ldquo;{testimonials[currentTestimonialIndex].quote}&rdquo;
                      </h3>

                      <div className="relative z-10 flex items-center gap-5 p-6 pr-10 md:-translate-y-8 shrink-0 mt-8 md:mt-0">
                         <div className="w-20 h-20 rounded-full overflow-hidden border border-white/20 shadow-lg shrink-0">
                           <img 
                             src={testimonials[currentTestimonialIndex].image} 
                             alt={testimonials[currentTestimonialIndex].author}
                             className="w-full h-full object-cover"
                           />
                         </div>
                         <div className="text-left">
                           <p className="text-xl font-bold text-white leading-tight">{testimonials[currentTestimonialIndex].author}</p>
                           <p className="text-xs font-mono text-gray-400 uppercase tracking-widest leading-tight mt-1">{testimonials[currentTestimonialIndex].role}</p>
                         </div>
                      </div>

                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
              
              <div className="flex justify-center gap-1 mt-24 md:mt-20">
                {testimonials.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentTestimonialIndex(idx)}
                    className="py-4 px-2 group"
                    data-testid={`button-testimonial-${idx}`}
                  >
                    <div className={`h-1 rounded-full transition-all duration-300 ${
                      idx === currentTestimonialIndex 
                        ? "bg-gray-600 w-8" 
                        : "bg-white/10 group-hover:bg-white/20 w-4"
                    }`} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
