import { Contact } from "@shared/schema";

export interface NameValidationResult {
  score: number;
  isGeneric: boolean;
  confidence: number;
  name: string;
  context?: string;
  aiScore?: number;
  validationSteps: ValidationStepResult[];
}

interface ValidationStepResult {
  name: string;
  score: number;
  weight: number;
  reason?: string;
}

export interface ValidationOptions {
  useLocalValidation?: boolean;
  localValidationWeight?: number;
  minimumScore?: number;
  companyNamePenalty?: number;
  searchPrompt?: string;
  searchTermPenalty?: number;
  aiScore?: number;
}

// Centralized scoring weights
const VALIDATION_WEIGHTS = {
  formatAndStructure: 0.30,  // Basic name format and structure
  genericTerms: 0.25,        // Check for generic/business terms
  aiValidation: 0.30,        // AI-based validation
  contextAnalysis: 0.15      // Role and company context
};

const MAX_SCORE = 95;  // Maximum possible score

// Centralized list of placeholder and generic terms
const PLACEHOLDER_NAMES = new Set([
  'john doe', 'jane doe', 'john smith', 'jane smith',
  'test user', 'demo user', 'example user',
  'admin user', 'guest user', 'unknown user'
]);

// Update GENERIC_TERMS to properly include compound terms
const GENERIC_TERMS = new Set([
  // Job titles and positions
  'chief', 'executive', 'officer', 'ceo', 'cto', 'cfo', 'coo', 'president',
  'director', 'manager', 'managers', 'head', 'lead', 'senior', 'junior', 'principal',
  'vice', 'assistant', 'associate', 'coordinator', 'specialist', 'analyst',
  'administrator', 'supervisor', 'founder', 'co-founder', 'owner', 'partner',
  'developer', 'engineer', 'architect', 'consultant', 'advisor', 'strategist',

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

  // Technical terms
  'web', 'design', 'web design', 'web development',
  'stack', 'implementation', 'verification', 'process',
  'digital', 'tech', 'technical', 'technology',

  // Compound business terms
  'project manager', 'team lead', 'business analyst',
  'sales representative', 'customer service',
  'human resources', 'account manager',
  'marketing director', 'product owner',
  'technical lead', 'system administrator',

  // Generic descriptors
  'the', 'our', 'your', 'this', 'that',
  'team', 'group', 'division', 'department',
  'staff', 'personnel', 'members', 'employees'
]);

// Sequential validation steps
export function validateName(
  name: string,
  context: string = "",
  companyName?: string | null,
  options: ValidationOptions = {}
): NameValidationResult {
  const validationSteps: ValidationStepResult[] = [];
  let totalScore = 95; // Start with maximum score

  // Step 1: Format and Structure Validation
  const formatScore = validateNameFormat(name);
  validationSteps.push({
    name: "Format Validation",
    score: formatScore,
    weight: VALIDATION_WEIGHTS.formatAndStructure
  });

  // Step 2: Generic Terms Check - Direct penalty application
  const genericTermScore = validateGenericTerms(name);
  const genericPenalty = 95 - genericTermScore; // Calculate the actual penalty
  if (genericPenalty > 0) {
    totalScore = Math.max(20, totalScore - genericPenalty);
    validationSteps.push({
      name: "Generic Terms Penalty",
      score: -genericPenalty,
      weight: 1,
      reason: "Contains generic terms"
    });
  }

  // Step 3: AI Validation Score
  const aiScore = options.aiScore || 50;
  validationSteps.push({
    name: "AI Validation",
    score: aiScore,
    weight: VALIDATION_WEIGHTS.aiValidation
  });

  // Step 4: Context Analysis
  const contextScore = validateContext(name, context, companyName);
  validationSteps.push({
    name: "Context Analysis",
    score: contextScore,
    weight: VALIDATION_WEIGHTS.contextAnalysis
  });

  // Apply additional penalties
  if (options.searchPrompt) {
    const searchTermPenalty = calculateSearchTermPenalty(name, options.searchPrompt);
    totalScore = Math.max(20, totalScore - searchTermPenalty);
    validationSteps.push({
      name: "Search Term Penalty",
      score: -searchTermPenalty,
      weight: 1,
      reason: "Contains search terms"
    });
  }

  if (companyName && isNameSimilarToCompany(name, companyName)) {
    if (!isFounderOrOwner(context, companyName)) {
      const penalty = options.companyNamePenalty || 20;
      totalScore = Math.max(20, totalScore - penalty);
      validationSteps.push({
        name: "Company Name Penalty",
        score: -penalty,
        weight: 1,
        reason: "Similar to company name"
      });
    }
  }

  // Ensure score stays within bounds
  totalScore = Math.max(options.minimumScore || 20, Math.min(95, totalScore));

  return {
    score: Math.round(totalScore),
    isGeneric: genericTermScore < 40,
    confidence: calculateConfidence(validationSteps),
    name,
    context,
    aiScore: options.aiScore,
    validationSteps
  };
}

function validateNameFormat(name: string): number {
  let score = 50;
  const namePattern = /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}$/;
  const nameParts = name.split(/\s+/);

  // Full name format check
  if (namePattern.test(name)) {
    score += 30;
  }

  // Name parts analysis
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

  return Math.min(95, Math.max(20, score));
}

function validateGenericTerms(name: string): number {
  const baseScore = 95;  // Start from maximum score
  const nameLower = name.toLowerCase();

  // Check for compound generic terms first
  const compoundMatches = Array.from(GENERIC_TERMS).filter(term => {
    // Case insensitive match for the whole term
    return nameLower.includes(term.toLowerCase());
  });

  // Count how many generic terms were found
  const genericCount = compoundMatches.length;

  // Apply -45 points for each generic term found
  const penaltyScore = baseScore - (genericCount * 45);

  // Log for debugging
  if (genericCount > 0) {
    console.log(`Generic terms found in "${name}":`, compoundMatches);
    console.log(`Applied penalty: -${genericCount * 45} points`);
  }

  // Ensure score stays within bounds
  return Math.max(20, Math.min(95, penaltyScore));
}

function validateContext(name: string, context: string, companyName?: string | null): number {
  let score = 60;

  // Role context check
  if (/\b(ceo|cto|cfo|founder|president|director)\b/i.test(context)) {
    if (isFounderOrOwner(context, companyName || '')) {
      score += 20;
    }
  }

  // Professional context indicators
  if (/\b(manages|leads|heads|directs)\b/i.test(context)) {
    score += 10;
  }

  // Negative context indicators
  if (/\b(intern|temporary|contractor)\b/i.test(context)) {
    score -= 10;
  }

  return Math.min(95, Math.max(20, score));
}

function validateDomainRules(name: string, context: string): number {
  let score = 70;

  // Check for industry-specific patterns
  if (/Dr\.|Prof\.|PhD/i.test(name)) {
    score += 10;
  }

  // Check for common name patterns in business context
  if (/^[A-Z]\.\s[A-Z][a-z]+$/.test(name)) { // Initial + Last name
    score -= 15;
  }

  return Math.min(95, Math.max(20, score));
}

function calculateConfidence(steps: ValidationStepResult[]): number {
  const totalWeight = steps.reduce((acc, step) => acc + step.weight, 0);
  const weightedConfidence = steps.reduce((acc, step) => {
    const stepConfidence = step.score > 80 ? 90 : step.score > 60 ? 70 : 50;
    return acc + (stepConfidence * step.weight);
  }, 0);

  return Math.round(weightedConfidence / totalWeight);
}

function calculateSearchTermPenalty(name: string, searchPrompt: string): number {
  const searchTerms = searchPrompt.toLowerCase().split(/\s+/);
  const normalizedName = name.toLowerCase();

  const matchingTerms = searchTerms.filter(term =>
    term.length >= 4 && normalizedName.includes(term)
  );

  return matchingTerms.length * 25;
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