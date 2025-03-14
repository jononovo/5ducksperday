import { Contact } from "@shared/schema";
import { isValidBusinessEmail, generatePossibleEmails, extractDomainFromContext } from "./email-analysis";
import { validateNames, combineValidationScores } from "./contact-ai-name-scorer";
import { 
  isPlaceholderName, 
  isPlaceholderEmail, 
  calculateGenericTermPenalty, 
  countGenericTerms,
  calculateIndustryContextScore,
  GENERIC_TERMS 
} from "./name-filters";

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
  industry?: string; // Added industry context for more targeted validation
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

// We use the GENERIC_TERMS imported from name-filters.ts

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
  
  // Enhanced name regex to catch more patterns of real names
  // This pattern is more forgiving to catch various name formats
  const nameRegex = /([A-Z][a-z]+(?:[-'\s]+[A-Z][a-z]+)+)|([A-Z][a-z]+\s+[A-Z]\.?\s+[A-Z][a-z]+)/g;
  
  // Standard email regex
  const emailRegex = /[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}/g;
  
  // Enhanced role regex to catch more leadership positions
  const roleRegex = /(?:(?:is|as|serves\s+as)\s+(?:the|a|an)\s+|,\s+|:\s+)([^,.\n]*?(?:Manager|Director|VP|Officer|Executive|Lead|Head|Chief|Founder|Owner|President|CEO|CTO|CFO|Partner|Principal))/gi;

  try {
    // First pass: Extract and manually validate all names
    const potentialNames: {name: string; score: number; context: string}[] = [];
    let totalNamesFound = 0;

    for (const result of analysisResults) {
      if (typeof result !== 'string') continue;
      nameRegex.lastIndex = 0;
      let nameMatch;

      while ((nameMatch = nameRegex.exec(result)) !== null) {
        const name = nameMatch[0];
        totalNamesFound++;

        console.log(`\nAnalyzing name: "${name}"`);

        if (isPlaceholderName(name)) {
          console.log(`Skipping placeholder name: ${name}`);
          continue;
        }

        const nameIndex = result.indexOf(name);
        const contextWindow = result.slice(
          Math.max(0, nameIndex - 100),
          nameIndex + 200
        );

        // Manual validation first
        const validationResult = validateName(name, contextWindow, companyName);
        console.log(`Manual validation score for "${name}": ${validationResult.score}`);

        // Use a much lower threshold to include more potential matches
        // We'll filter more aggressively later
        if (validationResult.score >= 25) { // Significantly lower threshold (was 40)
          console.log(`Name "${name}" passed manual validation with score ${validationResult.score}`);
          potentialNames.push({
            name,
            score: validationResult.score,
            context: contextWindow
          });
        } else {
          console.log(`Name "${name}" failed manual validation with score ${validationResult.score}`);
        }
      }
    }

    console.log(`\nTotal names found: ${totalNamesFound}`);
    console.log(`Names passing manual validation: ${potentialNames.length}`);

    if (potentialNames.length === 0) {
      console.log('No names passed manual validation, returning empty array');
      return [];
    }

    // Second pass: AI validation for qualified names
    const qualifiedNames = potentialNames.map(p => p.name);
    console.log('\nStarting AI validation for qualified names:', qualifiedNames);
    const aiScores = await validateNames(qualifiedNames, companyName, validationOptions.searchPrompt);
    console.log('AI validation scores:', aiScores);

    // Process results with both manual and AI scores
    for (const { name, context, score: manualScore } of potentialNames) {
      const aiScore = aiScores[name] || 50;
      console.log(`\nProcessing "${name}":
        - Manual score: ${manualScore}
        - AI score: ${aiScore}`);

      const finalScore = combineValidationScores(aiScore, manualScore, {
        minimumScore: validationOptions.minimumScore || 20, // Lowered threshold (was 30)
        companyNamePenalty: 15, // Reduced penalty (was 20)
        requireRole: false, // Don't require role (was true)
        roleMinimumScore: 30 // Lower role score requirement (was 40)
      });

      console.log(`Final combined score for "${name}": ${finalScore}`);

      // Use much lower final threshold to include more names
      if (finalScore >= (validationOptions.minimumScore || 20)) { // Lowered threshold (was 30)
        roleRegex.lastIndex = 0;
        const roleMatch = roleRegex.exec(context);
        const role = roleMatch ? roleMatch[1].trim() : null;

        const domain = extractDomainFromContext(context);
        const emailMatches = new Set<string>();

        // Email extraction logic remains the same
        emailRegex.lastIndex = 0;
        let emailMatch;
        while ((emailMatch = emailRegex.exec(context)) !== null) {
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

        const emailsArray = Array.from(emailMatches);

        console.log(`Adding contact "${name}" with final score: ${finalScore}`);
        contacts.push({
          name,
          email: emailsArray.length > 0 ? emailsArray[0] : null,
          role,
          probability: finalScore,
          nameConfidenceScore: finalScore,
          lastValidated: new Date(),
          completedSearches: ['name_validation', 'ai_validation']
        });
      } else {
        console.log(`Name "${name}" failed final validation with score ${finalScore}`);
      }
    }

    const finalContacts = contacts
      .sort((a, b) => (b.probability || 0) - (a.probability || 0))
      .filter((contact, index, self) =>
        index === self.findIndex(c => c.name === contact.name)
      );

    console.log(`\nExtracted ${finalContacts.length} validated contacts`);
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
  const domainScore = validateDomainRules(name, context, options);
  validationSteps.push({
    name: "Domain Rules",
    score: domainScore,
    weight: VALIDATION_WEIGHTS.domainKnowledge,
    reason: options?.industry ? `Industry context: ${options.industry}` : undefined
  });

  // Calculate weighted total
  totalScore = validationSteps.reduce((acc, step) => {
    return acc + (step.score * step.weight);
  }, 0);

  // Apply penalties for generic terms more aggressively
  const nameParts = name.toLowerCase().split(/[\s-]+/);
  // Use the centralized countGenericTerms function
  const genericTermCount = countGenericTerms(name);
  if (genericTermCount > 0) {
    // Use the pre-calculated penalty from name-filters
    const genericPenalty = calculateGenericTermPenalty(name);
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
  
  // Strict name pattern with optional middle initial
  // First name and last name required, middle name/initial optional
  const namePattern = /^[A-Z][a-z]+(?:(?:\s+[A-Z](?:\.|\s+))?(?:\s+[A-Z][a-z]+){1,2})$/;
  const nameParts = name.split(/\s+/).filter(part => part.length > 0);
  
  // CRITICAL CHECK: Must pass name pattern test
  if (namePattern.test(name)) {
    score += 35; // Increased bonus for proper format
  } else {
    score -= 30; // Significant penalty for improper format
  }
  
  // Check if ALL CAPS (unlikely for real person name)
  if (name === name.toUpperCase() && name.length > 2) {
    score -= 40; // Severe penalty
  }
  
  // Stricter format checks for name parts
  const validPartCount = nameParts.length >= 2 && nameParts.length <= 4;
  if (!validPartCount) {
    score -= 25; // Increased penalty for wrong number of parts
  }
  
  // Ideal name format analysis
  if (nameParts.length === 2) {
    // First name + Last name (most common format)
    score += 20;
  } else if (nameParts.length === 3) {
    // First name + Middle name/initial + Last name
    score += 15;
  } else if (nameParts.length > 4) {
    // Too many parts, likely not a real name
    score -= 15 * (nameParts.length - 4); // Progressive penalty
  }
  
  // Length checks for each part
  const hasReasonableLengths = nameParts.every(part =>
    part.length >= 2 && part.length <= 20
  );
  
  if (hasReasonableLengths) {
    score += 15; // Increased bonus
  } else {
    score -= 25; // Increased penalty
  }
  
  // Check for invalid characters in names
  const hasInvalidChars = /[0-9@#$%^&*()+=\[\]{}|\\/<>~`_]/.test(name);
  if (hasInvalidChars) {
    score -= 40; // Severe penalty for invalid chars
  }
  
  // Check for common name prefixes (slight bonus)
  const prefixes = ['Mr', 'Mrs', 'Ms', 'Dr', 'Prof'];
  if (prefixes.includes(nameParts[0])) {
    score += 5;
  }
  
  return Math.min(95, Math.max(10, score)); // Allow lower minimum score for clearer validation failures
}

function validateGenericTerms(name: string): number {
  let score = 80;

  // Use the centralized generic terms counter from name-filters
  const genericCount = countGenericTerms(name);

  // Apply penalty based on generic terms found
  if (genericCount > 0) {
    // Use the pre-calculated penalty from name-filters
    score -= calculateGenericTermPenalty(name);
  }

  // Extended checks for business terms with more patterns
  if (/\b(department|team|group|division|office|support|sales|service|info)\b/i.test(name)) {
    score -= 50; // Increased penalty
  }
  
  // Check for words that are commonly part of business activities and not names
  if (/\b(contact|inquiry|question|help|service|request|consult|about)\b/i.test(name)) {
    score -= 45;
  }
  
  // Check for title-like words that indicate this is a role, not a person
  if (/\b(manager|director|president|chief|officer|ceo|cfo|cto|owner|founder)\b/i.test(name)) {
    // Only penalize if these words appear alone, not as part of "John Smith, CEO"
    // Look for commas or parentheses that would indicate a name with title
    if (!name.includes(',') && !name.includes('(') && !name.includes('-')) {
      score -= 40;
    }
  }
  
  // Check for email-like patterns which are definitely not person names
  if (name.includes('@') || /\b(email|mail)\b/i.test(name)) {
    score -= 75; // Severe penalty
  }

  return Math.min(95, Math.max(0, score)); // Allow complete rejection with score of 0
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

function validateDomainRules(name: string, context: string, options?: ValidationOptions): number {
  let score = 70;

  // Check for professional title patterns
  if (/Dr\.|Prof\.|PhD/i.test(name)) {
    score += 10;
  }

  // Check for common name patterns in business context
  if (/^[A-Z]\.\s[A-Z][a-z]+$/.test(name)) { // Initial + Last name
    score -= 15;
  }

  // Apply industry-specific validation if industry context is provided
  if (options?.industry) {
    const industry = options.industry;
    
    // Healthcare-specific validation rules (applied before general industry adjustment)
    if (industry === 'healthcare') {
      const nameLower = name.toLowerCase();
      
      // Boost for medical titles at beginning of name (Dr. Jane Smith)
      const medicalPrefixes = ['dr.', 'dr ', 'doctor', 'prof.', 'professor'];
      if (medicalPrefixes.some(prefix => nameLower.startsWith(prefix))) {
        score += 15;
        console.log(`Healthcare boost: Medical prefix found in "${name}": +15`);
      }
      
      // Boost for medical degrees at end of name (Jane Smith, MD)
      const medicalSuffixes = [', md', ', do', ', phd', ', rn', ', np', ', pa', ', pharmd'];
      if (medicalSuffixes.some(suffix => nameLower.endsWith(suffix))) {
        score += 15;
        console.log(`Healthcare boost: Medical suffix found in "${name}": +15`);
      }
      
      // Check for healthcare titles in surrounding context
      const titleInContext = (
        context.match(new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+(?:is|as)\\s+(?:a|the)\\s+([\\w\\s]+(?:doctor|physician|surgeon|specialist|practitioner|nurse|therapist))`, 'i')) ||
        context.match(new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*,\\s*([\\w\\s]+(?:doctor|physician|surgeon|specialist|practitioner|nurse|therapist))`, 'i'))
      );
      
      if (titleInContext) {
        score += 10;
        console.log(`Healthcare boost: Title context match for "${name}": +10`);
      }
      
      // Special case: Full healthcare professional patterns
      if ((/Dr\.\s+[A-Z][a-z]+\s+[A-Z][a-z]+/.test(name) || 
          /Professor\s+[A-Z][a-z]+\s+[A-Z][a-z]+/.test(name)) && 
          !name.includes('Hospital') && !name.includes('Center')) {
        // Very likely a real person with title
        score += 20;
        console.log(`Healthcare boost: Full title pattern match for "${name}": +20`);
      }
      
      // Penalize department names
      const departmentTerms = ['department', 'unit', 'center', 'ward', 'clinic', 'hospital', 'institute'];
      if (departmentTerms.some(term => nameLower.includes(term))) {
        score -= 30;
        console.log(`Healthcare penalty: Department term found in "${name}": -30`);
      }
    }
    
    // Apply the general industry adjustment after specific rules
    const industryAdjustment = calculateIndustryContextScore(name, industry);
    score += industryAdjustment;
    
    // Log the adjustment for debugging
    console.log(`Applied industry-specific adjustment for industry "${options.industry}": ${industryAdjustment}`);
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