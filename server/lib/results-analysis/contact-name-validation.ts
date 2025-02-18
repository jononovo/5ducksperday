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
  'cooperative', 'co', 'corporation', 'incorporated', 'plc',

  // Industry terms
  'information', 'technology', 'software', 'industry', 'reputation',
  'quality', 'control', 'strategic', 'direction', 'overall',
  'vision', 'strategy', 'innovation', 'infrastructure',
  'technical', 'leader', 'focus', 'primary', 'secondary',

  // Descriptive business terms
  'main', 'primary', 'secondary', 'principal', 'executive',
  'managing', 'operating', 'board', 'advisory', 'steering',
  'corporate', 'enterprise', 'business', 'commercial'
]);

export function isPlaceholderName(name: string): boolean {
  return PLACEHOLDER_NAMES.has(name.toLowerCase());
}

export interface ValidationOptions {
  useLocalValidation?: boolean;
  localValidationWeight?: number;
  minimumScore?: number;
  searchPrompt?: string;
}

export function validateNameLocally(name: string, context: string = ""): NameValidationResult {
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

const defaultOptions: ValidationOptions = {
  useLocalValidation: true,
  localValidationWeight: 0.3,
  minimumScore: 30
};