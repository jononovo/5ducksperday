import type { ValidationOptions } from '@shared/schema';

export interface NameValidationResult {
  score: number;
  reasons: string[];
}

export function validateNameLocally(name: string, context?: string): NameValidationResult {
  if (!name || typeof name !== 'string') {
    return { score: 0, reasons: ['Invalid input'] };
  }

  let score = 50;
  const reasons: string[] = [];

  // Length checks
  if (name.length < 4) {
    score -= 20;
    reasons.push('Name too short');
  } else if (name.length > 50) {
    score -= 20;
    reasons.push('Name too long');
  }

  // Basic format checks
  if (!/^[A-Z]/.test(name)) {
    score -= 10;
    reasons.push('Does not start with capital letter');
  }

  // Pattern matching
  if (/^[A-Z][a-z]+\s+[A-Z][a-z]+$/.test(name)) {
    score += 30;
    reasons.push('Matches standard full name pattern');
  }

  // Context-based validation if provided
  if (context) {
    const lowerContext = context.toLowerCase();
    const nameParts = name.toLowerCase().split(/\s+/);
    
    // Look for role indicators near the name
    const roleNearName = lowerContext.includes(`${name.toLowerCase()} is`) || 
                        lowerContext.includes(`${name.toLowerCase()}, the`);
    if (roleNearName) {
      score += 10;
      reasons.push('Name appears with role context');
    }
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    reasons
  };
}

export function combineValidationScores(
  aiScore: number,
  localValidation: NameValidationResult,
  options?: ValidationOptions
): number {
  const weights = {
    ai: options?.aiWeight || 0.6,
    local: options?.localWeight || 0.4
  };

  return Math.round(
    (aiScore * weights.ai) + (localValidation.score * weights.local)
  );
}
