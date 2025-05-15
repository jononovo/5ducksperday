import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { 
  Search, 
  ArrowRight, 
  User, 
  PlayCircle, 
  ChevronRight,
  Sparkles
} from "lucide-react";
import { Footer } from "@/components/ui/footer";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

// Search process steps
const SEARCH_STEPS = [
  {
    id: 1,
    title: "Initiating search analysis",
    description: "Analyzing your search query and preparing the AI models...",
  },
  {
    id: 2,
    title: "Searching for companies",
    description: "Scanning databases and sources for relevant companies...",
  },
  {
    id: 3,
    title: "Identifying key companies",
    description: "Evaluating and ranking the most relevant companies...",
  },
  {
    id: 4,
    title: "Searching for contacts",
    description: "Finding decision makers and key personnel within target companies...",
  },
  {
    id: 5,
    title: "Identifying leadership roles",
    description: "Identifying executives, managers, and key contacts with decision-making power...",
  },
  {
    id: 6,
    title: "Preparing results",
    description: "Organizing and formatting the search results for presentation...",
  },
];

// Example search prompts
const EXAMPLE_PROMPTS = [
  "Plumbers in Brooklyn",
  "Software engineers in London",
  "Marketing directors in tech companies",
  "Healthcare executives in Boston",
  "Restaurants in San Francisco",
];

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchProgress, setShowSearchProgress] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLDivElement>(null);
  const [isVideoExpanded, setIsVideoExpanded] = useState(false);

  // Function to handle search submission
  const handleSearch = (query: string = searchQuery) => {
    if (!query.trim()) return;
    
    // Start fake search progress
    setShowSearchProgress(true);
    setCurrentStep(1);
    setProgress(0);

    // Use query to set a value in local storage for later use
    localStorage.setItem("pendingSearchQuery", query);
  };

  // Progress through search steps
  useEffect(() => {
    if (!showSearchProgress) return;

    // Progress bar logic
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 2;
      });
    }, 50);

    // Step advancement logic
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= SEARCH_STEPS.length) {
          clearInterval(stepInterval);
          return prev;
        }
        return prev + 1;
      });
    }, 3000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(stepInterval);
    };
  }, [showSearchProgress]);

  // Redirect to search page after "fake" search completes
  useEffect(() => {
    if (currentStep >= SEARCH_STEPS.length && progress >= 100) {
      const timer = setTimeout(() => {
        setLocation("/");
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentStep, progress, setLocation]);

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-blue-950">
      {/* Enhanced Header with subtle gradient */}
      <header className="py-4 px-6 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex justify-between items-center">
          <div className="text-2xl font-extrabold flex items-center">
            <span className="text-yellow-500 mr-0.5">5</span> 
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">Ducks</span>
            <div className="flex ml-2">
              <span className="text-2xl">🐥</span>
              <span className="text-xl">🥚🥚🥚🥚</span>
            </div>
          </div>
          
          <Link href="/auth">
            <Button 
              variant="ghost" 
              className="flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-900"
            >
              <User size={16} />
              <span>Login</span>
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="flex-1">
        <section className="py-16 md:py-24 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            {/* Animated badge */}
            <div className="mb-4 inline-flex items-center px-4 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-sm animate-pulse hover:animate-none transition-all duration-300">
              <Sparkles size={16} className="mr-2 animate-[spin_4s_linear_infinite]" />
              <span className="text-sm font-medium">AI-Powered Contact Discovery</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-extrabold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-violet-600 leading-tight">
              Find Your Perfect Prospects in Seconds
            </h1>
            
            <p className="text-xl text-slate-700 dark:text-slate-300 mb-12 max-w-2xl mx-auto leading-relaxed">
              AI that identifies the right companies and decision makers for your business
            </p>

            {/* Enhanced Search Input */}
            <div className="relative max-w-2xl mx-auto mb-10">
              {/* Animated glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 rounded-full opacity-70 blur-md animate-[pulse_3s_ease-in-out_infinite]"></div>
              
              <div className="relative bg-white dark:bg-slate-900 rounded-full">
                <Input
                  type="text"
                  placeholder="What type of businesses are you looking for?"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-36 py-7 text-lg rounded-full border-transparent shadow-lg focus-visible:ring-2 focus-visible:ring-blue-500 transition-shadow duration-300"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSearch();
                    }
                  }}
                />
                
                {/* Animated search icon */}
                <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-blue-500 transition-all duration-300 hover:scale-110" size={20} />
                
                <Button
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 rounded-full px-5 py-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 hover:shadow-lg hover:-translate-y-[2px] text-white transition-all duration-300"
                  onClick={() => handleSearch()}
                >
                  <span className="mr-2">Search</span>
                  <ArrowRight size={16} className="animate-[bounceX_1s_ease-in-out_infinite]" />
                </Button>
              </div>
            </div>
            
            {/* Custom keyframes for arrow bounce animation */}
            <style jsx>{`
              @keyframes bounceX {
                0%, 100% { transform: translateX(0); }
                50% { transform: translateX(3px); }
              }
            `}</style>

            {/* Example Search Prompts */}
            <div className="flex flex-wrap justify-center gap-2 mb-16">
              {EXAMPLE_PROMPTS.map((prompt) => (
                <Button
                  key={prompt}
                  variant="outline"
                  className="text-sm bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                  onClick={() => {
                    setSearchQuery(prompt);
                    handleSearch(prompt);
                  }}
                >
                  {prompt}
                </Button>
              ))}
            </div>
            
            <div className="flex justify-center space-x-6 my-10">
              <div className="text-center p-4">
                <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">10M+</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">Company Records</div>
              </div>
              <div className="text-center p-4">
                <div className="text-4xl font-bold text-purple-600 dark:text-purple-400 mb-2">98%</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">Contact Accuracy</div>
              </div>
              <div className="text-center p-4">
                <div className="text-4xl font-bold text-pink-600 dark:text-pink-400 mb-2">250K+</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">Daily Updates</div>
              </div>
            </div>
          </div>
        </section>

        {/* Video Section */}
        <section ref={videoRef} className="py-20 px-4 bg-white dark:bg-slate-900">
          <div className="container mx-auto max-w-5xl">
            <h2 className="text-3xl font-bold mb-8 text-center">See How It Works</h2>
            
            <div 
              className={`relative aspect-video bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden transition-all duration-500 mx-auto 
                ${isVideoExpanded ? "w-[90%] shadow-xl" : "w-[60%] cursor-pointer"}
              `}
              onClick={() => !isVideoExpanded && setIsVideoExpanded(true)}
            >
              {/* Thumbnail overlay when not expanded */}
              {!isVideoExpanded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-transparent to-slate-900/60 text-white">
                  <PlayCircle size={64} className="mb-4 text-white opacity-90" />
                  <p className="font-medium">Click to watch demo</p>
                </div>
              )}
              
              {/* Replace this with your arcade.software embed */}
              <div className="h-full w-full flex items-center justify-center">
                {isVideoExpanded ? (
                  <div className="w-full h-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                    <p className="text-muted-foreground text-center">Interactive demo will load here</p>
                  </div>
                ) : (
                  <img 
                    src="https://placehold.co/1920x1080/2563eb/FFFFFF?text=5+Ducks+Demo+Video" 
                    alt="Video thumbnail" 
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            </div>
          </div>
        </section>
        
        {/* Features Section */}
        <section className="py-16 px-4 bg-blue-50 dark:bg-blue-950/30">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-3xl font-bold mb-12 text-center">How We Find Your Perfect Prospects</h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-md">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center mb-4">
                  <Search className="text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">AI-Powered Search</h3>
                <p className="text-slate-600 dark:text-slate-400">Advanced algorithms find companies that match your exact requirements</p>
              </div>
              
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-md">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center mb-4">
                  <User className="text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Key Contact Discovery</h3>
                <p className="text-slate-600 dark:text-slate-400">Automatically identifies decision-makers and their contact information</p>
              </div>
              
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-md">
                <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/50 rounded-lg flex items-center justify-center mb-4">
                  <Sparkles className="text-pink-600 dark:text-pink-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Email Enrichment</h3>
                <p className="text-slate-600 dark:text-slate-400">Enhances contact details with verified email addresses and social profiles</p>
              </div>
            </div>
            
            <div className="text-center mt-12">
              <Button 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full px-8 py-6"
                onClick={() => handleSearch("Software companies in New York")}
              >
                <span className="mr-2">Try it for free</span>
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer is imported from UI components */}
      <Footer />

      {/* Enhanced Search Progress Dialog */}
      <Dialog open={showSearchProgress} onOpenChange={setShowSearchProgress}>
        <DialogContent className="p-0 gap-0 overflow-hidden border-none shadow-2xl sm:max-w-[65%] w-full md:w-[65%] h-auto max-h-[90vh] md:rounded-xl bg-white dark:bg-slate-900">
          <VisuallyHidden>
            <DialogTitle>Search Progress</DialogTitle>
          </VisuallyHidden>
          
          {/* Gradient header */}
          <div className="p-8 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
            <h3 className="text-2xl font-bold tracking-tight">
              Searching for "{searchQuery}"
            </h3>
          </div>
          
          {/* Progress bar */}
          <Progress value={progress} className="h-2" />
          
          {/* Enhanced step indicator */}
          <div className="flex items-center justify-center p-6">
            <div className="flex items-center space-x-3">
              {SEARCH_STEPS.map((step, index) => (
                <div key={step.id} className="flex flex-col items-center">
                  <div 
                    className={`w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                      currentStep === index + 1 
                        ? "bg-blue-500 ring-4 ring-blue-200 dark:ring-blue-900/50 scale-110" 
                        : currentStep > index + 1
                          ? "bg-green-500"
                          : "bg-slate-200 dark:bg-slate-700"
                    }`}
                  >
                    {currentStep > index + 1 && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                      </svg>
                    )}
                  </div>
                  {index < SEARCH_STEPS.length - 1 && (
                    <div className={`h-0.5 w-10 md:w-14 mt-3 ${
                      currentStep > index + 1 ? "bg-green-500" : "bg-slate-200 dark:bg-slate-700"
                    }`}></div>
                  )}
                </div>
              ))}
            </div>
          </div>
            
          {/* Current step details */}
          <div className="px-8 py-6 min-h-[120px] flex flex-col items-center justify-center">
            <h4 className="text-xl font-semibold text-center mb-2">
              {SEARCH_STEPS[currentStep - 1].title}
            </h4>
            <p className="text-slate-600 dark:text-slate-400 text-center max-w-md">
              {SEARCH_STEPS[currentStep - 1].description}
            </p>
          </div>
          
          {/* Registration prompt */}
          <div className="p-8 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
            <p className="mb-5 text-center font-medium">
              Register to see your search results
            </p>
            <div className="max-w-sm mx-auto">
              <Button 
                onClick={() => {
                  // Import the necessary functions for Google sign-in
                  import("@/hooks/use-auth").then(({ useAuth }) => {
                    const { signInWithGoogle } = useAuth();
                    signInWithGoogle();
                  });
                }}
                className="w-full py-6 mb-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-lg rounded-lg"
              >
                <span className="mr-2">Sign in with Google</span>
                <ArrowRight size={16} />
              </Button>
              <div className="text-center">
                <Link href="/auth" className="text-blue-500 hover:underline text-sm">
                  Login
                </Link>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}