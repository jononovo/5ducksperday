import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { Search, ArrowRight, User } from "lucide-react";
import { Footer } from "@/components/ui/footer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
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

  // Handle video scroll effect
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsVideoExpanded(true);
        }
      },
      { threshold: 0.5 }
    );

    if (videoRef.current) {
      observer.observe(videoRef.current);
    }

    return () => {
      if (videoRef.current) {
        observer.unobserve(videoRef.current);
      }
    };
  }, []);

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
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="container mx-auto py-4 px-4 flex justify-between items-center">
        <div className="text-xl font-bold">Simple B2B Sales</div>
        <Link href="/auth">
          <Button variant="ghost" className="flex items-center gap-2">
            <User size={16} />
            Login
          </Button>
        </Link>
      </header>

      {/* Main Hero Section */}
      <main className="flex-1">
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <h1 className="text-4xl md:text-6xl font-extrabold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-600">
              Discover Your Perfect Prospects
            </h1>
            <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
              Use AI to find the right companies and decision makers in seconds
            </p>

            {/* Search Input */}
            <div className="relative max-w-2xl mx-auto mb-8">
              <Input
                type="text"
                placeholder="What type of businesses are you looking for?"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-20 py-6 text-lg rounded-full"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearch();
                  }
                }}
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Button
                className="absolute right-1 top-1/2 transform -translate-y-1/2 rounded-full"
                onClick={() => handleSearch()}
              >
                <span className="mr-2">Search</span>
                <ArrowRight size={16} />
              </Button>
            </div>

            {/* Example Search Prompts */}
            <div className="flex flex-wrap justify-center gap-2 mb-12">
              {EXAMPLE_PROMPTS.map((prompt) => (
                <Button
                  key={prompt}
                  variant="outline"
                  className="text-sm"
                  onClick={() => {
                    setSearchQuery(prompt);
                    handleSearch(prompt);
                  }}
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </div>
        </section>

        {/* Video Section */}
        <section 
          ref={videoRef} 
          className={`py-20 px-4 bg-slate-50 dark:bg-slate-900 transition-all duration-700 ${
            isVideoExpanded ? "min-h-[80vh]" : "min-h-[20vh]"
          }`}
        >
          <div className="container mx-auto max-w-5xl">
            <h2 className="text-3xl font-bold mb-8 text-center">See How It Works</h2>
            <div 
              className={`aspect-video bg-slate-200 dark:bg-slate-800 rounded-lg overflow-hidden transition-all duration-700 mx-auto ${
                isVideoExpanded ? "w-[90%] shadow-xl" : "w-[50%] cursor-pointer opacity-70"
              }`}
            >
              {/* Replace this with your arcade.software embed */}
              <div className="h-full w-full flex items-center justify-center">
                <p className="text-muted-foreground text-center">
                  {isVideoExpanded 
                    ? "Interactive demo video will be displayed here" 
                    : "Scroll to view demo"}
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer is imported from UI components */}
      <Footer />

      {/* Search Progress Dialog */}
      <Dialog open={showSearchProgress} onOpenChange={setShowSearchProgress}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Processing your search</DialogTitle>
            <DialogDescription>
              Our AI is searching for the best matches for "{searchQuery}"
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Progress value={progress} className="h-2 mb-6" />
            
            <div className="space-y-4">
              {SEARCH_STEPS.map((step) => (
                <div 
                  key={step.id}
                  className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                    currentStep >= step.id 
                      ? "bg-blue-50 dark:bg-blue-950/20" 
                      : "opacity-50"
                  }`}
                >
                  <div 
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                      currentStep >= step.id 
                        ? "bg-blue-500 text-white" 
                        : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                    }`}
                  >
                    {step.id}
                  </div>
                  <div>
                    <p className="font-medium">{step.title}</p>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {currentStep >= SEARCH_STEPS.length && (
            <div className="mt-4 text-center">
              <p className="mb-4">Register to see your search results</p>
              <Button onClick={() => setLocation("/auth")} className="w-full">
                <span className="mr-2">Sign in with Google</span>
                <ArrowRight size={16} />
              </Button>
              <p className="mt-2 text-sm text-muted-foreground">
                <Link href="/auth" className="text-blue-500 hover:underline">
                  Login with email instead
                </Link>
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}