import { NameValidationResult } from "./contact-name-validation";

export interface ValidationOptions {
  useLocalValidation?: boolean;
  localValidationWeight?: number;
  minimumScore?: number;
  companyNamePenalty?: number;
  searchPrompt?: string;  
  searchTermPenalty?: number;  
}

const defaultOptions: ValidationOptions = {
  useLocalValidation: true,
  localValidationWeight: 0.3,
  minimumScore: 30,
  companyNamePenalty: 20,
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

  // Apply company name penalty with improved founder detection
  if (companyName && typeof companyName === 'string' && isNameSimilarToCompany(localResult.name, companyName)) {
    // Only apply penalty if not a founder/owner
    if (!isFounderOrOwner(localResult.context, companyName)) {
      combinedScore = Math.max(20, combinedScore - (options.companyNamePenalty || 20));
    } else {
      // Boost score for verified founders
      combinedScore = Math.min(100, combinedScore + 10);
    }
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
    // Check if name is a significant part of company name
    if (cleanCompany.includes(normalizedName)) {
      return true;
    }
    // Check if company name is a significant part of the person's name
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