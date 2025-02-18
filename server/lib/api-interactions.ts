import type { Company, Contact } from "@shared/schema";
import { validateName } from "./results-analysis/contact-name-validation";
import { isPlaceholderEmail, isValidBusinessEmail, parseEmailDetails } from "./results-analysis/email-analysis";
import { queryPerplexity } from "./api/perplexity-client";
import type { PerplexityMessage } from "./types/perplexity";
import { analyzeWithPerplexity } from "./perplexity";

// Validate names using Perplexity AI
export async function validateNames(
  names: string[],
  companyName?: string,
  searchPrompt?: string
): Promise<Record<string, number>> {
  console.log(`Running AI validation for ${names.length} contacts`);

  const messages: PerplexityMessage[] = [
    {
      role: "system",
      content: `You are a contact name validation service. Analyze each name and return a JSON object with scores between 1-95. Consider:

      1. Common name patterns (max 95 points)
      2. Professional context (can reduce score by up to 30 points)
      3. Job title contamination (reduces score by 40 points)
      4. Realistic vs placeholder names (placeholder names max 10 points)
      5. Names should not contain terms from the search prompt: "${searchPrompt || ''}"

      Scoring rules (maximum 95 points):
      - 85-95: Full proper name with clear first/last, very likely real (e.g. "Michael Johnson")
      - 70-84: Common but incomplete name, likely real (e.g. "Mike J.")
      - 50-69: Ambiguous or unusual, possibly real (e.g. "M. Johnson III")
      - 30-49: Possibly not a name (e.g. "Sales Team", "Tech Lead")
      - 1-29: Obviously not a person's name

      Additional Penalties (applied after initial score):
      - Contains job titles: -40 points
      - Contains company terms: -30 points
      - Contains generic business terms: -20 points
      - Contains search terms: -25 points per term

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
            console.log(`AI Score for "${name}": ${score}`);
            validated[name] = score;
          }
        }
        return validated;
      } catch (e) {
        console.error('Failed to parse AI response:', e);
        return {}; // Return empty object on parse error
      }
    }
    console.error('No valid JSON found in AI response');
    return {};
  } catch (error) {
    console.error('Error in AI name validation:', error);
    return {};
  }
}

export interface PerplexityResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
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


export async function searchContactDetails(
  name: string,
  company: string
): Promise<Partial<Contact>> {
  const messages: PerplexityMessage[] = [
    {
      role: "system",
      content: `You are a contact information researcher. Find professional information about the specified person. Include:
        1. Role and department
        2. Professional email
        3. LinkedIn URL
        4. Location
        
        Format your response in JSON.`
    },
    {
      role: "user",
      content: `Find professional contact information for ${name} at ${company}.`
    }
  ];

  const response = await queryPerplexity(messages);
  return parseEmailDetails(response);
}