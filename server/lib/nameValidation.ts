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
    'operation', 'development', 'sales', 'marketing', 'customer',

    // Common placeholder names
    'john doe', 'jane doe', 'john smith', 'jane smith',
    'test', 'demo', 'example', 'user', 'admin'
  ];

  const name_lower = name.toLowerCase();

  // Check for placeholder patterns
  if (
    /^[a-z]+\s+[a-z]+$/i.test(name) && // Simple two-word name
    genericTerms.includes(name_lower)    // Matches known placeholder
  ) {
    return true;
  }

  // Check for job title patterns
  const jobTitlePatterns = [
    /^(chief|vice|senior|junior|assistant)\s+/i,
    /\b(officer|manager|director|head|lead)\b/i,
    /^(c[A-Za-z]o)$/i,  // Matches CEO, CTO, CFO, etc.
    /(president|founder|owner|partner)$/i,
    /^(mr|mrs|ms|dr|prof)\.\s*$/i  // Just a title
  ];

  if (jobTitlePatterns.some(pattern => pattern.test(name))) {
    return true;
  }

  // Generic patterns indicating non-names
  const genericPatterns = [
    /^[a-z\s]+$/i,  // All lowercase or uppercase
    /^(mr|mrs|ms|dr|prof)\.\s*$/i,  // Just a title
    /^(the|our|your|their)\s+/i,  // Possessive starts
    /\d+/,  // Contains numbers
    /^[a-z]{1,2}\s+[a-z]{1,2}$/i,  // Very short words
    /^(contact|info|support|help|sales|service)/i,  // Common department starts
    /^[^a-z]+$/i,  // Contains no letters
    /^[A-Z\s]+$/,  // All capitals
    /[!@#$%^&*(),.?":{}|<>]/  // Contains special characters
  ];

  return genericPatterns.some(pattern => pattern.test(name));
}

function calculateNameConfidenceScore(name: string, context: string): number {
  let score = 0;
  const namePattern = /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}$/;

  // Base score for proper name format
  if (namePattern.test(name)) {
    score += 30;
  } else {
    return 10; // Early return for obviously incorrect formats
  }

  // Check name length and word count
  const nameParts = name.split(/\s+/);
  if (nameParts.length === 2) {
    score += 20; // Common firstname lastname format
  } else if (nameParts.length === 3) {
    score += 15; // Possible middle name
  } else {
    score -= 20; // Unusual number of name parts
  }

  // Name part length checks
  const hasReasonableLengths = nameParts.every(part => part.length >= 2 && part.length <= 20);
  if (hasReasonableLengths) {
    score += 10;
  } else {
    score -= 15;
  }

  // Context validation with increased weights for professional indicators
  const contextIndicators = {
    leadership: ['leads', 'directs', 'manages', 'founded', 'oversees', 'heads'],
    verification: ['linkedin', 'profile', 'verified', 'official', 'biography'],
    introduction: ['meet', 'introducing', 'led by', 'headed by', 'welcome'],
    professional: ['experienced', 'professional', 'expert', 'specialist', 'certified']
  };

  const contextLower = context.toLowerCase();
  Object.entries(contextIndicators).forEach(([category, indicators]) => {
    if (indicators.some(indicator => contextLower.includes(indicator))) {
      // Increased weights for professional context
      score += category === 'verification' ? 20 : 15;
    }
  });

  // Professional title check (positive indicator)
  const titleNearName = /(?:Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.)\s+[A-Z]/i.test(context);
  if (titleNearName) {
    score += 15;
  }

  // Red flags with adjusted penalties
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
      score -= 25; // Reduced penalty
    }
  });

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
  minimumScore: 20  // Lowered from previous value
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

  // Reduced penalty for generic names
  if (localResult.isGeneric) {
    return Math.max(20, combinedScore - 20);  // Less severe penalty
  }

  // Lower minimum score threshold
  return Math.max(options.minimumScore || 20, Math.min(100, combinedScore));
}