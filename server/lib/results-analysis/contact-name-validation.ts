import { Contact } from "@shared/schema";

export interface NameValidationResult {
  score: number;
  isGeneric: boolean;
  confidence: number;
}

export function validateNameLocally(name: string, context: string = ""): NameValidationResult {
  const isGeneric = isGenericName(name);
  if (isGeneric) {
    return { score: 30, isGeneric: true, confidence: 90 };
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

  if (genericTerms.includes(name_lower)) {
    return true;
  }

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

  return false;
}

function calculateNameConfidenceScore(name: string, context: string): number {
  let score = 50; // Start with a neutral score
  const namePattern = /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}$/;

  // Base score for proper name format
  if (namePattern.test(name)) {
    score += 20;
  }

  // Check name length and word count
  const nameParts = name.split(/\s+/);
  if (nameParts.length === 2) {
    score += 15; // Common firstname lastname format
  } else if (nameParts.length === 3) {
    score += 10; // Possible middle name
  } else {
    score -= 10; // Unusual number of name parts
  }

  // Name part length checks
  const hasReasonableLengths = nameParts.every(part => part.length >= 2 && part.length <= 20);
  if (hasReasonableLengths) {
    score += 10;
  } else {
    score -= 10;
  }

  // Red flags with reduced penalties
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
      score -= 15; // Reduced penalty
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

  // Moderate penalty for generic names
  if (localResult.isGeneric) {
    return Math.max(30, combinedScore - 20);
  }

  return Math.max(options.minimumScore || 30, Math.min(100, combinedScore));
}
