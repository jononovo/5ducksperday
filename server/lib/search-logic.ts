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
      content: "Find exactly 5 real companies that match the search criteria. Please output a JSON array of objects, where each object contains 'name' and 'website' properties. The 'name' should be the full legal name without any numbering or prefixes, and 'website' should be the official company website domain. If you can't find correct data, leave it empty."
    },
    {
      role: "user",
      content: `Find 5 companies that match this criteria: ${query}`
    }
  ];

  // Ensure we're using the correct model
  const response = await queryPerplexity(messages, "sonar");
  
  // Log the raw response for debugging
  console.log('Raw Perplexity response:', response);
  
  try {
    const parsed = JSON.parse(response);
    console.log('Successfully parsed JSON response');
    
    if (Array.isArray(parsed)) {
      const companies = parsed.slice(0, 5).map(company => company.name);
      console.log('Extracted company names from array:', companies);
      return companies;
    }
    
    // Handle case where the response might be wrapped in another object
    if (parsed.companies && Array.isArray(parsed.companies)) {
      const companies = parsed.companies.slice(0, 5).map(company => company.name);
      console.log('Extracted company names from companies field:', companies);
      return companies;
    }
    
    // Fallback to original parsing if structure doesn't match expectations
    console.log('JSON structure did not match expected format, falling back to line splitting');
    const companies = response.split('\n').filter(line => line.trim()).slice(0, 5);
    console.log('Fallback company names:', companies);
    return companies;
  } catch (error) {
    console.error('Error parsing JSON response:', error);
    
    // Fallback to original parsing method
    const companies = response.split('\n').filter(line => line.trim()).slice(0, 5);
    console.log('Fallback company names after JSON parse error:', companies);
    return companies;
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