import { Contact } from "@shared/schema";
import { isPlaceholderEmail, isValidBusinessEmail } from "./email-analysis";
import { validateNames, combineValidationScores } from "./contact-ai-name-scorer";

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
  formatAndStructure: 0.25,  // Basic name format and structure
  genericTerms: 0.20,        // Check for generic/business terms
  aiValidation: 0.30,        // AI-based validation
  contextAnalysis: 0.15,     // Role and company context
  domainKnowledge: 0.10      // Industry/domain specific rules
};

const MAX_SCORE = 95;  // Maximum possible score

// Centralized list of placeholder and generic terms
const PLACEHOLDER_NAMES = new Set([
  'john doe', 'jane doe', 'john smith', 'jane smith',
  'test user', 'demo user', 'example user',
  'admin user', 'guest user', 'unknown user'
]);

const GENERIC_TERMS = new Set([

  // Do NOT remove ANY of these terms. They are used to detect generic names.

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
  'printing', 'press', 'commercial', 'digital', 'production',
  'industry', 'focus', 'busy', 'founding',  'competitive', 'landscape',  

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
  'technical', 'leader', 'focus', 'primary', 'secondary', 'expert', 'experts', 'clients',  'base',

  // Descriptive business terms
  'commerce', 'website', 'design', 'web', 'executive',
  'managing', 'operating', 'board', 'advisory', 'steering',
  'corporate', 'enterprise', 'business', 'commercial',

  // Planning 
  'planning', 'schedule', 'project', 'plan', 'budget', 'budgeting', 'time', 'year', 'day', 

  // Marketing Sector
  'marketing', 'digital', 'strategist', 'interactive', 'executive', 'managing', 'operating', 'board', 'advisory', 'steering',
  'corporate', 'enterprise', 'business', 'commercial', 'social', 'media', 'creative', 'content', 'writing', 'subject',  

  // Tech Sector
  'tech', 'stack', 'implementation', 'verification', 'process', 'managing', 'operating', 'board', 'advisory', 'steering',
  'corporate', 'enterprise', 'business', 'commercial', 'technological', 'integration', 

  // Construction Sector
  'building', 'construction', 'development', 'project', 'site', 'planning', 'design', 'engineering',
  'architecture', 'infrastructure', 'facility', 'maintenance', 'operations',

  // Non-name common words
  'the', 'of', 'and', 'a', 'to', 'in', 'is', 'it', 'at',

  // Entertainment Sector
  'entertainment', 'music', 'film', 'television', 'video', 'show', 'event', 'performance', 'concert', 'festival',

  // Healthcare Sector
  'healthcare', 'medical', 'hospital', 'clinic', 'facility', 'care', 'insurance', 'health', 'dental', 'pharmacy', 
  'pharmaceutical', 'disease', 'diagnosis', 'treatment', 'therapy',

  // Finance Sector
  'finance', 'accounting', 'investment', 'management', 'tax', 'invest', 'fund', 'loan', 'credit', 'debt', 'range', 'revenue',

  // Skincare & spa Sector
  'skincare', 'spa', 'makeup', 'hair', 'beauty', 'skin', 'treatment', 'therapy', 'cosmetics', 'hygiene', 'wellness', 'therapeutics', 
  'relaxation', 'rejuvenation', 'recovery', 'hydration', 'nutrition',

  // Fitness Sector
  'fitness', 'exercise', 'gym', 'training', 'nutrition', 'diet', 'health', 'wellness', 'fit', 'routine', 'program',

  // Fashion Sector
  'fashion', 'style', 'trend', 'design', 'brand', 'show',

  // Education Sector
  'education', 'school', 'university', 'college', 'degree', 'training', 'program', 'course', 'certification', 'diploma', 'masters', 'bachelors', 'ma',

  // Tourism Sector
  'tourism', 'travel', 'vacation', 'holiday', 'trip', 'destination', 'experience', 'adventure', 'sightseeing', 'excursion', 'exploration',

  // Religion Sector
  'religion', 'spirituality', 'religious', 'church', 'temple', 'christianity', 'judaism', 'islam', 'buddhism',

  // Sports Sector
  'sports', 'athletics', 'sport', 'team', 'league', 'competition', 'event', 'match', 'game', 'season', 'tournament', 'championship', 'world', 'cup', 'final',

  // Art Sector
  'art', 'design', 'painting', 'sculpture', 'architecture', 'museum', 'gallery', 'exhibition', 'collection',

  // Real-estate Sector
  'real-estate', 'property', 'home', 'rental', 'sale', 'buy', 'buying', 'sell', 'selling', 'housing', 'development',

  // Catering Sector 
  'catering', 'restaurant', 'food', 'menu', 'dining', 'service', 'delivery',

  // Geographic Sector
  'geography', 'location', 'region', 'country', 'city', 'state', 'province', 'county', 'municipality', 'district', 'neighborhood', 'village', 'town', 'street', 'block', 'corner', 'road', 'avenue', 'highway', 'freeway', 'northern', 'southern', 'eastern', 'western', 'north', 'south', 'east', 'west', 

  // Govt Sector
  'government', 'governor', 'governor-general', 'governor-general', 'authoritative', 'executive', 'chief', 'chief-executive', 'authority'
]);

// Common business email formats for contact extraction
const EMAIL_FORMATS = [
  (first: string, last: string) => `${first}.${last}`,
  (first: string, last: string) => `${first[0]}${last}`,
  (first: string, last: string) => `${first}${last[0]}`,
  (first: string, last: string) => `${first}`,
  (first: string, last: string) => `${last}`,
  (first: string, last: string) => `${first[0]}.${last}`
];

function generatePossibleEmails(name: string, domain: string): string[] {
  const nameParts = name.toLowerCase().split(/\s+/);
  if (nameParts.length < 2) return [];

  const firstName = nameParts[0];
  const lastName = nameParts[nameParts.length - 1];

  return EMAIL_FORMATS.map(format =>
    `${format(firstName, lastName)}@${domain}`
  );
}

function extractDomainFromContext(text: string): string | null {
  const domainPattern = /(?:@|http:\/\/|https:\/\/|www\.)([a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,})/;
  const match = text.match(domainPattern);
  return match ? match[1] : null;
}

const isPlaceholderName = (name: string): boolean => PLACEHOLDER_NAMES.has(name.toLowerCase());

export async function extractContacts(
  analysisResults: string[],
  companyName?: string,
  validationOptions: ValidationOptions = {}
): Promise<Partial<Contact>[]> {
  if (!Array.isArray(analysisResults)) {
    console.warn('analysisResults is not an array, returning empty array');
    return [];
  }

  console.log('Starting contact extraction process');
  const contacts: Partial<Contact>[] = [];
  const nameRegex = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g;
  const emailRegex = /[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}/g;
  const roleRegex = /(?:is|as|serves\s+as)\s+(?:the|a|an)\s+([^,.]+?(?:Manager|Director|Officer|Executive|Lead|Head|Chief|Founder|Owner|President|CEO|CTO|CFO))/gi;

  try {
    // First pass: Extract all names for bulk validation
    const allNames: string[] = [];
    for (const result of analysisResults) {
      if (typeof result !== 'string') continue;
      nameRegex.lastIndex = 0;
      let nameMatch;
      while ((nameMatch = nameRegex.exec(result)) !== null) {
        const name = nameMatch[0];
        if (!isPlaceholderName(name)) {
          allNames.push(name);
        }
      }
    }

    console.log(`Found ${allNames.length} potential contact names for validation`);

    // Bulk validate all names with Perplexity AI
    console.log('Starting bulk AI validation');
    const aiScores = await validateNames(allNames, companyName, validationOptions.searchPrompt);
    console.log('Completed bulk AI validation');

    // Second pass: Process each result with AI scores
    for (const result of analysisResults) {
      if (typeof result !== 'string') continue;

      const domain = extractDomainFromContext(result);
      nameRegex.lastIndex = 0;
      let nameMatch;

      while ((nameMatch = nameRegex.exec(result)) !== null) {
        const name = nameMatch[0];
        if (isPlaceholderName(name)) continue;

        const nameIndex = result.indexOf(name);
        const contextWindow = result.slice(
          Math.max(0, nameIndex - 100),
          nameIndex + 200
        );

        // Use AI score in validation
        const aiScore = aiScores[name] || 50;
        console.log(`Processing contact "${name}" with AI score: ${aiScore}`);

        const validationResult = validateName(name, contextWindow, companyName, {
          ...validationOptions,
          aiScore
        });

        if (validationResult.score >= (validationOptions.minimumScore || 30)) {
          roleRegex.lastIndex = 0;
          const roleMatch = roleRegex.exec(contextWindow);
          const role = roleMatch ? roleMatch[1].trim() : null;

          const emailMatches = new Set<string>();
          emailRegex.lastIndex = 0;
          let emailMatch;

          while ((emailMatch = emailRegex.exec(result)) !== null) {
            const email = emailMatch[0].toLowerCase();
            if (!isPlaceholderEmail(email) && isValidBusinessEmail(email)) {
              emailMatches.add(email);
            }
          }

          if (domain) {
            const predictedEmails = generatePossibleEmails(name, domain);
            for (const email of predictedEmails) {
              if (isValidBusinessEmail(email) && !isPlaceholderEmail(email)) {
                emailMatches.add(email);
              }
            }
          }

          const nameParts = name.toLowerCase().split(/\s+/);
          emailRegex.lastIndex = 0;

          while ((emailMatch = emailRegex.exec(result)) !== null) {
            const email = emailMatch[0].toLowerCase();
            if (!isPlaceholderEmail(email) &&
              nameParts.some(part => part.length >= 2 && email.includes(part))) {
              emailMatches.add(email);
            }
          }

          const emailsArray = Array.from(emailMatches);

          console.log(`Adding contact "${name}" with final score: ${validationResult.score}`);
          contacts.push({
            name,
            email: emailsArray.length > 0 ? emailsArray[0] : null,
            role,
            probability: validationResult.score,
            nameConfidenceScore: validationResult.score,
            lastValidated: new Date(),
            completedSearches: ['name_validation', 'ai_validation']
          });
        }
      }
    }

    const finalContacts = contacts
      .sort((a, b) => (b.probability || 0) - (a.probability || 0))
      .filter((contact, index, self) =>
        index === self.findIndex(c => c.name === contact.name)
      );

    console.log(`Extracted ${finalContacts.length} validated contacts`);
    return finalContacts;

  } catch (error) {
    console.error('Error in contact extraction:', error);
    return [];
  }
}

// Sequential validation steps
export function validateName(
  name: string,
  context: string = "",
  companyName?: string | null,
  options: ValidationOptions = {}
): NameValidationResult {
  const validationSteps: ValidationStepResult[] = [];
  let totalScore = 0;

  // Step 1: Format and Structure Validation (25% weight)
  const formatScore = validateNameFormat(name);
  validationSteps.push({
    name: "Format Validation",
    score: formatScore,
    weight: VALIDATION_WEIGHTS.formatAndStructure
  });

  // Step 2: Generic Terms Check (20% weight)
  const genericScore = validateGenericTerms(name);
  validationSteps.push({
    name: "Generic Terms Check",
    score: genericScore,
    weight: VALIDATION_WEIGHTS.genericTerms
  });

  // Step 3: AI Validation Score (30% weight)
  const aiScore = options.aiScore || 50;
  validationSteps.push({
    name: "AI Validation",
    score: aiScore,
    weight: VALIDATION_WEIGHTS.aiValidation
  });

  // Step 4: Context Analysis (15% weight)
  const contextScore = validateContext(name, context, companyName);
  validationSteps.push({
    name: "Context Analysis",
    score: contextScore,
    weight: VALIDATION_WEIGHTS.contextAnalysis
  });

  // Step 5: Domain Knowledge Rules (10% weight)
  const domainScore = validateDomainRules(name, context);
  validationSteps.push({
    name: "Domain Rules",
    score: domainScore,
    weight: VALIDATION_WEIGHTS.domainKnowledge
  });

  // Calculate weighted total
  totalScore = validationSteps.reduce((acc, step) => {
    return acc + (step.score * step.weight);
  }, 0);

  // Apply penalties for generic terms more aggressively
  const nameParts = name.toLowerCase().split(/[\s-]+/);
  const genericTermCount = nameParts.filter(part => GENERIC_TERMS.has(part)).length;
  if (genericTermCount > 0) {
    const genericPenalty = Math.min(75, genericTermCount * 35); // Increased penalty per generic term
    totalScore = Math.max(20, totalScore - genericPenalty);
    validationSteps.push({
      name: "Generic Term Penalty",
      score: -genericPenalty,
      weight: 1,
      reason: `Contains ${genericTermCount} generic terms`
    });
  }

  // Apply search term penalties
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

  // Apply company name penalties
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
  totalScore = Math.max(options.minimumScore || 20, Math.min(MAX_SCORE, totalScore));

  return {
    score: Math.round(totalScore),
    isGeneric: genericScore < 40,
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
  const nameLower = name.toLowerCase();
  const words = nameLower.split(/[\s-]+/);
  let score = 80;

  // Check against generic terms
  const genericCount = words.filter(word =>
    GENERIC_TERMS.has(word) || PLACEHOLDER_NAMES.has(word)
  ).length;

  if (genericCount > 0) {
    score -= (genericCount * 25);
  }

  // Additional checks for business terms
  if (/\b(department|team|group|division)\b/i.test(name)) {
    score -= 40;
  }

  return Math.min(95, Math.max(20, score));
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