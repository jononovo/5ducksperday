import { NameValidationResult } from "./contact-name-validation";

export interface ValidationOptions {
  useLocalValidation?: boolean;
  localValidationWeight?: number;
  minimumScore?: number;
  companyNamePenalty?: number;
  searchPrompt?: string;  
  searchTermPenalty?: number;
}

// Founder detection confidence levels
const FOUNDER_CONFIDENCE = {
  STRONG: 0.9,    // Multiple strong indicators
  MEDIUM: 0.6,    // Some supporting evidence
  WEAK: 0.3,      // Limited evidence
  NONE: 0         // No founder indicators
};

// Similarity thresholds for graduated penalties
const SIMILARITY_THRESHOLDS = {
  EXACT: 0.9,     // Nearly identical match
  HIGH: 0.7,      // Very similar
  MEDIUM: 0.5,    // Moderately similar
  LOW: 0.3        // Slightly similar
};

// Base penalties for different similarity levels
const BASE_PENALTIES = {
  EXACT: 75,     // Highest similarity - highest penalty
  HIGH: 60,      // Very similar
  MEDIUM: 45,    // Moderately similar
  LOW: 35        // Slightly similar - matches new default penalty
};

/**
 * Analyzes contextual information to find evidence of founder status
 * Returns a confidence score between 0 and 1
 */
function analyzeFounderEvidence(context: string, companyName: string): number {
  const normalizedContext = context.toLowerCase();
  const normalizedCompany = companyName.toLowerCase();
  let confidence = 0;

  // Strong founder indicators with weighted scoring
  const founderPatterns = [
    { pattern: /\b(?:founder|co-founder|founding)\b/i, weight: 0.4 },
    { pattern: /\b(?:started|established|created|launched)\s+(?:the\s+)?company\b/i, weight: 0.35 },
    { pattern: /\b(?:owner|proprietor)\b/i, weight: 0.3 },
    { pattern: /\bceo\b/i, weight: 0.25 },
    { pattern: /\b(?:president|chief\s+executive)\b/i, weight: 0.25 }
  ];

  // Supporting evidence patterns
  const supportingPatterns = [
    { pattern: /(?:since|in|founded)\s+(?:19|20)\d{2}\b/, weight: 0.2 },        // Founding date
    { pattern: /\b(?:leads|directs|manages)\s+(?:the\s+)?(?:company|business|organization)\b/i, weight: 0.15 },
    { pattern: /\b(?:founding|initial|original)\s+team\b/i, weight: 0.15 },
    { pattern: /\b(?:visionary|pioneer|entrepreneur)\b/i, weight: 0.1 },
    { pattern: /\b(?:bootstrapped|self-funded|started from)\b/i, weight: 0.1 }
  ];

  // Check founder patterns near company name mentions
  const contextWindow = 150; // Characters to look around company name mention
  const companyMentions = [...normalizedContext.matchAll(new RegExp(normalizedCompany, 'gi'))];

  for (const mention of companyMentions) {
    const start = Math.max(0, mention.index! - contextWindow);
    const end = Math.min(normalizedContext.length, mention.index! + normalizedCompany.length + contextWindow);
    const nearbyContext = normalizedContext.slice(start, end);

    // Check primary founder patterns
    for (const { pattern, weight } of founderPatterns) {
      if (pattern.test(nearbyContext)) {
        confidence = Math.max(confidence, weight);
      }
    }

    // Check supporting evidence
    for (const { pattern, weight } of supportingPatterns) {
      if (pattern.test(nearbyContext)) {
        confidence += weight * 0.5; // Supporting evidence adds half its weight
      }
    }
  }

  // Check for business registration language
  if (/\b(?:registered|incorporated|filed)\s+(?:the\s+)?(?:company|business)\b/i.test(normalizedContext)) {
    confidence += 0.15;
  }

  // Cap confidence at 1.0
  return Math.min(1, confidence);
}

/**
 * Calculate similarity between a name and company name
 * Returns a score between 0 and 1
 */
function calculateNameSimilarity(name: string, companyName: string): number {
  const normalizedName = name.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  const normalizedCompany = companyName.toLowerCase().replace(/[^a-z0-9\s]/g, '');

  // Remove common business suffixes for comparison
  const cleanCompany = normalizedCompany
    .replace(/\b(?:inc|llc|ltd|corp|co|company|group|holdings)\b/, '')
    .trim();

  // Split into words for more detailed comparison
  const nameWords = normalizedName.split(/\s+/);
  const companyWords = cleanCompany.split(/\s+/);

  let similarity = 0;

  // Exact match check (highest similarity)
  if (normalizedName === cleanCompany) {
    return 1;
  }

  // Word-by-word comparison with position weighting
  let matchingWords = 0;
  let positionScore = 0;

  for (let i = 0; i < nameWords.length; i++) {
    const nameWord = nameWords[i];
    for (let j = 0; j < companyWords.length; j++) {
      if (nameWord === companyWords[j]) {
        matchingWords++;
        // Words in the same position get higher score
        positionScore += (i === j) ? 0.3 : 0.1;
      }
    }
  }

  // Calculate base similarity from matching words
  const wordSimilarity = matchingWords / Math.max(nameWords.length, companyWords.length);

  // Combine word matches with position bonuses
  similarity = wordSimilarity + positionScore;

  // Substring check with length consideration
  if (cleanCompany.includes(normalizedName) || normalizedName.includes(cleanCompany)) {
    const lengthRatio = Math.min(normalizedName.length, cleanCompany.length) / 
                       Math.max(normalizedName.length, cleanCompany.length);
    similarity = Math.max(similarity, lengthRatio * 0.8); // Cap substring similarity at 0.8
  }

  return Math.min(1, similarity);
}

/**
 * Calculate final penalty based on similarity and founder evidence
 */
function calculateSimilarityPenalty(
  similarity: number,
  founderConfidence: number
): number {
  // Determine base penalty from similarity level
  let basePenalty = 0;
  if (similarity >= SIMILARITY_THRESHOLDS.EXACT) {
    basePenalty = BASE_PENALTIES.EXACT;
  } else if (similarity >= SIMILARITY_THRESHOLDS.HIGH) {
    basePenalty = BASE_PENALTIES.HIGH;
  } else if (similarity >= SIMILARITY_THRESHOLDS.MEDIUM) {
    basePenalty = BASE_PENALTIES.MEDIUM;
  } else if (similarity >= SIMILARITY_THRESHOLDS.LOW) {
    basePenalty = BASE_PENALTIES.LOW;
  }

  // Reduce penalty based on founder evidence
  // Only strong founder evidence significantly reduces penalty
  if (founderConfidence >= FOUNDER_CONFIDENCE.STRONG) {
    return Math.max(0, basePenalty * 0.2); // 80% reduction
  } else if (founderConfidence >= FOUNDER_CONFIDENCE.MEDIUM) {
    return Math.max(0, basePenalty * 0.6); // 40% reduction
  } else if (founderConfidence >= FOUNDER_CONFIDENCE.WEAK) {
    return Math.max(0, basePenalty * 0.8); // 20% reduction
  }

  return basePenalty; // No reduction for no founder evidence
}

/**
 * Main validation function that combines similarity checking with founder detection
 */
export function validateNameCompanySimilarity(
  name: string,
  context: string = "",
  companyName: string
): { penalty: number; similarity: number; founderConfidence: number } {
  // Calculate similarity score
  const similarity = calculateNameSimilarity(name, companyName);

  // Only proceed with founder analysis if similarity is significant
  if (similarity >= SIMILARITY_THRESHOLDS.LOW) {
    const founderConfidence = analyzeFounderEvidence(context, companyName);
    const penalty = calculateSimilarityPenalty(similarity, founderConfidence);

    return {
      penalty,
      similarity,
      founderConfidence
    };
  }

  return {
    penalty: 0,
    similarity,
    founderConfidence: 0
  };
}

const defaultOptions: ValidationOptions = {
  useLocalValidation: true,
  localValidationWeight: 0.3,
  minimumScore: 30,
  companyNamePenalty: 35,  // Increased from 20 to 35
  searchTermPenalty: 25
};

export function combineValidationScores(
  aiScore: number,
  localResult: NameValidationResult,
  companyName?: string | null,
  options: ValidationOptions = defaultOptions
): number {
  if (!options.useLocalValidation) {
    return aiScore;
  }

  const weight = options.localValidationWeight || 0.3;
  let combinedScore = Math.round(
    (aiScore * (1 - weight)) + (localResult.score * weight)
  );

  // Apply company name penalty using the new similarity function
  if (companyName && typeof companyName === 'string') {
    const { penalty, similarity } = validateNameCompanySimilarity(localResult.name, localResult.context, companyName);
    combinedScore -= penalty;
  }

  // Apply search term penalty
  if (options.searchPrompt) {
    const searchTerms = options.searchPrompt.toLowerCase().split(/\s+/);
    const normalizedName = localResult.name.toLowerCase();

    // Skip common words shorter than 4 characters
    const matchingTerms = searchTerms.filter(term => 
      term.length >= 4 && normalizedName.includes(term)
    );

    if (matchingTerms.length > 0) {
      combinedScore = Math.max(20, combinedScore - (options.searchTermPenalty || 25));
    }
  }

  // Higher penalty for generic names
  if (localResult.isGeneric) {
    return Math.max(20, combinedScore - 30);
  }

  return Math.max(options.minimumScore || 30, Math.min(100, combinedScore));
}

/**
 * @deprecated Use calculateNameSimilarity instead
 * This function is kept for backward compatibility
 */
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

/**
 * @deprecated Use analyzeFounderEvidence instead
 * This function is kept for backward compatibility
 */
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