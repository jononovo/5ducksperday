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
      content: `You are a contact name validation service. Analyze each name and return a JSON object with scores between 1-100. Consider:

      1. Common name patterns vs generic terms
      2. Professional context
      3. Job title contamination
      4. Realistic vs placeholder names

      Scoring rules:
      - 90-100: Full name with clear first/last (e.g. "Michael Johnson")
      - 70-89: Common but incomplete name (e.g. "Mike J.")
      - 40-69: Ambiguous or unusual (e.g. "M. Johnson III")
      - 1-39: Likely not a real name (e.g. "Sales Team", "John Doe")

      Return ONLY a JSON object like:
      {
        "Michael Johnson": 95,
        "Sales Department": 10
      }`
    },
    {
      role: "user",
      content: `Score these names (output only JSON): ${JSON.stringify(names)}`
    }
  ];

  try {
    const response = await queryPerplexity(messages);

    // Extract JSON more robustly
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        // Validate scores are within range
        const validated: Record<string, number> = {};
        for (const [name, score] of Object.entries(parsed)) {
          if (typeof score === 'number' && score >= 1 && score <= 100) {
            validated[name] = score;
          } else {
            // Use local validation as fallback
            const localScore = validateNameLocally(name).score;
            validated[name] = localScore;
          }
        }
        return validated;
      } catch (e) {
        console.error('Failed to parse AI response:', e);
        // Fall through to local validation
      }
    }

    // If AI validation fails, use local validation
    return names.reduce((acc, name) => {
      const localScore = validateNameLocally(name).score;
      return { ...acc, [name]: localScore };
    }, {});

  } catch (error) {
    console.error('Error in name validation:', error);
    // Always fallback to local validation
    return names.reduce((acc, name) => {
      const localScore = validateNameLocally(name).score;
      return { ...acc, [name]: localScore };
    }, {});
  }
}

// Enhance contact extraction
export async function extractContacts(
  analysisResults: string[],
  validationOptions?: ValidationOptions
): Promise<Partial<Contact>[]> {
  if (!Array.isArray(analysisResults)) {
    console.warn('analysisResults is not an array, returning empty array');
    return [];
  }

  const contacts: Partial<Contact>[] = [];
  // Less strict name regex to allow more matches
  const nameRegex = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g;
  const emailRegex = /[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}/g;
  const roleRegex = /(?:is|as|serves\s+as)\s+(?:the|a|an)\s+([^,.]+?(?:Manager|Director|Officer|Executive|Lead|Head|Chief|Founder|Owner|President|CEO|CTO|CFO))/gi;

  const placeholderNames = new Set([
    'john doe', 'jane doe', 'john smith', 'jane smith',
    'test user', 'demo user', 'example user'
  ]);

  for (const result of analysisResults) {
    if (typeof result !== 'string') continue;

    const names = Array.from(result.matchAll(nameRegex))
      .map(m => m[0])
      .filter(name => !placeholderNames.has(name.toLowerCase()));

    if (names.length === 0) continue;

    // Validate all names at once
    const aiScores = await validateNames(names);

    for (const name of names) {
      const aiScore = aiScores[name];
      const localResult = validateNameLocally(name, result);

      // Lower weight for local validation to give AI more influence
      const finalScore = combineValidationScores(
        aiScore,
        localResult,
        {
          ...validationOptions,
          localValidationWeight: 0.3,
          minimumScore: 30  // Lower minimum score threshold
        }
      );

      // Lower threshold for acceptance to allow more prospects
      if (finalScore >= 30) {
        const nameIndex = result.indexOf(name);
        const contextWindow = result.slice(
          Math.max(0, nameIndex - 100),
          nameIndex + 200
        );

        const roleMatch = [...contextWindow.matchAll(roleRegex)];
        const role = roleMatch.length > 0 ? roleMatch[0][1].trim() : null;

        // More lenient email matching
        const emailMatches = Array.from(result.match(emailRegex) || [])
          .filter(email => !isPlaceholderEmail(email))
          .filter(email => {
            const nameParts = name.toLowerCase().split(/\s+/);
            const emailLower = email.toLowerCase();
            // Accept email if it contains any part of the name that's at least 3 chars
            return nameParts.some(part => 
              part.length >= 3 && emailLower.includes(part)
            );
          });

        const nearestEmail = emailMatches.length > 0 ? emailMatches[0] : null;

        contacts.push({
          name,
          email: nearestEmail,
          role,
          probability: finalScore,
          nameConfidenceScore: finalScore,
          lastValidated: new Date()
        });
      }
    }
  }

  // Sort by probability and remove duplicates
  return contacts
    .sort((a, b) => (b.probability || 0) - (a.probability || 0))
    .filter((contact, index, self) => 
      index === self.findIndex(c => c.name === contact.name)
    );
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

// Query Perplexity AI API
export async function queryPerplexity(messages: PerplexityMessage[]): Promise<string> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error("Perplexity API key is not configured");
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
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json() as PerplexityResponse;
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Perplexity API error:', error);
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

export function parseCompanyData(analysisResults: string[]): Partial<Company> {
  const companyData: Partial<Company> = {
    services: [],
    validationPoints: [],
    differentiation: [],
    totalScore: 0
  };

  try {
    for (const result of analysisResults) {
      // Try parsing as JSON first
      try {
        const jsonData = JSON.parse(result);
        if (jsonData.size && typeof jsonData.size === 'number') {
          companyData.size = jsonData.size;
        }
        if (jsonData.services) {
          companyData.services = jsonData.services;
        }
        continue;
      } catch (e) {
        // Fall back to text parsing
      }

      // Parse company size carefully
      if (result.includes("employees") || result.includes("staff")) {
        const sizeMatch = result.match(/(\d+)[\s-]*(?:\d+)?\s*(employees|staff)/i);
        if (sizeMatch) {
          // If there's a range like "2-20", take the higher number
          const numbers = sizeMatch[1].split('-').map(n => parseInt(n.trim()));
          companyData.size = Math.max(...numbers.filter(n => !isNaN(n)));
        }
      }

      // Extract differentiators
      if (result.toLowerCase().includes("different") || result.toLowerCase().includes("unique")) {
        const points = result
          .split(/[.!?•]/)
          .map(s => s.trim())
          .filter(s => 
            s.length > 0 && 
            s.length < 100 &&
            (s.toLowerCase().includes("unique") ||
             s.toLowerCase().includes("only") ||
             s.toLowerCase().includes("leading"))
          )
          .slice(0, 3);

        if (points.length > 0) {
          companyData.differentiation = points;
        }
      }

      // Calculate score
      let score = 50;
      if (companyData.size && companyData.size > 50) score += 10;
      if (companyData.differentiation && companyData.differentiation.length > 0) score += 20;
      if (companyData.services && companyData.services.length > 0) score += 20;
      companyData.totalScore = Math.min(100, score);
    }
  } catch (error) {
    console.error('Error parsing company data:', error);
  }

  return companyData;
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

  const locationMatch = response.match(/(?:location|based in|located in):\s*([^.\n]+)/i);
  if (locationMatch) {
    contact.location = locationMatch[1].trim();
  }

  return contact;
}