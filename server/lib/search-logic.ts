import type { Company, Contact } from "@shared/schema";
import { queryPerplexity } from "./api/perplexity-client";
import type { PerplexityMessage } from "./types/perplexity";
import { analyzeWithPerplexity } from "./perplexity";
import { 
  analyzeCompanySize, 
  analyzeDifferentiators,
  calculateCompanyScore 
} from "./results-analysis/company-analysis";
import { validateName } from "./results-analysis/contact-name-validation";
import { extractContacts } from "./results-analysis/email-extraction-format";
import { validateNames } from "./results-analysis/contact-ai-name-scorer";
import { findKeyDecisionMakers } from "./search-logic/contact-discovery/enhanced-contact-finder";

// Core search functions
export async function searchCompanies(query: string): Promise<string[]> {
  const messages: PerplexityMessage[] = [
    {
      role: "system",
      content: "Find exactly 5 real companies that match the search criteria. Format your response as a JSON array of objects with 'name' and 'website' properties. The 'name' should be the full legal name, and 'website' should be the official company website URL."
    },
    {
      role: "user",
      content: `Find 5 companies that match this criteria: ${query}`
    }
  ];

  const response = await queryPerplexity(messages);
  try {
    const parsed = JSON.parse(response);
    if (Array.isArray(parsed)) {
      return parsed.slice(0, 5).map(company => company.name);
    }
    // Handle case where the response might be wrapped in another object
    if (parsed.companies && Array.isArray(parsed.companies)) {
      return parsed.companies.slice(0, 5).map(company => company.name);
    }
    // Fallback to original parsing if structure doesn't match expectations
    return response.split('\n').filter(line => line.trim()).slice(0, 5);
  } catch (error) {
    console.error('Error parsing JSON response:', error);
    // Fallback to original parsing method
    return response.split('\n').filter(line => line.trim()).slice(0, 5);
  }
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

// Export the functions we need
export { validateNames, extractContacts };