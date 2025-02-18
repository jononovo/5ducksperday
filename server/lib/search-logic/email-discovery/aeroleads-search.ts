import axios from 'axios';

interface AeroLeadsResponse {
  success: boolean;
  data: {
    email?: string;
    score?: number;
  };
  message?: string;
}

interface NameParts {
  firstName: string;
  lastName: string;
}

function splitFullName(fullName: string): NameParts {
  // Handle case where full name is provided
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

    // Using their recommended simple format
    const response = await axios.get<AeroLeadsResponse>(
      'https://aeroleads.com/api/get_email_details',
      {
        params: {
          api_key: apiKey,
          first_name: firstName,
          last_name: lastName,
          company: company
        },
        timeout: 20000 // 20 second timeout
      }
    );

    console.log('AeroLeads API response:', response.data);

    if (response.data.success && response.data.data?.email) {
      return {
        email: response.data.data.email,
        confidence: response.data.data.score || 75 // Default confidence if not provided
      };
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