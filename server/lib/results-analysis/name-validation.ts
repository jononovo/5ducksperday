import { validateNameLocally } from "./contact-name-validation";
import { combineValidationScores } from "./score-combination";
import type { ValidationOptions } from "./score-combination";
import { getNameValidationScores } from "../api-interactions";

export async function validateNames(
  names: string[],
  companyName?: string,
  searchPrompt?: string 
): Promise<Record<string, number>> {
  try {
    // Get raw validation scores from API
    const aiScores = await getNameValidationScores(names, searchPrompt);
    const validated: Record<string, number> = {};

    const validationOptions: ValidationOptions = {
      searchPrompt,
      minimumScore: 30,
      searchTermPenalty: 25
    };

    // Process each name with local validation and combine scores
    for (const name of names) {
      const aiScore = aiScores[name] || 50; // Default to 50 if API didn't return a score
      const localResult = validateNameLocally(name);

      validated[name] = combineValidationScores(
        aiScore,
        localResult,
        companyName,
        validationOptions
      );
    }

    return validated;

  } catch (error) {
    console.error('Error in name validation:', error);

    // Fallback to local validation only
    const validationOptions: ValidationOptions = {
      searchPrompt,
      minimumScore: 30,
      searchTermPenalty: 25
    };

    return names.reduce((acc, name) => {
      const localResult = validateNameLocally(name);
      return {
        ...acc,
        [name]: combineValidationScores(50, localResult, companyName, validationOptions)
      };
    }, {});
  }
}
