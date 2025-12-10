import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowRight, Map, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

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

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
      toast({
        title: "LEVEL UNLOCKED! 🦆",
        description: "Welcome to the inner circle.",
        className: "bg-primary text-primary-foreground border-none font-heading font-bold",
      });
    } else {
      toast({
        title: "WRONG CODE 🚫",
        description: "That's not the secret password!",
        variant: "destructive",
        className: "font-heading font-bold",
      });
    }
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
                onClick={() => setCurrentIndex(0)}
                className="fixed top-6 right-6 z-50 p-2 rounded-full bg-black/60 hover:bg-black/80 transition-colors cursor-pointer"
                data-testid="button-close-overlay"
              >
                <X className="w-6 h-6 text-white/70 hover:text-white" />
              </motion.button>
              <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 max-w-md w-full scale-110 shadow-2xl flex flex-col gap-4 px-4">
                <div className="w-full">
                  <div className="relative flex-1 group/input flex items-center">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 bg-blue-500/20 blur-xl rounded-lg z-0"
                    />
                    
                    <Input 
                      type="text" 
                      placeholder="ENTER_SECRET_CODE" 
                      className="h-16 bg-black border-none text-xl md:text-2xl pl-8 pr-16 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-white/40 font-code tracking-widest uppercase text-white w-full relative z-10 transition-all duration-500 text-center shadow-[0_0_30px_rgba(59,130,246,0.3)]"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && code.length >= 6 && handleQuack()}
                      autoFocus
                      data-testid="input-secret-code-floating"
                    />

                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white/60 group-focus-within/input:border-white transition-colors pointer-events-none z-10" />
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white/60 group-focus-within/input:border-white transition-colors pointer-events-none z-10" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white/60 group-focus-within/input:border-white transition-colors pointer-events-none z-10" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white/60 group-focus-within/input:border-white transition-colors pointer-events-none z-10" />
                    
                    <AnimatePresence>
                      {code.length >= 6 && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ type: "spring", stiffness: 300, damping: 25 }}
                          className="absolute right-3 z-20"
                        >
                          <Button 
                            size="icon" 
                            className="h-10 w-10 rounded-md bg-gray-700 text-white hover:bg-gray-600 hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
                            onClick={handleQuack}
                            data-testid="button-quack-floating"
                          >
                            <ArrowRight className="w-5 h-5" />
                          </Button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full text-center mt-24"
                >
                  <Button variant="link" className="text-white/60 hover:text-white transition-colors font-code uppercase tracking-widest text-sm no-underline hover:no-underline cursor-pointer" data-testid="link-apply-code">
                    Apply for a code <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </motion.div>
              </div>
            </>,
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
