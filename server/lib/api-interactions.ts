import type { Company, Contact } from "@shared/schema";
import { validateNameLocally } from "./results-analysis/contact-name-validation";
import { combineValidationScores } from "./results-analysis/score-combination";
import { isPlaceholderEmail, isValidBusinessEmail } from "./results-analysis/email-analysis";
import { queryPerplexity } from "./api/perplexity-client";
import type { PerplexityMessage } from "./types/perplexity";
import { analyzeWithPerplexity } from "./perplexity";

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

// Validate names using Perplexity AI
export async function validateNames(
  names: string[], 
  companyName?: string
): Promise<Record<string, number>> {
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
            const localResult = validateNameLocally(name);
            validated[name] = combineValidationScores(score, localResult, companyName);
          } else {
            const localResult = validateNameLocally(name);
            validated[name] = combineValidationScores(50, localResult, companyName); // Default AI score of 50
          }
        }
        return validated;
      } catch (e) {
        console.error('Failed to parse AI response:', e);
      }
    }

    // Fallback to local validation
    return names.reduce((acc, name) => {
      const localResult = validateNameLocally(name);
      return { ...acc, [name]: combineValidationScores(50, localResult, companyName) };
    }, {});

  } catch (error) {
    console.error('Error in name validation:', error);
    return names.reduce((acc, name) => {
      const localResult = validateNameLocally(name);
      return { ...acc, [name]: combineValidationScores(50, localResult, companyName) };
    }, {});
  }
}

export async function searchContactDetails(
  name: string,
  company: string,
  location?: { city?: string; state?: string }
): Promise<Partial<Contact>> {
  const locationContext = location ? 
    `Location: ${[location.city, location.state].filter(Boolean).join(', ')}` : '';

  const messages: PerplexityMessage[] = [
    {
      role: "system",
      content: `You are a contact information researcher specializing in professional email discovery. Your task is to find detailed professional information about the specified person, with a strong focus on their email address.

      Key requirements:
      1. Email address is the highest priority - use standard business email patterns
      2. Professional role and department
      3. LinkedIn URL if available
      4. Location details
      5. Any other professional contact methods

      Format your response in JSON like this:
      {
        "email": "firstname.lastname@company.com",
        "role": "Job Title",
        "department": "Department Name",
        "linkedinUrl": "https://linkedin.com/in/...",
        "location": "City, State",
        "phoneNumber": "+1-XXX-XXX-XXXX"
      }

      For email addresses:
      - Prefer verified business emails
      - Use common business email patterns (firstname.lastname@, firstinitial.lastname@, etc.)
      - If unsure, use null`
    },
    {
      role: "user",
      content: `Find professional contact information for ${name} at ${company}.
        ${locationContext}

        Focus especially on finding their business email address using standard corporate email patterns.`
    }
  ];

  try {
    const response = await queryPerplexity(messages);
    const jsonMatch = response.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        const enrichedContact: Partial<Contact> = {};

        // Email validation and processing
        if (parsed.email && typeof parsed.email === 'string') {
          const email = parsed.email.toLowerCase().trim();
          if (isValidBusinessEmail(email) && !isPlaceholderEmail(email)) {
            enrichedContact.email = email;
          }
        }

        // Process other fields
        if (parsed.role && typeof parsed.role === 'string') {
          enrichedContact.role = parsed.role.trim();
        }
        if (parsed.department && typeof parsed.department === 'string') {
          enrichedContact.department = parsed.department.trim();
        }
        if (parsed.linkedinUrl && typeof parsed.linkedinUrl === 'string') {
          enrichedContact.linkedinUrl = parsed.linkedinUrl.trim();
        }
        if (parsed.location && typeof parsed.location === 'string') {
          enrichedContact.location = parsed.location.trim();
        }
        if (parsed.phoneNumber && typeof parsed.phoneNumber === 'string') {
          enrichedContact.phoneNumber = parsed.phoneNumber.trim();
        }

        return enrichedContact;
      } catch (error) {
        console.error('Failed to parse enrichment response:', error);
        return {};
      }
    }
    return {};
  } catch (error) {
    console.error('Error in contact enrichment:', error);
    return {};
  }
}