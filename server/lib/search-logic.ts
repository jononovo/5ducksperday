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

  const response = await queryPerplexity(messages);
  
  // Log the raw response for debugging
  console.log('Raw Perplexity response:', response);
  
  try {
    console.log('Attempting to extract JSON from response');
    
    // Try to extract JSON from the response if it's inside a code block
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    let jsonString = response;
    let parsed;
    
    if (jsonMatch && jsonMatch[1]) {
      console.log('Found JSON in code block');
      jsonString = jsonMatch[1];
      
      try {
        parsed = JSON.parse(jsonString);
        console.log('Successfully parsed JSON from code block');
      } catch (innerError) {
        console.error('Error parsing extracted JSON block:', innerError);
        
        // Try to extract just the array part from the code block
        const arrayMatch = jsonString.match(/(\[\s*\{[\s\S]*\}\s*\])/);
        if (arrayMatch && arrayMatch[1]) {
          console.log('Found array in JSON block');
          try {
            parsed = JSON.parse(arrayMatch[1]);
            console.log('Successfully parsed array from JSON block');
          } catch (arrayError) {
            console.error('Error parsing array from JSON block:', arrayError);
          }
        }
      }
    }
    
    // If we couldn't extract JSON from a code block, try to find and parse any JSON array in the response
    if (!parsed) {
      const arrayMatch = response.match(/(\[\s*\{[\s\S]*?\}\s*\])/s);
      if (arrayMatch && arrayMatch[1]) {
        console.log('Found JSON array in response');
        try {
          parsed = JSON.parse(arrayMatch[1]);
          console.log('Successfully parsed JSON array from response');
        } catch (arrayError) {
          console.error('Error parsing JSON array from response:', arrayError);
        }
      }
    }
    
    // Last attempt: try to parse the entire response
    if (!parsed) {
      try {
        parsed = JSON.parse(response);
        console.log('Successfully parsed entire response as JSON');
      } catch (fullError) {
        console.error('Error parsing entire response as JSON:', fullError);
        
        // If all parsing attempts failed, try one more approach with regex for company names
        const companyNameMatches = response.match(/"name":\s*"([^"]*)"/g);
        if (companyNameMatches && companyNameMatches.length > 0) {
          console.log('Found company names with regex');
          const companyNames = companyNameMatches.map(match => {
            const nameMatch = match.match(/"name":\s*"([^"]*)"/);
            return nameMatch ? nameMatch[1] : '';
          }).filter(name => name.length > 0);
          
          if (companyNames.length > 0) {
            console.log('Extracted company names with regex:', companyNames);
            return companyNames.slice(0, 5);
          }
        }
        
        throw fullError; // Rethrow to fall to the catch block
      }
    }
    
    if (Array.isArray(parsed)) {
      const companies = parsed.slice(0, 5).map((company: {name: string, website?: string}) => company.name);
      console.log('Extracted company names from array:', companies);
      return companies;
    }
    
    // Handle case where the response might be wrapped in another object
    if (parsed.companies && Array.isArray(parsed.companies)) {
      const companies = parsed.companies.slice(0, 5).map((company: {name: string, website?: string}) => company.name);
      console.log('Extracted company names from companies field:', companies);
      return companies;
    }
    
    // Fallback to original parsing if structure doesn't match expectations
    console.log('JSON structure did not match expected format, falling back to line splitting');
    const companyLines = response.split('\n')
      .filter(line => line.trim() && !line.includes('```') && !line.includes('[') && !line.includes(']'))
      .filter(line => line.includes('"name":'))
      .map(line => {
        const nameMatch = line.match(/"name":\s*"([^"]+)"/);
        return nameMatch ? nameMatch[1] : line;
      })
      .slice(0, 5);
      
    if (companyLines.length > 0) {
      console.log('Extracted company names from JSON lines:', companyLines);
      return companyLines;
    }
    
    // Last resort fallback
    const companies = response.split('\n').filter(line => line.trim()).slice(0, 5);
    console.log('Fallback company names:', companies);
    return companies;
  } catch (error) {
    console.error('Error parsing JSON response:', error);
    
    // Try to extract company names from the JSON-like structure even if parsing failed
    try {
      const companyLines = response.split('\n')
        .filter(line => line.trim() && !line.includes('```') && !line.includes('[') && !line.includes(']'))
        .filter(line => line.includes('"name":'))
        .map(line => {
          const nameMatch = line.match(/"name":\s*"([^"]+)"/);
          return nameMatch ? nameMatch[1] : line;
        })
        .slice(0, 5);
        
      if (companyLines.length > 0) {
        console.log('Extracted company names from JSON lines after parse error:', companyLines);
        return companyLines;
      }
    } catch (extractError) {
      console.error('Error extracting company names from lines:', extractError);
    }
    
    // Last resort fallback to original parsing method
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