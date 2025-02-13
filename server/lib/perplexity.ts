import type { Company, Contact } from "@shared/schema";

interface PerplexityMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface PerplexityResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export async function queryPerplexity(messages: PerplexityMessage[]): Promise<string> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error("Perplexity API key is not configured. Please set the PERPLEXITY_API_KEY environment variable.");
  }

  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-sonar-small-128k-online",
        messages,
        temperature: 0.2,
        max_tokens: 1000,
        stream: false
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Perplexity API error (${response.status}): ${errorBody || response.statusText}`);
    }

    const data = await response.json() as PerplexityResponse;
    return data.choices[0].message.content;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to query Perplexity API: ${error.message}`);
    }
    throw error;
  }
}

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
  prompt: string
): Promise<string> {
  const messages: PerplexityMessage[] = [
    {
      role: "system",
      content: "You are a business intelligence analyst. Provide detailed, factual information about companies."
    },
    {
      role: "user",
      content: prompt.replace("[COMPANY]", companyName)
    }
  ];

  // Add specific differentiation analysis
  if (prompt.toLowerCase().includes("differentiation")) {
    messages[0].content += " Focus on unique selling propositions and competitive advantages. Provide exactly 3 short, impactful bullet points.";
  }

  return queryPerplexity(messages);
}

export function parseCompanyData(analysisResults: string[]): Partial<Company> {
  const companyData: Partial<Company> = {
    services: [],
    validationPoints: [],
    differentiation: [],
    totalScore: 0,
    snapshot: {}
  };

  for (const result of analysisResults) {
    // Extract website URLs
    const websiteRegex = /(?:website|url|web\s*site):\s*(https?:\/\/[^\s,)]+)/i;
    const websiteMatch = result.match(websiteRegex);
    if (websiteMatch) {
      companyData.website = websiteMatch[1];
    }

    // Extract profile URLs (LinkedIn, etc.)
    const profileRegex = /(?:profile|linkedin|company\s*profile):\s*(https?:\/\/[^\s,)]+)/i;
    const profileMatch = result.match(profileRegex);
    if (profileMatch) {
      companyData.alternativeProfileUrl = profileMatch[1];
    }

    // Extract differentiation points
    if (result.toLowerCase().includes("differentiat") || result.toLowerCase().includes("unique")) {
      const points = result
        .split(/[.!?•]/)
        .map(s => s.trim())
        .filter(s =>
          s.length > 0 &&
          s.length <= 30 &&
          (s.toLowerCase().includes("unique") ||
            s.toLowerCase().includes("only") ||
            s.toLowerCase().includes("leading") ||
            s.toLowerCase().includes("best"))
        )
        .slice(0, 3);

      if (points.length > 0) {
        companyData.differentiation = points;
      }
    }

    // Rest of the parsing logic
    if (result.includes("employees") || result.includes("staff")) {
      const sizeMatch = result.match(/(\d+)\s*(employees|staff)/i);
      if (sizeMatch) {
        companyData.size = parseInt(sizeMatch[1]);
      }
    }

    if (result.includes("founded") || result.includes("established")) {
      const yearMatch = result.match(/founded\s*in\s*(\d{4})/i);
      if (yearMatch) {
        const foundedYear = parseInt(yearMatch[1]);
        companyData.age = new Date().getFullYear() - foundedYear;
      }
    }

    if (result.toLowerCase().includes("services") || result.toLowerCase().includes("offerings")) {
      const services = result
        .split(/[.,;]/)
        .filter(s =>
          s.toLowerCase().includes("service") ||
          s.toLowerCase().includes("offering") ||
          s.toLowerCase().includes("solution")
        )
        .map(s => s.trim())
        .filter(s => s.length > 0);

      if (services.length > 0) {
        companyData.services = services;
      }
    }

    const validationPoints = result
      .split(/[.!?]/)
      .map(s => s.trim())
      .filter(s =>
        s.length > 20 &&
        (s.includes("success") || s.includes("achievement") || s.includes("award"))
      );

    if (validationPoints.length > 0) {
      companyData.validationPoints = validationPoints;
    }

    let score = 50;
    if (companyData.size && companyData.size > 50) score += 10;
    if (companyData.age && companyData.age > 5) score += 10;
    if (companyData.services && companyData.services.length > 2) score += 10;
    if (companyData.validationPoints && companyData.validationPoints.length > 0) score += 10;
    if (companyData.differentiation && companyData.differentiation.length === 3) score += 10;

    companyData.totalScore = Math.min(100, score);
  }

  return companyData;
}

export function extractContacts(analysisResults: string[]): Partial<Contact>[] {
  const contactMap = new Map<string, Partial<Contact> & { score: number }>();

  // Leadership roles with their importance scores
  const leadershipRoles = {
    'CEO': 10,
    'Chief Executive Officer': 10,
    'Founder': 9,
    'Co-Founder': 9,
    'CTO': 8,
    'Chief Technology Officer': 8,
    'Director': 7,
    'Managing Director': 7,
    'VP': 6,
    'Vice President': 6,
    'Head of': 5,
    'Manager': 4
  };

  // Enhanced regex patterns
  const emailRegex = /[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}/g;
  // More strict name pattern requiring first and last name
  const nameRegex = /([A-Z][a-z]{1,20})\s+([A-Z][a-z]{1,20})(?:\s+[A-Z][a-z]{1,20})?/g;

  // Common organization suffix patterns to filter out
  const orgSuffixes = [
    'Inc', 'LLC', 'Ltd', 'Limited', 'Corp', 'Corporation', 'Co', 'Company',
    'Group', 'Holdings', 'Services', 'Solutions', 'Technologies', 'Systems',
    'Partners', 'Consulting', 'Associates', 'International', 'Global',
    'Enterprises', 'Industries', 'Networks', 'Interactive', 'Digital'
  ];

  // Words that indicate a goal or objective rather than a person
  const goalKeywords = [
    'mission', 'vision', 'goal', 'objective', 'strategy', 'approach',
    'success', 'growth', 'development', 'innovation', 'leadership'
  ];

  // Add common page headers and standalone titles to filter out
  const pageHeaderKeywords = [
    'additional information', 'contact information', 'overview',
    'summary', 'details', 'about us', 'our team', 'leadership team',
    'management', 'board of directors', 'executive team'
  ];

  // Standalone titles that shouldn't be treated as names
  const standaloneTitles = [
    'president', 'vice-president', 'vice president', 'ceo', 'cto', 'cfo',
    'director', 'manager', 'head', 'lead', 'chief', 'executive',
    'vp', 'svp', 'evp', 'avp', 'founder', 'co-founder'
  ];

  // Location and institution keywords
  const locationInstitutionKeywords = [
    'university', 'college', 'institute', 'school', 'academy',
    'state', 'technical', 'center', 'north', 'south', 'east', 'west',
    'central', 'regional', 'national', 'international', 'city', 'county',
    'district', 'area', 'zone', 'valley', 'coast', 'bay', 'lake', 'mountain'
  ];

  for (const result of analysisResults) {
    const names = Array.from(result.matchAll(nameRegex))
      .map(match => match[0])
      .filter(name => {
        // Filter out organization names and goals
        if (orgSuffixes.some(suffix =>
          name.includes(suffix) ||
          name.includes(suffix.toUpperCase())
        )) {
          return false;
        }

        // Filter out standalone titles
        if (standaloneTitles.some(title => 
          name.toLowerCase() === title ||
          name.toLowerCase().startsWith(title + ' of') ||
          name.toLowerCase().endsWith(' ' + title)
        )) {
          return false;
        }

        // Get surrounding context (increased context window)
        const context = result.substring(
          Math.max(0, result.indexOf(name) - 50),
          Math.min(result.length, result.indexOf(name) + name.length + 50)
        ).toLowerCase();

        // Filter out if it appears to be a page header
        if (pageHeaderKeywords.some(header => context.includes(header))) {
          return false;
        }

        // Filter out if surrounded by goal-related keywords
        if (goalKeywords.some(keyword => context.includes(keyword))) {
          return false;
        }

        // Filter out location/institution names
        if (locationInstitutionKeywords.some(keyword => 
          name.toLowerCase().includes(keyword) ||
          context.includes(keyword)
        )) {
          return false;
        }

        // Validate name structure more strictly
        const nameParts = name.split(' ');
        const isValidName = (
          nameParts.length >= 2 && // Must have at least first and last name
          nameParts.length <= 3 && // No more than three parts (First Middle Last)
          nameParts.every(part => 
            part.length >= 2 && // Each part must be at least 2 chars
            part.length <= 20 && // Each part must be no more than 20 chars
            /^[A-Z][a-z]+$/.test(part) // Must start with capital letter, followed by lowercase
          )
        );

        if (!isValidName) {
          return false;
        }

        // Skip common false positives
        return !(
          name.includes('Company') ||
          name.includes('Service') ||
          name.includes('Product') ||
          name.includes('Platform') ||
          name.includes('Technology') ||
          name.length > 50 ||
          /\d/.test(name) || // Contains numbers
          name.split(' ').some(word => word.length > 20) // Words too long
        );
      });

    const emails = result.match(emailRegex) || [];

    // Extract roles with context
    const roleMatches = Object.keys(leadershipRoles).flatMap(role => {
      const regex = new RegExp(`(${role}[\\s-](?:of|at|for)?\\s[\\w\\s&]+)`, 'gi');
      const matches = result.match(regex) || [];
      return matches.map(match => ({ role: role, fullContext: match }));
    });

    for (const name of names) {
      const nearestRole = roleMatches.find(r =>
        result.indexOf(r.fullContext) - result.indexOf(name) < 100 &&
        result.indexOf(r.fullContext) - result.indexOf(name) > -100
      );

      const nearestEmail = emails.find(email =>
        result.indexOf(email) - result.indexOf(name) < 100 &&
        result.indexOf(email) - result.indexOf(name) > -100 &&
        !orgSuffixes.some(suffix => email.toLowerCase().includes(suffix.toLowerCase())) // Additional check for organizational emails
      );

      let score = 0;
      if (nearestRole) {
        const roleScore = leadershipRoles[nearestRole.role as keyof typeof leadershipRoles] || 0;
        score += roleScore;

        // Boost score if role directly precedes or follows the name
        if (Math.abs(result.indexOf(nearestRole.fullContext) - result.indexOf(name)) < 30) {
          score += 3;
        }
      }

      if (nearestEmail) {
        const nameParts = name.toLowerCase().split(' ');
        const emailParts = nearestEmail.toLowerCase().split('@')[0].split(/[.-]/);

        // More strict email matching
        if (nameParts.some(part =>
          part.length > 2 && // Avoid matching on very short name parts
          emailParts.some(ep => ep.includes(part))
        )) {
          score += 5;
        }
        score += 3;
      }

      // Only include contacts that meet minimum validation criteria
      if (score >= 5) { // Increased minimum score threshold
        const contactKey = `${name}-${nearestRole?.role || ''}-${nearestEmail || ''}`;

        if (!contactMap.has(contactKey) || contactMap.get(contactKey)!.score < score) {
          contactMap.set(contactKey, {
            name,
            email: nearestEmail || null,
            role: nearestRole?.role || null,
            priority: 3,
            score
          });
        }
      }
    }
  }

  // Convert to array, sort by score, and take top 5
  const sortedContacts = Array.from(contactMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((contact, index) => ({
      name: contact.name,
      email: contact.email,
      role: contact.role,
      priority: contact.score >= 15 ? 1 : contact.score >= 10 ? 2 : 3 // Stricter priority assignment based on score
    }));

  return sortedContacts;
}

export async function searchContactDetails(name: string, company: string): Promise<Partial<Contact>> {
  const messages: PerplexityMessage[] = [
    {
      role: "system",
      content: `You are a contact information researcher. Find detailed professional information about the specified person. Focus on:
1. Current role and department
2. Professional email format
3. LinkedIn profile URL
4. Location
5. Other verifiable contact details
Format your response in a structured way that's easy to parse.`
    },
    {
      role: "user",
      content: `Find detailed professional contact information for ${name} at ${company}. Include email, LinkedIn URL, role details, and location if available.`
    }
  ];

  const response = await queryPerplexity(messages);
  return parseContactDetails(response);
}

function parseContactDetails(response: string): Partial<Contact> {
  const contact: Partial<Contact> = {};

  // Look for email patterns
  const emailMatch = response.match(/[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) {
    contact.email = emailMatch[0];
  }

  // Look for LinkedIn URL
  const linkedinMatch = response.match(/linkedin\.com\/in\/[\w-]+/);
  if (linkedinMatch) {
    contact.linkedinUrl = `https://www.${linkedinMatch[0]}`;
  }

  // Look for role information
  const roleMatch = response.match(/(?:role|position|title):\s*([^.\n]+)/i);
  if (roleMatch) {
    contact.role = roleMatch[1].trim();
  }

  // Look for department
  const deptMatch = response.match(/(?:department|division):\s*([^.\n]+)/i);
  if (deptMatch) {
    contact.department = deptMatch[1].trim();
  }

  // Look for location
  const locationMatch = response.match(/(?:location|based in|located in):\s*([^.\n]+)/i);
  if (locationMatch) {
    contact.location = locationMatch[1].trim();
  }

  return contact;
}