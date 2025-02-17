import { NameValidationResult } from "./contact-name-validation";

export interface ValidationOptions {
  useLocalValidation?: boolean;
  localValidationWeight?: number;
  minimumScore?: number;
  companyNamePenalty?: number;
}

const defaultOptions: ValidationOptions = {
  useLocalValidation: true,
  localValidationWeight: 0.3,
  minimumScore: 30,
  companyNamePenalty: 20
};

export function combineValidationScores(
  aiScore: number,
  localResult: NameValidationResult,
  companyName?: string,
  options: ValidationOptions = defaultOptions
): number {
  if (!options.useLocalValidation) {
    return aiScore;
  }

  const weight = options.localValidationWeight || 0.3;
  let combinedScore = Math.round(
    (aiScore * (1 - weight)) + (localResult.score * weight)
  );

  // Apply company name penalty if the name matches or is similar to company name
  if (companyName && isNameSimilarToCompany(localResult.name, companyName)) {
    // Check for founder/owner context
    if (!hasFounderContext(localResult.context)) {
      combinedScore = Math.max(20, combinedScore - (options.companyNamePenalty || 20));
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
  
  // Direct match check
  if (normalizedName === normalizedCompany) return true;
  
  // Substring check with minimum length
  if (normalizedName.length > 4 && 
      (normalizedCompany.includes(normalizedName) || 
       normalizedName.includes(normalizedCompany))) {
    return true;
  }
  
  return false;
}

function hasFounderContext(context?: string): boolean {
  if (!context) return false;
  
  const founderPatterns = [
    /founder/i,
    /owner/i,
    /ceo/i,
    /president/i,
    /chief\s+executive/i,
    /partner/i
  ];
  
  return founderPatterns.some(pattern => pattern.test(context));
}
