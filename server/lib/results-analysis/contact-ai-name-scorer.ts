import type { Contact } from "@shared/schema";
import { validateName } from "./contact-name-validation";
import { queryPerplexity } from "../api/perplexity-client";
import type { PerplexityMessage } from "../types/perplexity";

export interface ValidationOptions {
  minimumScore?: number;
  companyNamePenalty?: number;
  requireRole?: boolean;
  roleMinimumScore?: number;
}

export function combineValidationScores(
  aiScore: number,
  patternScore: number,
  options: ValidationOptions = {}
): number {
  const weights = {
    ai: 0.8,        // Increased AI weight for stricter validation
    pattern: 0.2    // Decreased pattern weight
  };

  let combinedScore = (aiScore * weights.ai) + (patternScore * weights.pattern);

  // Stricter minimum score threshold
  if (options.minimumScore && combinedScore < options.minimumScore) {
    combinedScore = Math.max(combinedScore - 30, 0); // Increased penalty
  }

  // More aggressive penalties for non-person names
  if (options.requireRole && options.roleMinimumScore) {
    if (patternScore < options.roleMinimumScore) {
      combinedScore = Math.max(combinedScore - 35, 0); // Increased penalty
    }
  }

  // Increased company name penalty
  if (options.companyNamePenalty && combinedScore < 75) { // Increased threshold
    const adjustedPenalty = Math.min(options.companyNamePenalty, 40); // Increased max penalty
    combinedScore = Math.max(combinedScore - adjustedPenalty, 0);
  }

  return Math.min(Math.max(Math.round(combinedScore), 0), 100);
}

export async function validateNames(
  names: string[],
  companyName?: string,
  searchPrompt?: string
): Promise<Record<string, number>> {
  console.log(`Running AI validation for ${names.length} contacts`);

  const messages: PerplexityMessage[] = [
    {
      role: "system",
      content: `You are a strict contact name validation service. Analyze each name and return a JSON object with scores between 1-95. 

      Validation Rules:
      1. Must be a real person's name (first and last name)
      2. Cannot be a job title, department, or role
      3. Cannot be a company name or generic business term
      4. Cannot contain terms from the search prompt
      5. Must follow common name patterns (e.g., "John Smith", not "Marketing Team")
      6. Cannot be common business terms or departments

      Scoring Guidelines (maximum 95 points):
      - 85-95: Full proper name with clear first/last (e.g. "Michael Johnson")
      - 70-84: Common name pattern but needs verification (e.g. "Mike J.")
      - 50-69: Unusual name pattern, needs investigation (e.g. "M. Johnson III")
      - 30-49: Likely not a person's name (e.g. "Sales Team")
      - 1-29: Definitely not a person's name (e.g. "Marketing Department")

      Automatic Score Reductions:
      - Contains job titles or roles: -45 points (e.g. "CEO John Smith" -> 50)
      - Contains company terms: -40 points (e.g. "Microsoft Sales" -> 10)
      - Contains generic business terms: -35 points (e.g. "Team Lead" -> 15)
      - Contains search terms: -30 points per term
      - Single word names: -35 points (e.g. "Marketing" -> 15)
      - Common business words: -40 points (e.g. "Support", "Sales", "Team")

      Return ONLY a JSON object like:
      {
        "Michael Johnson": 85,
        "Sales Department": 15,
        "Tech Lead Smith": 45
      }`
    },
    {
      role: "user",
      content: `Score these names (output only JSON): ${JSON.stringify(names)}`
    }
  ];

  try {
    const response = await queryPerplexity(messages);
    console.log('AI validation response received');

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        const validated: Record<string, number> = {};

        console.log('Processing AI validation scores');
        for (const [name, score] of Object.entries(parsed)) {
          if (typeof score === 'number' && score >= 1 && score <= 95) {
            // Get pattern-based score with stricter validation
            const { score: patternScore } = validateName(name, '', companyName || '', {
              minimumScore: 50, // Increased minimum score
              companyNamePenalty: 40 // Increased penalty
            });

            // Combine scores with stricter weights
            const finalScore = combineValidationScores(score, patternScore, {
              minimumScore: 50, // Increased from 40
              companyNamePenalty: 40, // Increased from 25
              requireRole: true,
              roleMinimumScore: 60 // Increased from 50
            });

            console.log(`Combined score for "${name}": ${finalScore} (AI: ${score}, Pattern: ${patternScore})`);
            validated[name] = finalScore;
          }
        }
        return validated;
      } catch (e) {
        console.error('Failed to parse AI response:', e);
        return {};
      }
    }
    console.error('No valid JSON found in AI response');
    return {};
  } catch (error) {
    console.error('Error in AI name validation:', error);
    return {};
  }
}