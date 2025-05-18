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
      content: "Be precise and concise. Remove www and any http/https from the website. Only include the official domain name." 
    },
    {
      role: "user",
      content: `Find companies that match this criteria: ${query}. 
Please output a JSON array containing 7 objects, where each object has exactly two fields: 
"name" and "website".`
    }
  ];

  const response = await queryPerplexity(messages);
  
  // Log the raw response for debugging
  console.log('Raw Perplexity response:', response);
  
  try {
    console.log('Attempting to parse Perplexity response:', response);
    
    // Remove any Markdown formatting or surrounding text
    let cleanedResponse = response.trim();
    
    // Remove code block markers
    cleanedResponse = cleanedResponse.replace(/```json\s*|\s*```/g, '');
    
    // Extract any JSON array that might be in the response
    const arrayMatch = cleanedResponse.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (arrayMatch) {
      cleanedResponse = arrayMatch[0];
    }
    
    let companies = [];
    
    // Try to parse as JSON first
    try {
      const parsed = JSON.parse(cleanedResponse);
      
      if (Array.isArray(parsed)) {
        // Handle direct array of companies
        companies = parsed.slice(0, 5).map((company: {name: string, website?: string}) => ({
          name: company.name,
          website: company.website || null
        }));
        console.log('Successfully parsed JSON array of companies:', companies);
      } 
      else if (parsed.companies && Array.isArray(parsed.companies)) {
        // Handle response with companies property
        companies = parsed.companies.slice(0, 5).map((company: {name: string, website?: string}) => ({
          name: company.name,
          website: company.website || null
        }));
        console.log('Successfully parsed JSON with companies field:', companies);
      }
      
      if (companies.length > 0) {
        return companies;
      }
    } 
    catch (jsonError) {
      console.error('JSON parsing failed:', jsonError);
      
      // If JSON parsing fails, use regex as a fallback
      const companyData = [];
      const nameRegex = /"name":\s*"([^"]*)"/g;
      const websiteRegex = /"website":\s*"([^"]*)"/g;
      
      // Extract all company names and their positions in the text
      const names = [];
      let nameMatch;
      while ((nameMatch = nameRegex.exec(cleanedResponse)) !== null) {
        if (nameMatch[1] && nameMatch[1].trim()) {
          names.push({
            name: nameMatch[1].trim(),
            index: nameMatch.index
          });
        }
      }
      
      // Extract all websites and their positions
      const websites = [];
      let websiteMatch;
      while ((websiteMatch = websiteRegex.exec(cleanedResponse)) !== null) {
        websites.push({
          website: websiteMatch[1] ? websiteMatch[1].trim() : null,
          index: websiteMatch.index
        });
      }
      
      console.log(`Found ${names.length} company names and ${websites.length} websites with regex`);
      
      // Match companies with their websites based on proximity in the text
      for (const company of names) {
        let nearestWebsite = null;
        let minDistance = Number.MAX_SAFE_INTEGER;
        
        for (const site of websites) {
          const distance = Math.abs(company.index - site.index);
          if (distance < 100 && distance < minDistance) {
            minDistance = distance;
            nearestWebsite = site.website;
          }
        }
        
        companyData.push({
          name: company.name,
          website: nearestWebsite
        });
      }
      
      if (companyData.length > 0) {
        console.log('Extracted companies using regex fallback:', companyData);
        return companyData.slice(0, 5);
      }
    }
    
    // Last resort: line-by-line parsing
    const lines = cleanedResponse.split('\n').filter(line => line.trim());
    for (const line of lines) {
      const nameMatch = line.match(/"?name"?\s*:?\s*"?([^",]+)"?/i);
      if (nameMatch && nameMatch[1]) {
        companies.push({
          name: nameMatch[1].trim(),
          website: null
        });
      }
    }
    
    if (companies.length > 0) {
      console.log('Extracted companies using line parsing:', companies);
      return companies.slice(0, 5);
    }
    
    // If no companies found, return empty array
    return [];
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