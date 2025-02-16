import type { Company, Contact } from "@shared/schema";
import { queryPerplexity } from "./api/perplexity-client";
import { extractContacts } from "./results-analysis/contact-extraction";
import { parseCompanyData } from "./results-analysis/company-parser";
import { validateNameLocally, type ValidationOptions, combineValidationScores } from "./results-analysis/contact-name-validation";

export interface PerplexityMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// Validate names using Perplexity AI
export async function validateNames(names: string[]): Promise<Record<string, number>> {
  const messages: PerplexityMessage[] = [
    {
      role: "system",
      content: `You are a contact name validation service. Analyze each name and return a JSON object with scores between 1-100. Consider:

      1. Common name patterns
      2. Professional context
      3. Job title contamination
      4. Realistic vs placeholder names

      Scoring rules:
      - 90-100: Full name with clear first/last (e.g. "Michael Johnson")
      - 70-89: Common but incomplete name (e.g. "Mike J.")
      - 40-69: Ambiguous or unusual (e.g. "M. Johnson III")
      - 20-39: Possibly not a name (e.g. "Sales Team")
      - 1-19: Obviously not a person's name

      Return ONLY a JSON object like:
      {
        "Michael Johnson": 95,
        "Sales Department": 25
      }`
    },
    {
      role: "user",
      content: `Score these names (output only JSON): ${JSON.stringify(names)}`
    }
  ];

  try {
    const response = await queryPerplexity(messages);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        const validated: Record<string, number> = {};
        for (const [name, score] of Object.entries(parsed)) {
          if (typeof score === 'number' && score >= 1 && score <= 100) {
            validated[name] = score;
          } else {
            const localScore = validateNameLocally(name).score;
            validated[name] = localScore;
          }
        }
        return validated;
      } catch (e) {
        console.error('Failed to parse AI response:', e);
      }
    }

    return names.reduce((acc, name) => {
      const localScore = validateNameLocally(name).score;
      return { ...acc, [name]: localScore };
    }, {});

  } catch (error) {
    console.error('Error in name validation:', error);
    return names.reduce((acc, name) => {
      const localScore = validateNameLocally(name).score;
      return { ...acc, [name]: localScore };
    }, {});
  }
}

// Company search and analysis functions
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

export { extractContacts, parseCompanyData };