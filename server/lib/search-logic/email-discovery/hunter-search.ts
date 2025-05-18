import axios from 'axios';

interface HunterResponse {
  data?: {
    email?: string;
    score?: number;
    verification?: {
      status?: string;
      score?: number;
    };
    sources?: any[];
  };
  meta?: {
    params?: {
      first_name?: string;
      last_name?: string;
      domain?: string;
    };
  };
  errors?: {
    message?: string;
    details?: string;
  }[];
}

export interface NameParts {
  firstName: string;
  lastName: string;
}

export function splitFullName(fullName: string): NameParts {
  // Handle case where full name is provided
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ');
  return { firstName, lastName };
}

/**
 * Extract domain from company name or URL
 * Tries to make a best guess of the domain based on the company name
 */
export function extractDomain(company: string): string {
  // Remove number prefix if present (e.g., "1. Company Name" -> "Company Name")
  let normalized = company.replace(/^\d+[\.\s]+/, '').trim();
  
  // Remove extra spaces and trim
  normalized = normalized.trim();
  
  // If it's already a domain or URL, extract just the domain part
  if (normalized.includes('.')) {
    // Try to extract domain from URL
    try {
      // If it looks like a URL, parse it
      if (normalized.startsWith('http')) {
        const url = new URL(normalized);
        return url.hostname;
      }
      
      // If it looks like a domain (contains dots)
      if (normalized.includes('.') && !normalized.includes(' ')) {
        // Remove any path or query parts
        return normalized.split('/')[0];
      }
    } catch (e) {
      // Not a valid URL, continue with other approaches
    }
  }
  
  // For company names, convert to lowercase and remove spaces/special chars
  let simplifiedName = normalized.toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, '');     // Remove spaces
    
  // Special case handling for common company suffixes
  if (simplifiedName.endsWith('inc')) {
    simplifiedName = simplifiedName.substring(0, simplifiedName.length - 3);
  } else if (simplifiedName.endsWith('llc')) {
    simplifiedName = simplifiedName.substring(0, simplifiedName.length - 3);
  } else if (simplifiedName.endsWith('co')) {
    simplifiedName = simplifiedName.substring(0, simplifiedName.length - 2);
  }
  
  // Log the domain extraction process
  console.log(`Hunter domain extraction: "${company}" -> "${normalized}" -> "${simplifiedName}.com"`);
  
  // If still no clear domain, append .com as a best guess
  return simplifiedName + '.com';
}

export async function searchHunter(
  name: string,
  company: string,
  apiKey: string
): Promise<{ email: string | null; confidence: number }> {
  const { firstName, lastName } = splitFullName(name);
  
  try {
    console.log(`Searching Hunter.io for: ${firstName} ${lastName} at company "${company}"`);
    console.log(`Hunter API key available: ${!!apiKey}`);

    // Validate inputs before making the API call
    if (!firstName || !lastName) {
      console.warn('Hunter.io search warning: Missing first or last name');
    }
    
    if (!company) {
      console.warn('Hunter.io search warning: Missing company name');
    }

    // Make the API request with detailed logging
    console.log(`Hunter.io API request params: firstName=${firstName}, lastName=${lastName}, company=${company}`);
    
    const response = await axios.get<HunterResponse>(
      'https://api.hunter.io/v2/email-finder',
      {
        params: {
          api_key: apiKey,
          first_name: firstName,
          last_name: lastName,
          company: company
        },
        timeout: 15000 // 15 second timeout
      }
    );

    console.log('Hunter.io API response status:', response.status);
    console.log('Hunter.io API response:', JSON.stringify(response.data, null, 2));

    // Check for API errors in the response
    if (response.data && response.data.errors && response.data.errors.length > 0) {
      console.error('Hunter.io API returned errors:', response.data.errors);
      return {
        email: null,
        confidence: 0
      };
    }

    // Process successful response
    if (response.data && response.data.data && response.data.data.email) {
      // Calculate confidence based on Hunter's score
      let confidence = 50; // Default moderate confidence
      
      if (response.data.data.score) {
        confidence = Math.round(response.data.data.score * 100);
      }
      
      console.log(`Found email via Hunter.io: ${response.data.data.email} (confidence: ${confidence})`);
      
      return {
        email: response.data.data.email,
        confidence: confidence
      };
    }

    console.log('No email found in Hunter.io response for', { firstName, lastName, company });
    return {
      email: null,
      confidence: 0
    };
  } catch (error) {
    console.error('Hunter.io API error:', error);
    if (axios.isAxiosError(error)) {
      console.error('Hunter.io error response:', error.response?.data);
      console.error('Hunter.io error status:', error.response?.status);
      
      // Check for common error cases
      if (error.response?.status === 401) {
        console.error('Hunter.io authentication error - API key may be invalid or expired');
      } else if (error.response?.status === 429) {
        console.error('Hunter.io rate limit exceeded');
      }
    }
    return {
      email: null,
      confidence: 0
    };
  }
}