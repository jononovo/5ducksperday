import { 
  TrendingUp, 
  Mail, 
  Search, 
  Sparkles, 
  Zap, 
  Target, 
  MessageSquare, 
  Users, 
  Briefcase, 
  Globe, 
  Building2, 
  Star, 
  Package, 
  Headphones,
  ChevronRight 
} from "lucide-react";
import type { Question, FlowConfig } from "../types";

export interface StealthOnboardingData {
  [key: string]: string;
  purpose: string;
  goal: string;
  hasWebsite: string;
  website: string;
  companyName: string;
  companyCity: string;
  companyState: string;
  companyRole: string;
  offeringType: string;
  productDescription: string;
  customerLove: string;
  hasFixedPricing: string;
  packageName: string;
  packageCost: string;
  packageIncludes: string;
  serviceDescription: string;
  serviceCost: string;
  serviceOther: string;
}

export const STEALTH_INITIAL_DATA: StealthOnboardingData = {
  purpose: "",
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
};

const SECTION_CREDITS = {
  A: 120,
  B: 150,
  C: 150,
  D: 180,
};

export const STEALTH_QUESTIONS: Question<StealthOnboardingData>[] = [
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
    type: "multi-select",
    section: "A",
    title: "What brings you here?",
    subtitle: "Select all that apply",
    options: [
      { id: "sales", label: "Grow my sales pipeline", icon: <TrendingUp className="w-5 h-5" /> },
      { id: "outreach", label: "Automate my outreach", icon: <Mail className="w-5 h-5" /> },
      { id: "leads", label: "Find new leads", icon: <Search className="w-5 h-5" /> },
      { id: "curious", label: "Just exploring", icon: <Sparkles className="w-5 h-5" /> },
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
    type: "multi-field",
    section: "B",
    title: "Tell us about your company",
    subtitle: "Just the basics so Fluffy knows who you are",
    component: "company-details",
    conditionalOn: "hasWebsite",
    conditionalValue: "no",
    validate: (data) => 
      data.companyName.trim() !== "" &&
      data.companyCity.trim() !== "" &&
      data.companyState.trim() !== "",
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
    id: "section-c-complete",
    type: "section-complete",
    section: "C",
    title: "You're a star!",
    subtitle: "Fluffy knows your product now",
    emoji: "⭐",
    credits: SECTION_CREDITS.C,
  },
  
  // ===== SECTION D: Product Pricing =====
  {
    id: "section-d-intro",
    type: "section-intro",
    section: "D",
    title: "Let's talk pricing",
    subtitle: "This helps Fluffy understand your offer",
    emoji: "💰",
  },
  {
    id: "hasFixedPricing",
    type: "single-select",
    section: "D",
    title: "Do you have a fixed price or package?",
    subtitle: "Let Fluffy know how you charge",
    options: [
      { id: "yes", label: "Yes, I have set pricing", icon: <Package className="w-5 h-5" /> },
      { id: "no", label: "No, it varies by project", icon: <TrendingUp className="w-5 h-5" /> },
      { id: "skip", label: "Skip for now", icon: <ChevronRight className="w-5 h-5" /> },
    ],
  },
  // Fixed pricing sub-slides
  {
    id: "packageName",
    type: "text-input",
    section: "D",
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
    section: "D",
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
    section: "D",
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
    section: "D",
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
    section: "D",
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
    section: "D",
    title: "Anything else we should know?",
    subtitle: "Optional but helpful for Fluffy",
    placeholder: "e.g., Projects usually take 2-4 weeks",
    inputType: "textarea",
    conditionalOn: "hasFixedPricing",
    conditionalValue: "no",
    optional: true,
  },
  {
    id: "section-d-complete",
    type: "section-complete",
    section: "D",
    title: "Perfect!",
    subtitle: "Fluffy is ready to help you sell",
    emoji: "🎯",
    credits: SECTION_CREDITS.D,
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

export const STEALTH_FLOW_CONFIG: FlowConfig<StealthOnboardingData> = {
  questions: STEALTH_QUESTIONS,
  initialData: STEALTH_INITIAL_DATA,
  sectionCredits: SECTION_CREDITS,
};
