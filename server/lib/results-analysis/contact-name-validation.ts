import { Contact } from "@shared/schema";

export interface NameValidationResult {
  score: number;
  isGeneric: boolean;
  confidence: number;
  name: string;
  context?: string;
}

// Centralized list of placeholder and generic terms
const PLACEHOLDER_NAMES = new Set([
  'john doe', 'jane doe', 'john smith', 'jane smith',
  'test user', 'demo user', 'example user'
]);

const GENERIC_TERMS = new Set([
  // Job titles and positions
  'chief', 'executive', 'officer', 'ceo', 'cto', 'cfo', 'coo', 'president',
  'director', 'manager', 'managers', 'head', 'lead', 'senior', 'junior', 'principal',
  'vice', 'assistant', 'associate', 'coordinator', 'specialist', 'analyst',
  'administrator', 'supervisor', 'founder', 'co-founder', 'owner', 'partner', 

  // Generic business terms
  'leadership', 'team', 'member', 'staff', 'employee', 'general',
  'key', 'role', 'position', 'department', 'division', 'management',
  'contact', 'person', 'representative', 'individual',
  'business', 'company', 'enterprise','enterprises', 'organization', 'corporation',
  'admin', 'professional', 'consultant', 'consolidated',
  'service', 'support', 'office', 'personnel', 'resource',
  'operation', 'development', 'sales', 'marketing', 'customer',
  'printing', 'press', 'commercial', 'digital', 'production', 'Strategic', 'Visionary', 'Planner', 'Planner',

  // Common business name components
  'company', 'consolidated', 'incorporated', 'inc', 'llc', 'ltd',
  'group', 'holdings', 'solutions', 'services', 'international',
  'global', 'industries', 'systems', 'technologies', 'associates',
  'consulting', 'ventures', 'partners', 'limited', 'corp',
  'cooperative', 'co', 'corporation', 'incorporated', 'plc', 'Worldwide',

  // Common Industry terms used in page titles
  'information', 'technology', 'software', 'services', 'consulting', 'Industry', 'Reputation', 'Quality', 'Control', 'Strategic', 'Direction', 'Overall', 'Vision', 'Technology', 'Strategy', 'Innovation', 'Infrastructure', 'Innovation', 'Technical', 'Leader', 'Industry', 'Focus', 'primary', 'secondary','revenue','Market','Presence','Score','Competitive','Landscape','Graphic','Validation','Guarantee', 'Market', 'Presence', 'Competitive', 'Landscape', 'Quality', 'Verification', 'Score',

  
]);

export function isPlaceholderName(name: string): boolean {
  return PLACEHOLDER_NAMES.has(name.toLowerCase());
}

export function validateNameLocally(name: string, context: string = ""): NameValidationResult {
  const isGeneric = isGenericName(name);
  if (isGeneric) {
    return { 
      score: 20, // Reduced from 30 to be more aggressive
      isGeneric: true, 
      confidence: 90,
      name,
      context 
    };
  }

  const score = calculateNameConfidenceScore(name, context);
  return {
    score,
    isGeneric: false,
    confidence: score > 80 ? 90 : score > 50 ? 70 : 50,
    name,
    context
  };
}

function isGenericName(name: string): boolean {
  const nameLower = name.toLowerCase();
  const nameParts = nameLower.split(/[\s-]+/);

  // Check if any word in the name is a generic term
  if (nameParts.some(part => GENERIC_TERMS.has(part))) {
    return true;
  }

  // Check if the full name is in placeholder names
  if (PLACEHOLDER_NAMES.has(nameLower)) {
    return true;
  }

  const jobTitlePatterns = [
    /^(chief|vice|senior|junior|assistant)\s+/i,
    /\b(officer|manager|director|head|lead)\b/i,
    /^(c[A-Za-z]o)$/i,  // Matches CEO, CTO, CFO, etc.
    /(president|founder|owner|partner)$/i,
    /^(mr|mrs|ms|dr|prof)\.\s*$/i,  // Just a title
    /\b(group|company|consolidated|inc|llc)\b/i  // Common business suffixes
  ];

  return jobTitlePatterns.some(pattern => pattern.test(name));
}

function calculateNameConfidenceScore(name: string, context: string): number {
  let score = 50; // Start with a neutral score
  const namePattern = /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}$/;
  const nameParts = name.split(/\s+/);

  // Immediately return low score for placeholder or generic names
  if (isPlaceholderName(name)) {
    return 20;
  }

  // Check for generic terms in each part of the name
  if (nameParts.some(part => GENERIC_TERMS.has(part.toLowerCase()))) {
    return 25; // Slightly higher than placeholder but still very low
  }

  // Base score for proper name format
  if (namePattern.test(name)) {
    score += 20;
  }

  // Check name length and word count
  if (nameParts.length === 2) {
    score += 15; // Common firstname lastname format
  } else if (nameParts.length === 3) {
    score += 10; // Possible middle name
  } else {
    score -= 15; // Unusual number of name parts
  }

  // Name part length checks
  const hasReasonableLengths = nameParts.every(part => part.length >= 2 && part.length <= 20);
  if (hasReasonableLengths) {
    score += 10;
  } else {
    score -= 15;
  }

  // Red flags with increased penalties
  const redFlags = [
    /\d+/,  // Numbers
    /[^a-zA-Z\s'-]/,  // Special characters
    /^[a-z]/,  // Lowercase start
    /\s[a-z]/,  // Word doesn't start with capital
    /(.)\1{2,}/,  // Repeated characters
    /^[A-Z\s]+$/  // All capitals
  ];

  redFlags.forEach(flag => {
    if (flag.test(name)) {
      score -= 20; // Increased penalty from 15 to 20
    }
  });

  return Math.max(20, Math.min(100, score));
}

export interface ValidationOptions {
  useLocalValidation?: boolean;
  localValidationWeight?: number;
  minimumScore?: number;
}

const defaultOptions: ValidationOptions = {
  useLocalValidation: true,
  localValidationWeight: 0.3,
  minimumScore: 30
};