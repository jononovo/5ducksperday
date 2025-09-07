import axios from 'axios';

interface ApolloResponse {
  person?: {
    id?: string;
    first_name?: string;
    last_name?: string;
    name?: string;
    email?: string;
    linkedin_url?: string;
    title?: string;
    phone_numbers?: {
      type?: string;
      value?: string;
    }[];
    organization?: {
      id?: string;
      name?: string;
      website_url?: string;
      domain?: string;
    };
    confidence_score?: number;
  };
  status?: string;
  message?: string;
  organization_id?: string;
}

/**
 * Search Apollo.io for contact information using the People Enrichment API
 */
export async function searchApollo(
  name: string,
  company: string,
  apiKey: string
): Promise<{ email: string | null; confidence: number; linkedinUrl: string | null; title: string | null; phone: string | null }> {
  // Split the full name into first and last name
  const nameParts = name.trim().split(/\s+/);
  let firstName = '';
  let lastName = '';
  
  if (nameParts.length === 1) {
    firstName = nameParts[0];
  } else if (nameParts.length >= 2) {
    firstName = nameParts[0];
    lastName = nameParts.slice(1).join(' ');
  }

  try {
    console.log(`Searching Apollo.io for: ${firstName} ${lastName} at company "${company}"`);
    console.log(`Apollo API key available: ${!!apiKey}`);

    // Validate inputs before making the API call
    if (!firstName && !lastName) {
      console.warn('Apollo.io search warning: Missing name');
    }
    
    if (!company) {
      console.warn('Apollo.io search warning: Missing company name');
    }

    // Prepare the request payload
    const payload = {
      first_name: firstName || undefined, // Only include if non-empty
      last_name: lastName || undefined,   // Only include if non-empty
      organization_name: company || undefined // Use original company name
    };

    // Clean up payload by removing undefined values
    const cleanPayload: Record<string, any> = { ...payload };
    Object.keys(cleanPayload).forEach(key => {
      if (cleanPayload[key] === undefined) {
        delete cleanPayload[key];
      }
    });
    
    // Use the cleaned payload for the request

    // Make the API request with detailed logging
    console.log(`Apollo.io API request payload:`, JSON.stringify(cleanPayload));
    
    const response = await axios.post<ApolloResponse>(
      'https://api.apollo.io/api/v1/people/match',
      cleanPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apiKey,
          'Cache-Control': 'no-cache'
        },
        timeout: 15000 // 15 second timeout
      }
    );

    console.log('Apollo.io API response status:', response.status);
    
    // Check if response is valid JSON
    if (response.data) {
      if (typeof response.data === 'string') {
        const responseStr = response.data as string;
        console.warn('Received string response instead of JSON:', 
          responseStr.length > 100 ? responseStr.substring(0, 100) + '...' : responseStr);
        // Try to parse if it might be JSON string
        try {
          const parsedData = JSON.parse(response.data);
          console.log('Successfully parsed string response as JSON');
          
          if (parsedData && parsedData.person) {
            const person = parsedData.person;
            const confidence = person.confidence_score ? 
              Math.round(person.confidence_score * 100) : 50;
            
            let phone = null;
            if (person.phone_numbers && person.phone_numbers.length > 0) {
              phone = person.phone_numbers[0].value || null;
            }
            
            return {
              email: person.email || null,
              confidence: confidence,
              linkedinUrl: person.linkedin_url || null,
              title: person.title || null,
              phone: phone
            };
          }
        } catch (parseError) {
          console.error('Failed to parse response as JSON:', parseError);
        }
      } else {
        // Normal JSON response
        console.log('Apollo.io API response:', JSON.stringify(response.data, null, 2));
        
        // Process successful response
        if (response.data && response.data.person) {
          const person = response.data.person;
          
          // Calculate confidence based on Apollo's score if available
          const confidence = person.confidence_score ? 
            Math.round(person.confidence_score * 100) : 50; // Default to 50 if not provided
          
          // Extract phone if available
          let phone = null;
          if (person.phone_numbers && person.phone_numbers.length > 0) {
            phone = person.phone_numbers[0].value || null;
          }
          
          console.log(`Found contact via Apollo.io: ${person.email} (confidence: ${confidence})`);
          
          return {
            email: person.email || null,
            confidence: confidence,
            linkedinUrl: person.linkedin_url || null,
            title: person.title || null,
            phone: phone
          };
        }
      }
    }

    console.log('No contact found in Apollo.io response for', { firstName, lastName, company });
    return {
      email: null,
      confidence: 0,
      linkedinUrl: null,
      title: null,
      phone: null
    };
  } catch (error) {
    console.error('Apollo.io API error:', error);
    if (axios.isAxiosError(error)) {
      // Safely log error details
      const errorResponseData = error.response?.data;
      if (errorResponseData) {
        if (typeof errorResponseData === 'string') {
          // If the response data is a string (e.g., HTML), just log the first 200 chars
          console.error('Apollo.io error response (truncated):', 
            errorResponseData.substring(0, 200));
        } else {
          // Otherwise log the entire object
          console.error('Apollo.io error response:', errorResponseData);
        }
      }
      
      console.error('Apollo.io error status:', error.response?.status);
      
      // Check for common error cases
      if (error.response?.status === 401) {
        console.error('Apollo.io authentication error - API key may be invalid or expired');
      } else if (error.response?.status === 429) {
        console.error('Apollo.io rate limit exceeded');
      }
    }
    return {
      email: null,
      confidence: 0,
      linkedinUrl: null,
      title: null,
      phone: null
    };
  }
}