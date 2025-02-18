import axios from 'axios';

interface AeroLeadsResponse {
  success: boolean;
  data: {
    email?: string;
    score?: number;
    confidence?: number;
    status?: string;
  };
  message?: string;
}

interface NameParts {
  firstName: string;
  lastName: string;
}

function splitFullName(fullName: string): NameParts {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ');
  return { firstName, lastName };
}

export async function searchAeroLeads(
  name: string,
  company: string,
  apiKey: string
): Promise<{ email: string | null; confidence: number }> {
  const { firstName, lastName } = splitFullName(name);

  try {
    console.log(`Searching AeroLeads for: ${firstName} ${lastName} at ${company}`);

    // First, make a search request to find the person
    const searchResponse = await axios.post(
      'https://api.aeroleads.com/v2/search',
      {
        first_name: firstName,
        last_name: lastName,
        company_name: company,
        company_website: '',  // Optional
        limit: 1
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: 20000 // 20 second timeout
      }
    );

    console.log('AeroLeads search response:', searchResponse.data);

    if (!searchResponse.data.success) {
      console.log('AeroLeads search failed:', searchResponse.data.message);
      return {
        email: null,
        confidence: 0
      };
    }

    // If search found a match, get the email details
    if (searchResponse.data.data && searchResponse.data.data.length > 0) {
      const person = searchResponse.data.data[0];
      const emailResponse = await axios.get(
        `https://api.aeroleads.com/v2/person/${person.id}`,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`
          },
          timeout: 20000
        }
      );

      console.log('AeroLeads email response:', emailResponse.data);

      if (emailResponse.data.success && emailResponse.data.data.email) {
        return {
          email: emailResponse.data.data.email,
          confidence: emailResponse.data.data.confidence || 75 // Default confidence if not provided
        };
      }
    }

    console.log('No email found in AeroLeads response');
    return {
      email: null,
      confidence: 0
    };
  } catch (error) {
    console.error('AeroLeads API error:', error);
    if (axios.isAxiosError(error)) {
      console.error('Response:', error.response?.data);
      console.error('Status:', error.response?.status);
    }
    return {
      email: null,
      confidence: 0
    };
  }
}