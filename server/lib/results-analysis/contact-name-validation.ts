import { Contact } from "@shared/schema";

export interface NameValidationResult {
  score: number;
  isGeneric: boolean;
  confidence: number;
  name: string;
  context?: string;
}

export interface ValidationOptions {
  useLocalValidation?: boolean;
  localValidationWeight?: number;
  minimumScore?: number;
  companyNamePenalty?: number;
  searchPrompt?: string;
  searchTermPenalty?: number;
}

// Centralized list of placeholder and generic terms
const PLACEHOLDER_NAMES = new Set([
  'john doe', 'jane doe', 'john smith', 'jane smith',
  'test user', 'demo user', 'example user',
  'admin user', 'guest user', 'unknown user'
]);

const GENERIC_TERMS = new Set([
  // Job titles and positions
  'chief', 'executive', 'officer', 'ceo', 'cto', 'cfo', 'coo', 'president',
  'director', 'manager', 'managers', 'head', 'lead', 'senior', 'junior', 'principal',
  'vice', 'assistant', 'associate', 'coordinator', 'specialist', 'analyst',
  'administrator', 'supervisor', 'founder', 'co-founder', 'owner', 'partner',
  'developer', 'engineer', 'architect', 'consultant', 'advisor',

  // Departments and roles
  'sales', 'marketing', 'finance', 'accounting', 'hr', 'human resources',
  'operations', 'it', 'support', 'customer service', 'product', 'project',
  'research', 'development', 'legal', 'compliance', 'quality', 'assurance',

  // Business terms
  'leadership', 'team', 'member', 'staff', 'employee', 'general',
  'key', 'role', 'position', 'department', 'division', 'management',
  'contact', 'person', 'representative', 'individual',
  'business', 'company', 'enterprise', 'organization', 'corporation',
  'admin', 'professional', 'consultant', 'consolidated',
  'service', 'support', 'office', 'personnel', 'resource',
  'operation', 'development', 'sales', 'marketing', 'customer',
  'printing', 'press', 'commercial', 'digital', 'production',

  // Company identifiers
  'company', 'consolidated', 'incorporated', 'inc', 'llc', 'ltd',
  'group', 'holdings', 'solutions', 'services', 'international',
  'global', 'industries', 'systems', 'technologies', 'associates',
  'consulting', 'ventures', 'partners', 'limited', 'corp',
  'cooperative', 'co', 'corporation', 'incorporated', 'plc'
]);

export function isPlaceholderName(name: string): boolean {
  return PLACEHOLDER_NAMES.has(name.toLowerCase());
}

const defaultOptions: ValidationOptions = {
  useLocalValidation: true,
  localValidationWeight: 0.3,
  minimumScore: 30,
  companyNamePenalty: 20,
  searchTermPenalty: 25
};

export function validateName(
  name: string,
  context: string = "",
  companyName?: string | null,
  options: ValidationOptions = defaultOptions
): NameValidationResult {
  // Initial local validation
  const localResult = validateNameLocally(name, context);

  // If it's a generic name and not being validated in company context
  if (localResult.isGeneric && !companyName) {
    return localResult;
  }

  // Company name check
  if (companyName && isNameSimilarToCompany(name, companyName)) {
    if (!isFounderOrOwner(context, companyName)) {
      localResult.score = Math.max(20, localResult.score - (options.companyNamePenalty || 20));
    } else {
      localResult.score = Math.min(100, localResult.score + 10);
    }
  }

  // Search term penalty
  if (options.searchPrompt) {
    const searchTerms = options.searchPrompt.toLowerCase().split(/\s+/);
    const normalizedName = name.toLowerCase();

    const matchingTerms = searchTerms.filter(term => 
      term.length >= 4 && normalizedName.includes(term)
    );

    if (matchingTerms.length > 0) {
      localResult.score = Math.max(20, localResult.score - (options.searchTermPenalty || 25));
    }
  }

  // Final score adjustments
  if (localResult.isGeneric) {
    localResult.score = Math.max(20, localResult.score - 30);
  }

  localResult.score = Math.max(
    options.minimumScore || 30,
    Math.min(100, localResult.score)
  );

  return localResult;
}

function validateNameLocally(name: string, context: string = ""): NameValidationResult {
  const isGeneric = isGenericName(name);
  if (isGeneric) {
    return {
      score: 20,
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

  // Check each word against generic terms
  const genericWordCount = nameParts.filter(part => 
    part.length > 2 && GENERIC_TERMS.has(part)
  ).length;

  // If more than 33% of words are generic, consider it generic
  if (genericWordCount > 0 && (genericWordCount / nameParts.length) >= 0.33) {
    return true;
  }

  // Check for placeholder names
  if (PLACEHOLDER_NAMES.has(nameLower)) {
    return true;
  }

  // Check for common patterns that indicate non-person names
  const businessPatterns = [
    /^(chief|vice|senior|junior|assistant)\s+/i,
    /\b(officer|manager|director|head|lead)\b/i,
    /^(c[A-Za-z]o)$/i,
    /(president|founder|owner|partner)$/i,
    /^(mr|mrs|ms|dr|prof)\.\s*$/i,
    /\b(group|company|consolidated|inc|llc)\b/i,
    /^(the|our|your)\s+/i,
    /\b(team|department|division|office)\b/i,
    /\b(support|service|sales|contact)\s*(team|group|staff)?\b/i
  ];

  return businessPatterns.some(pattern => pattern.test(name));
}

function calculateNameConfidenceScore(name: string, context: string): number {
  let score = 50;
  const namePattern = /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}$/;
  const nameParts = name.split(/\s+/);

  if (isPlaceholderName(name)) {
    return 20;
  }

  // Check for generic terms with weighted impact
  const genericTermCount = nameParts.filter(part => 
    GENERIC_TERMS.has(part.toLowerCase())
  ).length;

  if (genericTermCount > 0) {
    score -= genericTermCount * 15;
    return Math.max(20, score);
  }

  // Proper name format
  if (namePattern.test(name)) {
    score += 20;
  }

  // Name structure analysis
  if (nameParts.length === 2) {
    score += 15;
  } else if (nameParts.length === 3) {
    score += 10;
  } else {
    score -= 15;
  }

  // Length checks
  const hasReasonableLengths = nameParts.every(part => 
    part.length >= 2 && part.length <= 20
  );
  if (hasReasonableLengths) {
    score += 10;
  } else {
    score -= 15;
  }

  // Red flags with increased penalties
  const redFlags = [
    /\d+/,
    /[^a-zA-Z\s'-]/,
    /^[a-z]/,
    /\s[a-z]/,
    /(.)\1{2,}/,
    /^[A-Z\s]+$/
  ];

  redFlags.forEach(flag => {
    if (flag.test(name)) {
      score -= 20;
    }
  });

  return Math.max(20, Math.min(100, score));
}

function isNameSimilarToCompany(name: string, companyName: string): boolean {
  const normalizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normalizedCompany = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');

  // Remove common company suffixes for comparison
  const cleanCompany = normalizedCompany
    .replace(/(inc|llc|ltd|corp|co|company|group|holdings)$/, '')
    .trim();

  // Direct match check
  if (normalizedName === cleanCompany) return true;

  // Name components check
  const nameWords = normalizedName.split(/\s+/);
  const companyWords = cleanCompany.split(/\s+/);

  // Check if significant portions match
  const matchingWords = nameWords.filter(word => 
    companyWords.includes(word) && word.length > 3
  );

  if (matchingWords.length >= 2) return true;

  // Substring check with minimum length and position
  if (normalizedName.length > 4) {
    if (cleanCompany.includes(normalizedName)) {
      return true;
    }
    if (normalizedName.includes(cleanCompany)) {
      return true;
    }
  }

  return false;
}

function isFounderOrOwner(context?: string, companyName?: string): boolean {
  if (!context) return false;

  const normalizedContext = context.toLowerCase();
  const normalizedCompany = companyName ? companyName.toLowerCase() : '';

  // Strong founder indicators
  const founderPatterns = [
    /\b(?:founder|co-founder|founding)\b/i,
    /\b(?:owner|proprietor)\b/i,
    /\bceo\b/i,
    /\b(?:president|chief\s+executive)\b/i,
    /\b(?:managing\s+director|managing\s+partner)\b/i
  ];

  // Check for founder patterns near company name
  if (companyName) {
    const contextWindow = 100; // Characters to look around company name mention
    const companyIndex = normalizedContext.indexOf(normalizedCompany);
    if (companyIndex >= 0) {
      const start = Math.max(0, companyIndex - contextWindow);
      const end = Math.min(normalizedContext.length, companyIndex + normalizedCompany.length + contextWindow);
      const nearbyContext = normalizedContext.slice(start, end);

      for (const pattern of founderPatterns) {
        if (pattern.test(nearbyContext)) {
          return true;
        }
      }
    }
  }

  // Check entire context if company name not found
  return founderPatterns.some(pattern => pattern.test(normalizedContext));
}