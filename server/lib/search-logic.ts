import type { Company, Contact } from "@shared/schema";
import { queryPerplexity } from "./api/perplexity-client";
import type { PerplexityMessage } from "./types/perplexity";
import { analyzeWithPerplexity } from "./perplexity";
import { 
  analyzeCompanySize, 
  analyzeDifferentiators,
  calculateCompanyScore 
} from "./results-analysis/company-analysis";
import { validateNameLocally } from "./results-analysis/contact-name-validation";
import { combineValidationScores, type ValidationOptions } from "./results-analysis/score-combination";
import { extractContacts } from "./results-analysis/contact-extraction";
import { getNameValidationScores } from "./api-interactions";

// Core search functions
export async function searchCompanies(query: string): Promise<string[]> {
  const messages: PerplexityMessage[] = [
    {
      role: "system",
      content: "You are a business intelligence analyst. List exactly 5 real company names that match the search criteria. Format your response as a simple list with one company name per line, nothing else."
    },
    {
      role: "user",
      content: `Find 5 companies that match this criteria: ${query}`
    }
  ];

  const response = await queryPerplexity(messages);
  return response.split('\n').filter(line => line.trim()).slice(0, 5);
}

export async function analyzeCompany(
  companyName: string,
  userPrompt: string,
  technicalPrompt?: string | null,
  responseStructure?: string | null
): Promise<string> {
  const messages: PerplexityMessage[] = [
    {
      role: "system",
      content: technicalPrompt || "You are a business intelligence analyst providing detailed company information."
    },
    {
      role: "user",
      content: (userPrompt || "").replace("[COMPANY]", companyName)
    }
  ];

  if (responseStructure) {
    messages[0].content += `\n\nFormat your response as JSON:\n${responseStructure}`;
  }

  return queryPerplexity(messages);
}

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

export { extractContacts };