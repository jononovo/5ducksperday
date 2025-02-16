import type { PerplexityMessage } from "./api-interactions";
import { queryPerplexity } from "./api-interactions";
import type { Company, Contact } from "@shared/schema";
import { 
  analyzeCompanySize, 
  analyzeDifferentiators,
  calculateCompanyScore 
} from "./results-analysis/company-analysis";
import { 
  parseContactDetails,
  isValidBusinessEmail,
  isPlaceholderEmail 
} from "./results-analysis/email-analysis";
import { validateNameLocally, type ValidationOptions, combineValidationScores } from "./results-analysis/name-expanded-validation";

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
      const parsed = JSON.parse(jsonMatch[0]);
      const validated: Record<string, number> = {};
      for (const [name, score] of Object.entries(parsed)) {
        if (typeof score === 'number' && score >= 1 && score <= 100) {
          validated[name] = score;
        } else {
          validated[name] = validateNameLocally(name).score;
        }
      }
      return validated;
    }
    return names.reduce((acc, name) => ({
      ...acc,
      [name]: validateNameLocally(name).score
    }), {});
  } catch (error) {
    console.error('Error in name validation:', error);
    return names.reduce((acc, name) => ({
      ...acc,
      [name]: validateNameLocally(name).score
    }), {});
  }
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
  return parseContactDetails(response);
}

export async function extractContacts(
  analysisResults: string[],
  validationOptions?: ValidationOptions
): Promise<Partial<Contact>[]> {
  if (!Array.isArray(analysisResults)) {
    console.warn('analysisResults is not an array, returning empty array');
    return [];
  }

  const contacts: Partial<Contact>[] = [];
  const nameRegex = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g;
  const emailRegex = /[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}/g;
  const roleRegex = /(?:is|as|serves\s+as)\s+(?:the|a|an)\s+([^,.]+?(?:Manager|Director|Officer|Executive|Lead|Head|Chief|Founder|Owner|President|CEO|CTO|CFO))/gi;

  const placeholderNames = new Set([
    'john doe', 'jane doe', 'john smith', 'jane smith',
    'test user', 'demo user', 'example user'
  ]);

  try {
    for (const result of analysisResults) {
      if (typeof result !== 'string') continue;

      let match;
      const names = [];
      while ((match = nameRegex.exec(result)) !== null) {
        const name = match[0];
        if (!placeholderNames.has(name.toLowerCase())) {
          names.push(name);
        }
      }

      if (names.length === 0) continue;

      const aiScores = await validateNames(names);

      for (const name of names) {
        const aiScore = aiScores[name] || 0;
        const localResult = validateNameLocally(name, result);
        const finalScore = combineValidationScores(aiScore, localResult, validationOptions);

        if (finalScore >= 30) {
          const nameIndex = result.indexOf(name);
          const contextWindow = result.slice(
            Math.max(0, nameIndex - 100),
            nameIndex + 200
          );

          let role = null;
          roleRegex.lastIndex = 0;
          const roleMatch = roleRegex.exec(contextWindow);
          if (roleMatch) {
            role = roleMatch[1].trim();
          }

          const emailMatches: string[] = [];
          emailRegex.lastIndex = 0;
          while ((match = emailRegex.exec(result)) !== null) {
            const email = match[0];
            if (!isPlaceholderEmail(email)) {
              const emailLower = email.toLowerCase();
              const nameParts = name.toLowerCase().split(/\s+/);
              if (isValidBusinessEmail(email) || 
                  nameParts.some(part => part.length >= 2 && emailLower.includes(part))) {
                emailMatches.push(email);
              }
            }
          }

          contacts.push({
            name,
            email: emailMatches[0] || null,
            role,
            probability: finalScore,
            nameConfidenceScore: finalScore,
            lastValidated: new Date()
          });
        }
      }
    }

    return Array.isArray(contacts) ? 
      contacts
        .sort((a, b) => (b.probability || 0) - (a.probability || 0))
        .filter((contact, index, self) =>
          index === self.findIndex(c => c.name === contact.name)
        ) : 
      [];

  } catch (error) {
    console.error('Error in contact extraction:', error);
    return [];
  }
}