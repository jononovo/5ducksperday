import { Contact } from "@shared/schema";

export interface NameValidationResult {
  score: number;
  isGeneric: boolean;
  confidence: number;
}

export function validateNameLocally(name: string, context: string = ""): NameValidationResult {
  const isGeneric = isGenericName(name);
  if (isGeneric) {
    return { score: 10, isGeneric: true, confidence: 90 };
  }

  const score = calculateNameConfidenceScore(name, context);
  return {
    score,
    isGeneric: false,
    confidence: score > 80 ? 90 : score > 50 ? 70 : 50
  };
}

function isGenericName(name: string): boolean {
  const genericTerms = [
    // Job titles and positions
    'chief', 'executive', 'officer', 'ceo', 'cto', 'cfo', 'coo', 'president',
    'director', 'manager', 'head', 'lead', 'senior', 'junior', 'principal',
    'vice', 'assistant', 'associate', 'coordinator', 'specialist', 'analyst',
    'administrator', 'supervisor', 'founder', 'co-founder', 'owner', 'partner',

    // Generic terms
    'leadership', 'team', 'member', 'staff', 'employee', 'general',
    'key', 'role', 'position', 'department', 'division', 'management',
    'contact', 'person', 'representative', 'individual',
    'business', 'company', 'enterprise', 'organization', 'corporation',
    'admin', 'professional', 'consultant',
    'service', 'support', 'office', 'personnel', 'resource',
    'operation', 'development', 'sales', 'marketing', 'customer'
  ];

  const name_lower = name.toLowerCase();

  // Check for job title patterns
  const jobTitlePatterns = [
    /^(chief|vice|senior|junior|assistant)\s+/i,
    /\b(officer|manager|director|head|lead)\b/i,
    /^(c[A-Za-z]o)$/i,  // Matches CEO, CTO, CFO, etc.
    /(president|founder|owner|partner)$/i
  ];

  if (jobTitlePatterns.some(pattern => pattern.test(name))) {
    return true;
  }

  if (genericTerms.some(term => name_lower === term)) {
    return true;
  }

  if (genericTerms.some(term =>
    name_lower.includes(term) ||
    name_lower.startsWith(term) ||
    name_lower.endsWith(term)
  )) {
    return true;
  }

  const genericPatterns = [
    /^[a-z\s]+$/i,  // All lowercase or uppercase
    /^(mr|mrs|ms|dr|prof)\.\s*$/i,  // Just a title without a name
    /^(the|our|your|their)\s+/i,  // Possessive starts
    /\d+/,  // Contains numbers
    /^[a-z]{1,2}\s+[a-z]{1,2}$/i,  // Very short names
    /^(contact|info|support|help|sales|service)/i,  // Common department starts
    /^[^a-z]+$/i,  // Contains no letters
    /^[A-Z\s]+$/  // All capitals (likely an acronym or title)
  ];

  return genericPatterns.some(pattern => pattern.test(name));
}

function calculateNameConfidenceScore(name: string, context: string): number {
  let score = 0;
  const namePattern = /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}$/;

  if (namePattern.test(name)) {
    score += 30;
  } else {
    return 10;
  }

  const contextIndicators = {
    leadership: ['leads', 'directs', 'manages', 'founded', 'oversees'],
    title: ['ceo', 'cto', 'founder', 'president', 'director'],
    introduction: ['meet', 'introducing', 'led by', 'headed by', 'under the leadership of'],
    verification: ['linkedin', 'profile', 'contact', 'verified', 'official'],
    designation: ['mr', 'ms', 'mrs', 'dr', 'prof']
  };

  const contextLower = context.toLowerCase();
  const nameLower = name.toLowerCase();

  Object.entries(contextIndicators).forEach(([category, indicators]) => {
    if (indicators.some(indicator => contextLower.includes(indicator))) {
      score += category === 'verification' ? 15 : 10;
    }
  });

  const redFlags = [
    /\d+/,  // Contains numbers
    /[^a-zA-Z\s'-]/,  // Contains special characters (except hyphen and apostrophe)
    /^[a-z]/,  // Doesn't start with capital letter
    /\s[a-z]/,  // Word doesn't start with capital letter
    /(.)\1{2,}/,  // Three or more repeated characters
    /^[A-Z\s]+$/  // All capitals (likely an acronym or title)
  ];

  redFlags.forEach(flag => {
    if (flag.test(name)) {
      score -= 30;
    }
  });

  const nameParts = name.split(/\s+/);
  if (nameParts.length === 2 || nameParts.length === 3) {
    score += 15;
  } else {
    score -= 20;
  }

  const emailMatch = context.match(/[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) {
    const email = emailMatch[0].toLowerCase();
    const nameWords = nameLower.split(/\s+/);
    if (nameWords.some(word => email.includes(word))) {
      score += 20;
    }
  }

  return Math.max(10, Math.min(100, score));
}

export interface ValidationOptions {
  useLocalValidation?: boolean;
  localValidationWeight?: number;  // Between 0 and 1
  minimumScore?: number;
}

const defaultOptions: ValidationOptions = {
  useLocalValidation: true,
  localValidationWeight: 0.3,
  minimumScore: 20
};

export function combineValidationScores(
  aiScore: number,
  localResult: NameValidationResult,
  options: ValidationOptions = defaultOptions
): number {
  if (!options.useLocalValidation) {
    return aiScore;
  }

  const weight = options.localValidationWeight || 0.3;
  const combinedScore = Math.round(
    (aiScore * (1 - weight)) + (localResult.score * weight)
  );

  return Math.max(10, Math.min(100, combinedScore));
}
