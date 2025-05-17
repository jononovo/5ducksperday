import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
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
import { Footer } from "@/components/footer";
import { Logo } from "@/components/logo";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

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
  "High-rated Greek restaurants in Toronto",
  "Chicken coop builders in Kentucky",
  "Mid-sized roofing companies in Atlanta",
  "Stationary suppliers in Scranton",
  "Health-tech SaaS in NYC",
];

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const { signInWithGoogle } = useAuth();
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
      {/* Header */}
      <header className="container mx-auto py-4 px-4 flex justify-between items-center">
        <Logo size="lg" asLink={false} />
        <Link href="/auth">
          <Button variant="outline" className="flex items-center gap-2">
            <User size={16} />
            Login
          </Button>
        </Link>
      </header>

      {/* Main Hero Section */}
      <main className="flex-1">
        <section className="py-16 md:py-24 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <div className="mb-4 inline-flex items-center px-4 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
              <Sparkles size={16} className="mr-2" />
              <span className="text-sm font-medium">AI-Powered Contact Discovery</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-extrabold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 leading-tight">
              Sell to 5 new people every day.
            </h1>
            
            <p className="text-xl text-slate-700 dark:text-slate-300 mb-12 max-w-2xl mx-auto">
              <span className="font-normal">5 Ducks 🦆 are waiting for you to click "Send". <br />
              What are you waiting for? 🤷🏼‍♀️</span>
            </p>

            {/* Search Input */}
            <div className="relative max-w-2xl mx-auto mb-10">
              <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 rounded-full opacity-70 blur"></div>
              <div className="relative bg-white dark:bg-slate-900 rounded-full">
                <Input
                  type="text"
                  placeholder="What type of business do you sell to?"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-36 py-7 text-lg rounded-full border-transparent shadow-lg focus-visible:ring-2 focus-visible:ring-blue-500"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSearch();
                    }
                  }}
                />
                <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-blue-500" size={20} />
                <Button
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 rounded-full px-5 py-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                  onClick={() => handleSearch()}
                >
                  <span className="mr-2">Search</span>
                  <ArrowRight size={16} />
                </Button>
              </div>
            </div>

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
            
            <div className="flex flex-wrap justify-center space-x-2 md:space-x-8 my-10">
              <div className="text-center p-3 md:p-4">
                <div className="text-3xl md:text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">3 Hrs</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">Saved per Week</div>
              </div>
              <div className="text-center p-3 md:p-4">
                <div className="text-3xl md:text-4xl font-bold text-purple-600 dark:text-purple-400 mb-2">225 Targets </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">Sweet-talked to per Month</div>
              </div>
              <div className="text-center p-3 md:p-4">
                <div className="text-3xl md:text-4xl font-bold text-pink-600 dark:text-pink-400 mb-2">Avg $50k</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">New Revenue Pipeline*</div>
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
            <h2 className="text-3xl font-bold mb-12 text-center">No-distraction Selling for Busy <span className="text-gray-400">(or easily-distractable)</span> People</h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-md">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center mb-4">
                  <Search className="text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">You're already wasting time</h3>
                <p className="text-slate-600 dark:text-slate-400">You should be sending simple emails to amazing people about how you are solving their problem.</p>
              </div>
              
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-md">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center mb-4">
                  <User className="text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">We limit you to 10 Emails per Day</h3>
                <p className="text-slate-600 dark:text-slate-400">So that you never have to feel intimidated about doing outreach.</p>
              </div>
              
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-md">
                <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/50 rounded-lg flex items-center justify-center mb-4">
                  <Sparkles className="text-pink-600 dark:text-pink-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">You'll be done in 5 Mins (or less)</h3>
                <p className="text-slate-600 dark:text-slate-400">And you won't even be distracted by your inbox, because we don't include that here.</p>
              </div>
            </div>
            
            <div className="text-center mt-12">
              <Button 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full px-8 py-6"
                onClick={() => handleSearch("Software companies in New York")}
              >
                <span className="mr-2">Try it for free (for 5 Minutes)</span>
                <ChevronRight size={16} />
              </Button>
            </div>
            
            {/* My Story Section */}
            <div className="mt-20 max-w-3xl mx-auto bg-white dark:bg-slate-800 rounded-xl p-8 shadow-lg">
              <h3 className="text-2xl font-semibold mb-6 text-center">My Story</h3>
              <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300">
                <p>I do 10 push-ups before every shower and I realized that if I do 20, I will very soon stop doing them. But I will explain that later. </p>
                
                <p className="mt-4">In February, after spending an embarrassingly long amount of time creating a SaaS product with a couple of developers.
                It was finally time to start selling. But being easily distracted, I instead figured that I should create a tool that will make selling easier for me. (Of course!!! That's not procrastination. That's efficiency.)</p>
                
                <p className="mt-4">I then got distracted in workflows to optimize the sales and lead generation. However, finally coming back to this, I decided to launch it because, who the hell wants to open their inbox (with all those clickbait newsletters and juicy news updates) and THEN start sending sales emails?!?
                That's like asking an alcoholic to work at a bar. It's so distracting.</p>
                
                <p className="mt-4">The other thing I realized is that all the other lead generation services that popped-up when I was searching, were for people with big budgets and usually needed someone to set it up for them.</p>
                
                <p className="mt-4">I wanted something for the small guy that he could get running in less than 60 seconds. And that could be addictive and fun.</p>
                
                <p className="mt-4">Now back to those pushups. Well, I realized that the harder the task is, the more likely that I will abandon it, and not make it habit.
                And I figured, if I can make the selling process much, much easier, but then put a limit so that people will not feel guilty leaving after five minutes, that they might enjoy it more AND may make a habit out of it.</p>

                <p className="mt-4">Umm,... yeah. <br />
                Thanks for listening and enjoy. <br />
                - <strong>Jon</strong>
                </p>
              </div>
            </div>
            
            {/* Why Sign-up Section */}
            <div className="mt-20 max-w-3xl mx-auto bg-white dark:bg-slate-800 rounded-xl p-8 shadow-lg">
              <h3 className="text-2xl font-semibold mb-6 text-center">Why Sign-up?</h3>
              <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300">
                <ol className="list-decimal pl-6 space-y-4">
                  <li>Because <strong>consistency beats motivation</strong> Every. Single. Time.</li>
                  <li>If you have not sold anything* in 90 days will <strong>reimburse you the full 3 months</strong> subscription (and will gently encourage you to find a better product to sell.)</li>
                  <li>Because "Hakuna Matata" means "No worries" and we allow you to <strong>sell without analysis-paralysis</strong> (which is primary cause of bankruptcy.)</li>
                </ol>
              </div>
            </div>
            
            
          </div>
        </section>
      </main>

      {/* Footer is imported from UI components */}
      <Footer />

      {/* Larger Search Progress Dialog */}
      <Dialog open={showSearchProgress} onOpenChange={setShowSearchProgress}>
        <DialogContent 
          className="w-[95%] md:w-[65%] p-0 gap-0 max-w-5xl overflow-hidden rounded-xl border-0 shadow-2xl"
        >
          <div className="p-6 md:p-8 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
            <DialogTitle className="text-xl md:text-2xl font-semibold text-white">
              Searching for "{searchQuery}"
            </DialogTitle>
            <DialogDescription className="text-white/80 mt-1">
              Our AI is analyzing your query and searching for matches
            </DialogDescription>
          </div>
          
          <div className="px-0">
            <Progress value={progress} className="h-2 rounded-none bg-slate-100 dark:bg-slate-800" />
          </div>
          
          {/* Larger step indicators with numbers */}
          <div className="p-6 md:p-8 pb-4">
            <div className="flex justify-center mb-6">
              <div className="flex space-x-8 md:space-x-10">
                {SEARCH_STEPS.map((step, index) => (
                  <div key={step.id} className="flex items-center">
                    <div 
                      className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-sm md:text-base font-medium transition-colors ${
                        currentStep === index + 1 
                          ? "bg-blue-500 text-white ring-4 ring-blue-100 dark:ring-blue-900/30" 
                          : currentStep > index + 1
                            ? "bg-blue-300 dark:bg-blue-600 text-white"
                            : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {index + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Current step description */}
            <div className="text-center mb-4">
              <h3 className="text-xl md:text-2xl font-semibold mb-2">
                {SEARCH_STEPS[currentStep - 1]?.title || "Finalizing..."}
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                {SEARCH_STEPS[currentStep - 1]?.description || "Almost done..."}
              </p>
            </div>
            
            {/* Loading animation */}
            <div className="flex justify-center my-8">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-200 dark:border-blue-900/30 rounded-full"></div>
                <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-500 rounded-full animate-spin border-t-transparent"></div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}