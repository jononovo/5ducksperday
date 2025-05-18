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
export async function searchCompanies(query: string): Promise<Array<{name: string, website: string | null}>> {
  const messages: PerplexityMessage[] = [
    {
      role: "system",
      content: `Find exactly 5 real companies that match the search criteria. Your response MUST be a valid JSON array of objects ONLY.

DO NOT include any text, disclaimers, or explanations outside the JSON structure.
DO NOT wrap the JSON in code blocks or markdown.

Each object in the array must have these exact properties:
- "name": The full legal company name
- "website": The official company website URL (include http/https prefix if known)

Example of expected output format:
[
  {"name": "Apple Inc.", "website": "https://www.apple.com"},
  {"name": "Microsoft Corporation", "website": "https://www.microsoft.com"}
]`
    },
    {
      role: "user",
      content: `Find 5 companies that match this criteria: ${query}. Return ONLY a JSON array as specified.`
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
        
        // If all parsing attempts failed, try one more approach with regex for company names and websites
        const companyData = [];
        const companyRegex = /"name":\s*"([^"]*)"/g;
        const websiteRegex = /"website":\s*"([^"]*)"/g;
        let nameMatch;
        let websiteMatch;
        
        // Find all company names
        const companyNames = [];
        while ((nameMatch = companyRegex.exec(response)) !== null) {
          if (nameMatch[1] && nameMatch[1].trim()) {
            companyNames.push({
              name: nameMatch[1].trim(),
              index: nameMatch.index
            });
          }
        }
        
        // Find all websites
        const websites = [];
        while ((websiteMatch = websiteRegex.exec(response)) !== null) {
          websites.push({
            website: websiteMatch[1] ? websiteMatch[1].trim() : null,
            index: websiteMatch.index
          });
        }
        
        console.log('Found company names with regex:', companyNames.length);
        console.log('Found websites with regex:', websites.length);
        
        // Try to match companies with websites based on proximity in the text
        for (const company of companyNames) {
          let nearestWebsite = null;
          let minDistance = Number.MAX_SAFE_INTEGER;
          
          for (const site of websites) {
            const distance = Math.abs(company.index - site.index);
            if (distance < minDistance) {
              minDistance = distance;
              nearestWebsite = site.website;
            }
          }
          
          // Only pair if they're reasonably close (within 100 chars)
          if (minDistance < 100) {
            companyData.push({
              name: company.name,
              website: nearestWebsite
            });
          } else {
            companyData.push({
              name: company.name,
              website: null
            });
          }
        }
        
        if (companyData.length > 0) {
          console.log('Extracted companies with websites using regex:', companyData);
          return companyData.slice(0, 5);
        }
        
        throw fullError; // Rethrow to fall to the catch block
      }
    }
    
    if (Array.isArray(parsed)) {
      const companies = parsed.slice(0, 5).map((company: {name: string, website?: string}) => {
        return {
          name: company.name,
          website: company.website || null
        };
      });
      console.log('Extracted companies from array:', companies);
      return companies;
    }
    
    // Handle case where the response might be wrapped in another object
    if (parsed.companies && Array.isArray(parsed.companies)) {
      const companies = parsed.companies.slice(0, 5).map((company: {name: string, website?: string}) => {
        return {
          name: company.name,
          website: company.website || null
        };
      });
      console.log('Extracted companies from companies field:', companies);
      return companies;
    }
    
    // Fallback to original parsing if structure doesn't match expectations
    console.log('JSON structure did not match expected format, falling back to line splitting');
    const companyLines = response.split('\n')
      .filter(line => line.trim() && !line.includes('```') && !line.includes('[') && !line.includes(']'))
      .filter(line => line.includes('"name":'))
      .map(line => {
        const nameMatch = line.match(/"name":\s*"([^"]+)"/);
        // Try to find a website in the same line
        const websiteMatch = line.match(/"website":\s*"([^"]*)"/);
        const website = websiteMatch && websiteMatch[1] ? websiteMatch[1] : null;
        
        return {
          name: nameMatch ? nameMatch[1] : line,
          website: website
        };
      })
      .slice(0, 5);
      
    if (companyLines.length > 0) {
      console.log('Extracted companies from JSON lines:', companyLines);
      return companyLines;
    }
    
    // Last resort fallback
    const companies = response.split('\n')
      .filter(line => line.trim())
      .slice(0, 5)
      .map(name => ({ name, website: null }));
      
    console.log('Fallback company data:', companies);
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
          // Try to find a website in the same line
          const websiteMatch = line.match(/"website":\s*"([^"]*)"/);
          const website = websiteMatch && websiteMatch[1] ? websiteMatch[1] : null;
          
          return {
            name: nameMatch ? nameMatch[1] : line,
            website: website
          };
        })
        .slice(0, 5);
        
      if (companyLines.length > 0) {
        console.log('Extracted companies from JSON lines after parse error:', companyLines);
        return companyLines;
      }
    } catch (extractError) {
      console.error('Error extracting company names from lines:', extractError);
    }
    
    // Last resort fallback to original parsing method
    const companies = response.split('\n')
      .filter(line => line.trim())
      .slice(0, 5)
      .map(name => ({ name, website: null }));
      
    console.log('Fallback company data after JSON parse error:', companies);
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