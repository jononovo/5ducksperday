import type { Company, Contact } from "@shared/schema";
import { validateNameLocally, type ValidationOptions, combineValidationScores } from "./nameValidation";

interface PerplexityMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface PerplexityResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

// Validate names using Perplexity AI
export async function validateNames(names: string[]): Promise<Record<string, number>> {
  const messages: PerplexityMessage[] = [
    {
      role: "system",
      content: `You are a name validation service. For each name in the provided list, return a single integer score (1-100) indicating the probability that it is a real person's name. 
      Score Guidelines:
      - 80-100: Clearly a real full name (e.g. "John Smith")
      - 50-79: Possibly a real name but uncommon or incomplete
      - 1-49: Likely not a real name (e.g. job titles, departments, or generic terms)

      Return ONLY a JSON object with names as keys and scores as integer values. No other text.`
    },
    {
      role: "user",
      content: `Validate these potential names and return scores (1-100): ${JSON.stringify(names)}`
    }
  ];

  try {
    const response = await queryPerplexity(messages);
    try {
      const scores = JSON.parse(response) as Record<string, number>;
      return scores;
    } catch (e) {
      console.error('Failed to parse name validation response:', e);
      return names.reduce((acc, name) => ({ ...acc, [name]: 10 }), {});
    }
  } catch (error) {
    console.error('Error validating names:', error);
    return names.reduce((acc, name) => ({ ...acc, [name]: 10 }), {});
  }
}

export async function extractContacts(
  analysisResults: string[],
  validationOptions?: ValidationOptions
): Promise<Partial<Contact>[]> {
  if (!Array.isArray(analysisResults)) {
    console.warn('analysisResults is not an array, returning empty array');
    return [];
  }

  const nameRegex = /([A-Z][a-z]{1,20})\s+([A-Z][a-z]{1,20})(?:\s+[A-Z][a-z]{1,20})?/g;
  const emailRegex = /[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}/g;

  // Extract all potential names from the results
  const potentialNames = new Set<string>();
  for (const result of analysisResults) {
    if (typeof result !== 'string') continue;
    const matches = Array.from(result.matchAll(nameRegex));
    matches.forEach(match => potentialNames.add(match[0]));
  }

  // Validate all names at once using AI
  const names = Array.from(potentialNames);
  if (names.length === 0) return [];

  const aiScores = await validateNames(names);

  // Process contacts with validated names
  const contacts: Partial<Contact>[] = [];

  for (const result of analysisResults) {
    if (typeof result !== 'string') continue;

    const names = Array.from(result.matchAll(nameRegex)).map(m => m[0]);
    const emails = Array.from(result.match(emailRegex) || [])
      .filter(email => !isPlaceholderEmail(email));

    for (const name of names) {
      const aiScore = aiScores[name] || 10;
      let finalScore = aiScore;

      // Apply local validation if enabled
      if (validationOptions?.useLocalValidation) {
        const localResult = validateNameLocally(name, result);
        finalScore = combineValidationScores(aiScore, localResult, validationOptions);
      }

      if (finalScore > (validationOptions?.minimumScore || 20)) {
        const nearestEmail = emails.find(email =>
          Math.abs(result.indexOf(email) - result.indexOf(name)) < 200
        );

        contacts.push({
          name,
          email: nearestEmail || null,
          probability: finalScore,
          nameConfidenceScore: finalScore
        });
      }
    }
  }

  // Ensure we're returning an array, sorted by probability
  return Array.isArray(contacts) ?
    contacts.sort((a, b) => (b.probability || 0) - (a.probability || 0)) :
    [];
}

// Helper function for validation
function isPlaceholderEmail(email: string): boolean {
  const placeholderPatterns = [
    /first[._]?name/i,
    /last[._]?name/i,
    /first[._]?initial/i,
    /company(domain)?\.com$/i,
    /example\.com$/i,
    /domain\.com$/i
  ];
  return placeholderPatterns.some(pattern => pattern.test(email));
}

export async function queryPerplexity(messages: PerplexityMessage[]): Promise<string> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error("Perplexity API key is not configured. Please set the PERPLEXITY_API_KEY environment variable.");
  }

  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-sonar-small-128k-online",
        messages,
        temperature: 0.2,
        max_tokens: 1000,
        stream: false
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Perplexity API error (${response.status}): ${errorBody || response.statusText}`);
    }

    const data = await response.json() as PerplexityResponse;
    return data.choices[0].message.content;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to query Perplexity API: ${error.message}`);
    }
    throw error;
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
      content: technicalPrompt || "You are a business intelligence analyst. Provide detailed, factual information about companies."
    },
    {
      role: "user",
      content: (userPrompt || "").replace("[COMPANY]", companyName)
    }
  ];

  if (responseStructure) {
    messages[0].content += `\n\nProvide your response in the following JSON structure:\n${responseStructure}`;
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
      content: `You are a contact information researcher. Find detailed professional information about the specified person. Focus on:
        1. Current role and department
        2. Professional email format
        3. LinkedIn profile URL
        4. Location

        Format your response in a structured way that's easy to parse.`
    },
    {
      role: "user",
      content: `Find detailed professional contact information for ${name} at ${company}. Include email, LinkedIn URL, role details, and location if available.`
    }
  ];

  const response = await queryPerplexity(messages);
  return parseContactDetails(response);
}

function parseContactDetails(response: string): Partial<Contact> {
  const contact: Partial<Contact> = {};

  const emailMatch = response.match(/[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}/);
  if (emailMatch && !isPlaceholderEmail(emailMatch[0])) {
    contact.email = emailMatch[0];
  }

  const linkedinMatch = response.match(/linkedin\.com\/in\/[\w-]+/);
  if (linkedinMatch) {
    contact.linkedinUrl = `https://www.${linkedinMatch[0]}`;
  }

  const roleMatch = response.match(/(?:role|position|title):\s*([^.\n]+)/i);
  if (roleMatch) {
    contact.role = roleMatch[1].trim();
  }

  const deptMatch = response.match(/(?:department|division):\s*([^.\n]+)/i);
  if (deptMatch) {
    contact.department = deptMatch[1].trim();
  }

  const locationMatch = response.match(/(?:location|based in|located in):\s*([^.\n]+)/i);
  if (locationMatch) {
    contact.location = locationMatch[1].trim();
  }

  return contact;
}

export function parseCompanyData(analysisResults: string[]): Partial<Company> {
  const companyData: Partial<Company> = {
    services: [],
    validationPoints: [],
    differentiation: [],
    totalScore: 0,
    snapshot: {}
  };

  try {
    for (const result of analysisResults) {
      try {
        const jsonData = JSON.parse(result);
        if (jsonData.website) companyData.website = jsonData.website;
        if (jsonData.size) companyData.size = jsonData.size;
        continue;
      } catch (e) {
        console.log('Falling back to text parsing for result:', e);
      }

      const websiteMatch = result.match(/(?:website|url|web\s*site):\s*(https?:\/\/[^\s,)]+)/i);
      if (websiteMatch) companyData.website = websiteMatch[1];

      const profileMatch = result.match(/(?:profile|linkedin|company\s*profile):\s*(https?:\/\/[^\s,)]+)/i);
      if (profileMatch) companyData.alternativeProfileUrl = profileMatch[1];

      if (result.toLowerCase().includes("differentiat") || result.toLowerCase().includes("unique")) {
        const points = result
          .split(/[.!?•]/)
          .map(s => s.trim())
          .filter(s =>
            s.length > 0 &&
            s.length <= 30 &&
            (s.toLowerCase().includes("unique") ||
              s.toLowerCase().includes("only") ||
              s.toLowerCase().includes("leading") ||
              s.toLowerCase().includes("best"))
          )
          .slice(0, 3);

        if (points.length > 0) companyData.differentiation = points;
      }

      // Parse company size more carefully
      if (result.includes("employees") || result.includes("staff")) {
        const sizeMatch = result.match(/(\d+)[\s-]*(?:\d+)?\s*(employees|staff)/i);
        if (sizeMatch) {
          // If there's a range like "2-20", take the higher number
          const numbers = sizeMatch[1].split('-').map(n => parseInt(n.trim()));
          companyData.size = Math.max(...numbers);
        }
      }

      let score = 50;
      if (companyData.size && companyData.size > 50) score += 10;
      if (companyData.differentiation && companyData.differentiation.length === 3) score += 20;
      companyData.totalScore = Math.min(100, score);
    }
  } catch (error) {
    console.error('Error parsing company data:', error);
  }

  return companyData;
}